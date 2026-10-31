import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  hasFormErrors,
  validateFarmRegistrationForm,
} from '../validation';
import type { FarmRegistrationFormErrors, FarmRegistrationFormValues } from '../types';
import {
  VIETNAM_PROVINCES,
  fetchDistrictsForProvince,
  fetchWardsForDistrict,
  findProvinceOption,
  generateSampleFarmPolygon,
  geocodeAddress,
  normalizeVietnamese,
  parseBoundaryCoordinates,
  stringifyBoundaryCoordinates,
  type DistrictOption,
  type GoongGeocodeResult,
  type LatLngPoint,
  type WardOption,
} from '../goongMapService';
import { FarmGoongMap } from './FarmGoongMap';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

const INITIAL_VALUES: FarmRegistrationFormValues = {
  proposedFarmName: '',
  address: '',
  province: '',
  district: '',
  ward: '',
  latitude: null,
  longitude: null,
  boundaryCoordinates: '',
  documentUrl: '',
  description: '',
};

interface FarmRegistrationFormProps {
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: FarmRegistrationFormValues) => void;
}

type FieldName = keyof FarmRegistrationFormValues;

export function FarmRegistrationForm({ submitting, submitError, onSubmit }: FarmRegistrationFormProps) {
  const { lang } = useLanguage();
  const [values, setValues] = useState<FarmRegistrationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FarmRegistrationFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  // Cascading options state (Tỉnh/TP -> Quận/Huyện -> Phường/Xã)
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Dropdown open states & filter keyword (gõ phím để filter danh sách thay vì điền tay tự do)
  const [openDropdown, setOpenDropdown] = useState<'province' | 'district' | 'ward' | null>(null);
  const [filterKeyword, setFilterKeyword] = useState('');

  const formRef = useRef<HTMLFormElement | null>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setFilterKeyword('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải danh sách Quận/Huyện khi Tỉnh/Thành phố thay đổi
  useEffect(() => {
    const prov = values.province?.trim();
    if (!prov) {
      setDistrictOptions([]);
      setWardOptions([]);
      return;
    }
    const matchedProvince = findProvinceOption(prov);
    if (!matchedProvince) {
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    void fetchDistrictsForProvince(matchedProvince.code)
      .then((list) => {
        if (!cancelled) setDistrictOptions(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [values.province]);

  // Tải danh sách Phường/Xã khi Quận/Huyện thay đổi
  useEffect(() => {
    const prov = values.province?.trim();
    const dist = values.district?.trim();
    if (!prov || !dist) {
      setWardOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingWards(true);
    void fetchWardsForDistrict(prov, dist)
      .then((list) => {
        if (!cancelled) setWardOptions(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [values.province, values.district]);

  function updateField<K extends FieldName>(field: K, value: FarmRegistrationFormValues[K]) {
    setValues((prev) => {
      const nextValues = { ...prev, [field]: value };
      if (touched[field]) {
        setErrors(validateFarmRegistrationForm(nextValues));
      }
      return nextValues;
    });
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateFarmRegistrationForm(values));
  }

  // Hỗ trợ gõ phím để lọc nhanh danh sách trong dropdown (không cho điền tay tự do)
  function handleFilterKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    dropdownType: 'province' | 'district' | 'ward'
  ) {
    if (event.key === 'Tab') {
      setOpenDropdown(null);
      setFilterKeyword('');
      return;
    }
    if (event.key === 'Escape') {
      setOpenDropdown(null);
      setFilterKeyword('');
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      setOpenDropdown(dropdownType);
      setFilterKeyword((prev) => prev.slice(0, -1));
      return;
    }
    if (event.key === 'Enter' && openDropdown === dropdownType) {
      event.preventDefault();
      if (dropdownType === 'province' && filteredProvinces.length > 0) {
        const first = filteredProvinces[0];
        handleSelectProvince(first.name, first.lat, first.lng);
      } else if (dropdownType === 'district' && filteredDistricts.length > 0) {
        handleSelectDistrict(filteredDistricts[0].name);
      } else if (dropdownType === 'ward' && filteredWards.length > 0) {
        handleSelectWard(filteredWards[0].name);
      }
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setOpenDropdown(dropdownType);
      setFilterKeyword((prev) => prev + event.key);
    }
  }

  // Chọn Tỉnh/Thành phố từ bộ lọc Goong Map
  function handleSelectProvince(provinceName: string, lat: number, lng: number) {
    setFilterKeyword('');
    setValues((prev) => {
      const boundaryPts = parseBoundaryCoordinates(prev.boundaryCoordinates);
      const nextBoundary =
        boundaryPts.length > 0
          ? prev.boundaryCoordinates
          : stringifyBoundaryCoordinates(generateSampleFarmPolygon({ lat, lng }));
      const next: FarmRegistrationFormValues = {
        ...prev,
        province: provinceName,
        district: '',
        ward: '',
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        boundaryCoordinates: nextBoundary,
      };
      setErrors(validateFarmRegistrationForm(next));
      return next;
    });
    setOpenDropdown('district');
  }

  // Chọn Quận/Huyện từ bộ lọc của Tỉnh/Thành phố đã chọn
  function handleSelectDistrict(districtName: string) {
    const currentProvince = values.province || '';
    setFilterKeyword('');
    setValues((prev) => {
      const next: FarmRegistrationFormValues = {
        ...prev,
        district: districtName,
        ward: '',
      };
      setErrors(validateFarmRegistrationForm(next));
      return next;
    });
    setOpenDropdown('ward');

    void geocodeAddress('', { province: currentProvince, district: districtName }).then((geo) => {
      if (geo) {
        setValues((prev) => ({
          ...prev,
          latitude: geo.lat,
          longitude: geo.lng,
          boundaryCoordinates: stringifyBoundaryCoordinates(
            generateSampleFarmPolygon({ lat: geo.lat, lng: geo.lng })
          ),
        }));
      }
    });
  }

  // Chọn Phường/Xã từ bộ lọc của Quận/Huyện đã chọn
  function handleSelectWard(wardName: string) {
    const currentProvince = values.province || '';
    const currentDistrict = values.district || '';
    setFilterKeyword('');
    setValues((prev) => {
      const next: FarmRegistrationFormValues = {
        ...prev,
        ward: wardName,
      };
      setErrors(validateFarmRegistrationForm(next));
      return next;
    });
    setOpenDropdown(null);

    void geocodeAddress('', { province: currentProvince, district: currentDistrict, ward: wardName }).then((geo) => {
      if (geo) {
        setValues((prev) => ({
          ...prev,
          latitude: geo.lat,
          longitude: geo.lng,
          boundaryCoordinates: stringifyBoundaryCoordinates(
            generateSampleFarmPolygon({ lat: geo.lat, lng: geo.lng })
          ),
        }));
      }
    });
  }

  // Khi người dùng ghim tọa độ hoặc kéo marker trên bản đồ Goong Map
  function handleMapLocationChange(lat: number, lng: number, reverseResult?: GoongGeocodeResult | null) {
    setValues((prev) => {
      const matchedProv = reverseResult?.province ? findProvinceOption(reverseResult.province) : undefined;
      const existingBoundary = parseBoundaryCoordinates(prev.boundaryCoordinates);
      const nextBoundary =
        existingBoundary.length >= 3
          ? prev.boundaryCoordinates
          : stringifyBoundaryCoordinates(generateSampleFarmPolygon({ lat, lng }));

      const next: FarmRegistrationFormValues = {
        ...prev,
        latitude: lat,
        longitude: lng,
        boundaryCoordinates: nextBoundary,
        province: matchedProv?.name || reverseResult?.province || prev.province,
        district: reverseResult?.district || prev.district,
        ward: reverseResult?.ward || prev.ward,
        address: prev.address.trim() ? prev.address : reverseResult?.addressLine || prev.address,
      };
      return next;
    });
  }

  function handleMapBoundaryChange(points: LatLngPoint[]) {
    setValues((prev) => ({
      ...prev,
      boundaryCoordinates: stringifyBoundaryCoordinates(points),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFarmRegistrationForm(values);
    setErrors(nextErrors);
    setTouched({
      proposedFarmName: true,
      address: true,
      description: true,
      province: true,
      district: true,
      ward: true,
      documentUrl: true,
    });
    if (hasFormErrors(nextErrors)) return;
    onSubmit(values);
  }

  const normFilter = normalizeVietnamese(filterKeyword);
  const filteredProvinces = VIETNAM_PROVINCES.filter((p) =>
    !normFilter ? true : normalizeVietnamese(p.name).includes(normFilter)
  );
  const filteredDistricts = districtOptions.filter((d) =>
    !normFilter ? true : normalizeVietnamese(d.name).includes(normFilter)
  );
  const filteredWards = wardOptions.filter((w) =>
    !normFilter ? true : normalizeVietnamese(w.name).includes(normFilter)
  );

  const boundaryPoints = parseBoundaryCoordinates(values.boundaryCoordinates);

  return (
    <form ref={formRef} className="panel farm-registration-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-title">
        <div>
          <h2>{lang === 'en' ? 'Farm Registration Information' : 'Thông tin đăng ký trang trại'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {lang === 'en' ? 'Select Province / City, District, Ward / Commune and trace farm boundaries on the map.' : 'Chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã và vẽ vùng tọa độ trang trại trên bản đồ.'}
          </p>
        </div>
      </div>

      {submitError ? <p className="form-error-banner">{submitError}</p> : null}

      <label className="form-field">
        <span>{lang === 'en' ? 'Proposed Farm Name *' : 'Tên trang trại dự kiến *'}</span>
        <input
          type="text"
          maxLength={160}
          value={values.proposedFarmName}
          onChange={(event) => updateField('proposedFarmName', event.target.value)}
          onBlur={() => handleBlur('proposedFarmName')}
          placeholder={lang === 'en' ? "e.g. Can Tho Green Farm" : "VD: Trang trại Xanh Cần Thơ"}
        />
        {errors.proposedFarmName ? <small className="field-error">{errors.proposedFarmName}</small> : null}
      </label>

      {/* Địa chỉ chi tiết */}
      <label className="form-field">
        <span>{lang === 'en' ? 'Detailed Address *' : 'Địa chỉ chi tiết *'}</span>
        <input
          type="text"
          value={values.address}
          maxLength={300}
          onChange={(event) => updateField('address', event.target.value)}
          onBlur={() => handleBlur('address')}
          placeholder={lang === 'en' ? "House number, street name, hamlet..." : "Số nhà, tên đường, thôn/ấp..."}
        />
        {errors.address ? <small className="field-error">{errors.address}</small> : null}
      </label>

      {/* Bộ lọc phân cấp Tỉnh / Thành phố -> Quận / Huyện -> Phường / Xã */}
      <div className="farm-registration-location-fields">
        {/* 1. Tỉnh / Thành phố */}
        <div className="form-field" style={{ position: 'relative' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span>{lang === 'en' ? 'Province / City' : 'Tỉnh / thành phố'}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={values.province ?? ''}
                maxLength={100}
                onFocus={() => {
                  setOpenDropdown('province');
                  setFilterKeyword('');
                }}
                onClick={() => {
                  setOpenDropdown('province');
                  setFilterKeyword('');
                }}
                onKeyDown={(e) => handleFilterKeyDown(e, 'province')}
                onChange={(event) => {
                  const val = event.target.value;
                  setValues((prev) => ({
                    ...prev,
                    province: val,
                    district: '',
                    ward: '',
                  }));
                }}
                onBlur={() => handleBlur('province')}
                placeholder={lang === 'en' ? "-- Select Province / City --" : "-- Chọn Tỉnh / Thành phố --"}
                autoComplete="off"
                style={{ width: '100%', paddingRight: '30px', cursor: 'pointer', background: '#ffffff' }}
              />
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFilterKeyword('');
                  setOpenDropdown((cur) => (cur === 'province' ? null : 'province'));
                }}
                style={{ position: 'absolute', right: '10px', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}
              >
                ▼
              </span>
            </div>
          </label>
          {errors.province && <small className="field-error">{errors.province}</small>}

          {openDropdown === 'province' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 45,
                marginTop: '4px',
                background: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: '10px',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                maxHeight: '250px',
                overflowY: 'auto',
              }}
            >
              <div style={{ padding: '7px 12px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', fontSize: '12px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{filterKeyword ? `🔍 Đang lọc: "${filterKeyword}"` : 'Gõ phím bất kỳ để lọc nhanh Tỉnh/TP'}</span>
                {filterKeyword && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFilterKeyword('');
                    }}
                    style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
              {filteredProvinces.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                  Không tìm thấy Tỉnh / Thành phố phù hợp
                </div>
              ) : (
                filteredProvinces.map((prov) => (
                  <div
                    key={prov.code}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectProvince(prov.name, prov.lat, prov.lng);
                    }}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      background: values.province === prov.name ? '#ecfdf5' : '#ffffff',
                      color: values.province === prov.name ? '#047857' : '#0f172a',
                      fontWeight: values.province === prov.name ? 700 : 500,
                      borderBottom: '1px solid #f8fafc',
                    }}
                  >
                    {prov.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. Quận / Huyện (chỉ hiển thị các Quận/Huyện thuộc Tỉnh/TP đã chọn) */}
        <div className="form-field" style={{ position: 'relative' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span>{lang === 'en' ? 'District' : 'Quận / huyện'}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={values.district ?? ''}
                maxLength={100}
                onFocus={() => {
                  setOpenDropdown('district');
                  setFilterKeyword('');
                }}
                onClick={() => {
                  setOpenDropdown('district');
                  setFilterKeyword('');
                }}
                onKeyDown={(e) => handleFilterKeyDown(e, 'district')}
                onChange={(event) => {
                  const val = event.target.value;
                  setValues((prev) => ({
                    ...prev,
                    district: val,
                    ward: '',
                  }));
                }}
                onBlur={() => handleBlur('district')}
                placeholder={values.province ? (lang === 'en' ? '-- Select District --' : '-- Chọn Quận / Huyện --') : (lang === 'en' ? 'Select Province / City first' : 'Chọn Tỉnh / Thành phố trước')}
                autoComplete="off"
                style={{
                  width: '100%',
                  paddingRight: '30px',
                  cursor: values.province ? 'pointer' : 'not-allowed',
                  background: values.province ? '#ffffff' : '#f8fafc',
                }}
              />
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFilterKeyword('');
                  setOpenDropdown((cur) => (cur === 'district' ? null : 'district'));
                }}
                style={{ position: 'absolute', right: '10px', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}
              >
                ▼
              </span>
            </div>
          </label>
          {errors.district && <small className="field-error">{errors.district}</small>}

          {openDropdown === 'district' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 45,
                marginTop: '4px',
                background: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: '10px',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                maxHeight: '250px',
                overflowY: 'auto',
              }}
            >
              {!values.province ? (
                <div style={{ padding: '10px 12px', fontSize: '13px', color: '#d97706' }}>
                  ⚠️ Vui lòng chọn Tỉnh / Thành phố trước để lọc Quận / Huyện
                </div>
              ) : loadingDistricts ? (
                <div style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                  ⏳ Đang tải Quận / Huyện của {values.province}...
                </div>
              ) : (
                <>
                  <div style={{ padding: '7px 12px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', fontSize: '12px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{filterKeyword ? `🔍 Đang lọc: "${filterKeyword}"` : `Quận/Huyện thuộc ${values.province}`}</span>
                    {filterKeyword && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFilterKeyword('');
                        }}
                        style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                  {filteredDistricts.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                      Không có Quận / Huyện khớp từ khóa
                    </div>
                  ) : (
                    filteredDistricts.map((dist) => (
                      <div
                        key={dist.code}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectDistrict(dist.name);
                        }}
                        style={{
                          padding: '9px 12px',
                          fontSize: '13.5px',
                          cursor: 'pointer',
                          background: values.district === dist.name ? '#ecfdf5' : '#ffffff',
                          color: values.district === dist.name ? '#047857' : '#0f172a',
                          fontWeight: values.district === dist.name ? 700 : 500,
                          borderBottom: '1px solid #f8fafc',
                        }}
                      >
                        {dist.name}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Phường / Xã (chỉ hiển thị các Phường/Xã thuộc Quận/Huyện đã chọn) */}
        <div className="form-field" style={{ position: 'relative' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span>{lang === 'en' ? 'Ward / Commune' : 'Phường / xã'}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={values.ward ?? ''}
                maxLength={100}
                onFocus={() => {
                  setOpenDropdown('ward');
                  setFilterKeyword('');
                }}
                onClick={() => {
                  setOpenDropdown('ward');
                  setFilterKeyword('');
                }}
                onKeyDown={(e) => handleFilterKeyDown(e, 'ward')}
                onChange={(event) => {
                  updateField('ward', event.target.value);
                }}
                onBlur={() => handleBlur('ward')}
                placeholder={values.district ? (lang === 'en' ? '-- Select Ward / Commune --' : '-- Chọn Phường / Xã --') : (lang === 'en' ? 'Select District first' : 'Chọn Quận / Huyện trước')}
                autoComplete="off"
                style={{
                  width: '100%',
                  paddingRight: '30px',
                  cursor: values.district ? 'pointer' : 'not-allowed',
                  background: values.district ? '#ffffff' : '#f8fafc',
                }}
              />
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFilterKeyword('');
                  setOpenDropdown((cur) => (cur === 'ward' ? null : 'ward'));
                }}
                style={{ position: 'absolute', right: '10px', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}
              >
                ▼
              </span>
            </div>
          </label>
          {errors.ward && <small className="field-error">{errors.ward}</small>}

          {openDropdown === 'ward' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 45,
                marginTop: '4px',
                background: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: '10px',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                maxHeight: '250px',
                overflowY: 'auto',
              }}
            >
              {!values.district ? (
                <div style={{ padding: '10px 12px', fontSize: '13px', color: '#d97706' }}>
                  ⚠️ Vui lòng chọn Quận / Huyện trước để lọc Phường / Xã
                </div>
              ) : loadingWards ? (
                <div style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                  ⏳ Đang tải Phường / Xã của {values.district}...
                </div>
              ) : (
                <>
                  <div style={{ padding: '7px 12px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', fontSize: '12px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{filterKeyword ? `🔍 Đang lọc: "${filterKeyword}"` : `Phường/Xã thuộc ${values.district}`}</span>
                    {filterKeyword && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFilterKeyword('');
                        }}
                        style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                  {filteredWards.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                      Không có Phường / Xã khớp từ khóa
                    </div>
                  ) : (
                    filteredWards.map((w) => (
                      <div
                        key={w.code}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectWard(w.name);
                        }}
                        style={{
                          padding: '9px 12px',
                          fontSize: '13.5px',
                          cursor: 'pointer',
                          background: values.ward === w.name ? '#ecfdf5' : '#ffffff',
                          color: values.ward === w.name ? '#047857' : '#0f172a',
                          fontWeight: values.ward === w.name ? 700 : 500,
                          borderBottom: '1px solid #f8fafc',
                        }}
                      >
                        {w.name}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bản đồ ghim tọa độ và vẽ ranh giới trang trại */}
      <div className="form-field">
        <span>{lang === 'en' ? 'Location Map & Farm Boundary Layout' : 'Bản đồ vị trí & Vẽ sơ đồ ranh giới trang trại'}</span>
        <FarmGoongMap
          farmName={values.proposedFarmName || 'Trang trại đăng ký mới'}
          address={values.address}
          province={values.province}
          district={values.district}
          ward={values.ward}
          latitude={values.latitude}
          longitude={values.longitude}
          boundary={boundaryPoints}
          editable={true}
          height={380}
          onLocationChange={handleMapLocationChange}
          onBoundaryChange={handleMapBoundaryChange}
        />
      </div>

      <label className="form-field">
        <span>{lang === 'en' ? 'Farm Description' : 'Mô tả trang trại'}</span>
        <textarea
          rows={4}
          maxLength={1000}
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder={lang === 'en' ? "Scale, target crops, soil and land condition..." : "Quy mô, loại cây trồng dự kiến, hiện trạng đất đai..."}
        />
        {errors.description ? <small className="field-error">{errors.description}</small> : null}
      </label>

      <label className="form-field">
        <span>{lang === 'en' ? 'Supporting Document URL' : 'Đường dẫn tài liệu minh chứng'}</span>
        <input
          type="url"
          value={values.documentUrl ?? ''}
          maxLength={1000}
          onChange={(event) => updateField('documentUrl', event.target.value)}
          onBlur={() => handleBlur('documentUrl')}
          placeholder="https://..."
        />
        {errors.documentUrl ? (
          <small className="field-error">{errors.documentUrl}</small>
        ) : (
          <small className="field-hint">
            {lang === 'en' ? 'Link to farm certificates or legal documents. Ensure admin has view permissions.' : 'Link giấy chứng nhận hoặc tài liệu trang trại. Hãy bảo đảm quản trị viên có quyền xem.'}
          </small>
        )}
      </label>

      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? (lang === 'en' ? 'Submitting registration...' : 'Đang gửi đăng ký...') : (lang === 'en' ? 'Submit Registration' : 'Gửi đăng ký')}
      </button>
    </form>
  );
}
