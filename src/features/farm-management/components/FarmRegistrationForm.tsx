import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ACCEPTED_EVIDENCE_EXTENSIONS,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_MB,
  hasFormErrors,
  validateFarmRegistrationForm,
} from '../validation';
import type { FarmRegistrationFormErrors, FarmRegistrationFormValues } from '../types';

const INITIAL_VALUES: FarmRegistrationFormValues = {
  proposedFarmName: '',
  address: '',
  contactPhone: '',
  description: '',
  evidenceFiles: [],
};

interface FarmRegistrationFormProps {
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: FarmRegistrationFormValues) => void;
}

type FieldName = keyof FarmRegistrationFormValues;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  function setEvidenceFiles(files: File[]) {
    const nextValues = { ...values, evidenceFiles: files };
    setValues(nextValues);
    setTouched((current) => ({ ...current, evidenceFiles: true }));
    setErrors(validateFarmRegistrationForm(nextValues));
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = event.target.files ? Array.from(event.target.files) : [];
    if (incoming.length > 0) {
      setEvidenceFiles([...values.evidenceFiles, ...incoming]);
    }
    // Reset để cho phép chọn lại đúng tệp vừa xoá nếu cần.
    event.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setEvidenceFiles(values.evidenceFiles.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFarmRegistrationForm(values);
    setErrors(nextErrors);
    setTouched({
      proposedFarmName: true,
      address: true,
      contactPhone: true,
      description: true,
      evidenceFiles: true,
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
          value={values.proposedFarmName}
          onChange={(event) => updateField('proposedFarmName', event.target.value)}
          onBlur={() => handleBlur('proposedFarmName')}
          placeholder="VD: Trang trại Xanh Cần Thơ"
        />
        {errors.proposedFarmName ? <small className="field-error">{errors.proposedFarmName}</small> : null}
      </label>

      <label className="form-field">
        <span>Địa chỉ *</span>
        <input
          type="text"
          value={values.address}
          onChange={(event) => updateField('address', event.target.value)}
          onBlur={() => handleBlur('address')}
          placeholder="Số nhà, đường, xã/phường, quận/huyện, tỉnh/thành"
        />
        {errors.address ? <small className="field-error">{errors.address}</small> : null}
      </label>

      <label className="form-field">
        <span>Số điện thoại liên hệ *</span>
        <input
          type="tel"
          value={values.contactPhone}
          onChange={(event) => updateField('contactPhone', event.target.value)}
          onBlur={() => handleBlur('contactPhone')}
          placeholder="0912345678"
        />
        {errors.contactPhone ? <small className="field-error">{errors.contactPhone}</small> : null}
      </label>

      <label className="form-field">
        <span>Mô tả trang trại</span>
        <textarea
          rows={4}
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Quy mô, loại cây trồng dự kiến, hiện trạng đất đai..."
        />
        {errors.description ? <small className="field-error">{errors.description}</small> : null}
      </label>

      <div className="form-field">
        <span>Tài liệu minh chứng *</span>

        <div className="file-dropzone">
          <input
            id="evidence-files-input"
            type="file"
            multiple
            accept={ACCEPTED_EVIDENCE_EXTENSIONS.join(',')}
            onChange={handleFileInputChange}
            className="file-input-hidden"
          />
          <label htmlFor="evidence-files-input" className="file-dropzone-label">
            <span>📎 Chọn ảnh, PDF hoặc tệp .zip</span>
            <span className="file-dropzone-hint">
              Tối đa {MAX_EVIDENCE_FILES} tệp, mỗi tệp ≤ {MAX_EVIDENCE_FILE_SIZE_MB}MB ({ACCEPTED_EVIDENCE_EXTENSIONS.join(', ')})
            </span>
          </label>
        </div>

        {values.evidenceFiles.length > 0 ? (
          <ul className="file-list">
            {values.evidenceFiles.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="file-list-item">
                <span className="file-list-name">📄 {file.name}</span>
                <span className="file-list-size">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={() => handleRemoveFile(index)}
                  aria-label={`Xoá tệp ${file.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {errors.evidenceFiles ? (
          <small className="field-error">{errors.evidenceFiles}</small>
        ) : (
          <small className="field-hint">
            Giấy chứng nhận quyền sử dụng đất, hình ảnh trang trại, hoặc tệp .zip chứa nhiều tài liệu.
          </small>
        )}
      </div>

      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? 'Đang gửi đăng ký...' : 'Gửi đăng ký'}
      </button>
    </form>
  );
}