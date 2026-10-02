import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { hasStaffFormErrors, validateStaffForm } from '../validation';
import type { StaffFormErrors, StaffFormValues, StaffMember } from '../types';

const EMPTY_VALUES: StaffFormValues = { fullName: '', email: '', phoneNumber: '' };

interface StaffFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialStaff: StaffMember | null;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: StaffFormValues) => void;
  onClose: () => void;
}

type FieldName = keyof StaffFormValues;

function staffToFormValues(staff: StaffMember): StaffFormValues {
  return { fullName: staff.fullName, email: staff.email, phoneNumber: staff.phoneNumber ?? '' };
}

export function StaffFormModal({
  open,
  mode,
  initialStaff,
  submitting,
  submitError,
  onSubmit,
  onClose,
}: StaffFormModalProps) {
  const [values, setValues] = useState<StaffFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  // Nạp lại giá trị mỗi khi modal được mở — cho nhân viên đang sửa, hoặc rỗng khi thêm mới.
  useEffect(() => {
    if (!open) return;
    setValues(initialStaff ? staffToFormValues(initialStaff) : EMPTY_VALUES);
    setErrors({});
    setTouched({});
  }, [open, initialStaff]);

  function updateField<K extends FieldName>(field: K, value: StaffFormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (touched[field]) {
      setErrors(validateStaffForm(nextValues));
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateStaffForm(values));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateStaffForm(values);
    setErrors(nextErrors);
    setTouched({ fullName: true, email: true, phoneNumber: true });
    if (hasStaffFormErrors(nextErrors)) return;
    onSubmit(values);
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}>
      <form className="staff-form" onSubmit={handleSubmit} noValidate>
        {submitError ? <p className="form-error-banner">{submitError}</p> : null}

        <label className="form-field">
          <span>Họ tên *</span>
          <input
            type="text"
            value={values.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            onBlur={() => handleBlur('fullName')}
            placeholder="VD: Nguyễn Văn An"
          />
          {errors.fullName ? <small className="field-error">{errors.fullName}</small> : null}
        </label>

        <label className="form-field">
          <span>Email *</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="nhanvien@email.com"
          />
          {errors.email ? (
            <small className="field-error">{errors.email}</small>
          ) : (
            <small className="field-hint">
              Nếu email đã có tài khoản MyCropDiary, nhân viên sẽ được thêm ngay vào trang trại.
            </small>
          )}
        </label>

        <label className="form-field">
          <span>Số điện thoại</span>
          <input
            type="tel"
            value={values.phoneNumber}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            onBlur={() => handleBlur('phoneNumber')}
            placeholder="0912345678"
          />
          {errors.phoneNumber ? <small className="field-error">{errors.phoneNumber}</small> : null}
        </label>

        <div className="confirm-dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>
            Huỷ
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
