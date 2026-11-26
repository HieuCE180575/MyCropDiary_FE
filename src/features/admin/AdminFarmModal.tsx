import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { FileUpload } from '../../shared/components/FileUpload';
import { AdminModal } from './AdminComponents';
import { translateAdminError } from './adminConfig';
import { useAdmin } from './AdminProvider';
import type { AdminRecord } from './adminTypes';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { FarmGoongMap } from '../farm-management/components/FarmGoongMap';
import {
  VIETNAM_PROVINCES,
  calculatePolygonAreaM2,
  fetchDistrictsForProvince,
  fetchWardsForDistrict,
  findProvinceOption,
  generateSampleFarmPolygon,
  geocodeAddress,
  parseBoundaryCoordinates,
  stringifyBoundaryCoordinates,
  type DistrictOption,
  type LatLngPoint,
  type WardOption,
} from '../farm-management/goongMapService';
import { parseEvidenceFiles, uploadFileToCloudinary, type EvidenceFileItem } from '../../shared/api/fileUploadService';

interface AdminFarmModalProps {
  mode: 'create' | 'edit';
  record?: AdminRecord;
  close: () => void;
}

export function AdminFarmModal({ mode, record, close }: AdminFarmModalProps) {
  const { lang } = useLanguage();
  const { state, execute, reloadUsers } = useAdmin();

  const [farmName, setFarmName] = useState(record?.name ?? '');
  const [address, setAddress] = useState(record?.address && record.address !== 'Chưa cập nhật địa chỉ' ? record.address : '');
  const [province, setProvince] = useState(record?.province ?? '');
  const [district, setDistrict] = useState(record?.district ?? '');
  const [ward, setWard] = useState(record?.ward ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [status, setStatus] = useState(record?.status || 'ACTIVE');

  const [latitude, setLatitude] = useState<number | null>(
    record?.latitude && !Number.isNaN(Number(record.latitude)) ? Number(record.latitude) : null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    record?.longitude && !Number.isNaN(Number(record.longitude)) ? Number(record.longitude) : null,
  );
  const [boundaryCoordinates, setBoundaryCoordinates] = useState(record?.boundaryCoordinates ?? '');
  const [documentUrl, setDocumentUrl] = useState(record?.document ?? '');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [ownerId, setOwnerId] = useState(record?.ownerId ?? '');
  const [staffIds, setStaffIds] = useState<string[]>(() => {
    if (!record?.staffIds) return [];
    try {
      const parsed = JSON.parse(record.staffIds);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });
  const [staffSearch, setStaffSearch] = useState('');

  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load users if not loaded yet
  useEffect(() => {
    if (state.users.length === 0) {
      reloadUsers();
    }
  }, [state.users.length, reloadUsers]);

  const activeUsers = useMemo(
    () => state.users.filter((u) => u.status === 'ACTIVE'),
    [state.users],
  );

  // Default owner to first non-admin active user (or first active user) if creating
  useEffect(() => {
    if (mode === 'create' && !ownerId && activeUsers.length > 0) {
      const preferred = activeUsers.find((u) => u.role === 'OWNER') ?? activeUsers.find((u) => u.role !== 'ADMIN') ?? activeUsers[0];
      if (preferred) setOwnerId(preferred.id);
    }
  }, [mode, ownerId, activeUsers]);

  // Ensure owner is not duplicated in staffIds
  useEffect(() => {
    if (ownerId && staffIds.includes(ownerId)) {
      setStaffIds((prev) => prev.filter((id) => id !== ownerId));
    }
  }, [ownerId, staffIds]);

  // Cascading districts
  useEffect(() => {
    const prov = province.trim();
    if (!prov) {
      setDistrictOptions([]);
      setWardOptions([]);
      return;
    }
    const matched = findProvinceOption(prov);
    if (!matched) return;
    let cancelled = false;
    setLoadingDistricts(true);
    void fetchDistrictsForProvince(matched.code)
      .then((list) => { if (!cancelled) setDistrictOptions(list); })
      .finally(() => { if (!cancelled) setLoadingDistricts(false); });
    return () => { cancelled = true; };
  }, [province]);

  // Cascading wards
  useEffect(() => {
    const prov = province.trim();
    const dist = district.trim();
    if (!prov || !dist) {
      setWardOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingWards(true);
    void fetchWardsForDistrict(prov, dist)
      .then((list) => { if (!cancelled) setWardOptions(list); })
      .finally(() => { if (!cancelled) setLoadingWards(false); });
    return () => { cancelled = true; };
  }, [province, district]);

  const handleProvinceChange = (nextProvince: string) => {
    setProvince(nextProvince);
    setDistrict('');
    setWard('');
    const matched = findProvinceOption(nextProvince);
    if (matched) {
      setLatitude(Number(matched.lat.toFixed(6)));
      setLongitude(Number(matched.lng.toFixed(6)));
      if (parseBoundaryCoordinates(boundaryCoordinates).length === 0) {
        setBoundaryCoordinates(stringifyBoundaryCoordinates(generateSampleFarmPolygon({ lat: matched.lat, lng: matched.lng })));
      }
    }
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setWard('');
    if (province && nextDistrict) {
      void geocodeAddress('', { province, district: nextDistrict }).then((geo) => {
        if (geo) {
          setLatitude(geo.lat);
          setLongitude(geo.lng);
          setBoundaryCoordinates(stringifyBoundaryCoordinates(generateSampleFarmPolygon({ lat: geo.lat, lng: geo.lng })));
        }
      });
    }
  };

  const handleWardChange = (nextWard: string) => {
    setWard(nextWard);
    if (province && district && nextWard) {
      void geocodeAddress('', { province, district, ward: nextWard }).then((geo) => {
        if (geo) {
          setLatitude(geo.lat);
          setLongitude(geo.lng);
          setBoundaryCoordinates(stringifyBoundaryCoordinates(generateSampleFarmPolygon({ lat: geo.lat, lng: geo.lng })));
        }
      });
    }
  };

  const boundaryPoints = useMemo(() => parseBoundaryCoordinates(boundaryCoordinates), [boundaryCoordinates]);
  const polygonAreaM2 = useMemo(() => calculatePolygonAreaM2(boundaryPoints), [boundaryPoints]);

  const filteredStaffCandidates = useMemo(() => {
    const kw = staffSearch.trim().toLowerCase();
    return activeUsers.filter((u) => {
      if (u.id === ownerId) return false;
      if (!kw) return true;
      return (u.name || '').toLowerCase().includes(kw) || (u.email || '').toLowerCase().includes(kw);
    });
  }, [activeUsers, ownerId, staffSearch]);

  const toggleStaff = (userId: string) => {
    setStaffIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!farmName.trim()) {
      setError(lang === 'en' ? 'Please enter a farm name.' : 'Vui lòng nhập tên trang trại.');
      return;
    }
    if (!address.trim()) {
      setError(lang === 'en' ? 'Please enter the farm address.' : 'Vui lòng nhập địa chỉ canh tác của trang trại.');
      return;
    }
    if (mode === 'create' && !ownerId) {
      setError(lang === 'en' ? 'Please select a farm owner.' : 'Vui lòng chọn chủ sở hữu cho trang trại.');
      return;
    }
    if (boundaryPoints.length > 0 && (boundaryPoints.length < 3 || polygonAreaM2 <= 0)) {
      setError(
        lang === 'en'
          ? 'Farm boundary polygon must have at least 3 valid points with area > 0 m².'
          : 'Ranh giới bản đồ phải có ít nhất 3 điểm hợp lệ và diện tích lớn hơn 0 m².',
      );
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let finalDocumentUrl = documentUrl;
      if (pendingFiles.length > 0) {
        const existingItems = parseEvidenceFiles(documentUrl);
        const uploadedItems: EvidenceFileItem[] = [];
        for (const file of pendingFiles) {
          const uploaded = await uploadFileToCloudinary(file, 'farms');
          uploadedItems.push({ url: uploaded.url, name: uploaded.originalFilename || file.name, size: file.size });
        }
        finalDocumentUrl = JSON.stringify([...existingItems, ...uploadedItems]);
      }

      const selectedOwner = activeUsers.find((u) => u.id === ownerId);
      await execute({
        type: 'save',
        collection: 'farms',
        id: record?.id,
        values: {
          name: farmName.trim(),
          address: address.trim(),
          province: province.trim(),
          district: district.trim(),
          ward: ward.trim(),
          description: description.trim(),
          status,
          latitude: latitude != null ? String(latitude) : '',
          longitude: longitude != null ? String(longitude) : '',
          boundaryCoordinates: boundaryCoordinates.trim(),
          document: finalDocumentUrl,
          ownerId: ownerId || '',
          ownerEmail: selectedOwner?.email || record?.ownerEmail || '',
          staffIds: JSON.stringify(staffIds),
        },
      });
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (lang === 'en' ? 'Unable to save farm.' : 'Không thể lưu thông tin trang trại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title={mode === 'create' ? (lang === 'en' ? 'Add New Farm' : 'Thêm trang trại mới') : (lang === 'en' ? 'Edit Farm' : 'Chỉnh sửa trang trại')}
      close={() => { if (!submitting) close(); }}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section 1: Basic Information */}
          <div className="admin-form-grid">
            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-name">
                  {lang === 'en' ? 'Farm Name' : 'Tên trang trại'} <b aria-hidden="true">*</b>
                </label>
                <span className="structured-field-badge">{farmName.length}/160 · {lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
              </div>
              <input
                id="admin-farm-name"
                className="ui-input"
                required
                maxLength={160}
                disabled={submitting}
                placeholder={lang === 'en' ? 'e.g. Da Lat High-Tech Farm' : 'VD: Trang trại Nông nghiệp Công nghệ cao Đà Lạt'}
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </div>

            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-status">
                  {lang === 'en' ? 'Farm Status' : 'Trạng thái trang trại'}
                </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Status' : 'Trạng thái'}</span>
              </div>
              <select
                id="admin-farm-status"
                className="ui-select"
                disabled={submitting}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">{lang === 'en' ? 'Active' : 'Đang hoạt động'}</option>
                <option value="INACTIVE">{lang === 'en' ? 'Inactive' : 'Tạm ngưng'}</option>
              </select>
            </div>
          </div>

          {/* Section 2: Owner & Staff Assignment */}
          <div className="admin-form-grid">
            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-owner">
                  {lang === 'en' ? 'Farm Owner' : 'Chủ sở hữu (Owner)'} <b aria-hidden="true">*</b>
                </label>
                <span className="structured-field-badge">{activeUsers.length} {lang === 'en' ? 'accounts' : 'tài khoản'}</span>
              </div>
              <select
                id="admin-farm-owner"
                className="ui-select"
                required={mode === 'create'}
                disabled={submitting}
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">{lang === 'en' ? '-- Select Farm Owner --' : '-- Chọn chủ sở hữu trang trại --'}</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
              <small className="admin-field-help">
                {lang === 'en'
                  ? 'Selected user will be assigned as Owner of this farm (system role automatically upgraded if needed).'
                  : 'Tài khoản được chọn sẽ trở thành Chủ trang trại (hệ thống tự nâng quyền Owner nếu đang là User/Staff).'}
              </small>
            </div>

            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-staff-search">
                  {lang === 'en' ? 'Technical Staff' : 'Nhân sự kỹ thuật (Staff)'}
                </label>
                <span className="structured-field-badge">
                  {staffIds.length} {lang === 'en' ? 'selected' : 'đã chọn'}
                </span>
              </div>
              <input
                id="admin-farm-staff-search"
                className="ui-input"
                type="search"
                disabled={submitting}
                placeholder={lang === 'en' ? 'Filter accounts by name or email...' : 'Tìm nhanh tài khoản theo tên hoặc email...'}
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <div
                style={{
                  maxHeight: '132px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  background: 'var(--color-surface)',
                }}
              >
                {filteredStaffCandidates.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: 'var(--color-muted)', padding: '4px' }}>
                    {lang === 'en' ? 'No matching active accounts.' : 'Không có tài khoản khả dụng phù hợp.'}
                  </span>
                ) : (
                  filteredStaffCandidates.map((u) => {
                    const checked = staffIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '3px 4px',
                          borderRadius: '6px',
                          background: checked ? 'var(--color-success-bg)' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={submitting}
                          onChange={() => toggleStaff(u.id)}
                        />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>{u.name}</strong> <span style={{ color: 'var(--color-muted)' }}>({u.email})</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Location (Province / District / Ward / Detailed Address) */}
          <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-province">
                  {lang === 'en' ? 'Province / City' : 'Tỉnh / Thành phố'}
                </label>
              </div>
              <select
                id="admin-farm-province"
                className="ui-select"
                disabled={submitting}
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
              >
                <option value="">{lang === 'en' ? '-- Select Province --' : '-- Chọn Tỉnh / TP --'}</option>
                {VIETNAM_PROVINCES.map((p) => (
                  <option key={p.code} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-district">
                  {lang === 'en' ? 'District' : 'Quận / Huyện'}
                </label>
              </div>
              <select
                id="admin-farm-district"
                className="ui-select"
                disabled={submitting || !province || loadingDistricts}
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                <option value="">
                  {loadingDistricts
                    ? (lang === 'en' ? 'Loading...' : 'Đang tải...')
                    : (lang === 'en' ? '-- Select District --' : '-- Chọn Quận / Huyện --')}
                </option>
                {districtOptions.map((d) => (
                  <option key={d.code} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="structured-field-card admin-field">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="admin-farm-ward">
                  {lang === 'en' ? 'Ward / Commune' : 'Phường / Xã'}
                </label>
              </div>
              <select
                id="admin-farm-ward"
                className="ui-select"
                disabled={submitting || !district || loadingWards}
                value={ward}
                onChange={(e) => handleWardChange(e.target.value)}
              >
                <option value="">
                  {loadingWards
                    ? (lang === 'en' ? 'Loading...' : 'Đang tải...')
                    : (lang === 'en' ? '-- Select Ward --' : '-- Chọn Phường / Xã --')}
                </option>
                {wardOptions.map((w) => (
                  <option key={w.code} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="structured-field-card admin-field full">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="admin-farm-address">
                {lang === 'en' ? 'Detailed Cultivation Address' : 'Địa chỉ canh tác chi tiết'} <b aria-hidden="true">*</b>
              </label>
              <span className="structured-field-badge">{address.length}/255 · {lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
            </div>
            <input
              id="admin-farm-address"
              className="ui-input"
              required
              maxLength={255}
              disabled={submitting}
              placeholder={lang === 'en' ? 'House number, street, hamlet...' : 'Số nhà, đường, thôn/ấp...'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Section 4: Interactive Map & Boundary */}
          <div className="structured-field-card admin-field full">
            <div className="structured-field-header">
              <span className="structured-field-label">
                {lang === 'en' ? 'Farm Location & Boundary Map' : 'Vị trí & Ranh giới trang trại trên bản đồ'}
              </span>
              <span className="structured-field-badge">
                {polygonAreaM2 > 0
                  ? `${Math.round(polygonAreaM2).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')} m² (${(polygonAreaM2 / 10000).toFixed(2)} ha)`
                  : (lang === 'en' ? 'Optional' : 'Tùy chọn')}
              </span>
            </div>
            <FarmGoongMap
              latitude={latitude}
              longitude={longitude}
              boundary={boundaryPoints}
              height={260}
              onLocationChange={(lat: number, lng: number) => {
                setLatitude(Number(lat.toFixed(6)));
                setLongitude(Number(lng.toFixed(6)));
              }}
              onBoundaryChange={(points: LatLngPoint[]) => {
                setBoundaryCoordinates(stringifyBoundaryCoordinates(points));
              }}
            />
          </div>

          {/* Section 5: Description & Documents */}
          <div className="structured-field-card admin-field full">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="admin-farm-desc">
                {lang === 'en' ? 'Farm Description' : 'Mô tả trang trại'}
              </label>
              <span className="structured-field-badge">{description.length}/1000</span>
            </div>
            <textarea
              id="admin-farm-desc"
              className="ui-textarea"
              rows={3}
              maxLength={1000}
              disabled={submitting}
              placeholder={lang === 'en' ? 'Crops grown, scale, VietGAP standards...' : 'Mô tả quy mô canh tác, cây trồng chủ lực, tiêu chuẩn VietGAP...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="structured-field-card admin-field full">
            <div className="structured-field-header">
              <span className="structured-field-label">
                {lang === 'en' ? 'Supporting Documents / Farm Images' : 'Tài liệu / Hình ảnh trang trại'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
            <FileUpload
              value={documentUrl}
              onChange={setDocumentUrl}
              folder="farms"
              deferred
              pendingFiles={pendingFiles}
              onPendingFilesChange={setPendingFiles}
              disabled={submitting}
            />
          </div>

          {error && <p role="alert" className="admin-form-error">{translateAdminError(error, lang)}</p>}
        </div>

        <div className="admin-modal-footer">
          <Button className="ui-cancel-button" variant="secondary" type="button" onClick={close} disabled={submitting}>
            {lang === 'en' ? 'Cancel' : 'Hủy'}
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {mode === 'create'
              ? (lang === 'en' ? 'Create Farm' : 'Tạo trang trại')
              : (lang === 'en' ? 'Save changes' : 'Lưu thay đổi')}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
