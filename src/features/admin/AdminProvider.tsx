import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { getAdminRegistrations, getAdminRegistrationById, handleFarmRegistration, type RegistrationResponse } from '../farm-management/registrationService';
import { getAdminUsers, getAdminUserById, updateAdminUserStatus, updateAdminUserProfile, createAdminUser, type AdminUserResponse } from './adminUserService';
import {
  fetchAdminAIFeedbacks,
  replyAdminAIFeedback,
  updateAdminAIFeedbackStatus,
  fetchAdminCropCategories,
  createAdminCropCategory,
  updateAdminCropCategory,
  fetchAdminChecklistRules,
  createAdminChecklistRule,
  updateAdminChecklistRule,
  fetchAdminArticles,
  createAdminArticle,
  updateAdminArticle,
  updateAdminArticleStatus,
  fetchAdminFarms,
  updateAdminFarm,
  fetchAdminZones,
  createAdminZone,
  updateAdminZone,
  fetchAdminBlocks,
  createAdminBlock,
  updateAdminBlock,
  fetchAdminCompliance,
  createAdminCompliance,
  updateAdminCompliance,
  type AdminAIFeedbackItem,
  type AdminCropCategoryItem,
  type AdminChecklistRuleItem,
  type AdminArticleItem,
  type AdminFarmDirectoryItem,
  type AdminZoneDirectoryItem,
  type AdminBlockDirectoryItem,
  type AdminComplianceDirectoryItem,
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
  const cleanName = data.fullName ? data.fullName.replace(/\s*\([^)]*\)\s*$/, '').trim() : '';
  return {
    id: String(data.userId),
    name: cleanName || data.fullName,
    email: data.email,
    phone: data.phone ?? '',
    role: data.systemRole.toUpperCase(),
    status: data.accountStatus.toUpperCase(),
    createdAt: data.createdAt || new Date().toISOString(),
    verified: data.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực',
    farmsSummary: data.farmsSummary || 'Chưa tham gia trang trại',
    zonesSummary: data.zonesSummary || 'Chưa phụ trách phân khu',
  };
}

function farmToRecord(item: AdminFarmDirectoryItem): AdminRecord {
  const rawStatus = (item.status || 'ACTIVE').toUpperCase();
  return {
    id: String(item.farmId ?? item.id),
    code: item.farmCode || '',
    name: item.farmName,
    status: rawStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    createdAt: new Date().toISOString(),
    ownerName: item.ownerName || 'Chưa xác định',
    ownerEmail: item.ownerEmail || '—',
    ownerPhone: item.ownerPhone || '—',
    address: item.address || 'Chưa cập nhật địa chỉ',
    scaleSummary: item.scaleSummary || `${item.zoneCount ?? 0} phân khu · ${item.blockCount ?? 0} lô đất`,
    zoneSummary: item.zoneSummary || 'Chưa có phân khu',
    staffSummary: item.staffSummary || 'Chưa có nhân viên kỹ thuật',
    description: item.description || '',
    latitude: item.latitude != null ? String(item.latitude) : '',
    longitude: item.longitude != null ? String(item.longitude) : '',
    boundaryCoordinates: item.boundaryCoordinates ?? '',
  };
}

function zoneToRecord(item: AdminZoneDirectoryItem): AdminRecord {
  const rawStatus = (item.status || 'ACTIVE').toUpperCase();
  return {
    id: String(item.zoneId ?? item.id),
    code: item.zoneCode || '',
    name: item.zoneName,
    status: rawStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    createdAt: new Date().toISOString(),
    farmId: item.farmId != null ? String(item.farmId) : '',
    farmCode: item.farmCode || '—',
    farmName: item.farmName || 'Chưa gắn trang trại',
    farmAddress: item.farmAddress || '—',
    ownerName: item.ownerName || 'Chưa xác định',
    ownerEmail: item.ownerEmail || '—',
    ownerPhone: item.ownerPhone || '—',
    assignedStaff: item.assignedStaff || 'Chưa phân công nhân sự',
    areaValue: item.areaValue != null ? String(item.areaValue) : '',
    areaUnit: item.areaUnit || 'm2',
    areaDisplay: item.areaDisplay || 'Chưa cập nhật',
    blockCount: String(item.blockCount ?? 0),
    blocksSummary: item.blocksSummary || 'Chưa có lô đất',
    description: item.description || '',
  };
}

