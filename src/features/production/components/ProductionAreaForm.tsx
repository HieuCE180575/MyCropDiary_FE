import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { hasProductionAreaFormErrors, validateProductionAreaForm } from '../validation';
import type { ProductionAreaFormErrors, ProductionAreaFormValues } from '../types';

const EMPTY_VALUES: ProductionAreaFormValues = {
  areaName: '',
  areaHectares: '',
  locationDescription: '',
};

interface ProductionAreaFormProps {
  title: string;
  breadcrumbLabel: string;
  initialValues?: ProductionAreaFormValues;
  submitting: boolean;
  submitError: string | null;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (values: ProductionAreaFormValues) => void;
}

type FieldName = keyof ProductionAreaFormValues;

export function ProductionAreaForm({
  title,
  breadcrumbLabel,
  initialValues,
  submitting,
  submitError,
  submitLabel,
  cancelHref,
  onSubmit,
}: ProductionAreaFormProps) {
  const [values, setValues] = useState<ProductionAreaFormValues>(initialValues ?? EMPTY_VALUES);
  const [errors, setErrors] = useState<ProductionAreaFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  function updateField<K extends FieldName>(field: K, value: ProductionAreaFormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (touched[field]) {
      setErrors(validateProductionAreaForm(nextValues));
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateProductionAreaForm(values));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProductionAreaForm(values);
    setErrors(nextErrors);
    setTouched({ areaName: true, areaHectares: true, locationDescription: true });
    if (hasProductionAreaFormErrors(nextErrors)) return;
    onSubmit(values);
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/production-zones">Khu sản xuất</Link>
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
            <span>Tên khu sản xuất *</span>
            <input
              type="text"
              value={values.areaName}
              onChange={(event) => updateField('areaName', event.target.value)}
              onBlur={() => handleBlur('areaName')}
              placeholder="VD: Khu sản xuất rau an toàn"
            />
            {errors.areaName ? <small className="field-error">{errors.areaName}</small> : null}
          </label>

          <label className="form-field">
            <span>Diện tích (ha) *</span>
            <input
              type="text"
              inputMode="decimal"
              value={values.areaHectares}
              onChange={(event) => updateField('areaHectares', event.target.value)}
              onBlur={() => handleBlur('areaHectares')}
              placeholder="VD: 5.5"
            />
            {errors.areaHectares ? <small className="field-error">{errors.areaHectares}</small> : null}
          </label>
        </div>

        <label className="form-field">
          <span>Vị trí / Mô tả</span>
          <textarea
            rows={3}
            value={values.locationDescription}
            onChange={(event) => updateField('locationDescription', event.target.value)}
            onBlur={() => handleBlur('locationDescription')}
            placeholder="Vị trí, ranh giới hoặc đặc điểm của khu sản xuất (không bắt buộc)"
          />
          {errors.locationDescription ? <small className="field-error">{errors.locationDescription}</small> : null}
        </label>

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