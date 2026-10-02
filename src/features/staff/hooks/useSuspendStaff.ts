import { useState } from 'react';
import { suspendStaff } from '../staffService';
import type { StaffMember } from '../types';

/** Quản lý trạng thái hộp thoại xác nhận + gọi API vô hiệu hoá một nhân viên. */
export function useSuspendStaff(onSuspended: (staff: StaffMember) => void) {
  const [target, setTarget] = useState<StaffMember | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestSuspend(staff: StaffMember) {
    setError(null);
    setTarget(staff);
  }

  function cancelSuspend() {
    setTarget(null);
    setError(null);
  }

  async function confirmSuspend() {
    if (!target) return;
    setSuspending(true);
    setError(null);
    try {
      const updated = await suspendStaff(target.farmMemberId);
      onSuspended(updated);
      setTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vô hiệu hoá nhân viên thất bại. Vui lòng thử lại.');
    } finally {
      setSuspending(false);
    }
  }

  return { target, requestSuspend, cancelSuspend, confirmSuspend, suspending, error };
}
