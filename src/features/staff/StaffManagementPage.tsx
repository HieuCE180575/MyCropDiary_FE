import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { LoadError } from '../../shared/components/LoadError';
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';

import { formatDate as displayDate } from '../../shared/format/formatters';
import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';


import { getFarmStaffList, addFarmStaffMember, updateFarmStaffMember, deactivateFarmStaffMember, deleteFarmStaffMember, type FarmStaffRecord, getFarmWorkersApi, createFarmWorkerApi, updateFarmWorkerApi, deleteFarmWorkerApi, type FarmWorkerResp, type FarmWorkerReq } from './staffService';
import {
  fetchZonesByFarm,
  fetchZoneAssignments,
  assignStaffToZone,
  unassignStaffFromZone,
} from '../production/zoneBlockService';
import type { Zone, StaffZoneAssignment } from '../production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface FarmStaffDataCache {
  staffList: FarmStaffRecord[];
  zones: Zone[];
  assignments: StaffZoneAssignment[];
  cachedAt: number;
}

const farmStaffMemoryCache = new Map<number, FarmStaffDataCache>();

export function StaffManagementPage() {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;
  const initialCache = farmId ? farmStaffMemoryCache.get(farmId) : null;

  const [activeTab, setActiveTab] = useState<'staff' | 'assignments' | 'workers'>('staff');

  // Worker Records state (Worker Records)
  const [workers, setWorkers] = useState<FarmWorkerResp[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [workerLoadError, setWorkerLoadError] = useState<string | null>(null);
  const [staffLoadError, setStaffLoadError] = useState<string | null>(null);
  const [assignmentLoadError, setAssignmentLoadError] = useState<string | null>(null);
  const [zoneLoadError, setZoneLoadError] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('ALL');
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<FarmWorkerResp | null>(null);
  const [viewingStaff, setViewingStaff] = useState<FarmStaffRecord | null>(null);
  const [viewingWorker, setViewingWorker] = useState<FarmWorkerResp | null>(null);
  const [workerForm, setWorkerForm] = useState<FarmWorkerReq>({
    farmMemberId: 0,
    workerCode: '',
    jobTitle: '',
    employmentStatus: 'active',
    hiredAt: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [savingWorker, setSavingWorker] = useState(false);
  const [staffList, setStaffList] = useState<FarmStaffRecord[]>(initialCache?.staffList || []);
  const [zones, setZones] = useState<Zone[]>(initialCache?.zones || []);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>(initialCache?.assignments || []);
  const [loading, setLoading] = useState(!initialCache);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assignSearch, setAssignSearch] = useState('');
  const [assignZoneFilter, setAssignZoneFilter] = useState('ALL');
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: 'worker' | 'deactivate' | 'assignment'; id: number; name: string; farmId: number } | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const requestAction = (kind: 'worker' | 'deactivate' | 'assignment', id: number, name = '') => {
    if (farmId) setPendingAction({ kind, id, name, farmId });
  };

  // Add Staff Modal
    // Candidate Users for Add Staff

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [jobTitle, setJobTitle] = useState('Kỹ sư nông nghiệp');
  const [savingStaff, setSavingStaff] = useState(false);
  const [addStaffError, setAddStaffError] = useState<TranslationMessage | null>(null);

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<FarmStaffRecord | null>(null);
  const [editRole, setEditRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [savingEdit, setSavingEdit] = useState(false);


  // Delete Eligible Worker Modal
  const [deleteWorkerTarget, setDeleteWorkerTarget] = useState<FarmStaffRecord | null>(null);
  const [deletingWorker, setDeletingWorker] = useState(false);

  // Add Assignment Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState<number | ''>('');
  const [assignZoneId, setAssignZoneId] = useState<number | ''>('');
  const [assignedAtDate, setAssignedAtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignNotes, setAssignNotes] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignModalError, setAssignModalError] = useState<TranslationMessage | null>(null);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => { if (isAddStaffOpen || editingStaff || isAssignOpen || isWorkerModalOpen) setNotification(null); }, [isAddStaffOpen, editingStaff?.farmMemberId, isAssignOpen, isWorkerModalOpen]);

  useEffect(() => {
    if (!farmId) return;
    const cached = farmStaffMemoryCache.get(farmId);
    if (cached) {
      setStaffList(cached.staffList);
      setZones(cached.zones);
      setAssignments(cached.assignments);
      setLoading(false);
      void loadData(true);
    } else {
      void loadData(false);
    }
    // activeTab is excluded so switching tabs is 100% instant without network fetch or spinner!
  }, [farmId]);

  useRealtimeSync(() => {
    if (!farmId) return;
    void loadData(true);
  });

  const loadData = async (silent = false) => {
    if (!farmId) return;
    setStaffLoadError(null);
    setAssignmentLoadError(null);
    setZoneLoadError(null);
    if (!silent && !farmStaffMemoryCache.has(farmId)) setLoading(true);
    try {
      const [staffData, zoneData, assignData] = await Promise.all([
        getFarmStaffList(farmId),
        fetchZonesByFarm(farmId).catch(error => {
          setZoneLoadError(error instanceof Error ? error.message : (lang === 'en' ? 'Unable to load production zones.' : 'Không tải được khu vực sản xuất.'));
          return [] as Zone[];
        }),
        fetchZoneAssignments(farmId).catch(error => {
          setAssignmentLoadError(error instanceof Error ? error.message : (lang === 'en' ? 'Unable to load assignments.' : 'Không tải được phân công.'));
          return [] as StaffZoneAssignment[];
        }),
      ]);
      setStaffList(staffData);
      setZones(zoneData);
      setAssignments(assignData);
      farmStaffMemoryCache.set(farmId, {
        staffList: staffData,
        zones: zoneData,
        assignments: assignData,
        cachedAt: Date.now(),
      });
    } catch (err) {
      if (!silent) {
        setStaffLoadError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load farm staff data.' : 'Không tải được nhân sự trang trại.'));
        setNotification({
          text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load farm staff data." : err instanceof Error ? err.message : 'Không thể tải dữ liệu nhân sự trang trại.'),
          type: 'error',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadWorkers = async () => {
    if (!farmId) return;
    setLoadingWorkers(true);
    setWorkerLoadError(null);
    try {
      const list = await getFarmWorkersApi(farmId, {
        status: workerStatusFilter === 'ALL' ? undefined : workerStatusFilter,
        keyword: workerSearch.trim() || undefined,
      });
      setWorkers(list);
    } catch (error) {
      setWorkerLoadError(error instanceof Error ? error.message : (lang === 'en' ? 'Unable to load worker profiles.' : 'Không tải được hồ sơ công nhân.'));
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  useEffect(() => {
    if (farmId && activeTab === 'workers') {
      void loadWorkers();
    }
  }, [farmId, activeTab, workerStatusFilter]);

  const handleOpenAddWorker = () => {
    setEditingWorker(null);
    setWorkerForm({
      farmMemberId: staffList.length > 0 ? staffList[0].farmMemberId : 0,
      workerCode: `CN-${String(workers.length + 1).padStart(3, '0')}`,
      jobTitle: 'Công nhân lao động',
      employmentStatus: 'active',
      hiredAt: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsWorkerModalOpen(true);
  };

  const handleOpenEditWorker = (w: FarmWorkerResp) => {
    setEditingWorker(w);
    setWorkerForm({
      farmMemberId: w.farmMemberId,
      workerCode: w.workerCode,
      jobTitle: w.jobTitle || '',
      employmentStatus: w.employmentStatus || 'active',
      hiredAt: w.hiredAt || new Date().toISOString().split('T')[0],
      notes: w.notes || '',
    });
    setIsWorkerModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !workerForm.workerCode.trim()) return;
    setSavingWorker(true);
    try {
      if (editingWorker) {
        await updateFarmWorkerApi(farmId, editingWorker.workerId, workerForm);
        setNotification({ text: (lang === 'en' ? "Worker profile updated successfully." : 'Cập nhật hồ sơ công nhân thành công.'), type: 'success' });
      } else {
        await createFarmWorkerApi(farmId, workerForm);
        setNotification({ text: (lang === 'en' ? "Worker profile added successfully." : 'Thêm hồ sơ công nhân mới thành công.'), type: 'success' });
      }
      setIsWorkerModalOpen(false);
      void loadWorkers();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save worker profile." : err instanceof Error ? err.message : 'Không thể lưu hồ sơ công nhân.'),
        type: 'error',
      });
    } finally {
      setSavingWorker(false);
    }
  };

  const handleDeleteWorker = async (workerId: number) => {
    if (!farmId) return;
    try {
      await deleteFarmWorkerApi(farmId, workerId);
      setNotification({ text: (lang === 'en' ? "Worker profile deleted successfully." : 'Đã xóa hồ sơ công nhân thành công.'), type: 'success' });
      void loadWorkers();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete worker profile." : err instanceof Error ? err.message : 'Không thể xóa hồ sơ công nhân.'),
        type: 'error',
      });
    }
  };

  const openAddStaffModal = async () => {
    setIsAddStaffOpen(true);
    setAddStaffError(null);
    setEmail('');

    setRole('STAFF');
    setJobTitle('Kỹ sư nông nghiệp');

  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setAddStaffError((lang === 'en' ? "Enter the staff account email address." : 'Vui lòng nhập địa chỉ email tài khoản nhân viên.'));
      return;
    }

    const existing = staffList.find((s) => s.email.toLowerCase() === trimmedEmail);
    if (existing) {
      setAddStaffError((message("Account \"{value1}\" is already a farm member (Status: {value2}). Duplicate members cannot be added!", { value1: email.trim(), value2: message(existing.status || 'Active') })));
      return;
    }

    setSavingStaff(true);
    setAddStaffError(null);
    setNotification(null);
    try {
      const created = await addFarmStaffMember(selectedFarm.id, {
        email: email.trim(),
        farmRole: role.toLowerCase(),
        jobTitle: jobTitle.trim() || undefined,
      });
      setNotification({
        text: (message("Added member \"{value1}\" ({value2}) to the farm successfully!", { value1: created.fullName, value2: created.email })),
        type: 'success',
      });
      setIsAddStaffOpen(false);
      setEmail('');
      setRole('STAFF');
      setJobTitle('Kỹ sư nông nghiệp');
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm nhân viên. Vui lòng kiểm tra email tài khoản đã kích hoạt.';
      setAddStaffError(msg);
      setNotification({
        text: msg,
        type: 'error',
      });
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    setNotification(null);
    try {
      await deactivateFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: (message("Suspended access for \"{value1}\".", { value1: name })), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (err instanceof Error ? err.message : message("Unable to deactivate member \"{value1}\".", { value1: name })),
        type: 'error',
      });
    }
  };

  const handleReactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    setNotification(null);
    try {
      await updateFarmStaffMember(selectedFarm.id, memberId, { status: 'ACTIVE' });
      setNotification({ text: (message("Reactivated member \"{value1}\" successfully!", { value1: name })), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (err instanceof Error ? err.message : message("Unable to reactivate \"{value1}\".", { value1: name })),
        type: 'error',
      });
    }
  };

  const openEditModal = (staff: FarmStaffRecord) => {
    setEditingStaff(staff);
    setEditRole(staff.farmRole === 'OWNER' ? 'OWNER' : 'STAFF');
    const labelToCheck = (staff.jobTitle || staff.roleLabel || '').trim().toLowerCase();
    const isGenericRole = [
      'owner',
      'farm owner',
      'co-owner',
      'staff',
      'technical staff',
      'chủ trang trại',
      'đồng chủ trang trại',
      'nhân viên kỹ thuật',
      'thành viên trang trại',
      'kỹ sư nông nghiệp',
    ].includes(labelToCheck);
    setEditJobTitle(isGenericRole ? '' : (staff.jobTitle || staff.roleLabel || ''));
    setEditStatus(staff.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !editingStaff) return;
    setSavingEdit(true);
    setNotification(null);
    try {
      await updateFarmStaffMember(selectedFarm.id, editingStaff.farmMemberId, {
        farmRole: editRole,
        jobTitle: editJobTitle.trim() || undefined,
        status: editStatus,
      });
      setNotification({
        text: (message("Updated member \"{value1}\" successfully!", { value1: editingStaff.fullName })),
        type: 'success',
      });
      setEditingStaff(null);
      await loadData();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update staff information." : err instanceof Error ? err.message : 'Không thể cập nhật thông tin nhân viên.'),
        type: 'error',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStaff = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    setDeletingWorker(true);
    setNotification(null);
    try {
      await deleteFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: (message("Removed member \"{value1}\" from the farm successfully!", { value1: name })), type: 'success' });
      await loadData();
      setDeleteWorkerTarget(null);
    } catch (err) {
      setNotification({
        text: (err instanceof Error ? err.message : message("Unable to remove member \"{value1}\".", { value1: name })),
        type: 'error',
      });
    } finally {
      setDeletingWorker(false);
    }
  };

  const openAssignModal = () => {
    const activeMembers = staffList.filter((s) => s.status === 'ACTIVE');
    if (activeMembers.length > 0 && !assignStaffId) {
      setAssignStaffId(activeMembers[0].farmMemberId);
    }
    if (zones.length > 0 && !assignZoneId) {
      setAssignZoneId(zones[0].zoneId);
    }
    setAssignNotes('');
    setAssignedAtDate(new Date().toISOString().split('T')[0]);
    setAssignModalError(null);
    setIsAssignOpen(true);
  };

  const handleAssignZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !assignStaffId || !assignZoneId) return;

    const alreadyAssigned = assignments.find(
      (a) => a.farmMemberId === Number(assignStaffId) && a.zoneId === Number(assignZoneId) && a.active
    );
    if (alreadyAssigned) {
      const staffObj = staffList.find((s) => s.farmMemberId === Number(assignStaffId));
      const zoneObj = zones.find((z) => z.zoneId === Number(assignZoneId));
      const msg = message("Staff member \"{value1}\" is already assigned to zone \"{value2}\". Duplicate assignments are not allowed!", { value1: (staffObj?.fullName || '#' + assignStaffId), value2: (zoneObj?.zoneName || '#' + assignZoneId) });
      setAssignModalError(msg);
      return;
    }

    setSavingAssign(true);
    setAssignModalError(null);
    setNotification(null);
    try {
      const assignedIso = assignedAtDate ? new Date(`${assignedAtDate}T08:00:00`).toISOString() : new Date().toISOString();
      await assignStaffToZone(selectedFarm.id, Number(assignZoneId), {
        farmMemberId: Number(assignStaffId),
        assignedAt: assignedIso,
        notes: assignNotes.trim() || undefined,
      });
      setNotification({ text: (lang === 'en' ? "Staff assigned to the zone successfully!" : 'Đã phân công nhân viên phụ trách phân khu thành công!'), type: 'success' });
      setIsAssignOpen(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể phân công nhân viên vào phân khu.';
      setAssignModalError(msg);
      setNotification({
        text: msg,
        type: 'error',
      });
    } finally {
      setSavingAssign(false);
    }
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!selectedFarm?.id) return;
    setNotification(null);
    try {
      await unassignStaffFromZone(selectedFarm.id, assignmentId);
      setNotification({ text: (lang === 'en' ? "Staff assignment removed from zone successfully." : 'Đã hủy phân công nhân viên khỏi phân khu thành công.'), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to cancel assignment." : err instanceof Error ? err.message : 'Không thể hủy phân công.'),
        type: 'error',
      });
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction || confirmingAction) return;
    if (pendingAction.farmId !== farmId) { setPendingAction(null); return; }
    setConfirmingAction(true);
    try {
      if (pendingAction.kind === 'worker') await handleDeleteWorker(pendingAction.id);
      else if (pendingAction.kind === 'deactivate') await handleDeactivate(pendingAction.id, pendingAction.name);
      else await handleUnassign(pendingAction.id);
    } finally {
      setConfirmingAction(false);
      setPendingAction(null);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phoneNumber || '').includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAssignments = assignments.filter((item) => {
    const q = assignSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (item.staffName && item.staffName.toLowerCase().includes(q)) ||
      (item.staffEmail && item.staffEmail.toLowerCase().includes(q)) ||
      (item.zoneName && item.zoneName.toLowerCase().includes(q)) ||
      (item.jobTitle && item.jobTitle.toLowerCase().includes(q));
    const matchesZone = assignZoneFilter === 'ALL' || String(item.zoneId) === String(assignZoneFilter);
    return matchesSearch && matchesZone;
  });

  const activeStaffOptions = staffList.filter((s) => s.status === 'ACTIVE');

  const parseStaffName = (rawName?: string | null) => {
    if (!rawName) return { displayName: 'Nhân sự', subTitle: null, initials: 'NS' };
    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    let displayName = rawName.trim();
    let subTitle: string | null = null;
    if (match) {
      displayName = match[1].trim();
      subTitle = match[2].trim();
    }
    const parts = displayName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length === 0
        ? 'NS'
        : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

    return { displayName, subTitle, initials };
  };

  const filteredWorkers = workers.filter((w) => {
    if (workerStatusFilter !== 'ALL' && w.employmentStatus !== workerStatusFilter) return false;
    const query = workerSearch.trim().toLowerCase();
    return !query || [w.workerCode, w.fullName, w.jobTitle].some((value) => value?.toLowerCase().includes(query));
  });
  const workerPagination = usePagination(filteredWorkers, JSON.stringify([farmId, workerSearch, workerStatusFilter]));

  const staffPagination = usePagination(filteredStaff, JSON.stringify([farmId, search, statusFilter]));
  const assignmentsPagination = usePagination(filteredAssignments, JSON.stringify([farmId, assignSearch, assignZoneFilter]));

  return (
    <section className="staff-management-page" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0, margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Notification Banner */}
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginBottom: '16px' }}
        >
          <strong>{(lang === 'en' ? notification.type === 'success' ? "✓ Success" : "⚠️ Notice" : notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo')}:</strong> {translate(notification.text)}
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Page Heading matching FarmHub Modern Mockup */}
      <PageHeading   title={<>
            {lang === 'en' ? 'Staff & Assignments' : 'Nhân sự và phân công'}
          </>} description={<>
            {lang === 'en' ? `${staffList.length} staff · ${assignments.length} VietGAP cultivation area assignments at ${selectedFarm?.farmName || 'Farm'}` : `${staffList.length} nhân viên · ${assignments.length} phân công vùng canh tác VietGAP tại ${selectedFarm?.farmName || 'Trang trại'}`}
          </>}><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(isOwner || activeTab === 'workers') &&
            (activeTab === 'workers' ? (
              <Button type="button" variant="primary" onClick={handleOpenAddWorker}>
                <Icon name="plus" size={17} /> {lang === 'en' ? 'Add worker profile' : 'Thêm hồ sơ công nhân'}
              </Button>
            ) : activeTab === 'staff' ? (
              <Button
                type="button"
                variant="primary"
                onClick={openAddStaffModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Staff' : 'Thêm nhân viên'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={openAssignModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name="plus" size={17} /> {lang === 'en' ? 'Assign New Area' : 'Phân công vùng mới'}
              </Button>
            ))}
        </div></PageHeading>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Integrated Tabs */}
        <TabList idPrefix="staff" label={lang === 'en' ? 'Staff sections' : 'Các mục nhân sự'} inset
            value={activeTab} onChange={setActiveTab} items={[
              { value: 'staff', label: <><Icon name="users" size={17} /> {translate('Staff List')} <span className="tab-count">({staffList.length})</span></> },
              { value: 'assignments', label: <><Icon name="plots" size={17} /> {translate('Zone Assignments')} <span className="tab-count">({assignments.length})</span></> },
              { value: 'workers', label: <><Icon name="users" size={17} /> {(lang === 'en' ? " Worker profiles " : " Hồ sơ công nhân ")} <span className="tab-count">({workers.length})</span></> },
            ]} />

        {activeTab === 'staff' && (
          <div {...tabPanelProps('staff', 'staff')}>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input aria-label={translate('Search by name, email, or phone...')} id="staff-management-page-control-2" className="ui-input"
                  type="search"
                  placeholder={translate('Search by name, email, or phone...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select className="ui-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by active status" : "Lọc theo trạng thái hoạt động")}
                >
                  <option value="ALL">{translate('All Statuses')}</option>
                  <option value="ACTIVE">{translate('Active')}</option>
                  <option value="SUSPENDED">{(lang === 'en' ? "Inactive" : "Đã ngưng hoạt động")}</option>
                </select>
                <span className="select-arrow">
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
                aria-label={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loading ? (
              <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading staff..." : "Đang tải danh sách nhân sự...")}</>} icon={<>⏳</>} />
            ) : (
              <>
                <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }} tabIndex={0}>
                  <table className="ui-data-table ui-data-table--wide" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-page)' }}>
                        <th scope="col" style={{ width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <input type="checkbox" aria-label={(lang === 'en' ? "Select all staff" : "Chọn tất cả staff")} style={{ cursor: 'pointer' }} />
                        </th>
                        <th scope="col" style={{ width: isOwner ? '23%' : '26%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Staff Member' : 'Thành viên'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '20%' : '23%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Contact' : 'Liên hệ'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '12%' : '14%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Role' : 'Vai trò'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '11%' : '13%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Assigned Areas' : 'Vùng tham gia'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '11%' : '12%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Joined Date' : 'Ngày tham gia'}
                        </th>
                        <th scope="col" style={{ width: '11%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Status' : 'Trạng thái'}
                        </th>
                        <th scope="col" style={{ width: '13%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Actions' : 'Thao tác'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffLoadError ? (<tr><td colSpan={8}><LoadError message={staffLoadError} onRetry={() => { void loadData(); }} /></td></tr>) : filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '56px 20px', background: 'var(--color-surface)' }}>
                            <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '14px',
                                  background: 'var(--color-success-bg)',
                                  color: 'var(--color-primary-text)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  marginBottom: '14px',
                                }}
                              >
                                <Icon name="users" size={28} />
                              </div>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                                {(lang === 'en' ? "No matching staff" : "Chưa có staff phù hợp")}
                              </h3>
                              <p style={{ color: 'var(--color-muted)', fontSize: '13.5px', margin: '0 0 18px', lineHeight: 1.5 }}>
                                {lang === 'en' ? 'Try searching with different keywords or click "Add Staff" with an activated account email.' : 'Hãy thử tìm kiếm với từ khóa khác hoặc bấm "Thêm nhân viên" bằng email tài khoản đã kích hoạt.'}
                              </p>
                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={openAddStaffModal}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                >
                                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Staff' : 'Thêm nhân viên'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        staffPagination.items.map((staff) => {
                        const isActive = staff.status === 'ACTIVE';
                        const { displayName, subTitle, initials } = parseStaffName(staff.fullName);

                        return (
                          <tr key={staff.farmMemberId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input type="checkbox" aria-label={(lang === 'en' ? `Select ${displayName}` : `Chọn ${displayName}`)} style={{ cursor: 'pointer' }} />
                            </td>

                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong
                                      style={{
                                        color: 'var(--color-text)',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                      title={displayName}
                                    >
                                      {displayName}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, background: 'var(--color-subtle)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                      #{staff.farmMemberId}
                                    </span>
                                  </div>
                                  {subTitle && (
                                    <span
                                      style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: 'var(--color-primary-text)',
                                        fontWeight: 600,
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                      title={translate(subTitle)}
                                    >
                                      {translate(subTitle)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div
                                style={{
                                  color: 'var(--color-text)',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={staff.email}
                              >
                                {staff.email}
                              </div>
                              <span
                                style={{
                                  color: 'var(--color-muted)',
                                  fontSize: '12px',
                                  marginTop: '2px',
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={staff.phoneNumber || ''}
                              >
                                {(lang === 'en' ? staff.phoneNumber || "No phone number provided" : staff.phoneNumber || 'Chưa cập nhật SĐT')}
                              </span>
                            </td>

                            <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{
                                  background: staff.farmRole === 'OWNER' ? 'var(--color-success-bg)' : 'var(--color-page)',
                                  color: staff.farmRole === 'OWNER' ? 'var(--color-primary-text)' : 'var(--color-body)',
                                  borderColor: staff.farmRole === 'OWNER' ? 'var(--color-border)' : 'var(--color-input-border)',
                                  fontWeight: 650,
                                }}
                              >
                                {staff.jobTitle || translate(staff.roleLabel)}
                              </span>
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  background: staff.activeAssignmentCount > 0 ? 'var(--color-success-bg)' : 'var(--color-subtle)',
                                  color: staff.activeAssignmentCount > 0 ? 'var(--color-primary-text)' : 'var(--color-muted)',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                {staff.activeAssignmentCount} {(lang === 'en' ? " zones" : " vùng")}
                              </span>
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle', color: 'var(--color-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              {staff.joinedAt ? displayDate(staff.joinedAt, lang) : '—'}
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span className={`status-dot-badge ${isActive ? 'active' : 'completed'}`}>
                                <span className="dot" />
                                {(lang === 'en' ? isActive ? "Active" : "Inactive" : isActive ? 'Đang hoạt động' : 'Đã ngưng')}
                              </span>
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div className="table-action-btns" style={{ justifyContent: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="table-icon-btn primary"
                                  title={lang === 'en' ? "View staff profile" : "Xem chi tiết nhân sự"}
                                  aria-label={lang === 'en' ? `View ${displayName}` : `Xem chi tiết ${displayName}`}
                                  onClick={() => setViewingStaff(staff)}
                                >
                                  <Icon name="eye" size={15} />
                                  <span className="sr-only">{lang === 'en' ? "View details" : "Xem chi tiết"}</span>
                                </button>
                                {isOwner && (
                                  <>
                                    <button
                                      type="button"
                                      className="table-icon-btn edit"
                                      title={lang === 'en' ? "Edit staff information" : "Chỉnh sửa thông tin staff"}
                                      aria-label={lang === 'en' ? `Edit ${displayName}` : `Chỉnh sửa ${displayName}`}
                                      onClick={() => openEditModal(staff)}
                                    >
                                      <Icon name="edit" size={15} />
                                      <span className="sr-only">{lang === 'en' ? "Edit" : "Chỉnh sửa"}</span>
                                    </button>
                                    {isActive ? (
                                      <button
                                        type="button"
                                        className="table-icon-btn danger"
                                        title={lang === 'en' ? "Suspend staff member" : "Tạm ngưng hoạt động nhân viên"}
                                        aria-label={lang === 'en' ? `Suspend ${displayName}` : `Tạm dừng ${displayName}`}
                                        onClick={() => requestAction('deactivate', staff.farmMemberId, displayName)}
                                      >
                                        <Icon name="close" size={14} />
                                        <span className="sr-only">{lang === 'en' ? "Suspend" : "Tạm ngưng"}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="table-icon-btn assign"
                                        title={lang === 'en' ? "Reactivate staff member" : "Kích hoạt lại nhân viên"}
                                        aria-label={lang === 'en' ? `Reactivate ${displayName}` : `Kích hoạt lại ${displayName}`}
                                        onClick={() => handleReactivate(staff.farmMemberId, displayName)}
                                      >
                                        <Icon name="check" size={14} />
                                        <span className="sr-only">{lang === 'en' ? "Activate" : "Kích hoạt"}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="table-icon-btn danger"
                                      title={lang === 'en' ? "Remove staff from farm" : "Xóa staff khỏi trang trại"}
                                      aria-label={lang === 'en' ? `Delete ${displayName}` : `Xóa ${displayName}`}
                                      onClick={() => setDeleteWorkerTarget(staff)}
                                    >
                                      <Icon name="trash" size={15} />
                                      <span className="sr-only">{lang === 'en' ? "Delete" : "Xóa"}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <TablePagination {...staffPagination} disabled={loading} />
              </>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div {...tabPanelProps('staff', 'assignments')}>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input aria-label={translate("Search by staff name or assigned zone...")} id="staff-management-page-control-3" className="ui-input"
                  type="search"
                  placeholder={translate("Search by staff name or assigned zone...")}
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select className="ui-select"
                  value={assignZoneFilter}
                  onChange={(e) => setAssignZoneFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by production zone" : "Lọc theo phân khu sản xuất")}
                >
                  <option value="ALL">{translate("All Zones (")}{zones.length})</option>
                  {zones.map((z) => (
                    <option key={z.zoneId} value={String(z.zoneId)}>
                      {z.zoneName}
                    </option>
                  ))}
                </select>
                <span className="select-arrow">
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
                aria-label={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
                onClick={() => {
                  setAssignSearch('');
                  setAssignZoneFilter('ALL');
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loading ? (
              <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading assignments..." : "Đang tải danh sách phân công...")}</>} icon={<>⏳</>} />
            ) : (
              <>
                <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }} tabIndex={0}>
                  <table className="ui-data-table ui-data-table--wide" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-page)' }}>
                        <th scope="col" style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label={(lang === 'en' ? "Select all assignments" : "Chọn tất cả phân công")} style={{ cursor: 'pointer' }} />
                        </th>
                        <th scope="col" style={{ width: isOwner ? '24%' : '27%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Production Zone' : 'Phân khu sản xuất'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '23%' : '26%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Assigned Staff' : 'Nhân sự phụ trách'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '15%' : '17%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Role / Title' : 'Vai trò / Chức vụ'}
                        </th>
                        <th scope="col" style={{ width: isOwner ? '13%' : '15%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Start Date' : 'Ngày bắt đầu'}
                        </th>
                        <th scope="col" style={{ width: '13%', textAlign: 'left' }}>
                          {lang === 'en' ? 'Assigned By' : 'Người giao việc'}
                        </th>
                        <th scope="col" style={{ width: '12%', textAlign: 'center' }}>
                          {lang === 'en' ? 'Actions' : 'Thao tác'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentLoadError ? (<tr><td colSpan={7}><LoadError message={assignmentLoadError} onRetry={() => { void loadData(); }} /></td></tr>) : filteredAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '56px 20px', background: 'var(--color-surface)' }}>
                            <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '14px',
                                  background: 'var(--color-success-bg)',
                                  color: 'var(--color-primary-text)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  marginBottom: '14px',
                                }}
                              >
                                <Icon name="plots" size={28} />
                              </div>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                                {(lang === 'en' ? assignments.length === 0 ? "No assignments yet" : "No matching assignments" : assignments.length === 0 ? 'No assignments yet' : 'Không tìm thấy phân công phù hợp')}
                              </h3>
                              <p style={{ color: 'var(--color-muted)', fontSize: '13.5px', margin: '0 0 18px', lineHeight: 1.5 }}>
                                {(lang === 'en' ? assignments.length === 0 ? 'Assign technical personnel to production zones to oversee seasons, blocks, and VietGAP compliance.' : "Try another keyword or reset the zone filter." : assignments.length === 0
                                  ? 'Assign technical personnel to production zones to oversee seasons, blocks, and VietGAP compliance.'
                                  : 'Hãy thử tìm kiếm với từ khóa khác hoặc làm mới bộ lọc phân khu.')}
                              </p>
                              {isOwner && assignments.length === 0 && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={openAssignModal}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                >
                                  <Icon name="plus" size={16} /> {(lang === 'en' ? " Assign now" : " Phân công ngay")}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        assignmentsPagination.items.map((item) => {
                        const { displayName, subTitle, initials } = parseStaffName(item.staffName);

                        return (
                          <tr key={item.assignmentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="checkbox"
                                aria-label={(lang === 'en' ? `Select assignment for ${displayName}` : `Chọn phân công của ${displayName}`)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>

                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <span
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: 'var(--color-success-bg)',
                                    color: 'var(--color-primary-text)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Icon name="plots" size={17} />
                                </span>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={(lang === 'en' ? item.zoneName || `Zone #${item.zoneId}` : item.zoneName || `Phân khu #${item.zoneId}`)}>
                                    {(lang === 'en' ? item.zoneName || `Zone #${item.zoneId}` : item.zoneName || `Phân khu #${item.zoneId}`)}
                                  </strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', fontWeight: 500 }}>
                                    {(lang === 'en' ? "Code: KV-00" : "Mã: KV-00")}{item.zoneId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayName}>
                                    {displayName}
                                  </strong>
                                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.staffEmail || ''}>
                                    {(lang === 'en' ? item.staffEmail || "No email" : item.staffEmail || 'Chưa có email')}
                                  </span>
                                  {subTitle && (
                                    <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--color-primary-text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={translate(subTitle)}>
                                      {translate(subTitle)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-border)', fontWeight: 650 }}
                              >
                                {(lang === 'en' ? item.jobTitle || "Assigned technical staff" : item.jobTitle || 'Nhân viên kỹ thuật phụ trách')}
                              </span>
                            </td>

                            <td style={{ color: 'var(--color-muted)', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              {item.assignedAt ? displayDate(item.assignedAt, lang) : '—'}
                            </td>

                            <td style={{ color: 'var(--color-body)', fontSize: '13px', fontWeight: 500, verticalAlign: 'middle', overflow: 'hidden' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={item.assignedByName || translate("Farm Owner")}>
                                {item.assignedByName || translate("Farm Owner")}
                              </span>
                            </td>

                            <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div className="table-action-btns" style={{ justifyContent: 'center', gap: '6px' }}>
                                <Link
                                  to={`/zones/${item.zoneId}`}
                                  className="table-icon-btn primary"
                                  title={lang === 'en' ? "View zone details" : "Xem chi tiết phân khu"}
                                  aria-label={lang === 'en' ? `View zone ${item.zoneName}` : `Xem chi tiết phân khu ${item.zoneName}`}
                                >
                                  <Icon name="eye" size={15} />
                                  <span className="sr-only">{lang === 'en' ? "View details" : "Xem chi tiết"}</span>
                                </Link>
                                {isOwner && (
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title={lang === 'en' ? "Remove staff assignment from zone" : "Hủy phân công staff khỏi phân khu"}
                                    aria-label={lang === 'en' ? `Cancel assignment for ${displayName}` : `Hủy phân công cho ${displayName}`}
                                    onClick={() => requestAction('assignment', item.assignmentId)}
                                  >
                                    <Icon name="trash" size={15} />
                                    <span className="sr-only">{lang === 'en' ? "Cancel assignment" : "Hủy phân công"}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <TablePagination {...assignmentsPagination} disabled={loading} />
              </>
            )}
          </div>
        )}

        {activeTab === 'workers' && (
          <div {...tabPanelProps('staff', 'workers')}>
            <div className="zone-clean-filter-bar worker-profile-filters">
              <div className="zone-clean-search">
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input aria-label={(lang === 'en' ? "Search by worker ID, name, or position..." : "Tìm theo mã công nhân, họ tên, chức danh...")} id="staff-management-page-control-4" className="ui-input"
                  type="search"
                  placeholder={(lang === 'en' ? "Search by worker ID, name, or position..." : "Tìm theo mã công nhân, họ tên, chức danh...")}
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select className="ui-select"
                  value={workerStatusFilter}
                  onChange={(e) => setWorkerStatusFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by employment status" : "Lọc theo tình trạng làm việc")}
                >
                  <option value="ALL">{(lang === 'en' ? "All statuses" : "Tất cả tình trạng")}</option>
                  <option value="active">{(lang === 'en' ? "Active" : "Đang làm việc")}</option>
                  <option value="inactive">{(lang === 'en' ? "Inactive" : "Đã nghỉ việc")}</option>
                  <option value="seasonal">{(lang === 'en' ? "Seasonal" : "Thời vụ (Seasonal)")}</option>
                </select>
                <span className="select-arrow"><Icon name="chevron" size={16} /></span>
              </div>

              <button type="button" className="zone-clean-reload-btn" title={lang === 'en' ? 'Reset filters' : 'Làm mới bộ lọc'} aria-label={lang === 'en' ? 'Reset filters' : 'Làm mới bộ lọc'} onClick={() => { setWorkerSearch(''); setWorkerStatusFilter('ALL'); }}><Icon name="refresh" size={16} /></button>
            </div>

            {loadingWorkers ? (
              <div className="zone-clean-loading">
                <div className="zone-spinner" />
                <p>{(lang === 'en' ? "Loading worker profiles..." : "Đang tải danh sách hồ sơ công nhân...")}</p>
              </div>
            ) : workerLoadError ? (<LoadError message={workerLoadError} onRetry={() => { void loadWorkers(); }} />) : workers.length === 0 ? (
              <div className="zone-clean-empty">
                <Icon name="users" size={48} />
                <h3>{(lang === 'en' ? "No worker profiles yet" : "Chưa có hồ sơ công nhân")}</h3>
                <p>{(lang === 'en' ? "Click \"Add worker profile\" to create worker records under VietGAP standards." : "Nhấn nút \"Thêm hồ sơ công nhân\" để thiết lập hồ sơ người lao động theo tiêu chuẩn VietGAP.")}</p>
              </div>
            ) : (
              <>
              <div className="zone-table-wrap worker-profile-table-wrap ui-table-scroll" tabIndex={0}>
                <table className="ui-data-table ui-data-table--wide worker-profile-table">
                  <colgroup>
                    <col style={{ width: '9%' }} /><col style={{ width: '23%' }} />
                    <col style={{ width: '19%' }} /><col style={{ width: '12%' }} />
                    <col style={{ width: '14%' }} /><col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">{(lang === 'en' ? "Worker ID" : "Mã CN")}</th>
                      <th scope="col">{(lang === 'en' ? "Full Name & Phone" : "Họ tên & SĐT")}</th>
                      <th scope="col">{(lang === 'en' ? "Position / Job title" : "Vị trí / Chức danh")}</th>
                      <th scope="col">{(lang === 'en' ? "Employment start date" : "Ngày vào làm")}</th>
                      <th scope="col">{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                      <th scope="col">{(lang === 'en' ? "Notes" : "Ghi chú")}</th>
                      <th scope="col">{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.length === 0 && <tr><td colSpan={7}><EmptyState title={lang === 'en' ? 'No matching worker profiles' : 'Không có hồ sơ công nhân phù hợp'} /></td></tr>}
                    {workerPagination.items.map((w) => (
                        <tr key={w.workerId}>
                          <td>
                            <span className="worker-profile-code">
                              {w.workerCode || `#${w.workerId}`}
                            </span>
                          </td>
                          <td>
                            <div className="worker-profile-person"><span className="staff-initials-avatar">{parseStaffName(w.fullName).initials}</span><div><strong>{parseStaffName(w.fullName).displayName}</strong>
                            {w.phoneNumber && (
                              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{w.phoneNumber}</div>
                            )}
                            </div></div>
                          </td>
                          <td>{(lang === 'en' ? w.jobTitle || "Worker" : w.jobTitle || 'Công nhân')}</td>
                          <td>{w.hiredAt ? displayDate(w.hiredAt, lang) : '—'}</td>
                          <td>
                            <StatusBadge tone={w.employmentStatus === 'active' ? 'success' : 'neutral'} label={<>
                              {(lang === 'en' ? w.employmentStatus === 'active' ? "Active" : w.employmentStatus === 'seasonal' ? "Seasonal" : "Left" : w.employmentStatus === 'active' ? 'Đang làm việc' : w.employmentStatus === 'seasonal' ? 'Thời vụ' : 'Đã nghỉ')}
                            </>} />
                          </td>
                          <td className="worker-profile-notes">
                            {w.notes || '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-action-btns">
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={lang === 'en' ? 'View worker profile' : 'Xem chi tiết hồ sơ công nhân'}
                                aria-label={lang === 'en' ? `View ${w.fullName}` : `Xem chi tiết ${w.fullName}`}
                                onClick={() => setViewingWorker(w)}
                              >
                                <Icon name="eye" size={15} />
                                <span className="sr-only">{lang === 'en' ? 'View details' : 'Xem chi tiết'}</span>
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn edit"
                                title={lang === 'en' ? 'Edit worker profile' : 'Sửa hồ sơ công nhân'}
                                aria-label={lang === 'en' ? `Edit ${w.fullName}` : `Sửa ${w.fullName}`}
                                onClick={() => handleOpenEditWorker(w)}
                              >
                                <Icon name="edit" size={15} />
                                <span className="sr-only">{lang === 'en' ? 'Edit' : 'Chỉnh sửa'}</span>
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={lang === 'en' ? 'Delete worker profile' : 'Xóa hồ sơ công nhân'}
                                aria-label={lang === 'en' ? `Delete ${w.fullName}` : `Xóa ${w.fullName}`}
                                onClick={() => requestAction('worker', w.workerId, w.fullName)}
                              >
                                <Icon name="trash" size={15} />
                                <span className="sr-only">{lang === 'en' ? 'Delete' : 'Xóa'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <TablePagination {...workerPagination} disabled={loadingWorkers} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        open={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title={lang === 'en' ? 'Add Staff to Farm' : 'Thêm nhân viên vào trang trại'}
        headerIcon={<Icon name="users" size={20} />}
        style={{ width: 'min(540px, 100%)' }}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {(lang === 'en' ? "Enter an existing MyCropDiary user's email to grant farm access." : "Nhập email của người dùng đã có tài khoản trên MyCropDiary để cấp quyền làm việc tại trang trại.")}
        </p>
        <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {addStaffError && (
            <p className="form-error-banner" role="alert" style={{ margin: '0 0 4px' }}>
              {translate(addStaffError)}
            </p>
          )}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-email" className="structured-field-label">
                {(lang === 'en' ? "Staff account email " : "Email tài khoản nhân viên ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="add-staff-email" className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="add-staff-email"
                type="email"
                required
                placeholder="nhanvien@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-role" className="structured-field-label">
                {(lang === 'en' ? "Farm role " : "Vai trò trong trang trại ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Role" : "Vai trò")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select className="ui-select"
                id="add-staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">{(lang === 'en' ? "Technical Staff" : "Nhân viên kỹ thuật")}</option>
                <option value="OWNER">{(lang === 'en' ? "Co-Owner" : "Đồng chủ trang trại")}</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-job-title" className="structured-field-label">
                {(lang === 'en' ? "Professional title" : "Chức danh chuyên môn")}
              </label>
              <span className="structured-field-badge">{jobTitle.length}/100 {(lang === 'en' ? "chars" : "ký tự")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="add-staff-job-title"
                type="text"
                maxLength={100}
                placeholder={(lang === 'en' ? "Example: Agronomist / Pest management specialist..." : "VD: Kỹ sư nông học / Quản lý BVTV...")}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddStaffOpen(false)} disabled={savingStaff}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={savingStaff}>
              {savingStaff ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Add Staff' : 'Thêm nhân viên')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={(lang === 'en' ? "Edit Staff Member" : "Chỉnh sửa nhân viên")}
        headerIcon={<Icon name="edit" size={20} />}
        style={{ width: 'min(540px, 100%)' }}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--color-muted)' }}>
          {(lang === 'en' ? "Update the member's farm role, professional title, or employment status." : "Cập nhật vai trò, chức danh chuyên môn hoặc trạng thái làm việc của thành viên.")}
        </p>
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notification?.type === 'error' && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}

          {/* Member Overview Card - Consistent with ZoneModal and AssignStaffModal */}
          <div
            className="structured-field-card"
            style={{
              background: 'var(--color-success-bg)',
              borderColor: 'var(--color-border)',
              marginBottom: 0,
            }}
          >
            <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
              <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                {(lang === 'en' ? "Staff Member" : "Thông tin thành viên")}
              </span>
              <span className="structured-field-badge">
                {editingStaff?.farmRole === 'OWNER'
                  ? (lang === 'en' ? 'Farm Owner' : 'Chủ trang trại')
                  : (lang === 'en' ? 'Technical Staff' : 'Nhân viên kỹ thuật')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <strong style={{ color: 'var(--color-primary-text)', fontSize: '15px' }}>
                👤 {editingStaff?.fullName}
              </strong>
              <small style={{ color: 'var(--color-primary-text)', fontWeight: 600 }}>
                {editingStaff?.email} {editingStaff?.phoneNumber ? `· ${editingStaff.phoneNumber}` : ''}
              </small>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-role" className="structured-field-label">
                {(lang === 'en' ? "Farm role " : "Vai trò trong trang trại ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Role" : "Vai trò")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select className="ui-select"
                id="edit-staff-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as 'OWNER' | 'STAFF')}
              >
                <option value="STAFF">{(lang === 'en' ? "Technical Staff" : "Nhân viên kỹ thuật")}</option>
                <option value="OWNER">{(lang === 'en' ? "Co-Owner" : "Đồng chủ trang trại")}</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-job-title" className="structured-field-label">
                {(lang === 'en' ? "Professional title" : "Chức danh chuyên môn")}
              </label>
              <span className="structured-field-badge">
                {editJobTitle.length}/100 {(lang === 'en' ? "chars" : "ký tự")}
              </span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="edit-staff-job-title"
                type="text"
                maxLength={100}
                placeholder={(lang === 'en' ? "Example: Agronomist / Nutrition manager..." : "VD: Kỹ sư nông học / Quản lý dinh dưỡng...")}
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-status" className="structured-field-label">
                {(lang === 'en' ? "Employment status" : "Trạng thái làm việc")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Status' : 'Trạng thái'}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select className="ui-select"
                id="edit-staff-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">{(lang === 'en' ? "Active" : "Đang hoạt động")}</option>
                <option value="INACTIVE">{(lang === 'en' ? "Suspended" : "Tạm ngưng hoạt động")}</option>
              </select>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setEditingStaff(null)} disabled={savingEdit}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={savingEdit}>
              {(lang === 'en' ? savingEdit ? "Saving..." : "Save changes" : savingEdit ? 'Đang lưu...' : 'Lưu thay đổi')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal ("Form phân công") */}
      <Modal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={(lang === 'en' ? "Assign staff to a zone" : "Phân công staff phụ trách phân khu")}
        headerIcon={<Icon name="plots" size={20} />}
        style={{ width: 'min(580px, 100%)' }}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--color-muted)' }}>
          {(lang === 'en' ? "Assign an engineer or technical staff member to supervise and maintain VietGAP farming records for the production zone." : "Chỉ định kỹ sư hoặc nhân viên kỹ thuật chịu trách nhiệm giám sát và ghi chép nhật ký canh tác theo chuẩn VietGAP cho phân khu sản xuất.")}
        </p>
        <form onSubmit={handleAssignZone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {assignModalError && (
            <p className="form-error-banner" role="alert" style={{ margin: '0 0 4px' }}>
              {translate(assignModalError)}
            </p>
          )}
          {/* Field 1: Chọn staff */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-staff-select" className="structured-field-label">
                {(lang === 'en' ? "Select assigned staff " : "Chọn staff phụ trách ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{activeStaffOptions.length} {(lang === 'en' ? " available staff" : " staff khả dụng")}</span>
            </div>
            {activeStaffOptions.length === 0 ? (
              <p style={{ color: 'var(--color-danger)', fontSize: '13.5px', margin: 0 }}>
                {(lang === 'en' ? "⚠️ The farm has no active staff. Add staff before assigning." : "⚠️ Trang trại chưa có staff đang hoạt động. Vui lòng thêm nhân viên trước khi phân công.")}
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="assign-staff-select"
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{(lang === 'en' ? "-- Select staff member --" : "-- Chọn thành viên phụ trách --")}</option>
                  {activeStaffOptions.map((s) => (
                    <option key={s.farmMemberId} value={s.farmMemberId}>
                      {s.fullName} ({s.email}) — {(s.jobTitle || translate(s.roleLabel || "Staff"))}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Field 2: Chọn phân khu */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-zone-select" className="structured-field-label">
                {(lang === 'en' ? "Assigned production zone " : "Phân khu sản xuất tiếp nhận ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{zones.length} {(lang === 'en' ? " zones" : " phân khu")}</span>
            </div>
            {zoneLoadError ? <LoadError message={zoneLoadError} onRetry={() => { void loadData(); }} /> : zones.length === 0 ? (
              <p style={{ color: 'var(--color-danger)', fontSize: '13.5px', margin: 0 }}>
                {(lang === 'en' ? "⚠️ This farm has no production zones. Create a zone first." : "⚠️ Trang trại chưa có khu vực sản xuất. Vui lòng tạo khu vực trước.")}
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="assign-zone-select"
                  required
                  value={assignZoneId}
                  onChange={(e) => setAssignZoneId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{(lang === 'en' ? "-- Select production zone --" : "-- Chọn phân khu sản xuất --")}</option>
                  {zones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} (KV-00{z.zoneId} · {z.areaValue} {translate(z.areaUnit)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Field 3: Ngày bắt đầu & Ghi chú */}
          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-start-date" className="structured-field-label">
                  {(lang === 'en' ? "Assignment start date " : "Ngày bắt đầu phụ trách ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <label htmlFor="assign-start-date" className="structured-field-badge">{(lang === 'en' ? "Date" : "Ngày")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  id="assign-start-date"
                  type="date"
                  required
                  value={assignedAtDate}
                  onChange={(e) => setAssignedAtDate(e.target.value)}
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-notes" className="structured-field-label">
                  {(lang === 'en' ? "Tasks & Notes" : "Nhiệm vụ & Ghi chú")}
                </label>
                <label htmlFor="assign-notes" className="structured-field-badge">{assignNotes.length}{(lang === 'en' ? "/200 characters" : "/200 ký tự")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  id="assign-notes"
                  type="text"
                  maxLength={200}
                  placeholder={(lang === 'en' ? "Example: Crop management, pest monitoring..." : "VD: Quản lý canh tác, giám sát sâu bệnh...")}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAssignOpen(false)} disabled={savingAssign}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={savingAssign || !assignStaffId || !assignZoneId}
            >
              {(lang === 'en' ? savingAssign ? "Assigning..." : "Confirm assignment" : savingAssign ? 'Đang phân công...' : 'Xác nhận phân công')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Worker Record Modal */}
      <Modal
        open={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        title={(lang === 'en' ? editingWorker ? "Edit worker profile" : "Add new worker profile" : editingWorker ? 'Chỉnh sửa hồ sơ công nhân' : 'Thêm hồ sơ công nhân mới')}
        headerIcon={<Icon name="users" size={20} />}
      >
        <form onSubmit={handleSaveWorker} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {notification?.type === 'error' && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
          <div className="structured-field-card">
            <label htmlFor="staff-management-page-field-1">
              {(lang === 'en' ? "Farm member *" : "Thành viên trang trại *")}
            </label>
            <select id="staff-management-page-field-1" className="ui-select"
              required
              disabled={!!editingWorker}
              value={workerForm.farmMemberId}
              onChange={(e) => setWorkerForm((p) => ({ ...p, farmMemberId: Number(e.target.value) }))}
              style={{ width: '100%', padding: '9px 12px' }}
            >
              <option value={0}>{(lang === 'en' ? "-- Select staff member --" : "-- Chọn thành viên nhân sự --")}</option>
              {staffList.map((s) => (
                <option key={s.farmMemberId} value={s.farmMemberId}>
                  {s.fullName} ({s.email}) - {s.jobTitle || translate(s.roleLabel)}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-form-grid" >
            <div className="structured-field-card">
              <label htmlFor="staff-management-page-control-1">
                {(lang === 'en' ? "Worker code *" : "Mã công nhân *")}
              </label>
              <input id="staff-management-page-control-1" className="ui-input"
                type="text"
                required
                value={workerForm.workerCode}
                onChange={(e) => setWorkerForm((p) => ({ ...p, workerCode: e.target.value }))}
                placeholder={(lang === 'en' ? "e.g. CN-001" : "VD: CN-001")}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>
            <div className="structured-field-card">
              <label htmlFor="staff-management-page-field-2">
                {(lang === 'en' ? "Position / Job title" : "Vị trí / Chức danh")}
              </label>
              <input id="staff-management-page-field-2" className="ui-input"
                type="text"
                value={workerForm.jobTitle || ''}
                onChange={(e) => setWorkerForm((p) => ({ ...p, jobTitle: e.target.value }))}
                placeholder={(lang === 'en' ? "Example: Harvest worker, Sprayer..." : "VD: Công nhân thu hoạch, Phun thuốc...")}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>
          </div>

          <div className="ui-form-grid" >
            <div className="structured-field-card">
              <label htmlFor="staff-management-page-field-3">
                {(lang === 'en' ? "Employment status *" : "Tình trạng làm việc *")}
              </label>
              <select id="staff-management-page-field-3" className="ui-select"
                required
                value={workerForm.employmentStatus || 'active'}
                onChange={(e) => setWorkerForm((p) => ({ ...p, employmentStatus: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px' }}
              >
                <option value="active">{(lang === 'en' ? "Active" : "Đang làm việc")}</option>
                <option value="seasonal">{(lang === 'en' ? "Seasonal worker" : "Lao động thời vụ (Seasonal)")}</option>
                <option value="inactive">{(lang === 'en' ? "Inactive" : "Đã nghỉ việc")}</option>
              </select>
            </div>
            <div className="structured-field-card">
              <label htmlFor="staff-management-page-field-4">
                {(lang === 'en' ? "Employment start date" : "Ngày vào làm")}
              </label>
              <input id="staff-management-page-field-4" className="ui-input"
                type="date"
                value={workerForm.hiredAt || ''}
                onChange={(e) => setWorkerForm((p) => ({ ...p, hiredAt: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>
          </div>

          <div className="structured-field-card">
            <label htmlFor="staff-management-page-field-5">
              {(lang === 'en' ? "Profile notes" : "Ghi chú hồ sơ")}
            </label>
            <textarea id="staff-management-page-field-5" className="ui-textarea"
              rows={2}
              value={workerForm.notes || ''}
              onChange={(e) => setWorkerForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={(lang === 'en' ? "Note experience and existing VietGAP certifications..." : "Ghi chú kinh nghiệm, chứng chỉ VietGAP đã có...")}
              style={{ width: '100%', padding: '9px 12px' }}
            />
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsWorkerModalOpen(false)}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={savingWorker}>
              {(lang === 'en' ? savingWorker ? "Saving..." : editingWorker ? "Save changes" : "Add profile" : savingWorker ? 'Đang lưu...' : editingWorker ? 'Lưu thay đổi' : 'Thêm hồ sơ')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Staff Member Profile Modal */}
      {viewingStaff && (
        <Modal
          open={Boolean(viewingStaff)}
          onClose={() => setViewingStaff(null)}
          title={lang === 'en' ? "Staff Member Profile" : "Hồ sơ chi tiết nhân sự"}
          headerIcon={<Icon name="eye" size={20} />}
          style={{ width: 'min(560px, 100%)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              className="structured-field-card"
              style={{
                background: 'var(--color-success-bg)',
                borderColor: 'var(--color-border)',
                marginBottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {viewingStaff.fullName.trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {viewingStaff.fullName}
                  </h3>
                  <span className={`status-dot-badge ${viewingStaff.status === 'ACTIVE' ? 'active' : 'completed'}`}>
                    <span className="dot" />
                    {lang === 'en' ? (viewingStaff.status === 'ACTIVE' ? 'Active' : 'Inactive') : (viewingStaff.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngưng')}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>
                  ID #{viewingStaff.farmMemberId} · {viewingStaff.farmRole === 'OWNER' ? (lang === 'en' ? 'Farm Owner' : 'Chủ trang trại') : (lang === 'en' ? 'Technical Staff' : 'Nhân sự kỹ thuật')}
                </p>
              </div>
            </div>

            <div className="ui-form-grid" style={{ background: 'var(--color-page)', padding: '16px', borderRadius: '10px', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Email Address' : 'Địa chỉ Email'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingStaff.email || '—'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingStaff.phoneNumber || '—'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Professional Title' : 'Chức danh công việc'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingStaff.jobTitle || viewingStaff.roleLabel || '—'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Join Date' : 'Ngày gia nhập'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingStaff.joinedAt ? displayDate(viewingStaff.joinedAt, lang) : '—'}
                </strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '8px' }}>
                {lang === 'en' ? 'Assigned Production Zones:' : 'Phân khu phụ trách:'}
              </span>
              {(() => {
                const memberAssignments = assignments.filter((a) => a.farmMemberId === viewingStaff.farmMemberId || a.staffEmail === viewingStaff.email);
                if (memberAssignments.length === 0) {
                  return (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', fontSize: '13px', color: 'var(--color-muted)' }}>
                      {lang === 'en' ? 'No specific zone assignments.' : 'Chưa được phân công phụ trách phân khu nào.'}
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {memberAssignments.map((a) => (
                      <span key={a.assignmentId} className="crop-cat-pill" style={{ background: 'var(--color-success-bg)', color: 'var(--color-primary-text)', fontWeight: 600 }}>
                        📍 {a.zoneName}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setViewingStaff(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const toEdit = viewingStaff;
                    setViewingStaff(null);
                    openEditModal(toEdit);
                  }}
                >
                  <Icon name="edit" size={15} /> {lang === 'en' ? 'Edit Staff' : 'Chỉnh sửa'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* View Worker Profile Modal */}
      {viewingWorker && (
        <Modal
          open={Boolean(viewingWorker)}
          onClose={() => setViewingWorker(null)}
          title={lang === 'en' ? "Worker Profile Details" : "Chi tiết hồ sơ công nhân"}
          headerIcon={<Icon name="eye" size={20} />}
          style={{ width: 'min(560px, 100%)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              className="structured-field-card"
              style={{
                background: 'var(--color-success-bg)',
                borderColor: 'var(--color-border)',
                marginBottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                👷
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {viewingWorker.fullName}
                  </h3>
                  <StatusBadge
                    tone={viewingWorker.employmentStatus === 'active' ? 'success' : 'neutral'}
                    label={<>
                      {lang === 'en' ? (viewingWorker.employmentStatus === 'active' ? 'Active' : viewingWorker.employmentStatus === 'seasonal' ? 'Seasonal' : 'Left') : (viewingWorker.employmentStatus === 'active' ? 'Đang làm việc' : viewingWorker.employmentStatus === 'seasonal' ? 'Thời vụ' : 'Đã nghỉ')}
                    </>}
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>
                  {viewingWorker.workerCode || `#${viewingWorker.workerId}`} · {viewingWorker.jobTitle || (lang === 'en' ? 'Worker' : 'Công nhân')}
                </p>
              </div>
            </div>

            <div className="ui-form-grid" style={{ background: 'var(--color-page)', padding: '16px', borderRadius: '10px', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingWorker.phoneNumber || '—'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Email Address' : 'Địa chỉ Email'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingWorker.email || '—'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Employment Status' : 'Tình trạng làm việc'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {lang === 'en' ? (viewingWorker.employmentStatus === 'active' ? 'Full-time / Active' : viewingWorker.employmentStatus === 'seasonal' ? 'Seasonal' : 'Left') : (viewingWorker.employmentStatus === 'active' ? 'Chính thức / Đang làm' : viewingWorker.employmentStatus === 'seasonal' ? 'Thời vụ' : 'Đã nghỉ việc')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                  {lang === 'en' ? 'Hire Date' : 'Ngày vào làm'}
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {viewingWorker.hiredAt ? displayDate(viewingWorker.hiredAt, lang) : '—'}
                </strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Worker Notes & Certifications:' : 'Ghi chú & Chứng nhận:'}
              </span>
              <p style={{ margin: 0, padding: '12px 14px', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                {viewingWorker.notes || (lang === 'en' ? 'No notes provided.' : 'Chưa có ghi chú kinh nghiệm hoặc chứng nhận VietGAP.')}
              </p>
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setViewingWorker(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const toEdit = viewingWorker;
                  setViewingWorker(null);
                  handleOpenEditWorker(toEdit);
                }}
              >
                <Icon name="edit" size={15} /> {lang === 'en' ? 'Edit Profile' : 'Chỉnh sửa hồ sơ'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmDialog open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'worker' ? (lang === 'en' ? 'Delete worker profile' : 'Xóa hồ sơ công nhân')
          : pendingAction?.kind === 'deactivate' ? (lang === 'en' ? 'Deactivate member' : 'Ngừng kích hoạt thành viên')
          : (lang === 'en' ? 'Cancel assignment' : 'Hủy phân công')}
        description={pendingAction?.kind === 'worker' ? (lang === 'en' ? 'Are you sure you want to delete this worker profile?' : 'Bạn có chắc chắn muốn xóa hồ sơ công nhân này?')
          : pendingAction?.kind === 'deactivate' ? (lang === 'en' ? `Deactivate member "${pendingAction.name}" from the farm?` : `Ngừng kích hoạt thành viên "${pendingAction.name}" khỏi trang trại?`)
          : (lang === 'en' ? 'Are you sure you want to cancel this assignment?' : 'Bạn có chắc muốn hủy lượt phân công này?')}
        tone="danger" loading={confirmingAction}
        onClose={() => setPendingAction(null)} onConfirm={() => void confirmPendingAction()} />
      <ConfirmDialog open={Boolean(deleteWorkerTarget)} title={lang === 'en' ? 'Remove farm member' : 'Xóa thành viên trang trại'}
        description={lang === 'en' ? 'This revokes farm access and related assignments.' : 'Thao tác này sẽ hủy quyền truy cập trang trại và các phân công liên quan.'}
        confirmLabel={lang === 'en' ? 'Remove member' : 'Xóa thành viên'} tone="danger" loading={deletingWorker}
        onClose={() => { if (!deletingWorker) setDeleteWorkerTarget(null); }}
        onConfirm={() => { if (deleteWorkerTarget) void handleDeleteStaff(deleteWorkerTarget.farmMemberId, deleteWorkerTarget.fullName); }} />
    </section>
  );
}