import { Icon } from '../../shared/components/Icon';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAuth } from '../auth';
import { createAdminDemo } from './adminDemo';
import { applyAdminCommand } from './adminModel';
import type { AdminCommand, AdminState } from './adminTypes';

interface AdminContextValue { state: AdminState; execute: (command: AdminCommand) => void; notice: string; dismissNotice: () => void }
const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState(createAdminDemo);
  const [notice, setNotice] = useState('');
  const execute = (command: AdminCommand) => {
    if (user?.systemRole !== 'ADMIN') throw new Error('Bạn không có quyền thực hiện thao tác quản trị.');
    const next = applyAdminCommand(state, command, { id: crypto.randomUUID(), actor: user.fullName || 'Quản trị viên', now: new Date().toISOString() });
    setState(next);
    setNotice('Đã cập nhật dữ liệu minh họa. Thao tác này không thay đổi dữ liệu thật.');
  };
  return <AdminContext.Provider value={{ state, execute, notice, dismissNotice: () => setNotice('') }}>{children}</AdminContext.Provider>;
}
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('Không tìm thấy không gian quản trị.');
  return value;
}

export function AdminNotice() {
  const { notice, dismissNotice } = useAdmin();
  return <>
    {notice && <div className="admin-toast" role="status"><span>{notice}</span><button type="button" onClick={dismissNotice} aria-label="Đóng thông báo"><Icon name="close" /></button></div>}
  </>;
}
