import { Icon } from '../../shared/components/Icon';
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { getAdminRegistrations, getAdminRegistrationById, handleFarmRegistration, type RegistrationResponse } from '../farm-management/registrationService';
import { getAdminUsers, getAdminUserById, updateAdminUserStatus, type AdminUserResponse } from './adminUserService';
import { useAuth } from '../auth';
import { createAdminDemo } from './adminDemo';
import { applyAdminCommand } from './adminModel';
import type { AdminCommand, AdminState, AdminRecord } from './adminTypes';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

interface AdminContextValue {
  state: AdminState;
  execute: (command: AdminCommand) => Promise<void>;
  loadDetail: (collection: 'users' | 'registrations', id: string, signal: AbortSignal) => Promise<AdminRecord>;
  notice: string;
  noticeId: number;
  dismissNotice: () => void;
  registrationsLoading: boolean;
  registrationsError: string;
  reloadRegistrations: () => void;
  usersLoading: boolean;
  usersError: string;
  reloadUsers: () => void;
}
const AdminContext = createContext<AdminContextValue | null>(null);

function toRecord(data: RegistrationResponse): AdminRecord {
  return { id: String(data.registrationId), name: data.farmName, status: data.status.toUpperCase(), createdAt: data.submittedAt,
    applicant: data.applicantFullName ?? '', email: data.applicantEmail ?? '', address: data.addressLine,
    province: data.province ?? '', description: data.description ?? '', document: data.documentUrl ?? '',
    district: data.district ?? '', ward: data.ward ?? '',
    latitude: data.latitude != null ? String(data.latitude) : '',
    longitude: data.longitude != null ? String(data.longitude) : '',
    boundaryCoordinates: data.boundaryCoordinates ?? '',
    reviewer: data.handlerFullName ?? '', reviewedAt: data.handledAt ?? '',
    reason: data.status.toUpperCase() === 'REJECTED' ? data.rejectionReason ?? '' : '' };
}

function userToRecord(data: AdminUserResponse): AdminRecord {
  return {
    id: String(data.userId),
    name: data.fullName,
    email: data.email,
    phone: data.phone ?? '',
    role: data.systemRole.toUpperCase(),
    status: data.accountStatus.toUpperCase(),
    createdAt: data.createdAt,
    verified: data.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực',
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>(() => ({ ...createAdminDemo(), registrations: [], users: [] }));
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
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [revision, setRevision] = useState(0);
  const silentAbortRef = useRef<AbortController | null>(null);

  const reloadRegistrations = useCallback(() => setRevision(value => value + 1), []);
  const reloadUsers = useCallback(() => setRevision(value => value + 1), []);

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

  useEffect(() => {
    const controller = new AbortController();
    setUsersLoading(true);
    setUsersError('');
    setState(previous => ({ ...previous, users: [] }));
    getAdminUsers(controller.signal).then(records => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, users: records.map(userToRecord) }));
    }).catch(error => {
      if (!controller.signal.aborted) setUsersError(error instanceof Error ? error.message : 'Không tải được danh sách tài khoản.');
    }).finally(() => { if (!controller.signal.aborted) setUsersLoading(false); });
    return () => {
      controller.abort();
      silentAbortRef.current?.abort();
    };
  }, [user?.userId, revision]);

  // Silent background realtime sync for Admin (no loading spinner, no table wipe)
  useRealtimeSync(() => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN') return;
    silentAbortRef.current?.abort();
    const controller = new AbortController();
    silentAbortRef.current = controller;

    getAdminRegistrations(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({ ...previous, registrations: records.map(toRecord) }));
          setRegistrationsError('');
        }
      })
      .catch(() => {});

    getAdminUsers(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({ ...previous, users: records.map(userToRecord) }));
          setUsersError('');
        }
      })
      .catch(() => {});
  });

  const loadDetail = useCallback(async (collection: 'users' | 'registrations', id: string, signal: AbortSignal) => {
    const record = collection === 'users'
      ? userToRecord(await getAdminUserById(id, signal))
      : toRecord(await getAdminRegistrationById(id, signal));
    if (!signal.aborted) setState(previous => ({
      ...previous, [collection]: previous[collection].map(item => item.id === id ? record : item),
    }));
    return record;
  }, []);

  const execute = async (command: AdminCommand) => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN') throw new Error('Bạn không có quyền thực hiện thao tác quản trị.');
    if (command.type === 'review') {
      const updated = toRecord(await handleFarmRegistration(command.id, command.status, command.reason));
      setState(previous => ({ ...previous, registrations: previous.registrations.map(record => record.id === updated.id ? updated : record) }));
      showNotice(command.status === 'APPROVED' ? 'Đã duyệt hồ sơ và tạo trang trại.' : 'Đã từ chối hồ sơ.');
      return;
    }
    if (command.type === 'status' && command.collection === 'users') {
      const updated = userToRecord(await updateAdminUserStatus(command.id, command.status));
      setState(previous => ({
        ...previous,
        users: previous.users.map(record => record.id === updated.id ? updated : record),
      }));
      showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt tài khoản thành công.' : 'Đã khóa tài khoản thành công.');
      return;
    }
    const next = applyAdminCommand(state, command, { id: crypto.randomUUID(), actor: user.fullName || 'Quản trị viên', now: new Date().toISOString() });
    setState(next);
    showNotice('Đã cập nhật dữ liệu minh họa. Thao tác này không thay đổi dữ liệu thật.');
  };
  return (
    <AdminContext.Provider
      value={{
        state,
        execute,
        loadDetail,
        notice,
        noticeId,
        dismissNotice: () => setNotice(''),
        registrationsLoading,
        registrationsError,
        reloadRegistrations,
        usersLoading,
        usersError,
        reloadUsers,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
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
