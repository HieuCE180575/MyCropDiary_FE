import { Icon } from '../../shared/components/Icon';
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { getAdminRegistrations, getAdminRegistrationById, handleFarmRegistration, type RegistrationResponse } from '../farm-management/registrationService';
import { getAdminUsers, getAdminUserById, updateAdminUserStatus, type AdminUserResponse } from './adminUserService';
import {
  fetchAdminAIFeedbacks,
  replyAdminAIFeedback,
  updateAdminAIFeedbackStatus,
  fetchAdminCropCategories,
  fetchAdminChecklistRules,
  fetchAdminArticles,
  type AdminAIFeedbackItem,
  type AdminCropCategoryItem,
  type AdminChecklistRuleItem,
  type AdminArticleItem,
} from './adminService';
import { useAuth } from '../auth';
import { createAdminDemo } from './adminDemo';
import { applyAdminCommand } from './adminModel';
import type { AdminCommand, AdminState, AdminRecord } from './adminTypes';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

interface AdminContextValue {
  state: AdminState;
  execute: (command: AdminCommand) => Promise<void>;
  loadDetail: (collection: 'users' | 'registrations' | 'feedback', id: string, signal: AbortSignal) => Promise<AdminRecord>;
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
  return {
    id: String(data.registrationId),
    name: data.farmName,
    status: data.status.toUpperCase(),
    createdAt: data.submittedAt || new Date().toISOString(),
    applicant: data.applicantFullName ?? '',
    email: data.applicantEmail ?? '',
    address: data.addressLine,
    province: data.province ?? '',
    description: data.description ?? '',
    document: data.documentUrl ?? '',
    district: data.district ?? '',
    ward: data.ward ?? '',
    latitude: data.latitude != null ? String(data.latitude) : '',
    longitude: data.longitude != null ? String(data.longitude) : '',
    boundaryCoordinates: data.boundaryCoordinates ?? '',
    reviewer: data.handlerFullName ?? '',
    reviewedAt: data.handledAt ?? '',
    reason: data.status.toUpperCase() === 'REJECTED' ? data.rejectionReason ?? '' : '',
  };
}

function userToRecord(data: AdminUserResponse): AdminRecord {
  return {
    id: String(data.userId),
    name: data.fullName,
    email: data.email,
    phone: data.phone ?? '',
    role: data.systemRole.toUpperCase(),
    status: data.accountStatus.toUpperCase(),
    createdAt: data.createdAt || new Date().toISOString(),
    verified: data.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực',
  };
}

function feedbackToRecord(item: AdminAIFeedbackItem): AdminRecord {
  const lastReply = item.replies && item.replies.length > 0 ? item.replies[item.replies.length - 1].replyText : '';
  return {
    id: String(item.feedbackId),
    name: item.feedbackText || 'Phản hồi tư vấn AI',
    status: item.status.toUpperCase(),
    createdAt: item.createdAt || new Date().toISOString(),
    sender: item.senderName,
    rating: item.rating ? `${item.rating} sao` : '3 sao',
    question: item.userQuestion || 'Câu hỏi tư vấn nông nghiệp',
    answer: item.messageText || '',
    source: 'TCVN 11892-1:2017 (VietGAP)',
    comment: item.feedbackText,
    reply: lastReply,
  };
}