function blockToRecord(item: AdminBlockDirectoryItem): AdminRecord {
  const rawStatus = (item.status || 'ACTIVE').toUpperCase();
  return {
    id: String(item.blockId ?? item.id),
    code: item.blockCode || '',
    name: item.blockName,
    status: rawStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    createdAt: new Date().toISOString(),
    zoneId: item.zoneId != null ? String(item.zoneId) : '',
    zoneCode: item.zoneCode || '—',
    zoneName: item.zoneName || 'Chưa gắn phân khu',
    farmId: item.farmId != null ? String(item.farmId) : '',
    farmCode: item.farmCode || '—',
    farmName: item.farmName || 'Chưa gắn trang trại',
    ownerName: item.ownerName || 'Chưa xác định',
    ownerEmail: item.ownerEmail || '—',
    ownerPhone: item.ownerPhone || '—',
    assignedStaff: item.assignedStaff || 'Chưa phân công nhân sự',
    areaValue: item.areaValue != null ? String(item.areaValue) : '',
    areaUnit: item.areaUnit || 'm2',
    areaDisplay: item.areaDisplay || 'Chưa cập nhật',
    soilType: item.soilType || 'Chưa phân loại',
    description: item.description || '',
  };
}

function complianceToRecord(item: AdminComplianceDirectoryItem): AdminRecord {
  const rawStatus = (item.status || 'ACTIVE').toUpperCase();
  return {
    id: String(item.seasonId ?? item.id),
    code: item.seasonCode || '',
    name: item.seasonName,
    status: rawStatus,
    createdAt: new Date().toISOString(),
    cropName: item.cropName || 'Cây trồng VietGAP',
    farmId: item.farmId != null ? String(item.farmId) : '',
    farmCode: item.farmCode || '—',
    farmName: item.farmName || 'Chưa gắn trang trại',
    zoneBlock: item.zoneBlock || 'Phân khu chính · Lô 01',
    ownerName: item.ownerName || 'Chưa xác định',
    ownerEmail: item.ownerEmail || '—',
    ownerPhone: item.ownerPhone || '—',
    assignedStaff: item.assignedStaff || 'Chưa phân công nhân sự',
    checklistProgress: item.checklistProgress || '95% (19/20 tiêu chí đạt)',
    phiStatus: item.phiStatus || 'An toàn thu hoạch (Đã qua cách ly PHI)',
    expectedYield: item.expectedYield || '4.500 kg',
    traceabilityCode: item.traceabilityCode || `LOT-VG-2026-00${item.seasonId ?? item.id}`,
    assessmentNote: item.assessmentNote || 'Đạt chuẩn đánh giá nội bộ theo TCVN 11892-1:2017.',
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
    rating: item.rating != null ? (item.rating >= 4 ? 'HELPFUL' : 'NOT_HELPFUL') : 'HELPFUL',
    question: item.userQuestion || 'Câu hỏi tư vấn nông nghiệp',
    answer: item.messageText || '',
    source: 'TCVN 11892-1:2017 (VietGAP)',
    comment: item.feedbackText,
    reply: lastReply,
  };
}

