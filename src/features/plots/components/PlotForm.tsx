import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ACCEPTED_PLOT_IMAGE_EXTENSIONS,
  MAX_PLOT_COVER_IMAGE_SIZE_MB,
  PLOT_AREA_UNIT_OPTIONS,
  PLOT_FORM_STATUS_OPTIONS,
} from '../constants';
import { hasPlotFormErrors, validatePlotForm } from '../validation';
import type { PlotFormErrors, PlotFormValues } from '../types';
import { ImagePlus } from 'lucide-react';

const EMPTY_VALUES: PlotFormValues = {
  plotName: '',
  areaValue: '',
  areaUnit: 'ha',
  locationDescription: '',
  soilType: '',
  status: 'active',
  notes: '',
  coverImage: null,
};

interface PlotFormProps {
  title: string;
  breadcrumbLabel: string;
  initialValues?: PlotFormValues;
  initialCoverImageUrl?: string;
  submitting: boolean;
  submitError: string | null;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (values: PlotFormValues) => void;
}

type FieldName = keyof PlotFormValues;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PlotForm({
  title,
  breadcrumbLabel,
  initialValues,
  initialCoverImageUrl,
  submitting,
  submitError,
  submitLabel,
  cancelHref,
  onSubmit,
}: PlotFormProps) {
  const [values, setValues] = useState<PlotFormValues>(initialValues ?? EMPTY_VALUES);
  const [errors, setErrors] = useState<PlotFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialCoverImageUrl);

  // Tạo/giải phóng URL xem trước khi người dùng chọn ảnh mới, tránh rò rỉ bộ nhớ.
  useEffect(() => {
    if (!values.coverImage) {
      setPreviewUrl(initialCoverImageUrl);
      return;
    }
    const objectUrl = URL.createObjectURL(values.coverImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [values.coverImage, initialCoverImageUrl]);

  function updateField<K extends FieldName>(field: K, value: PlotFormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (touched[field]) {
      setErrors(validatePlotForm(nextValues));
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validatePlotForm(values));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const nextValues = { ...values, coverImage: file };
    setValues(nextValues);
    setTouched((current) => ({ ...current, coverImage: true }));
    setErrors(validatePlotForm(nextValues));
    event.target.value = '';
  }

  function handleRemoveImage() {
    updateField('coverImage', null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePlotForm(values);
    setErrors(nextErrors);
    setTouched({
      plotName: true,
      areaValue: true,
      areaUnit: true,
      locationDescription: true,
      soilType: true,
      status: true,
      notes: true,
      coverImage: true,
    });
    if (hasPlotFormErrors(nextErrors)) return;
    onSubmit(values);
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/land-plots">Lô đất</Link>
        <span>›</span>
        <span>{breadcrumbLabel}</span>
      </nav>

      <form className="panel plot-form" onSubmit={handleSubmit} noValidate>
        <div className="panel-title">
          <div>
            <h2>{title}</h2>
          </div>
        </div>

        {submitError ? <p className="form-error-banner">{submitError}</p> : null}

        <div className="plot-form-grid">
          <label className="form-field">
            <span>Tên lô đất *</span>
            <input
              type="text"
              value={values.plotName}
              onChange={(event) => updateField('plotName', event.target.value)}
              onBlur={() => handleBlur('plotName')}
              placeholder="VD: Khu Bắc"
            />
            {errors.plotName ? <small className="field-error">{errors.plotName}</small> : null}
          </label>

          <label className="form-field">
            <span>Diện tích *</span>
            <div className="input-with-unit">
              <input
                type="text"
                inputMode="decimal"
                value={values.areaValue}
                onChange={(event) => updateField('areaValue', event.target.value)}
                onBlur={() => handleBlur('areaValue')}
                placeholder="VD: 1.25"
              />
              <select
                value={values.areaUnit}
                onChange={(event) => updateField('areaUnit', event.target.value as PlotFormValues['areaUnit'])}
              >
                {PLOT_AREA_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.areaValue ? <small className="field-error">{errors.areaValue}</small> : null}
          </label>
        </div>

        <label className="form-field">
          <span>Vị trí / Địa chỉ *</span>
          <input
            type="text"
            value={values.locationDescription}
            onChange={(event) => updateField('locationDescription', event.target.value)}
            onBlur={() => handleBlur('locationDescription')}
            placeholder="Nhập vị trí hoặc địa chỉ của lô đất"
          />
          {errors.locationDescription ? <small className="field-error">{errors.locationDescription}</small> : null}
        </label>

        <div className="plot-form-grid">
          <label className="form-field">
            <span>Loại đất</span>
            <input
              type="text"
              value={values.soilType}
              onChange={(event) => updateField('soilType', event.target.value)}
              onBlur={() => handleBlur('soilType')}
              placeholder="VD: Đất phù sa"
            />
            {errors.soilType ? <small className="field-error">{errors.soilType}</small> : null}
          </label>

          <label className="form-field">
            <span>Trạng thái sử dụng *</span>
            <select
              value={values.status}
              onChange={(event) => updateField('status', event.target.value as PlotFormValues['status'])}
              onBlur={() => handleBlur('status')}
            >
              {PLOT_FORM_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>Ghi chú</span>
          <textarea
            rows={3}
            value={values.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            onBlur={() => handleBlur('notes')}
            placeholder="Ghi chú thêm (không bắt buộc)"
          />
          {errors.notes ? <small className="field-error">{errors.notes}</small> : null}
        </label>

        <div className="form-field">
          <span>Ảnh minh hoạ (không bắt buộc)</span>
          <div className="file-dropzone">
            <input
              id="plot-cover-image-input"
              type="file"
              accept={ACCEPTED_PLOT_IMAGE_EXTENSIONS.join(',')}
              onChange={handleImageChange}
              className="file-input-hidden"
            />
            <label htmlFor="plot-cover-image-input" className="file-dropzone-label">
              <span><ImagePlus size={16} strokeWidth={1.5} style={{ marginBottom: "-3px" }} /> Chọn ảnh lô đất</span>
              <span className="file-dropzone-hint">
                Tối đa {MAX_PLOT_COVER_IMAGE_SIZE_MB}MB ({ACCEPTED_PLOT_IMAGE_EXTENSIONS.join(', ')})
              </span>
            </label>
          </div>

          {previewUrl ? (
            <div className="plot-image-preview">
              <img src={previewUrl} alt="Xem trước ảnh lô đất" />
              {values.coverImage ? (
                <span className="file-list-item plot-image-preview-meta">
                  <span className="file-list-name">📄 {values.coverImage.name}</span>
                  <span className="file-list-size">{formatFileSize(values.coverImage.size)}</span>
                  <button type="button" className="file-remove-btn" onClick={handleRemoveImage} aria-label="Xoá ảnh đã chọn">
                    ✕
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}

          {errors.coverImage ? <small className="field-error">{errors.coverImage}</small> : null}
        </div>

        <div className="form-actions">
          <Link to={cancelHref} className="ghost-button">
            Huỷ
          </Link>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Đang lưu...' : submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
