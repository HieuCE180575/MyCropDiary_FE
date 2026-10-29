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
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
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
    <section className="tasks-page">
      {/* Page Heading */}
      <header className="tasks-heading">
        <div>
          <h1>Phân công &amp; Quản lý công việc</h1>
          <p>
            Giao việc, giám sát quy trình lao động nông nghiệp và theo dõi tiến độ công nhật tại{' '}
            <strong>{selectedFarm?.farmName || 'Trang trại'}</strong> theo chuẩn VietGAP.
          </p>
        </div>
        <div className="tasks-heading-actions">
          <button
            type="button"
            className="action-button"
            disabled={!farmId || loading}
            onClick={() => void loadTasks()}
          >
            <Icon name={loading ? 'loader' : 'refresh'} /> {loading ? 'Đang nạp...' : 'Tải lại'}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!farmId}
            onClick={openCreateModal}
          >
            <Icon name="plus" /> Giao việc mới
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={`form-error-banner ${notification.type === 'success' ? 'mu-notice-success' : ''}`}
          style={{
            marginBottom: '20px',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderColor: notification.type === 'success' ? '#6ee7b7' : '#fca5a5',
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name={notification.type === 'success' ? 'check-circle' : 'warning'} />
          <span>{notification.text}</span>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="tasks-metrics" aria-label="Thống kê công việc">
        <article className="tasks-metric-card tone-slate">
          <div className="tasks-metric-top">
            <span>Tổng số việc</span>
            <span className="tasks-metric-icon">📋</span>
          </div>
          <strong className="tasks-metric-value">{totalTasks}</strong>
          <p className="tasks-metric-hint">Toàn bộ nhiệm vụ của trang trại</p>
        </article>

        <article className="tasks-metric-card tone-amber">
          <div className="tasks-metric-top">
            <span>Cần thực hiện</span>
            <span className="tasks-metric-icon">⏳</span>
          </div>
          <strong className="tasks-metric-value">{todoTasks.length}</strong>
          <p className="tasks-metric-hint">Chờ phân bổ &amp; tiếp nhận</p>
        </article>

        <article className="tasks-metric-card tone-blue">
          <div className="tasks-metric-top">
            <span>Đang triển khai</span>
            <span className="tasks-metric-icon">🚀</span>
          </div>
          <strong className="tasks-metric-value">{inProgressTasks.length}</strong>
          <p className="tasks-metric-hint">Đang có nhân sự thực hiện</p>
        </article>

        <article className="tasks-metric-card tone-green">
          <div className="tasks-metric-top">
            <span>Đã hoàn thành</span>
            <span className="tasks-metric-icon">✅</span>
          </div>
          <strong className="tasks-metric-value">{completedTasks.length}</strong>
          <p className="tasks-metric-hint">Nghiệm thu đạt chuẩn kỹ thuật</p>
        </article>

        <article className="tasks-metric-card tone-red">
          <div className="tasks-metric-top">
            <span>Khẩn cấp chưa xong</span>
            <span className="tasks-metric-icon">🚨</span>
          </div>
          <strong className="tasks-metric-value">{urgentTasks.length}</strong>
          <p className="tasks-metric-hint">Cần ưu tiên xử lý ngay</p>
        </article>
      </div>

      {/* Control Bar & Filters */}
      <div className="tasks-control-bar">
        <div className="tasks-control-row-top">
          <form onSubmit={handleSearchSubmit} className="tasks-search-wrap">
            <span className="tasks-search-icon"><Icon name="search" /></span>
            <input
              type="search"
              placeholder="Tìm theo tên việc, ghi chú, người phụ trách..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Switch */}
            <div className="tasks-view-switch" role="group" aria-label="Chế độ hiển thị">
              <button
                type="button"
                className={`tasks-view-btn ${viewMode === 'KANBAN' ? 'active' : ''}`}
                onClick={() => setViewMode('KANBAN')}
              >
                📊 Bảng Kanban
              </button>
              <button
                type="button"
                className={`tasks-view-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
                onClick={() => setViewMode('TABLE')}
              >
                📑 Danh sách
              </button>
            </div>
          </div>
        </div>

        <div className="tasks-control-row-filters">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Lọc theo:</label>

          <select
            className="tasks-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="planned">Cần thực hiện</option>
            <option value="in_progress">Đang triển khai</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select
            className="tasks-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Tất cả độ ưu tiên</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="high">Ưu tiên cao</option>
            <option value="normal">Bình thường</option>
            <option value="low">Mức thấp</option>
          </select>

          <select
            className="tasks-filter-select"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tất cả mùa vụ</option>
            {seasons.map((s) => (
              <option key={s.cropSeasonId} value={s.cropSeasonId}>
                {s.seasonName}
              </option>
            ))}
          </select>

          <select
            className="tasks-filter-select"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tất cả khu vực</option>
            {zones.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.zoneName}
              </option>
            ))}
          </select>

          {(keyword || statusFilter !== 'all' || priorityFilter !== 'all' || seasonFilter || zoneFilter) && (
            <button
              type="button"
              className="action-button"
              style={{ fontSize: '12.5px', padding: '6px 12px' }}
              onClick={() => {
                setKeyword('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setSeasonFilter('');
                setZoneFilter('');
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Kanban or Table */}
      {viewMode === 'KANBAN' ? (
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
      ) : (
        /* Table View */
        <div className="tasks-table-wrap">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Tên công việc &amp; Phân loại</th>
                <th>Mùa vụ &amp; Vị trí</th>
                <th>Độ ưu tiên</th>
                <th>Người phụ trách</th>
                <th>Hạn chót</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    Không tìm thấy công việc nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.taskId}>
                    <td>
                      <strong
                        style={{ cursor: 'pointer', color: '#0f172a' }}
                        onClick={() => setSelectedTaskDetail(t)}
                      >
                        {t.taskName}
                      </strong>
                      <div style={{ marginTop: '4px' }}>
                        <span className="task-type-pill">{t.taskType || 'Chăm sóc'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        {t.seasonName ? `🌱 ${t.seasonName}` : '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {t.zoneName ? `📍 ${t.zoneName}` : ''}
                        {t.blockName ? ` / ${t.blockName}` : ''}
                      </div>
                    </td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td>
                      {t.assignees && t.assignees.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {t.assignees.map((a) => (
                            <span key={a.workerId} className="task-worker-chip">
                              👤 {a.fullName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12.5px' }}>Chưa phân công</span>
                      )}
                    </td>
                    <td>
                      {t.dueAt ? (
                        <span
                          className={`task-due-date ${t.status !== 'completed' && t.dueAt < nowIso ? 'is-overdue' : ''}`}
                        >
                          📅 {new Date(t.dueAt).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background:
                            t.status === 'completed'
                              ? '#dcfce7'
                              : t.status === 'in_progress'
                                ? '#e0f2fe'
                                : '#fef3c7',
                          color:
                            t.status === 'completed'
                              ? '#166534'
                              : t.status === 'in_progress'
                                ? '#0369a1'
                                : '#b45309',
                        }}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="task-btn-action"
                          onClick={() => setSelectedTaskDetail(t)}
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="task-btn-action"
                          onClick={() => openEditModal(t)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="task-btn-action"
                          style={{ color: '#dc2626' }}
                          onClick={() => setDeletingTask(t)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