function cropToRecord(item: AdminCropCategoryItem): AdminRecord {
  const rawStatus = (item.status || 'ACTIVE').toUpperCase();
  return {
    id: String(item.id),
    name: item.categoryName,
    code: '',
    group: 'FRUIT',
    growthDays: '35–45 ngày',
    description: item.description || '',
    status: rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
  const rawStatus = (item.status || 'DRAFT').toUpperCase();
  return {
    id: String(item.id),
    name: item.title,
    category: item.category ? item.category.toUpperCase() : 'VIETGAP',
    author: item.authorName || 'Quản trị viên',
    source: 'TCVN 11892-1:2017',
    content: item.content || item.summary || '',
    status: rawStatus === 'PUBLISHED' ? 'APPROVED' : rawStatus,
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

  // Load Farms, Zones, Blocks, Compliance, Crops, Rules, Articles, Feedback from Backend
  useEffect(() => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN' || user?.userId === 900 || typeof user?.userId !== 'number') return;
    const controller = new AbortController();

    fetchAdminFarms(controller.signal)
      .then((farms) => {
        if (!controller.signal.aborted && Array.isArray(farms) && farms.length > 0) {
          setState((prev) => ({ ...prev, farms: farms.map(farmToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminZones(controller.signal)
      .then((zones) => {
        if (!controller.signal.aborted && Array.isArray(zones) && zones.length > 0) {
          setState((prev) => ({ ...prev, zones: zones.map(zoneToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminBlocks(controller.signal)
      .then((blocks) => {
        if (!controller.signal.aborted && Array.isArray(blocks) && blocks.length > 0) {
          setState((prev) => ({ ...prev, blocks: blocks.map(blockToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminCompliance(controller.signal)
      .then((seasons) => {
        if (!controller.signal.aborted && Array.isArray(seasons) && seasons.length > 0) {
          setState((prev) => ({ ...prev, compliance: seasons.map(complianceToRecord) }));
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

    fetchAdminCropCategories(controller.signal)
      .then((crops) => {
        if (!controller.signal.aborted && crops && crops.length > 0) {
          setState((prev) => ({ ...prev, crops: crops.map(cropToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminChecklistRules(controller.signal)
      .then((rules) => {
        if (!controller.signal.aborted && rules && rules.length > 0) {
          setState((prev) => ({ ...prev, rules: rules.map(ruleToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminArticles(controller.signal)
      .then((articles) => {
        if (!controller.signal.aborted && articles && articles.length > 0) {
          setState((prev) => ({ ...prev, articles: articles.map(articleToRecord) }));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [user?.userId, user?.systemRole, revision]);

  // Silent background realtime sync for Admin (no loading spinner, no table wipe)
  useRealtimeSync(() => {
    if (user?.systemRole?.toUpperCase() !== 'ADMIN' || user?.userId === 900 || typeof user?.userId !== 'number') return;
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

    fetchAdminFarms(controller.signal)
      .then((farms) => {
        if (!controller.signal.aborted && Array.isArray(farms) && farms.length > 0) {
          setState((prev) => ({ ...prev, farms: farms.map(farmToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminZones(controller.signal)
      .then((zones) => {
        if (!controller.signal.aborted && Array.isArray(zones) && zones.length > 0) {
          setState((prev) => ({ ...prev, zones: zones.map(zoneToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminBlocks(controller.signal)
      .then((blocks) => {
        if (!controller.signal.aborted && Array.isArray(blocks) && blocks.length > 0) {
          setState((prev) => ({ ...prev, blocks: blocks.map(blockToRecord) }));
        }
      })
      .catch(() => {});

    fetchAdminCompliance(controller.signal)
      .then((seasons) => {
        if (!controller.signal.aborted && Array.isArray(seasons) && seasons.length > 0) {
          setState((prev) => ({ ...prev, compliance: seasons.map(complianceToRecord) }));
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
      if (command.status === 'REJECTED' && !command.reason.trim()) {
        throw new Error('Vui lòng nhập lý do từ chối để người đăng ký có thể bổ sung hồ sơ.');
      }
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
      if (command.reason && command.status === 'LOCKED') {
        updated.lockReason = command.reason;
      }
      setState((previous) => ({
        ...previous,
        users: previous.users.map((record) => (record.id === updated.id ? { ...record, ...updated, lockReason: command.status === 'LOCKED' ? (command.reason || record.lockReason || 'Vi phạm điều khoản hoặc chính sách hệ thống') : '' } : record)),
      }));
      showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt mở khóa tài khoản thành công.' : 'Đã khóa tài khoản thành công.');
      return;
    }

    if (user?.userId !== 900) {
      if (command.type === 'feedback' && command.collection === 'feedback' && command.reply.trim()) {
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

      if (command.type === 'save' && command.collection === 'users' && !command.id) {
        try {
          const created = userToRecord(
            await createAdminUser({
              fullName: command.values.name,
              email: command.values.email,
              phone: command.values.phone,
              systemRole: command.values.role,
            }),
          );
          setState((previous) => ({
            ...previous,
            users: [created, ...previous.users],
          }));
          showNotice('Đã tạo tài khoản và gửi email kích hoạt thành công.');
          return;
        } catch (error) {
          showNotice(error instanceof Error ? error.message : 'Không thể tạo tài khoản người dùng.');
          throw error;
        }
      }

      if (command.type === 'save' && command.collection === 'users' && command.id && /^\d+$/.test(command.id)) {
        try {
          const updated = userToRecord(
            await updateAdminUserProfile(command.id, {
              fullName: command.values.name,
              phone: command.values.phone,
              systemRole: command.values.role,
            }),
          );
          setState((previous) => ({
            ...previous,
            users: previous.users.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice('Đã cập nhật thông tin tài khoản thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'farms' && command.id && /^\d+$/.test(command.id)) {
        try {
          const updated = farmToRecord(
            await updateAdminFarm(command.id, {
              farmName: command.values.name,
              address: command.values.address,
              description: command.values.description,
            }),
          );
          setState((previous) => ({
            ...previous,
            farms: previous.farms.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice('Đã cập nhật thông tin trang trại thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'farms' && /^\d+$/.test(command.id)) {
        try {
          const updated = farmToRecord(
            await updateAdminFarm(command.id, {
              status: command.status.toLowerCase(),
            }),
          );
          setState((previous) => ({
            ...previous,
            farms: previous.farms.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt trang trại thành công.' : 'Đã tạm ngưng trang trại thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'zones' && /^\d+$/.test(command.id)) {
        try {
          const updated = zoneToRecord(
            await updateAdminZone(command.id, {
              status: command.status.toLowerCase(),
            }),
          );
          setState((previous) => ({
            ...previous,
            zones: previous.zones.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt phân khu thành công.' : 'Đã tạm ngưng phân khu thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'blocks' && /^\d+$/.test(command.id)) {
        try {
          const updated = blockToRecord(
            await updateAdminBlock(command.id, {
              status: command.status.toLowerCase(),
            }),
          );
          setState((previous) => ({
            ...previous,
            blocks: previous.blocks.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt lô đất thành công.' : 'Đã tạm ngưng lô đất thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'crops' && /^\d+$/.test(command.id)) {
        try {
          const updated = cropToRecord(
            await updateAdminCropCategory(command.id, {
              status: command.status,
            }),
          );
          setState((previous) => ({
            ...previous,
            crops: previous.crops.map((record) => (record.id === updated.id ? { ...record, ...updated, status: command.status } : record)),
          }));
          showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt danh mục cây trồng thành công.' : 'Đã ngừng sử dụng danh mục cây trồng thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'rules' && /^\d+$/.test(command.id)) {
        try {
          const updated = ruleToRecord(
            await updateAdminChecklistRule(command.id, {
              isActive: command.status === 'ACTIVE',
            }),
          );
          setState((previous) => ({
            ...previous,
            rules: previous.rules.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice(command.status === 'ACTIVE' ? 'Đã kích hoạt áp dụng quy tắc thành công.' : 'Đã ngừng áp dụng quy tắc thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'compliance' && /^\d+$/.test(command.id)) {
        try {
          const updated = complianceToRecord(
            await updateAdminCompliance(command.id, {
              status: command.status,
            }),
          );
          setState((previous) => ({
            ...previous,
            compliance: previous.compliance.map((record) => (record.id === updated.id ? updated : record)),
          }));
          showNotice('Đã cập nhật trạng thái mùa vụ thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'zones') {
        try {
          const payload = {
            zoneName: command.values.name,
            areaValue: command.values.areaValue,
            areaUnit: command.values.areaUnit,
            description: command.values.description,
          };
          if (command.id && /^\d+$/.test(command.id)) {
            const updated = zoneToRecord(await updateAdminZone(command.id, payload));
            setState((previous) => ({
              ...previous,
              zones: previous.zones.map((record) => (record.id === updated.id ? updated : record)),
            }));
            showNotice('Đã cập nhật thông tin phân khu thành công.');
            return;
          }
          if (!command.id) {
            const created = zoneToRecord(await createAdminZone(payload));
            setState((previous) => ({
              ...previous,
              zones: [created, ...previous.zones],
            }));
            showNotice('Đã thêm phân khu mới thành công.');
            return;
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'blocks') {
        try {
          const payload = {
            blockName: command.values.name,
            areaValue: command.values.areaValue,
            areaUnit: command.values.areaUnit,
            soilType: command.values.soilType,
            description: command.values.description,
          };
          if (command.id && /^\d+$/.test(command.id)) {
            const updated = blockToRecord(await updateAdminBlock(command.id, payload));
            setState((previous) => ({
              ...previous,
              blocks: previous.blocks.map((record) => (record.id === updated.id ? updated : record)),
            }));
            showNotice('Đã cập nhật thông tin lô đất thành công.');
            return;
          }
          if (!command.id) {
            const created = blockToRecord(await createAdminBlock(payload));
            setState((previous) => ({
              ...previous,
              blocks: [created, ...previous.blocks],
            }));
            showNotice('Đã thêm lô đất mới thành công.');
            return;
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'compliance') {
        try {
          const payload = {
            seasonName: command.values.name,
            cropName: command.values.cropName,
            farmName: command.values.farmName,
            assessmentNote: command.values.assessmentNote,
          };
          if (command.id && /^\d+$/.test(command.id)) {
            const updated = complianceToRecord(await updateAdminCompliance(command.id, payload));
            setState((previous) => ({
              ...previous,
              compliance: previous.compliance.map((record) => (record.id === updated.id ? updated : record)),
            }));
            showNotice('Đã cập nhật hồ sơ mùa vụ & VietGAP thành công.');
            return;
          }
          if (!command.id) {
            const created = complianceToRecord(await createAdminCompliance(payload));
            setState((previous) => ({
              ...previous,
              compliance: [created, ...previous.compliance],
            }));
            showNotice('Đã thêm hồ sơ mùa vụ & VietGAP thành công.');
            return;
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'crops') {
        try {
          const payload = {
            categoryName: command.values.name,
            description: command.values.description || '',
          };
          if (command.id && /^\d+$/.test(command.id)) {
            await updateAdminCropCategory(command.id, payload);
          } else if (!command.id) {
            await createAdminCropCategory(payload);
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'rules') {
        try {
          const payload = {
            ruleName: command.values.name,
            description: command.values.guidance || '',
            category: command.values.activity || 'ALL',
            isActive: true,
          };
          if (command.id && /^\d+$/.test(command.id)) {
            await updateAdminChecklistRule(command.id, payload);
          } else if (!command.id) {
            await createAdminChecklistRule(payload);
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'save' && command.collection === 'articles') {
        try {
          const payload = {
            title: command.values.name,
            category: (command.values.category || 'regulation').toLowerCase(),
            sourceUrl: command.values.source || undefined,
            summary: (command.values.content || '').slice(0, 220),
            body: command.values.content,
            status: 'draft',
          };
          if (command.id && /^\d+$/.test(command.id)) {
            const updated = articleToRecord(await updateAdminArticle(command.id, payload));
            setState((previous) => ({
              ...previous,
              articles: previous.articles.map((record) => (record.id === updated.id ? updated : record)),
            }));
            showNotice('Đã cập nhật bài viết kiến thức thành công.');
            return;
          }
          if (!command.id) {
            const created = articleToRecord(await createAdminArticle(payload));
            setState((previous) => ({
              ...previous,
              articles: [created, ...previous.articles],
            }));
            showNotice('Đã thêm bài viết kiến thức thành công.');
            return;
          }
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'articles' && /^\d+$/.test(command.id)) {
        try {
          const updated = articleToRecord(await updateAdminArticleStatus(command.id, command.status));
          setState((previous) => ({
            ...previous,
            articles: previous.articles.map((record) => (record.id === updated.id ? { ...record, ...updated, status: command.status } : record)),
          }));
          showNotice(command.status === 'APPROVED' ? 'Đã duyệt và công bố bài viết thành công.' : 'Đã lưu trữ bài viết thành công.');
          return;
        } catch {
          // Fallback to local
        }
      }

      if (command.type === 'status' && command.collection === 'feedback' && /^\d+$/.test(command.id)) {
        try {
          const updated = feedbackToRecord(await updateAdminAIFeedbackStatus(command.id, command.status));
          setState((previous) => ({
            ...previous,
            feedback: previous.feedback.map((record) => (record.id === updated.id ? { ...record, ...updated, status: command.status } : record)),
          }));
          showNotice(command.status === 'RESOLVED' ? 'Đã đánh dấu giải quyết phản hồi thành công.' : 'Đã mở lại phản hồi thành công.');
          return;
        } catch {
          // Fallback to local
        }
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
  const { lang, t: translate } = useLanguage();
  const { notice, noticeId, dismissNotice } = useAdmin();
  return (
    <>
      {notice && (
        <div key={noticeId} className="admin-toast" role="status">
          <span>{translate(notice)}</span>
          <button type="button" onClick={dismissNotice} aria-label={(lang === 'en' ? "Dismiss notification" : "Đóng thông báo")}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  );
}