function cropToRecord(item: AdminCropCategoryItem): AdminRecord {
  return {
    id: String(item.id),
    name: item.categoryName,
    code: `CROP-${item.id}`,
    group: 'FRUIT',
    description: item.description || '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ruleToRecord(item: AdminChecklistRuleItem): AdminRecord {
  return {
    id: String(item.ruleId),
    name: item.ruleName,
    field: 'ACTIVITY_DATE',
    activity: item.category || 'ALL',
    group: 'ALL',
    requirement: 'REQUIRED',
    guidance: item.description || '',
    status: item.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function articleToRecord(item: AdminArticleItem): AdminRecord {
  return {
    id: String(item.id),
    name: item.title,
    category: item.category || 'VIETGAP',
    author: item.authorName || 'Quản trị viên',
    source: 'TCVN 11892-1:2017',
    content: item.content || item.summary || '',
    status: item.status.toUpperCase(),
    createdAt: item.publishedAt || new Date().toISOString(),
    updatedAt: item.publishedAt || new Date().toISOString(),
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>(() => ({ ...createAdminDemo(), registrations: [], users: [] }));
  const [notice, setNotice] = useState('');
  const [noticeId, setNoticeId] = useState(0);

  const showNotice = (message: string) => {
    setNotice(message);
    setNoticeId((value) => value + 1);
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

  const reloadRegistrations = useCallback(() => setRevision((value) => value + 1), []);
  const reloadUsers = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setRegistrationsLoading(true);
    setRegistrationsError('');
    setState((previous) => ({ ...previous, registrations: [] }));
    getAdminRegistrations(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, registrations: records.map(toRecord) }));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setRegistrationsError(error instanceof Error ? error.message : 'Không tải được hồ sơ.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegistrationsLoading(false);
      });
    return () => controller.abort();
  }, [user?.userId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setUsersLoading(true);
    setUsersError('');
    setState((previous) => ({ ...previous, users: [] }));
    getAdminUsers(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, users: records.map(userToRecord) }));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setUsersError(error instanceof Error ? error.message : 'Không tải được danh sách tài khoản.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setUsersLoading(false);
      });
    return () => {
      controller.abort();
      silentAbortRef.current?.abort();
    };
  }, [user?.userId, revision]);

  // Load Crops, Rules, Articles, Feedback from Backend
  useEffect(() => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN') return;
    const controller = new AbortController();

    // Feedback
    fetchAdminAIFeedbacks(undefined, controller.signal)
      .then((feedbacks) => {
        if (!controller.signal.aborted && feedbacks && feedbacks.length > 0) {
          setState((prev) => ({ ...prev, feedback: feedbacks.map(feedbackToRecord) }));
        }
      })
      .catch(() => {});

    // Crop categories
    fetchAdminCropCategories(controller.signal)
      .then((crops) => {
        if (!controller.signal.aborted && crops && crops.length > 0) {
          setState((prev) => ({ ...prev, crops: crops.map(cropToRecord) }));
        }
      })
      .catch(() => {});

    // Checklist rules
    fetchAdminChecklistRules(controller.signal)
      .then((rules) => {
        if (!controller.signal.aborted && rules && rules.length > 0) {
          setState((prev) => ({ ...prev, rules: rules.map(ruleToRecord) }));
        }
      })
      .catch(() => {});

    // Articles
    fetchAdminArticles(controller.signal)
      .then((articles) => {
        if (!controller.signal.aborted && articles && articles.length > 0) {
          setState((prev) => ({ ...prev, articles: articles.map(articleToRecord) }));
        }
      })
      .catch(() => {});

    return () => controller.abort();
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

    fetchAdminAIFeedbacks(undefined, controller.signal)
      .then((feedbacks) => {
        if (!controller.signal.aborted && feedbacks && feedbacks.length > 0) {
          setState((prev) => ({ ...prev, feedback: feedbacks.map(feedbackToRecord) }));
        }
      })
      .catch(() => {});
  });

  const loadDetail = useCallback(
    async (collection: 'users' | 'registrations' | 'feedback', id: string, signal: AbortSignal) => {
      if (collection === 'users') {
        const record = userToRecord(await getAdminUserById(id, signal));
        if (!signal.aborted) setState((prev) => ({ ...prev, users: prev.users.map((item) => (item.id === id ? record : item)) }));
        return record;
      }
      if (collection === 'registrations') {
        const record = toRecord(await getAdminRegistrationById(id, signal));
        if (!signal.aborted) setState((prev) => ({ ...prev, registrations: prev.registrations.map((item) => (item.id === id ? record : item)) }));
        return record;
      }
      const item = state.feedback.find((f) => f.id === id);
      if (item) return item;
      throw new Error('Không tìm thấy bản ghi.');
    },
    [state.feedback]
  );

  const execute = async (command: AdminCommand) => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN') throw new Error('Bạn không có quyền thực hiện thao tác quản trị.');

    if (command.type === 'review') {
      const updated = toRecord(await handleFarmRegistration(command.id, command.status, command.reason));
      setState((previous) => ({
        ...previous,
        registrations: previous.registrations.map((record) => (record.id === updated.id ? updated : record)),
      }));
      showNotice(command.status === 'APPROVED' ? 'Đã duyệt hồ sơ và tạo trang trại.' : 'Đã từ chối hồ sơ.');
      return;
    }

    if (command.type === 'status' && command.collection === 'users') {
      const updated = userToRecord(await updateAdminUserStatus(command.id, command.status));
      setState((previous) => ({
        ...previous,
        users: previous.users.map((record) => (record.id === updated.id ? updated : record)),
      }));
      showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt tài khoản thành công.' : 'Đã khóa tài khoản thành công.');
      return;
    }

    if (command.type === 'feedback' && command.collection === 'feedback') {
      try {
        let updatedItem: AdminAIFeedbackItem | null = null;
        if (command.reply) {
          updatedItem = await replyAdminAIFeedback(command.id, command.reply);
        }
        if (command.status) {
          updatedItem = await updateAdminAIFeedbackStatus(command.id, command.status);
        }
        if (updatedItem) {
          const updatedRecord = feedbackToRecord(updatedItem);
          setState((previous) => ({
            ...previous,
            feedback: previous.feedback.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)),
          }));
          showNotice('Đã gửi phản hồi và cập nhật trạng thái ý kiến thành công.');
          return;
        }
      } catch {
        // Fallback to local
      }
    }

    const next = applyAdminCommand(state, command, {
      id: crypto.randomUUID(),
      actor: user.fullName || 'Quản trị viên',
      now: new Date().toISOString(),
    });
    setState(next);
    showNotice('Đã cập nhật dữ liệu thành công.');
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
  return (
    <>
      {notice && (
        <div key={noticeId} className="admin-toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={dismissNotice} aria-label="Đóng thông báo">
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  );
}
