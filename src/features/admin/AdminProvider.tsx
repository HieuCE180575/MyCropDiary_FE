import { Icon } from '../../shared/components/Icon';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAdminRegistrations, handleFarmRegistration, type RegistrationResponse } from '../farm-management/registrationService';
import { useAuth } from '../auth';
import { createAdminDemo } from './adminDemo';
import { applyAdminCommand } from './adminModel';
import type { AdminCommand, AdminState, AdminRecord } from './adminTypes';

interface AdminContextValue { state: AdminState; execute: (command: AdminCommand) => Promise<void>; notice: string; noticeId: number; dismissNotice: () => void; registrationsLoading: boolean; registrationsError: string; reloadRegistrations: () => void }
const AdminContext = createContext<AdminContextValue | null>(null);

function toRecord(data: RegistrationResponse): AdminRecord {
  return { id: String(data.registrationId), name: data.farmName, status: data.status.toUpperCase(), createdAt: data.submittedAt,
    applicant: data.applicantFullName ?? '', email: data.applicantEmail ?? '', address: data.addressLine,
    province: data.province ?? '', description: data.description ?? '', document: data.documentUrl ?? '',
    district: data.district ?? '', ward: data.ward ?? '',
    reviewer: data.handlerFullName ?? '', reviewedAt: data.handledAt ?? '',
    reason: data.status.toUpperCase() === 'REJECTED' ? data.rejectionReason ?? '' : '' };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>(() => ({ ...createAdminDemo(), registrations: [] }));
  const [notice, setNotice] = useState('');
  const [noticeId, setNoticeId] = useState(0);
  const showNotice = (message: string) => {
    setNotice(message);
    setNoticeId(value => value + 1);
  };
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice, noticeId]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [registrationsError, setRegistrationsError] = useState('');
  const [revision, setRevision] = useState(0);
  const reloadRegistrations = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setRegistrationsLoading(true);
    setRegistrationsError('');
    setState(previous => ({ ...previous, registrations: [] }));
    getAdminRegistrations(controller.signal).then(records => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, registrations: records.map(toRecord) }));
    }).catch(error => {
      if (!controller.signal.aborted) setRegistrationsError(error instanceof Error ? error.message : 'Không tải được hồ sơ.');
    }).finally(() => { if (!controller.signal.aborted) setRegistrationsLoading(false); });
    return () => controller.abort();
  }, [user?.userId, revision]);
  const execute = async (command: AdminCommand) => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN') throw new Error('Bạn không có quyền thực hiện thao tác quản trị.');
    if (command.type === 'review') {
      const updated = toRecord(await handleFarmRegistration(command.id, command.status, command.reason));
      setState(previous => ({ ...previous, registrations: previous.registrations.map(record => record.id === updated.id ? updated : record) }));
      showNotice(command.status === 'APPROVED' ? 'Đã duyệt hồ sơ và tạo trang trại.' : 'Đã từ chối hồ sơ.');
      return;
    }
    const next = applyAdminCommand(state, command, { id: crypto.randomUUID(), actor: user.fullName || 'Quản trị viên', now: new Date().toISOString() });
    setState(next);
    showNotice('Đã cập nhật dữ liệu minh họa. Thao tác này không thay đổi dữ liệu thật.');
  };
  return <AdminContext.Provider value={{ state, execute, notice, noticeId, dismissNotice: () => setNotice(''), registrationsLoading, registrationsError, reloadRegistrations }}>{children}</AdminContext.Provider>;
}
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('Không tìm thấy không gian quản trị.');
  return value;
}

export function AdminNotice() {
  const { notice, noticeId, dismissNotice } = useAdmin();
  return <>
    {notice && <div key={noticeId} className="admin-toast" role="status"><span>{notice}</span><button type="button" onClick={dismissNotice} aria-label="Đóng thông báo"><Icon name="close" /></button></div>}
  </>;
}
