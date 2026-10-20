import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  hasFormErrors,
  validateFarmRegistrationForm,
} from '../validation';
import type { FarmRegistrationFormErrors, FarmRegistrationFormValues } from '../types';

const INITIAL_VALUES: FarmRegistrationFormValues = {
  proposedFarmName: '',
  address: '',
  province: '',
  district: '',
  ward: '',
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
  const [values, setValues] = useState<FarmRegistrationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FarmRegistrationFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  function updateField<K extends FieldName>(field: K, value: FarmRegistrationFormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (touched[field]) {
      setErrors(validateFarmRegistrationForm(nextValues));
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateFarmRegistrationForm(values));
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

  return (
    <form className="panel farm-registration-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-title">
        <div>
          <h2>Thông tin đăng ký trang trại</h2>
        </div>
      </div>

      {submitError ? <p className="form-error-banner">{submitError}</p> : null}

      <label className="form-field">
        <span>Tên trang trại dự kiến *</span>
        <input
          type="text"
          maxLength={160}
          value={values.proposedFarmName}
          onChange={(event) => updateField('proposedFarmName', event.target.value)}
          onBlur={() => handleBlur('proposedFarmName')}
          placeholder="VD: Trang trại Xanh Cần Thơ"
        />
        {errors.proposedFarmName ? <small className="field-error">{errors.proposedFarmName}</small> : null}
      </label>

      <label className="form-field">
        <span>Địa chỉ chi tiết *</span>
        <input
          type="text"
          value={values.address}
          maxLength={300}
          onChange={(event) => updateField('address', event.target.value)}
          onBlur={() => handleBlur('address')}
          placeholder="Số nhà, tên đường, thôn/ấp..."
        />
        {errors.address ? <small className="field-error">{errors.address}</small> : null}
      </label>

      <div className="farm-registration-location-fields">
        {([
          ['province', 'Tỉnh / thành phố'],
          ['district', 'Quận / huyện'],
          ['ward', 'Phường / xã'],
        ] as const).map(([field, label]) => (
          <label className="form-field" key={field}>
            <span>{label}</span>
            <input type="text" value={values[field] ?? ''} maxLength={100}
              onChange={(event) => updateField(field, event.target.value)} onBlur={() => handleBlur(field)}
              placeholder={`Nhập ${label.toLocaleLowerCase('vi-VN')}`} />
            {errors[field] && <small className="field-error">{errors[field]}</small>}
          </label>
        ))}
      </div>

      <label className="form-field">
        <span>Mô tả trang trại</span>
        <textarea
          rows={4}
          maxLength={1000}
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Quy mô, loại cây trồng dự kiến, hiện trạng đất đai..."
        />
        {errors.description ? <small className="field-error">{errors.description}</small> : null}
      </label>

      <label className="form-field">
        <span>Đường dẫn tài liệu minh chứng</span>
        <input type="url" value={values.documentUrl ?? ''} maxLength={1000}
          onChange={(event) => updateField('documentUrl', event.target.value)} onBlur={() => handleBlur('documentUrl')}
          placeholder="https://..." />
        {errors.documentUrl ? <small className="field-error">{errors.documentUrl}</small> :
          <small className="field-hint">Link giấy chứng nhận hoặc tài liệu trang trại. Hãy bảo đảm quản trị viên có quyền xem.</small>}
      </label>

      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? 'Đang gửi đăng ký...' : 'Gửi đăng ký'}
      </button>
    </form>
  );
}
