import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import {
  getFarmStaffList,
  addFarmStaffMember,
  updateFarmStaffMember,
  deactivateFarmStaffMember,
  deleteFarmStaffMember,
  fetchCandidateUsers,
  type CandidateUser,
  type FarmStaffRecord,
  getFarmWorkersApi,
  createFarmWorkerApi,
  updateFarmWorkerApi,
  deleteFarmWorkerApi,
  type FarmWorkerResp,
  type FarmWorkerReq,
} from './staffService';
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
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('ALL');
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<FarmWorkerResp | null>(null);
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
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Staff Modal
    // Candidate Users for Add Staff
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);
  const [useManualEmail, setUseManualEmail] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [jobTitle, setJobTitle] = useState('Kỹ sư nông nghiệp');
  const [savingStaff, setSavingStaff] = useState(false);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);

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
  const [assignModalError, setAssignModalError] = useState<string | null>(null);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

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
    if (!silent && !farmStaffMemoryCache.has(farmId)) setLoading(true);
    try {
      const [staffData, zoneData, assignData] = await Promise.all([
        getFarmStaffList(farmId),
        fetchZonesByFarm(farmId).catch(() => [] as Zone[]),
        fetchZoneAssignments(farmId).catch(() => [] as StaffZoneAssignment[]),
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
        setNotification({
          text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load farm staff data." : err instanceof Error ? err.message : 'Không thể tải dữ liệu staff trang trại.'),
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
    try {
      const list = await getFarmWorkersApi(farmId, {
        status: workerStatusFilter === 'ALL' ? undefined : workerStatusFilter,
        keyword: workerSearch.trim() || undefined,
      });
      setWorkers(list);
    } catch {
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
    if (!farmId || !window.confirm((lang === 'en' ? "Are you sure you want to delete this worker profile?" : 'Bạn có chắc chắn muốn xóa hồ sơ công nhân này?'))) return;
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
    setSelectedCandidate(null);
    setCandidateKeyword('');
    setUseManualEmail(false);
    setRole('STAFF');
    setJobTitle('Kỹ sư nông nghiệp');
    if (farmId) {
      setLoadingCandidates(true);
      try {
        const list = await fetchCandidateUsers(farmId);
        setCandidates(list);
      } catch {
        setCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    }
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
      setAddStaffError((lang === 'en' ? `Account "${email.trim()}" is already a farm member (Status: ${existing.status || 'Active'}). Duplicate members cannot be added!` : `Tài khoản "${email.trim()}" đã là thành viên of trang trại (Trạng thái: ${existing.status || 'Active'}). Không thể thêm trùng lặp!`));
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
        text: (lang === 'en' ? `Added member "${created.fullName}" (${created.email}) to the farm successfully!` : `Đã thêm thành viên "${created.fullName}" (${created.email}) vào trang trại thành công!`),
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
    if (!window.confirm((lang === 'en' ? `Deactivate member "${name}" from the farm?` : `Ngừng kích hoạt thành viên "${name}" khỏi trang trại?`))) return;
    setNotification(null);
    try {
      await deactivateFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: (lang === 'en' ? `Suspended access for "${name}".` : `Đã tạm dừng quyền truy cập của "${name}".`), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : `Unable to deactivate member "${name}".` : err instanceof Error ? err.message : `Không thể vô hiệu hóa thành viên "${name}".`),
        type: 'error',
      });
    }
  };

  const handleReactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    setNotification(null);
    try {
      await updateFarmStaffMember(selectedFarm.id, memberId, { status: 'ACTIVE' });
      setNotification({ text: (lang === 'en' ? `Reactivated member "${name}" successfully!` : `Đã kích hoạt lại thành viên "${name}" thành công!`), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : `Unable to reactivate "${name}".` : err instanceof Error ? err.message : `Không thể kích hoạt lại "${name}".`),
        type: 'error',
      });
    }
  };

  const openEditModal = (staff: FarmStaffRecord) => {
    setEditingStaff(staff);
    setEditRole(staff.farmRole === 'OWNER' ? 'OWNER' : 'STAFF');
    const isGenericRole = ['chủ trang trại', 'nhân viên kỹ thuật', 'thành viên trang trại'].includes(
      (staff.roleLabel || '').trim().toLowerCase()
    );
    setEditJobTitle(isGenericRole ? '' : staff.roleLabel);
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
        text: (lang === 'en' ? `Updated member "${editingStaff.fullName}" successfully!` : `Đã cập nhật thông tin thành viên "${editingStaff.fullName}" thành công!`),
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
    if (!window.confirm((lang === 'en' ? `Confirm removal of member "${name}" from the farm? This revokes all access and assignments.` : `Xác nhận xóa thành viên "${name}" khỏi trang trại? Thao tác này sẽ hủy mọi quyền truy cập và phân công.`))) return;
    setNotification(null);
    try {
      await deleteFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: (lang === 'en' ? `Removed member "${name}" from the farm successfully!` : `Đã xóa thành viên "${name}" khỏi trang trại thành công!`), type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : `Unable to remove member "${name}".` : err instanceof Error ? err.message : `Không thể xóa thành viên "${name}".`),
        type: 'error',
      });
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
      const msg = (lang === 'en' ? `Staff member "${(staffObj?.fullName || '#' + assignStaffId)}" is already assigned to zone "${(zoneObj?.zoneName || '#' + assignZoneId)}". Duplicate assignments are not allowed!` : `Nhân sự "${staffObj?.fullName || '#' + assignStaffId}" đã và đang được phân công phụ trách phân khu "${zoneObj?.zoneName || '#' + assignZoneId}". Không thể phân công trùng lặp!`);
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
    if (!window.confirm((lang === 'en' ? "Are you sure you want to cancel this assignment?" : 'Bạn có chắc muốn hủy lượt phân công này?'))) return;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px', width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {lang === 'en' ? 'Farm Staff & Area Assignments' : 'Người lao động & Phân công'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {lang === 'en' ? `${staffList.length} staff · ${assignments.length} VietGAP cultivation area assignments at ${selectedFarm?.farmName || 'Farm'}` : `${staffList.length} nhân viên · ${assignments.length} phân công vùng canh tác VietGAP tại ${selectedFarm?.farmName || 'Trang trại'}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isOwner &&
            (activeTab === 'staff' ? (
              <button
                type="button"
                className="primary-button"
                onClick={openAddStaffModal}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Staff' : 'Thêm nhân viên'}
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={openAssignModal}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Icon name="plus" size={17} /> {lang === 'en' ? 'Assign New Area' : 'Phân công vùng mới'}
              </button>
            ))}
        </div>
      </div>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Integrated Tabs */}
        <div className="zone-integrated-tabs">
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Icon name="users" size={17} /> Staff List <span className="tab-count">({staffList.length})</span>
          </button>
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <Icon name="blocks" size={17} /> Zone Assignments <span className="tab-count">({assignments.length})</span>
          </button>
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
          >
            <Icon name="users" size={17} /> {(lang === 'en' ? " Worker profiles " : " Hồ sơ công nhân ")} <span className="tab-count">({workers.length})</span>
          </button>
        </div>

        {activeTab === 'staff' && (
          <>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by active status" : "Lọc theo trạng thái hoạt động")}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
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
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">⏳</div>
                <h2>{(lang === 'en' ? "Loading staff..." : "Đang tải danh sách staff...")}</h2>
              </div>
            ) : (
              <>
                <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
                  <table className="data-table" style={{ width: '100%', minWidth: '960px', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '44px', minWidth: '44px', padding: '12px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <input type="checkbox" aria-label={(lang === 'en' ? "Select all staff" : "Chọn tất cả staff")} style={{ cursor: 'pointer' }} />
                        </th>
                        <th style={{ width: isOwner ? '23%' : '26%', padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Staff Member' : 'Thành viên'}
                        </th>
                        <th style={{ width: isOwner ? '20%' : '23%', padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Contact' : 'Liên hệ'}
                        </th>
                        <th style={{ width: isOwner ? '12%' : '14%', padding: '12px 12px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Role' : 'Vai trò'}
                        </th>
                        <th style={{ width: isOwner ? '11%' : '13%', padding: '12px 10px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          {lang === 'en' ? 'Assigned Areas' : 'Vùng tham gia'}
                        </th>
                        <th style={{ width: isOwner ? '11%' : '12%', padding: '12px 10px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          {lang === 'en' ? 'Joined Date' : 'Ngày tham gia'}
                        </th>
                        <th style={{ width: isOwner ? '11%' : '12%', padding: '12px 10px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          {lang === 'en' ? 'Status' : 'Trạng thái'}
                        </th>
                        {isOwner && (
                          <th style={{ width: '12%', padding: '12px 10px', textAlign: 'center', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                            {lang === 'en' ? 'Actions' : 'Thao tác'}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={isOwner ? 8 : 7} style={{ textAlign: 'center', padding: '56px 20px', background: '#ffffff' }}>
                            <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '14px',
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  display: 'grid',
                                  placeItems: 'center',
                                  marginBottom: '14px',
                                }}
                              >
                                <Icon name="users" size={28} />
                              </div>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                                {(lang === 'en' ? "No matching staff" : "Chưa có staff phù hợp")}
                              </h3>
                              <p style={{ color: '#64748b', fontSize: '13.5px', margin: '0 0 18px', lineHeight: 1.5 }}>
                                {lang === 'en' ? 'Try searching with different keywords or click "Add Staff" with an activated account email.' : 'Hãy thử tìm kiếm với từ khóa khác hoặc bấm "Thêm nhân viên" bằng email tài khoản đã kích hoạt.'}
                              </p>
                              {isOwner && (
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={openAddStaffModal}
                                  style={{
                                    padding: '8px 18px',
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    borderRadius: '9px',
                                    background: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 3px 10px rgba(5, 150, 105, 0.2)',
                                  }}
                                >
                                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Staff' : 'Thêm nhân viên'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((staff) => {
                        const isActive = staff.status === 'ACTIVE';
                        const { displayName, subTitle, initials } = parseStaffName(staff.fullName);

                        return (
                          <tr key={staff.farmMemberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <input type="checkbox" aria-label={(lang === 'en' ? `Select ${displayName}` : `Chọn ${displayName}`)} style={{ cursor: 'pointer' }} />
                            </td>

                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong
                                      style={{
                                        color: '#0f172a',
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
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                      #{staff.farmMemberId}
                                    </span>
                                  </div>
                                  {subTitle && (
                                    <span
                                      style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#059669',
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

                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div
                                style={{
                                  color: '#0f172a',
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
                                  color: '#64748b',
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

                            <td style={{ padding: '12px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{
                                  background: staff.farmRole === 'OWNER' ? '#ecfdf5' : '#f8fafc',
                                  color: staff.farmRole === 'OWNER' ? '#047857' : '#334155',
                                  borderColor: staff.farmRole === 'OWNER' ? '#a7f3d0' : '#cbd5e1',
                                  fontWeight: 650,
                                }}
                              >
                                {translate(staff.roleLabel)}
                              </span>
                            </td>

                            <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  background: staff.activeAssignmentCount > 0 ? '#ecfdf5' : '#f1f5f9',
                                  color: staff.activeAssignmentCount > 0 ? '#047857' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                {staff.activeAssignmentCount} {(lang === 'en' ? " zones" : " vùng")}
                              </span>
                            </td>

                            <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString('vi-VN') : '—'}
                            </td>

                            <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span className={`status-dot-badge ${isActive ? 'active' : 'completed'}`}>
                                <span className="dot" />
                                {(lang === 'en' ? isActive ? "Active" : "Inactive" : isActive ? 'Active' : 'Đã ngưng')}
                              </span>
                            </td>

                            {isOwner && (
                              <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div className="table-action-btns" style={{ justifyContent: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="table-icon-btn edit"
                                    title={(lang === 'en' ? "Edit staff information" : "Chỉnh sửa thông tin staff")}
                                    aria-label={(lang === 'en' ? `Edit ${displayName}` : `Chỉnh sửa ${displayName}`)}
                                    onClick={() => openEditModal(staff)}
                                  >
                                    <Icon name="edit" size={15} />
                                    <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
                                  </button>
                                  {isActive ? (
                                    <button
                                      type="button"
                                      className="table-icon-btn"
                                      title={(lang === 'en' ? "Suspend staff member" : "Tạm ngưng hoạt động nhân viên")}
                                      aria-label={(lang === 'en' ? `Suspend ${displayName}` : `Tạm dừng ${displayName}`)}
                                      onClick={() => handleDeactivate(staff.farmMemberId, displayName)}
                                    >
                                      <Icon name="close" size={14} />
                                      <span className="sr-only">{(lang === 'en' ? "Suspend" : "Tạm ngưng")}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="table-icon-btn edit"
                                      title={(lang === 'en' ? "Reactivate staff member" : "Kích hoạt lại nhân viên")}
                                      aria-label={(lang === 'en' ? `Reactivate ${displayName}` : `Kích hoạt lại ${displayName}`)}
                                      onClick={() => handleReactivate(staff.farmMemberId, displayName)}
                                    >
                                      <Icon name="check" size={14} />
                                      <span className="sr-only">{(lang === 'en' ? "Activate" : "Kích hoạt")}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title={(lang === 'en' ? "Remove staff from farm" : "Xóa staff khỏi trang trại")}
                                    aria-label={(lang === 'en' ? `Delete ${displayName}` : `Xóa ${displayName}`)}
                                    onClick={() => setDeleteWorkerTarget(staff)}
                                  >
                                    <Icon name="trash" size={15} />
                                    <span className="sr-only">{(lang === 'en' ? "Delete" : "Xóa")}</span>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="zone-table-footer">
                  <div>
                    Showing {filteredStaff.length > 0 ? `1–${filteredStaff.length}` : '0'} of {filteredStaff.length} staff
                  </div>
                  <div className="zone-pagination-wrap">
                    <button type="button" className="zone-page-btn" disabled aria-label={(lang === 'en' ? "Previous page" : "Trang trước")}>
                      <Icon name="chevron-left" size={15} />
                    </button>
                    <button type="button" className="zone-page-btn active">
                      1
                    </button>
                    <button type="button" className="zone-page-btn" disabled aria-label={(lang === 'en' ? "Next page" : "Trang sau")}>
                      <Icon name="chevron-right" size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'assignments' && (
          <>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder="Search by staff name or assigned zone..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  value={assignZoneFilter}
                  onChange={(e) => setAssignZoneFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by production zone" : "Lọc theo phân khu sản xuất")}
                >
                  <option value="ALL">All Zones ({zones.length})</option>
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
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">⏳</div>
                <h2>{(lang === 'en' ? "Loading assignments..." : "Đang tải danh sách phân công...")}</h2>
              </div>
            ) : (
              <>
                <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '40px', padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label={(lang === 'en' ? "Select all assignments" : "Chọn tất cả phân công")} style={{ cursor: 'pointer' }} />
                        </th>
                        <th style={{ width: isOwner ? '24%' : '27%', padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Production Zone' : 'Phân khu sản xuất'}
                        </th>
                        <th style={{ width: isOwner ? '23%' : '26%', padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Assigned Staff' : 'Nhân sự phụ trách'}
                        </th>
                        <th style={{ width: isOwner ? '15%' : '17%', padding: '12px 12px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Role / Title' : 'Vai trò / Chức vụ'}
                        </th>
                        <th style={{ width: isOwner ? '13%' : '15%', padding: '12px 10px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          {lang === 'en' ? 'Start Date' : 'Ngày bắt đầu'}
                        </th>
                        <th style={{ width: isOwner ? '13%' : '15%', padding: '12px 12px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          {lang === 'en' ? 'Assigned By' : 'Người giao việc'}
                        </th>
                        {isOwner && (
                          <th style={{ width: '12%', padding: '12px 10px', textAlign: 'center', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                            {lang === 'en' ? 'Actions' : 'Thao tác'}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={isOwner ? 7 : 6} style={{ textAlign: 'center', padding: '56px 20px', background: '#ffffff' }}>
                            <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '14px',
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  display: 'grid',
                                  placeItems: 'center',
                                  marginBottom: '14px',
                                }}
                              >
                                <Icon name="blocks" size={28} />
                              </div>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                                {(lang === 'en' ? assignments.length === 0 ? "No assignments yet" : "No matching assignments" : assignments.length === 0 ? 'No assignments yet' : 'Không tìm thấy phân công phù hợp')}
                              </h3>
                              <p style={{ color: '#64748b', fontSize: '13.5px', margin: '0 0 18px', lineHeight: 1.5 }}>
                                {(lang === 'en' ? assignments.length === 0 ? 'Assign technical personnel to production zones to oversee seasons, blocks, and VietGAP compliance.' : "Try another keyword or reset the zone filter." : assignments.length === 0
                                  ? 'Assign technical personnel to production zones to oversee seasons, blocks, and VietGAP compliance.'
                                  : 'Hãy thử tìm kiếm với từ khóa khác hoặc làm mới bộ lọc phân khu.')}
                              </p>
                              {isOwner && assignments.length === 0 && (
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={openAssignModal}
                                  style={{
                                    padding: '9px 18px',
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    borderRadius: '9px',
                                    background: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                                  }}
                                >
                                  <Icon name="plus" size={16} /> {(lang === 'en' ? " Assign now" : " Phân công ngay")}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAssignments.map((item) => {
                        const { displayName, subTitle, initials } = parseStaffName(item.staffName);

                        return (
                          <tr key={item.assignmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="checkbox"
                                aria-label={(lang === 'en' ? `Select assignment for ${displayName}` : `Chọn phân công của ${displayName}`)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>

                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <span
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Icon name="blocks" size={17} />
                                </span>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={(lang === 'en' ? item.zoneName || `Zone #${item.zoneId}` : item.zoneName || `Phân khu #${item.zoneId}`)}>
                                    {(lang === 'en' ? item.zoneName || `Zone #${item.zoneId}` : item.zoneName || `Phân khu #${item.zoneId}`)}
                                  </strong>
                                  <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                                    {(lang === 'en' ? "Code: KV-00" : "Mã: KV-00")}{item.zoneId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayName}>
                                    {displayName}
                                  </strong>
                                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.staffEmail || ''}>
                                    {(lang === 'en' ? item.staffEmail || "No email" : item.staffEmail || 'Chưa có email')}
                                  </span>
                                  {subTitle && (
                                    <span style={{ display: 'block', fontSize: '11.5px', color: '#059669', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={translate(subTitle)}>
                                      {translate(subTitle)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 650 }}
                              >
                                {(lang === 'en' ? item.jobTitle || "Assigned technical staff" : item.jobTitle || 'Technical Staff phụ trách')}
                              </span>
                            </td>

                            <td style={{ padding: '12px 10px', color: '#64748b', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString('vi-VN') : '—'}
                            </td>

                            <td style={{ padding: '12px 12px', color: '#334155', fontSize: '13px', fontWeight: 500, verticalAlign: 'middle', overflow: 'hidden' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={item.assignedByName || 'Farm Owner'}>
                                {item.assignedByName || 'Farm Owner'}
                              </span>
                            </td>

                            {isOwner && (
                              <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div className="table-action-btns" style={{ justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title={(lang === 'en' ? "Remove staff assignment from zone" : "Hủy phân công staff khỏi phân khu")}
                                    aria-label={(lang === 'en' ? `Cancel assignment for ${displayName}` : `Hủy phân công cho ${displayName}`)}
                                    onClick={() => handleUnassign(item.assignmentId)}
                                  >
                                    <Icon name="trash" size={15} />
                                    <span className="sr-only">{(lang === 'en' ? "Cancel assignment" : "Hủy phân công")}</span>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="zone-table-footer">
                  <div>
                    Showing {filteredAssignments.length > 0 ? `1–${filteredAssignments.length}` : '0'} of {filteredAssignments.length} {(lang === 'en' ? " assignments" : " lượt phân công")}
                  </div>
                  <div className="zone-pagination-wrap">
                    <button type="button" className="zone-page-btn" disabled aria-label={(lang === 'en' ? "Previous page" : "Trang trước")}>
                      <Icon name="chevron-left" size={15} />
                    </button>
                    <button type="button" className="zone-page-btn active">
                      1
                    </button>
                    <button type="button" className="zone-page-btn" disabled aria-label={(lang === 'en' ? "Next page" : "Trang sau")}>
                      <Icon name="chevron-right" size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'workers' && (
          <>
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder={(lang === 'en' ? "Search by worker ID, name, or position..." : "Tìm theo mã công nhân, họ tên, chức danh...")}
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  value={workerStatusFilter}
                  onChange={(e) => setWorkerStatusFilter(e.target.value)}
                  aria-label={(lang === 'en' ? "Filter by employment status" : "Lọc theo tình trạng làm việc")}
                >
                  <option value="ALL">{(lang === 'en' ? "All statuses" : "Tất cả tình trạng")}</option>
                  <option value="active">{(lang === 'en' ? "Active" : "Đang làm việc (Active)")}</option>
                  <option value="inactive">{(lang === 'en' ? "Inactive" : "Đã nghỉ việc (Inactive)")}</option>
                  <option value="seasonal">{(lang === 'en' ? "Seasonal" : "Thời vụ (Seasonal)")}</option>
                </select>
              </div>

              <div className="zone-clean-actions">
                <button
                  type="button"
                  className="zone-btn zone-btn-primary"
                  onClick={handleOpenAddWorker}
                >
                  <Icon name="plus" size={16} /> {(lang === 'en' ? " Add worker profile" : " Thêm hồ sơ công nhân")}
                </button>
              </div>
            </div>

            {loadingWorkers ? (
              <div className="zone-clean-loading">
                <div className="zone-spinner" />
                <p>{(lang === 'en' ? "Loading worker profiles..." : "Đang tải danh sách hồ sơ công nhân...")}</p>
              </div>
            ) : workers.length === 0 ? (
              <div className="zone-clean-empty">
                <Icon name="users" size={48} />
                <h3>{(lang === 'en' ? "No worker profiles yet" : "Chưa có hồ sơ công nhân")}</h3>
                <p>{(lang === 'en' ? "Click \"Add worker profile\" to create worker records under VietGAP standards." : "Nhấn nút \"Thêm hồ sơ công nhân\" để thiết lập hồ sơ người lao động theo tiêu chuẩn VietGAP.")}</p>
              </div>
            ) : (
              <div className="zone-clean-table-wrap">
                <table className="zone-clean-table">
                  <thead>
                    <tr>
                      <th>{(lang === 'en' ? "Worker ID" : "Mã CN")}</th>
                      <th>{(lang === 'en' ? "Full Name & Phone" : "Họ tên & SĐT")}</th>
                      <th>{(lang === 'en' ? "Position / Job title" : "Vị trí / Chức danh")}</th>
                      <th>{(lang === 'en' ? "Employment start date" : "Ngày vào làm")}</th>
                      <th>{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                      <th>{(lang === 'en' ? "Notes" : "Ghi chú")}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers
                      .filter((w) => {
                        if (workerStatusFilter !== 'ALL' && w.employmentStatus !== workerStatusFilter) return false;
                        if (workerSearch.trim()) {
                          const q = workerSearch.toLowerCase();
                          const matchCode = w.workerCode?.toLowerCase().includes(q);
                          const matchName = w.fullName?.toLowerCase().includes(q);
                          const matchJob = w.jobTitle?.toLowerCase().includes(q);
                          if (!matchCode && !matchName && !matchJob) return false;
                        }
                        return true;
                      })
                      .map((w) => (
                        <tr key={w.workerId}>
                          <td>
                            <span className="profile-tag-pill" style={{ fontWeight: 700 }}>
                              {w.workerCode}
                            </span>
                          </td>
                          <td>
                            <strong>{w.fullName}</strong>
                            {w.phoneNumber && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {w.phoneNumber}</div>
                            )}
                          </td>
                          <td>{(lang === 'en' ? w.jobTitle || "Worker" : w.jobTitle || 'Công nhân')}</td>
                          <td>{w.hiredAt ? new Date(w.hiredAt).toLocaleDateString('vi-VN') : '—'}</td>
                          <td>
                            <span className={`status-badge ${w.employmentStatus === 'active' ? 'status-badge--success' : ''}`}>
                              {(lang === 'en' ? w.employmentStatus === 'active' ? "Active" : w.employmentStatus === 'seasonal' ? "Seasonal" : "Left" : w.employmentStatus === 'active' ? 'Đang làm việc' : w.employmentStatus === 'seasonal' ? 'Thời vụ' : 'Đã nghỉ')}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', fontSize: '12.5px', color: '#64748b' }}>
                            {w.notes || '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => handleOpenEditWorker(w)}
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                              >
                                {(lang === 'en' ? "Edit" : "Sửa")}
                              </button>
                              <button
                                type="button"
                                className="outline-button"
                                onClick={() => void handleDeleteWorker(w.workerId)}
                                style={{ fontSize: '12px', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                              >
                                {(lang === 'en' ? "Delete" : "Xóa")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        open={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title={lang === 'en' ? 'Add Staff to Farm' : 'Thêm nhân viên vào trang trại'}
        headerIcon={<Icon name="users" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
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
                {(lang === 'en' ? "Staff account email " : "Email tài khoản nhân viên ")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
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
                {(lang === 'en' ? "Farm role " : "Vai trò of trang trại ")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Permissions" : "Phân quyền")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="add-staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">{(lang === 'en' ? "Technical Staff (STAFF)" : "Nhân viên kỹ thuật (STAFF)")}</option>
                <option value="OWNER">{(lang === 'en' ? "Co-Owner (OWNER)" : "Đồng chủ trang trại (OWNER)")}</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-job-title" className="structured-field-label">
                {(lang === 'en' ? "Professional title" : "Chức danh chuyên môn")}
              </label>
              <span className="structured-field-badge">Showing</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
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
            <button type="button" className="ghost-button" onClick={() => setIsAddStaffOpen(false)} disabled={savingStaff}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </button>
            <button type="submit" className="primary-button" disabled={savingStaff}>
              {savingStaff ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Add Staff' : 'Thêm nhân viên')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={(lang === 'en' ? `Edit staff: ${editingStaff?.fullName || ''}` : `Chỉnh sửa nhân viên: ${editingStaff?.fullName || ''}`)}
        headerIcon={<Icon name="edit" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b' }}>
          {(lang === 'en' ? "Update the member's role, professional title, or employment status." : "Cập nhật vai trò, chức danh chuyên môn hoặc trạng thái làm việc của thành viên.")}
        </p>
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-role" className="structured-field-label">
                {(lang === 'en' ? "Farm role " : "Vai trò of trang trại ")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Permissions" : "Quyền hạn")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="edit-staff-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as 'OWNER' | 'STAFF')}
              >
                <option value="STAFF">{(lang === 'en' ? "Technical Staff (STAFF)" : "Nhân viên kỹ thuật (STAFF)")}</option>
                <option value="OWNER">{(lang === 'en' ? "Co-Owner (OWNER)" : "Đồng chủ trang trại (OWNER)")}</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-job-title" className="structured-field-label">
                {(lang === 'en' ? "Professional title" : "Chức danh chuyên môn")}
              </label>
              <span className="structured-field-badge">{(lang === 'en' ? "Custom" : "Tùy chỉnh")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
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
                {(lang === 'en' ? "Employment status" : "Trạng thái làm việc")}
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Status' : 'Trạng thái'}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="edit-staff-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">Active (ACTIVE)</option>
                <option value="INACTIVE">{(lang === 'en' ? "Suspended (INACTIVE)" : "Tạm ngưng (INACTIVE)")}</option>
              </select>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setEditingStaff(null)} disabled={savingEdit}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </button>
            <button type="submit" className="primary-button" disabled={savingEdit}>
              {(lang === 'en' ? savingEdit ? "Saving..." : "Save changes" : savingEdit ? 'Đang lưu...' : 'Lưu thay đổi')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal ("Form phân công") */}
      <Modal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={(lang === 'en' ? "Assign staff to a zone" : "Phân công staff phụ trách phân khu")}
        headerIcon={<Icon name="blocks" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b' }}>
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
                {(lang === 'en' ? "Select assigned staff " : "Chọn staff phụ trách ")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{activeStaffOptions.length} {(lang === 'en' ? " available staff" : " staff khả dụng")}</span>
            </div>
            {activeStaffOptions.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '13.5px', margin: 0 }}>
                {(lang === 'en' ? "⚠️ The farm has no active staff. Add staff before assigning." : "⚠️ Trang trại chưa có staff đang hoạt động. Vui lòng thêm nhân viên trước khi phân công.")}
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="assign-staff-select"
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{(lang === 'en' ? "-- Select staff member --" : "-- Chọn thành viên phụ trách --")}</option>
                  {activeStaffOptions.map((s) => (
                    <option key={s.farmMemberId} value={s.farmMemberId}>
                      {s.fullName} ({s.email}) — {(lang === 'en' ? s.roleLabel || "Staff" : s.roleLabel || 'Nhân sự')}
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
                {(lang === 'en' ? "Assigned production zone " : "Phân khu sản xuất tiếp nhận ")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{zones.length} {(lang === 'en' ? " zones" : " phân khu")}</span>
            </div>
            {zones.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '13.5px', margin: 0 }}>
                {(lang === 'en' ? "⚠️ This farm has no production zones. Create a zone first." : "⚠️ Chưa có phân khu sản xuất nào of trang trại. Vui lòng tạo phân khu trước.")}
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
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
                  {(lang === 'en' ? "Assignment start date " : "Ngày bắt đầu phụ trách ")} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">{(lang === 'en' ? "Date" : "Ngày")}</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
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
                <span className="structured-field-badge">{assignNotes.length}{(lang === 'en' ? "/200 characters" : "/200 ký tự")}</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
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
            <button type="button" className="ghost-button" onClick={() => setIsAssignOpen(false)} disabled={savingAssign}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={savingAssign || !assignStaffId || !assignZoneId}
            >
              {(lang === 'en' ? savingAssign ? "Assigning..." : "Confirm assignment" : savingAssign ? 'Đang phân công...' : 'Xác nhận phân công')}
            </button>
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
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {(lang === 'en' ? "Farm member *" : "Thành viên trang trại *")}
            </label>
            <select
              required
              disabled={!!editingWorker}
              value={workerForm.farmMemberId}
              onChange={(e) => setWorkerForm((p) => ({ ...p, farmMemberId: Number(e.target.value) }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value={0}>{(lang === 'en' ? "-- Select staff member --" : "-- Chọn thành viên nhân sự --")}</option>
              {staffList.map((s) => (
                <option key={s.farmMemberId} value={s.farmMemberId}>
                  {s.fullName} ({s.email}) - {translate(s.roleLabel)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {(lang === 'en' ? "Worker code *" : "Mã công nhân *")}
              </label>
              <input
                type="text"
                required
                value={workerForm.workerCode}
                onChange={(e) => setWorkerForm((p) => ({ ...p, workerCode: e.target.value }))}
                placeholder={(lang === 'en' ? "e.g. CN-001" : "VD: CN-001")}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {(lang === 'en' ? "Position / Job title" : "Vị trí / Chức danh")}
              </label>
              <input
                type="text"
                value={workerForm.jobTitle || ''}
                onChange={(e) => setWorkerForm((p) => ({ ...p, jobTitle: e.target.value }))}
                placeholder={(lang === 'en' ? "Example: Harvest worker, Sprayer..." : "VD: Công nhân thu hoạch, Phun thuốc...")}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {(lang === 'en' ? "Employment status *" : "Tình trạng làm việc *")}
              </label>
              <select
                required
                value={workerForm.employmentStatus || 'active'}
                onChange={(e) => setWorkerForm((p) => ({ ...p, employmentStatus: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="active">{(lang === 'en' ? "Active" : "Đang làm việc (Active)")}</option>
                <option value="seasonal">{(lang === 'en' ? "Seasonal worker" : "Lao động thời vụ (Seasonal)")}</option>
                <option value="inactive">{(lang === 'en' ? "Inactive" : "Đã nghỉ việc (Inactive)")}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {(lang === 'en' ? "Employment start date" : "Ngày vào làm")}
              </label>
              <input
                type="date"
                value={workerForm.hiredAt || ''}
                onChange={(e) => setWorkerForm((p) => ({ ...p, hiredAt: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {(lang === 'en' ? "Profile notes" : "Ghi chú hồ sơ")}
            </label>
            <textarea
              rows={2}
              value={workerForm.notes || ''}
              onChange={(e) => setWorkerForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={(lang === 'en' ? "Note experience and existing VietGAP certifications..." : "Ghi chú kinh nghiệm, chứng chỉ VietGAP đã có...")}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setIsWorkerModalOpen(false)}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </button>
            <button type="submit" className="primary-button" disabled={savingWorker}>
              {(lang === 'en' ? savingWorker ? "Saving..." : editingWorker ? "Save changes" : "Add profile" : savingWorker ? 'Đang lưu...' : editingWorker ? 'Lưu thay đổi' : 'Thêm hồ sơ')}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
