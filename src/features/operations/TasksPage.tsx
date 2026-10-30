import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import {
  fetchFarmTasks,
  createFarmTask,
  updateFarmTask,
  updateFarmTaskStatus,
  deleteFarmTask,
  type FarmTaskResp,
  type CreateFarmTaskReq,
  type UpdateFarmTaskReq,
} from './farmTaskService';
import {
  fetchCropSeasonsByFarm,
  fetchBlocksInSeason,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';
import { fetchZonesByFarm, fetchBlocks } from '../production/zoneBlockService';
import type { Zone, Block } from '../production/types';
import { getFarmStaffList, type FarmStaffRecord } from '../staff/staffService';
import '../../styles/tasks.css';

export function TasksPage() {
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [tasks, setTasks] = useState<FarmTaskResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & View mode
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('TABLE');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState<number | ''>('');
  const [zoneFilter, setZoneFilter] = useState<number | ''>('');

  // Dropdown options
  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [staffList, setStaffList] = useState<FarmStaffRecord[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FarmTaskResp | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<FarmTaskResp | null>(null);
  const [deletingTask, setDeletingTask] = useState<FarmTaskResp | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formTaskName, setFormTaskName] = useState('');
  const [formTaskType, setFormTaskType] = useState('Chăm sóc cây trồng');
  const [formPriority, setFormPriority] = useState('normal');
  const [formStatus, setFormStatus] = useState('planned');
  const [formSeasonId, setFormSeasonId] = useState<number | ''>('');
  const [formZoneId, setFormZoneId] = useState<number | ''>('');
  const [formBlockId, setFormBlockId] = useState<number | ''>('');
  const [formWorkerIds, setFormWorkerIds] = useState<number[]>([]);
  const [formStartsAt, setFormStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [formDueAt, setFormDueAt] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const requestsRef = useRef<{ list?: AbortController }>({});

  useEffect(() => {
    if (farmId) {
      void loadTasks();
      void loadDropdownOptions();
    }
    return () => {
      requestsRef.current.list?.abort();
    };
  }, [farmId, statusFilter, priorityFilter, seasonFilter, zoneFilter]);

  useRealtimeSync(() => {
    if (submitting || isCreateModalOpen || editingTask || deletingTask) return;
    void loadTasks(true);
  });

  const loadDropdownOptions = async () => {
    if (!farmId) return;
    try {
      const [seasonsData, zonesData, staffData] = await Promise.all([
        fetchCropSeasonsByFarm(farmId).catch(() => []),
        fetchZonesByFarm(farmId).catch(() => []),
        getFarmStaffList(farmId).catch(() => []),
      ]);
      setSeasons(seasonsData);
      setZones(zonesData);
      setStaffList(staffData);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!formSeasonId) {
      setSeasonBlocks([]);
      return;
    }
    void fetchBlocksInSeason(Number(formSeasonId))
      .then((data) => {
        setSeasonBlocks(data);
        if (data.length > 0 && !editingTask) {
          setFormBlockId(data[0].blockId);
          if (data[0].zoneId) setFormZoneId(data[0].zoneId);
        }
      })
      .catch(() => setSeasonBlocks([]));
  }, [formSeasonId, editingTask]);

  useEffect(() => {
    if (!farmId || !formZoneId) {
      setBlocks([]);
      return;
    }
    void fetchBlocks(farmId, Number(formZoneId))
      .then((data) => setBlocks(data))
      .catch(() => setBlocks([]));
  }, [farmId, formZoneId]);

  const loadTasks = async (silent = false) => {
    if (!farmId) return;
    requestsRef.current.list?.abort();
    const controller = new AbortController();
    requestsRef.current.list = controller;

    if (!silent) setLoading(true);
    try {
      const res = await fetchFarmTasks(
        farmId,
        {
          cropSeasonId: seasonFilter ? Number(seasonFilter) : undefined,
          zoneId: zoneFilter ? Number(zoneFilter) : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          keyword: keyword.trim() || undefined,
          size: 100,
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setTasks(res.items || []);
      }
    } catch (err) {
      if (!controller.signal.aborted && !silent) {
        setNotification({
          text: err instanceof Error ? err.message : 'Không thể tải danh sách công việc.',
          type: 'error',
        });
      }
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    void loadTasks();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTaskName('');
    setFormTaskType('Chăm sóc cây trồng');
    setFormPriority('normal');
    setFormStatus('planned');
    setFormSeasonId(seasons.length > 0 ? seasons[0].cropSeasonId : '');
    setFormZoneId('');
    setFormBlockId('');
    setFormWorkerIds([]);
    setFormStartsAt(new Date().toISOString().slice(0, 16));
    setFormDueAt(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
    setFormDescription('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: FarmTaskResp) => {
    setEditingTask(task);
    setFormTaskName(task.taskName);
    setFormTaskType(task.taskType || 'Chăm sóc cây trồng');
    setFormPriority(task.priority || 'normal');
    setFormStatus(task.status || 'planned');
    setFormSeasonId(task.cropSeasonId ?? '');
    setFormZoneId(task.zoneId ?? '');
    setFormBlockId(task.blockId ?? '');
    setFormWorkerIds(task.assignees ? task.assignees.map((a) => a.workerId) : []);
    setFormStartsAt(task.startsAt ? task.startsAt.slice(0, 16) : '');
    setFormDueAt(task.dueAt ? task.dueAt.slice(0, 16) : '');
    setFormDescription(task.description || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!farmId || !formTaskName.trim()) return;

    if (formStartsAt && formDueAt && formDueAt < formStartsAt) {
      setNotification({ text: 'Hạn hoàn thành không thể trước ngày bắt đầu.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    const payload: CreateFarmTaskReq = {
      taskName: formTaskName.trim(),
      taskType: formTaskType,
      priority: formPriority,
      status: formStatus,
      cropSeasonId: formSeasonId ? Number(formSeasonId) : null,
      zoneId: formZoneId ? Number(formZoneId) : null,
      blockId: formBlockId ? Number(formBlockId) : null,
      assignedWorkerIds: formWorkerIds.length > 0 ? formWorkerIds : undefined,
      startsAt: formStartsAt ? (formStartsAt.length === 16 ? `${formStartsAt}:00` : formStartsAt) : null,
      dueAt: formDueAt ? (formDueAt.length === 16 ? `${formDueAt}:00` : formDueAt) : null,
      description: formDescription.trim() || null,
    };

    try {
      if (editingTask) {
        await updateFarmTask(editingTask.taskId, payload as UpdateFarmTaskReq);
        setNotification({ text: 'Cập nhật công việc thành công!', type: 'success' });
      } else {
        await createFarmTask(farmId, payload);
        setNotification({ text: 'Giao việc mới thành công!', type: 'success' });
      }
      setIsCreateModalOpen(false);
      void loadTasks();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Lỗi khi lưu công việc.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateFarmTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, status: newStatus } : t))
      );
      setNotification({
        text: `Đã chuyển công việc sang "${getStatusLabel(newStatus)}"`,
        type: 'success',
      });
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.',
        type: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setSubmitting(true);
    try {
      await deleteFarmTask(deletingTask.taskId);
      setTasks((prev) => prev.filter((t) => t.taskId !== deletingTask.taskId));
      setNotification({ text: 'Đã xóa công việc thành công!', type: 'success' });
      setDeletingTask(null);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể xóa công việc.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    const norm = (p || '').toLowerCase();
    switch (norm) {
      case 'urgent':
        return <span className="task-priority-badge task-priority-urgent">Khẩn cấp</span>;
      case 'high':
        return <span className="task-priority-badge task-priority-high">Ưu tiên cao</span>;
      case 'low':
        return <span className="task-priority-badge task-priority-low">Mức thấp</span>;
      default:
        return <span className="task-priority-badge task-priority-normal">Bình thường</span>;
    }
  };

  const getStatusLabel = (s: string) => {
    const norm = (s || '').toLowerCase();
    if (norm === 'in_progress' || norm === 'doing') return 'Đang triển khai';
    if (norm === 'completed' || norm === 'done') return 'Đã hoàn thành';
    if (norm === 'cancelled') return 'Đã hủy';
    return 'Cần thực hiện';
  };

  // Metrics computation
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === 'planned');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed');

  const nowIso = new Date().toISOString();

  // Helper function to render a task card in Kanban
  const renderTaskCard = (t: FarmTaskResp) => {
    const isOverdue = t.status !== 'completed' && t.dueAt && t.dueAt < nowIso;

    return (
      <article key={t.taskId} className="task-card">
        <div className="task-card-header">
          <span className="task-type-pill">{t.taskType || 'Chăm sóc'}</span>
          {getPriorityBadge(t.priority)}
        </div>

        <h3 className="task-card-title" onClick={() => setSelectedTaskDetail(t)}>
          {t.taskName}
        </h3>

        {(t.seasonName || t.zoneName || t.blockName) && (
          <div className="task-card-meta-tags">
            {t.seasonName && <span className="task-meta-tag">🌱 {t.seasonName}</span>}
            {(t.zoneName || t.blockName) && (
              <span className="task-meta-tag">
                📍 {t.zoneName || 'Khu canh tác'}
                {t.blockName ? ` / ${t.blockName}` : ''}
              </span>
            )}
          </div>
        )}

        {t.description && <p className="task-card-desc">{t.description}</p>}

        <div className="task-card-footer">
          <div className="task-assignees">
            {t.assignees && t.assignees.length > 0 ? (
              t.assignees.map((a) => (
                <span key={a.workerId} className="task-worker-chip" title={a.fullName}>
                  👤 {a.fullName}
                </span>
              ))
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa phân công</span>
            )}
          </div>

          {t.dueAt && (
            <span className={`task-due-date ${isOverdue ? 'is-overdue' : ''}`}>
              📅 {new Date(t.dueAt).toLocaleDateString('vi-VN')}
              {isOverdue && ' ⚠️'}
            </span>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="task-card-actions">
          <div style={{ display: 'flex', gap: '6px' }}>
            {t.status === 'planned' && (
              <button
                type="button"
                className="task-btn-action task-btn-primary"
                onClick={() => handleQuickStatusChange(t.taskId, 'in_progress')}
              >
                ▶ Bắt đầu làm
              </button>
            )}
            {t.status === 'in_progress' && (
              <button
                type="button"
                className="task-btn-action task-btn-done"
                onClick={() => handleQuickStatusChange(t.taskId, 'completed')}
              >
                ✓ Hoàn thành
              </button>
            )}
            {t.status === 'completed' && (
              <button
                type="button"
                className="task-btn-action"
                onClick={() => handleQuickStatusChange(t.taskId, 'in_progress')}
              >
                ↺ Mở lại việc
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="task-btn-action"
              title="Xem chi tiết"
              onClick={() => setSelectedTaskDetail(t)}
            >
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="task-btn-action"
              title="Chỉnh sửa"
              onClick={() => openEditModal(t)}
            >
              Sửa
            </button>
            <button
              type="button"
              className="task-btn-action"
              style={{ color: '#dc2626' }}
              title="Xóa việc"
              onClick={() => setDeletingTask(t)}
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="tasks-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Notification Banner */}
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginBottom: '16px' }}
        >
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Phân công &amp; Quản lý công việc
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {totalTasks} công việc · {todoTasks.length} cần thực hiện · {inProgressTasks.length} đang triển khai · {completedTasks.length} đã xong tại {selectedFarm?.farmName || 'Trang trại'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="primary-button"
            disabled={!farmId}
            onClick={openCreateModal}
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
            <Icon name="plus" size={17} /> Giao việc mới
          </button>
        </div>
      </div>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Clean Filter Bar */}
        <div className="zone-clean-filter-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div className="zone-clean-search" style={{ flex: 1, minWidth: '220px' }}>
            <span className="search-icon">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              placeholder="Tìm theo tên việc, ghi chú, người phụ trách..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Filter by Status */}
          <div className="zone-clean-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="planned">Cần thực hiện</option>
              <option value="in_progress">Đang triển khai</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Filter by Priority */}
          <div className="zone-clean-select-wrap">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Lọc theo độ ưu tiên"
            >
              <option value="all">Tất cả độ ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Ưu tiên cao</option>
              <option value="normal">Bình thường</option>
              <option value="low">Mức thấp</option>
            </select>
          </div>

          {/* Filter by Season */}
          <div className="zone-clean-select-wrap">
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value ? Number(e.target.value) : '')}
              aria-label="Lọc theo mùa vụ"
            >
              <option value="">Tất cả mùa vụ</option>
              {seasons.map((s) => (
                <option key={s.cropSeasonId} value={s.cropSeasonId}>
                  {s.seasonName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Zone */}
          <div className="zone-clean-select-wrap">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value ? Number(e.target.value) : '')}
              aria-label="Lọc theo khu vực"
            >
              <option value="">Tất cả khu vực</option>
              {zones.map((z) => (
                <option key={z.zoneId} value={z.zoneId}>
                  {z.zoneName}
                </option>
              ))}
            </select>
          </div>

          {/* Reload / Reset */}
          <button
            type="button"
            className="zone-clean-reload-btn"
            title="Tải lại và đặt lại bộ lọc"
            aria-label="Tải lại và đặt lại bộ lọc"
            onClick={() => {
              setKeyword('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setSeasonFilter('');
              setZoneFilter('');
              void loadTasks();
            }}
          >
            <Icon name="refresh" size={16} />
          </button>

          {/* View Switch */}
          <div className="tasks-view-switch" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
              onClick={() => setViewMode('TABLE')}
            >
              📑 Danh sách
            </button>
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'KANBAN' ? 'active' : ''}`}
              onClick={() => setViewMode('KANBAN')}
            >
              📊 Bảng Kanban
            </button>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
            Trạng thái:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'all' ? '#059669' : '#ffffff',
              borderColor: statusFilter === 'all' ? '#059669' : '#cbd5e1',
              color: statusFilter === 'all' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            Tất cả ({totalTasks})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('planned')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'planned' ? '#d97706' : '#ffffff',
              borderColor: statusFilter === 'planned' ? '#d97706' : '#fed7aa',
              color: statusFilter === 'planned' ? '#ffffff' : '#b45309',
              transition: 'all 0.15s ease',
            }}
          >
            ⏳ Cần thực hiện ({todoTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'in_progress' ? '#0284c7' : '#ffffff',
              borderColor: statusFilter === 'in_progress' ? '#0284c7' : '#bae6fd',
              color: statusFilter === 'in_progress' ? '#ffffff' : '#0369a1',
              transition: 'all 0.15s ease',
            }}
          >
            🚀 Đang triển khai ({inProgressTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'completed' ? '#059669' : '#ffffff',
              borderColor: statusFilter === 'completed' ? '#059669' : '#a7f3d0',
              color: statusFilter === 'completed' ? '#ffffff' : '#047857',
              transition: 'all 0.15s ease',
            }}
          >
            ✅ Đã hoàn thành ({completedTasks.length})
          </button>
          {urgentTasks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('urgent');
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                border: '1px solid',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: priorityFilter === 'urgent' ? '#dc2626' : '#ffffff',
                borderColor: priorityFilter === 'urgent' ? '#dc2626' : '#fecaca',
                color: priorityFilter === 'urgent' ? '#ffffff' : '#b91c1c',
                transition: 'all 0.15s ease',
              }}
            >
              🚨 Khẩn cấp ({urgentTasks.length})
            </button>
          )}
        </div>

        {/* Main Content: Table List or Kanban */}
        {viewMode === 'TABLE' ? (
          loading ? (
            <div className="panel empty-state" style={{ padding: '60px 20px', border: 'none', boxShadow: 'none' }}>
              <div className="empty-icon">⏳</div>
              <h2>Đang tải danh sách công việc...</h2>
            </div>
          ) : tasks.length === 0 ? (
            <div className="panel empty-state" style={{ padding: '60px 20px', border: 'none', boxShadow: 'none' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#f0fdf4',
                  color: '#059669',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Icon name="check-circle" size={32} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                Không tìm thấy công việc nào phù hợp
              </h2>
              <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                Giao việc và phân công nhân viên kỹ thuật để giám sát tiến độ chăm sóc cây trồng theo tiêu chuẩn VietGAP.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={openCreateModal}
                style={{
                  padding: '10px 20px',
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
                <Icon name="plus" size={16} /> Giao việc ngay
              </button>
            </div>
          ) : (
            <>
              <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label="Chọn tất cả việc" style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        Tên công việc &amp; Phân loại
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        Mùa vụ &amp; Vị trí
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        Độ ưu tiên
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        Người phụ trách
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        Hạn hoàn thành
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                        Trạng thái
                      </th>
                      <th style={{ width: '220px', padding: '14px 16px', textAlign: 'right' }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const isCompleted = t.status === 'completed';
                      const isInProgress = t.status === 'in_progress';

                      return (
                        <tr key={t.taskId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <input type="checkbox" aria-label={`Chọn ${t.taskName}`} style={{ cursor: 'pointer' }} />
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <strong
                              style={{
                                cursor: 'pointer',
                                color: '#0f172a',
                                fontSize: '14.5px',
                                display: 'block',
                                transition: 'color 0.15s ease',
                              }}
                              onClick={() => setSelectedTaskDetail(t)}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#059669')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#0f172a')}
                            >
                              {t.taskName}
                            </strong>
                            {t.description && (
                              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4, maxWidth: '380px' }}>
                                {t.description.length > 70 ? `${t.description.slice(0, 70)}...` : t.description}
                              </p>
                            )}
                            <div style={{ marginTop: '5px' }}>
                              <span className="crop-cat-pill blue" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                                {t.taskType || 'Chăm sóc'}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                              {t.seasonName ? `🌱 ${t.seasonName}` : '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {t.zoneName ? `📍 ${t.zoneName}` : ''}
                              {t.blockName ? ` • ${t.blockName}` : ''}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px' }}>{getPriorityBadge(t.priority)}</td>

                          <td style={{ padding: '14px 16px' }}>
                            {t.assignees && t.assignees.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {t.assignees.map((a) => (
                                  <span
                                    key={a.workerId}
                                    style={{
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      color: '#0f172a',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        display: 'grid',
                                        placeItems: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {(a.fullName || 'NS').slice(0, 1).toUpperCase()}
                                    </span>
                                    {a.fullName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12.5px', fontStyle: 'italic' }}>Chưa phân công</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            {t.dueAt ? (
                              <span
                                className={`task-due-date ${!isCompleted && t.dueAt < nowIso ? 'is-overdue' : ''}`}
                                style={{ fontSize: '13px' }}
                              >
                                📅 {new Date(t.dueAt).toLocaleDateString('vi-VN')}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span
                              className={`status-dot-badge ${
                                isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'active'
                              }`}
                            >
                              <span className="dot" />
                              {getStatusLabel(t.status)}
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div className="table-action-btns" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                              {/* Quick status transition button */}
                              {t.status === 'planned' && (
                                <button
                                  type="button"
                                  className="btn-status-quick start"
                                  title="Bắt đầu thực hiện công việc"
                                  onClick={() => void handleQuickStatusChange(t.taskId, 'in_progress')}
                                >
                                  ▶ Bắt đầu
                                </button>
                              )}
                              {t.status === 'in_progress' && (
                                <button
                                  type="button"
                                  className="btn-status-quick done"
                                  title="Nghiệm thu hoàn thành"
                                  onClick={() => void handleQuickStatusChange(t.taskId, 'completed')}
                                >
                                  ✓ Hoàn thành
                                </button>
                              )}
                              {t.status === 'completed' && (
                                <button
                                  type="button"
                                  className="btn-status-quick reopen"
                                  title="Mở lại công việc"
                                  onClick={() => void handleQuickStatusChange(t.taskId, 'in_progress')}
                                >
                                  ↺ Mở lại
                                </button>
                              )}

                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title="Xem chi tiết công việc"
                                aria-label={`Chi tiết ${t.taskName}`}
                                onClick={() => setSelectedTaskDetail(t)}
                              >
                                <Icon name="eye" size={15} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn edit"
                                title="Chỉnh sửa công việc"
                                aria-label={`Chỉnh sửa ${t.taskName}`}
                                onClick={() => openEditModal(t)}
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title="Xóa công việc"
                                aria-label={`Xóa ${t.taskName}`}
                                onClick={() => setDeletingTask(t)}
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="zone-table-footer">
                <div>
                  Hiển thị 1–{tasks.length} trong {totalTasks} công việc
                </div>
                <div className="zone-pagination-wrap">
                  <button type="button" className="zone-page-btn" disabled aria-label="Trang trước">
                    <Icon name="chevron-left" size={15} />
                  </button>
                  <button type="button" className="zone-page-btn active">
                    1
                  </button>
                  <button type="button" className="zone-page-btn" disabled aria-label="Trang sau">
                    <Icon name="chevron-right" size={15} />
                  </button>
                </div>
              </div>
            </>
          )
        ) : (
          /* Kanban Board Layout */
          <div style={{ padding: '20px' }}>
            <div className="tasks-kanban-board">
              {/* Column 1: TODO / Planned */}
              <div className="tasks-column col-todo">
                <div className="tasks-column-header">
                  <div className="tasks-column-title">
                    <span className="tasks-column-dot" />
                    <span>Cần thực hiện</span>
                  </div>
                  <span className="tasks-column-count">{todoTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {todoTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>Không có việc chờ thực hiện</span>
                    </div>
                  ) : (
                    todoTasks.map((t) => renderTaskCard(t))
                  )}
                </div>
              </div>

              {/* Column 2: IN PROGRESS */}
              <div className="tasks-column col-doing">
                <div className="tasks-column-header">
                  <div className="tasks-column-title">
                    <span className="tasks-column-dot" />
                    <span>Đang triển khai</span>
                  </div>
                  <span className="tasks-column-count">{inProgressTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {inProgressTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>Chưa có việc đang làm</span>
                    </div>
                  ) : (
                    inProgressTasks.map((t) => renderTaskCard(t))
                  )}
                </div>
              </div>

              {/* Column 3: DONE / Completed */}
              <div className="tasks-column col-done">
                <div className="tasks-column-header">
                  <div className="tasks-column-title">
                    <span className="tasks-column-dot" />
                    <span>Đã hoàn thành</span>
                  </div>
                  <span className="tasks-column-count">{completedTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {completedTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>Chưa có việc hoàn thành</span>
                    </div>
                  ) : (
                    completedTasks.map((t) => renderTaskCard(t))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Tạo mới / Chỉnh sửa công việc */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (!submitting) setIsCreateModalOpen(false);
        }}
        title={editingTask ? 'Chỉnh sửa công việc' : 'Giao việc mới (VietGAP)'}
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="task-form-grid">
            <div className="task-form-field task-field-full">
              <label htmlFor="task-name">Tên công việc / Nhiệm vụ *</label>
              <input
                id="task-name"
                required
                maxLength={160}
                placeholder="Ví dụ: Pha chế dịch dinh dưỡng và kiểm tra hệ thống tưới nhỏ giọt"
                value={formTaskName}
                onChange={(e) => setFormTaskName(e.target.value)}
              />
            </div>

            <div className="task-form-field">
              <label htmlFor="task-type">Phân loại công việc *</label>
              <select
                id="task-type"
                value={formTaskType}
                onChange={(e) => setFormTaskType(e.target.value)}
              >
                <option value="Làm đất">Làm đất &amp; Xử lý giá thể</option>
                <option value="Gieo trồng">Gieo hạt &amp; Cấy cây con</option>
                <option value="Bón phân & Tưới">Bón phân &amp; Tưới tiêu</option>
                <option value="Chăm sóc sinh trưởng">Chăm sóc sinh trưởng &amp; Tỉa cành</option>
                <option value="Bảo vệ thực vật">Bảo vệ thực vật &amp; Phun vi sinh</option>
                <option value="Thu hoạch">Thu hoạch &amp; Đóng gói</option>
                <option value="Tuân thủ VietGAP">Giám sát &amp; Tuân thủ VietGAP</option>
                <option value="Khác">Công việc khác</option>
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-priority">Mức độ ưu tiên *</label>
              <select
                id="task-priority"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              >
                <option value="urgent">Khẩn cấp (Xử lý ngay)</option>
                <option value="high">Ưu tiên cao</option>
                <option value="normal">Bình thường</option>
                <option value="low">Mức thấp</option>
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-season">Mùa vụ canh tác liên kết</label>
              <select
                id="task-season"
                value={formSeasonId}
                onChange={(e) => setFormSeasonId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Không liên kết vụ cụ thể</option>
                {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-status">Trạng thái công việc</label>
              <select
                id="task-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="planned">Cần thực hiện</option>
                <option value="in_progress">Đang triển khai</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-zone">Khu vực sản xuất (Zone)</label>
              <select
                id="task-zone"
                value={formZoneId}
                onChange={(e) => {
                  setFormZoneId(e.target.value ? Number(e.target.value) : '');
                  setFormBlockId('');
                }}
              >
                <option value="">Chọn khu vực</option>
                {zones.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.zoneName}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-block">
                Lô đất canh tác (Block){' '}
                {seasonBlocks.length > 0 && (
                  <span style={{ color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>
                    (Thuộc mùa vụ: {seasonBlocks.length} lô)
                  </span>
                )}
              </label>
              <select
                id="task-block"
                value={formBlockId}
                disabled={seasonBlocks.length === 0 && (!formZoneId || blocks.length === 0)}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setFormBlockId(val);
                  if (val && seasonBlocks.length > 0) {
                    const matched = seasonBlocks.find((sb) => sb.blockId === val);
                    if (matched?.zoneId) setFormZoneId(matched.zoneId);
                  }
                }}
              >
                <option value="">Chọn lô đất</option>
                {seasonBlocks.length > 0
                  ? seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      🌱 {sb.blockName} ({sb.zoneName || `Khu #${sb.zoneId}`} · {sb.plantedArea ?? sb.blockArea}{' '}
                      {sb.areaUnit || 'm²'})
                    </option>
                  ))
                  : blocks.map((b) => (
                    <option key={b.blockId} value={b.blockId}>
                      {b.blockName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-start">Thời gian bắt đầu</label>
              <input
                id="task-start"
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
            </div>

            <div className="task-form-field">
              <label htmlFor="task-due">Hạn hoàn thành (Deadline)</label>
              <input
                id="task-due"
                type="datetime-local"
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
              />
            </div>

            <div className="task-form-field task-field-full">
              <label>Phân công nhân sự thực hiện</label>
              <div
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  background: '#f8fafc',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                }}
              >
                {staffList.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Chưa có nhân sự trong trang trại. Hãy thêm nhân sự tại mục &quot;Người lao động&quot;.
                  </span>
                ) : (
                  staffList.map((s) => {
                    const isChecked = formWorkerIds.includes(s.farmMemberId);
                    return (
                      <label
                        key={s.farmMemberId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormWorkerIds([...formWorkerIds, s.farmMemberId]);
                            } else {
                              setFormWorkerIds(formWorkerIds.filter((id) => id !== s.farmMemberId));
                            }
                          }}
                        />
                        <span>
                          <strong>{s.fullName}</strong> ({s.roleLabel})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="task-form-field task-field-full">
              <label htmlFor="task-desc">Mô tả kỹ thuật &amp; Hướng dẫn thực hiện</label>
              <textarea
                id="task-desc"
                rows={3}
                placeholder="Ghi rõ quy trình kỹ thuật, liều lượng, dụng cụ bảo hộ hoặc yêu cầu VietGAP cần tuân thủ..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="action-button"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              <Icon name={submitting ? 'loader' : 'save'} />
              {submitting ? 'Đang lưu...' : editingTask ? 'Lưu thay đổi' : 'Giao việc ngay'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Xem chi tiết công việc */}
      {selectedTaskDetail && (
        <Modal
          open
          onClose={() => setSelectedTaskDetail(null)}
          title={`Chi tiết công việc #${selectedTaskDetail.taskId}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="task-type-pill">{selectedTaskDetail.taskType || 'Chăm sóc'}</span>
            {getPriorityBadge(selectedTaskDetail.priority)}
          </div>

          <h2 style={{ fontSize: '19px', color: '#0f172a', margin: '12px 0 6px' }}>
            {selectedTaskDetail.taskName}
          </h2>

          <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
            {selectedTaskDetail.description || 'Không có mô tả chi tiết.'}
          </p>

          <dl className="task-detail-grid">
            <dt>Trạng thái hiện tại:</dt>
            <dd>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    selectedTaskDetail.status === 'completed'
                      ? '#dcfce7'
                      : selectedTaskDetail.status === 'in_progress'
                        ? '#e0f2fe'
                        : '#fef3c7',
                  color:
                    selectedTaskDetail.status === 'completed'
                      ? '#166534'
                      : selectedTaskDetail.status === 'in_progress'
                        ? '#0369a1'
                        : '#b45309',
                  fontWeight: 700,
                  fontSize: '12.5px',
                }}
              >
                {getStatusLabel(selectedTaskDetail.status)}
              </span>
            </dd>

            <dt>Mùa vụ canh tác:</dt>
            <dd>{selectedTaskDetail.seasonName ? `🌱 ${selectedTaskDetail.seasonName}` : 'Chưa liên kết mùa vụ'}</dd>

            <dt>Khu vực &amp; Thửa đất:</dt>
            <dd>
              {selectedTaskDetail.zoneName ? `📍 ${selectedTaskDetail.zoneName}` : 'Chưa gắn khu vực'}
              {selectedTaskDetail.blockName ? ` / ${selectedTaskDetail.blockName}` : ''}
            </dd>

            <dt>Nhân sự phụ trách:</dt>
            <dd>
              {selectedTaskDetail.assignees && selectedTaskDetail.assignees.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedTaskDetail.assignees.map((a) => (
                    <span key={a.workerId} className="task-worker-chip">
                      👤 {a.fullName} {a.phoneNumber ? `(${a.phoneNumber})` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                'Chưa phân công nhân sự'
              )}
            </dd>

            <dt>Thời gian bắt đầu:</dt>
            <dd>
              {selectedTaskDetail.startsAt
                ? new Date(selectedTaskDetail.startsAt).toLocaleString('vi-VN')
                : 'Chưa đặt'}
            </dd>

            <dt>Hạn hoàn thành:</dt>
            <dd>
              {selectedTaskDetail.dueAt
                ? new Date(selectedTaskDetail.dueAt).toLocaleString('vi-VN')
                : 'Chưa đặt'}
            </dd>

            <dt>Người giao việc:</dt>
            <dd>{selectedTaskDetail.createdByFullName || 'Quản trị trang trại'}</dd>
          </dl>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="action-button"
              onClick={() => {
                const cur = selectedTaskDetail;
                setSelectedTaskDetail(null);
                openEditModal(cur);
              }}
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setSelectedTaskDetail(null)}
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {/* Modal 3: Xác nhận xóa công việc */}
      {deletingTask && (
        <Modal
          open
          onClose={() => {
            if (!submitting) setDeletingTask(null);
          }}
          title="Xác nhận xóa công việc"
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '38px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', color: '#0f172a' }}>
              Xóa công việc &quot;{deletingTask.taskName}&quot;?
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Hành động này sẽ xóa công việc và các phân công lao động liên quan. Không thể hoàn tác.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="action-button"
              disabled={submitting}
              onClick={() => setDeletingTask(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              disabled={submitting}
              onClick={handleDeleteConfirm}
            >
              {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
