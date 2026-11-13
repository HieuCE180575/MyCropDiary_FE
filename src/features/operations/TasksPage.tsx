import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';

import { formatDate as displayDate, formatDateTime as displayDateTime } from '../../shared/format/formatters';
import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

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
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [tasks, setTasks] = useState<FarmTaskResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

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
  const [formTaskType, setFormTaskType] = useState('Crop Care');
  const [formPriority, setFormPriority] = useState('normal');
  const [formStatus, setFormStatus] = useState('planned');
  const [formSeasonId, setFormSeasonId] = useState<number | ''>('');
  const [formZoneId, setFormZoneId] = useState<number | ''>('');
  const [formBlockId, setFormBlockId] = useState<number | ''>('');
  const [formWorkerIds, setFormWorkerIds] = useState<number[]>([]);
  const [formStartsAt, setFormStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [formDueAt, setFormDueAt] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [taskModalError, setTaskModalError] = useState<string | null>(null);

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
      const collected: FarmTaskResp[] = [];
      for (let page = 0; ; page++) {
        const res = await fetchFarmTasks(
        farmId,
        {
          cropSeasonId: seasonFilter ? Number(seasonFilter) : undefined,
          zoneId: zoneFilter ? Number(zoneFilter) : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          keyword: keyword.trim() || undefined,
          size: 100,
          page,
        },
        controller.signal
      );

        if (controller.signal.aborted) return;
        collected.push(...(res.items || []));
        if (res.last || page + 1 >= (res.totalPages ?? 1) || !res.items?.length) break;
      }
      if (!controller.signal.aborted) setTasks(collected);
    } catch (err) {
      if (!controller.signal.aborted && !silent) {
        setNotification({
          text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load tasks." : err instanceof Error ? err.message : 'Không thể tải danh sách tasks.'),
          type: 'error',
        });
      }
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTaskName('');
    setFormTaskType('Crop Care');
    setFormPriority('normal');
    setFormStatus('planned');
    setFormSeasonId(seasons.length > 0 ? seasons[0].cropSeasonId : '');
    setFormZoneId('');
    setFormBlockId('');
    setFormWorkerIds([]);
    setFormStartsAt(new Date().toISOString().slice(0, 16));
    setFormDueAt(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
    setFormDescription('');
    setTaskModalError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: FarmTaskResp) => {
    setEditingTask(task);
    setFormTaskName(task.taskName);
    setFormTaskType(task.taskType || 'Crop Care');
    setFormPriority(task.priority || 'normal');
    setFormStatus(task.status || 'planned');
    setFormSeasonId(task.cropSeasonId ?? '');
    setFormZoneId(task.zoneId ?? '');
    setFormBlockId(task.blockId ?? '');
    setFormWorkerIds(task.assignees ? task.assignees.map((a) => a.workerId) : []);
    setFormStartsAt(task.startsAt ? task.startsAt.slice(0, 16) : '');
    setFormDueAt(task.dueAt ? task.dueAt.slice(0, 16) : '');
    setFormDescription(task.description || '');
    setTaskModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    const trimmedTaskName = formTaskName.trim();
    if (!trimmedTaskName) {
      setTaskModalError((lang === 'en' ? "Enter a task name." : 'Vui lòng nhập tên tasks / nhiệm vụ.'));
      return;
    }

    if (formStartsAt && formDueAt && formDueAt < formStartsAt) {
      setTaskModalError((lang === 'en' ? `Due date (${formDueAt}) cannot be before the start time (${formStartsAt}).` : `Hạn hoàn thành (${formDueAt}) không thể trước thời điểm bắt đầu (${formStartsAt}).`));
      return;
    }

    const isDuplicate = tasks.some(
      (t) =>
        t.taskName.trim().toLowerCase() === trimmedTaskName.toLowerCase() &&
        (!editingTask || t.taskId !== editingTask.taskId) &&
        t.cropSeasonId === (formSeasonId ? Number(formSeasonId) : null) &&
        t.blockId === (formBlockId ? Number(formBlockId) : null) &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    );
    if (isDuplicate) {
      setTaskModalError((lang === 'en' ? `Task "${trimmedTaskName}" already exists and is active in this season/block. Check to avoid duplicate tasks.` : `Công việc "${trimmedTaskName}" đã tồn at và đang diễn ra trong phạm vi mùa vụ/plot đất này. Vui lòng kiểm tra lại để tránh giao việc trùng lặp.`));
      return;
    }

    setSubmitting(true);
    setTaskModalError(null);
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
        setNotification({ text: (lang === 'en' ? "Task updated successfully!" : 'Cập nhật tasks thành công!'), type: 'success' });
      } else {
        await createFarmTask(farmId, payload);
        setNotification({ text: (lang === 'en' ? "Task assigned successfully!" : 'Giao việc mới thành công!'), type: 'success' });
      }
      setIsCreateModalOpen(false);
      void loadTasks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu tasks.';
      setTaskModalError(msg);
      setNotification({
        text: msg,
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
        text: (message("Task status changed to \"{value1}\"", { value1: message(getStatusLabel(newStatus)) })),
        type: 'success',
      });
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update status." : err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.'),
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
      setNotification({ text: (lang === 'en' ? "Task deleted successfully!" : 'Đã xóa tasks thành công!'), type: 'success' });
      setDeletingTask(null);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete task." : err instanceof Error ? err.message : 'Không thể xóa tasks.'),
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
        return <StatusBadge   tone="danger" label={<>{lang === 'en' ? 'Urgent' : 'Khẩn cấp'}</>} />;
      case 'high':
        return <StatusBadge   tone="warning" label={<>{lang === 'en' ? 'High' : 'Ưu tiên cao'}</>} />;
      case 'low':
        return <StatusBadge   tone="neutral" label={<>{lang === 'en' ? 'Low' : 'Mức thấp'}</>} />;
      default:
        return <StatusBadge   tone="neutral" label={<>{lang === 'en' ? 'Normal' : 'Bình thường'}</>} />;
    }
  };


  const getStatusLabel = (s: string) => {
    const norm = (s || '').toLowerCase();
    if (norm === 'in_progress' || norm === 'doing') return lang === 'en' ? 'In Progress' : 'Đang thực hiện';
    if (norm === 'completed' || norm === 'done') return lang === 'en' ? 'Completed' : 'Hoàn thành';
    if (norm === 'cancelled') return lang === 'en' ? 'Cancelled' : 'Đã hủy';
    return lang === 'en' ? 'To Do' : 'Cần làm';
  };

  // Metrics computation
  const tasksPagination = usePagination(tasks, JSON.stringify([farmId, keyword, statusFilter, priorityFilter, seasonFilter, zoneFilter]));
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
          <span className="task-type-pill">{(lang === 'en' ? t.taskType || translate("Crop care") : t.taskType || 'Chăm sóc')}</span>
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
                📍 {(lang === 'en' ? t.zoneName || "Growing zone" : t.zoneName || 'Khu canh tác')}
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
              <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>{translate("Unassigned")}</span>
            )}
          </div>

          {t.dueAt && (
            <span className={`task-due-date ${isOverdue ? 'is-overdue' : ''}`}>
              📅 {displayDate(t.dueAt, lang)}
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
                {lang === 'en' ? '▶ Start' : '▶ Bắt đầu'}
              </button>
            )}
            {t.status === 'in_progress' && (
              <button
                type="button"
                className="task-btn-action task-btn-done"
                onClick={() => handleQuickStatusChange(t.taskId, 'completed')}
              >
                {lang === 'en' ? '✓ Complete' : '✓ Complete'}
              </button>
            )}
            {t.status === 'completed' && (
              <button
                type="button"
                className="task-btn-action"
                onClick={() => handleQuickStatusChange(t.taskId, 'in_progress')}
              >
                {lang === 'en' ? '↺ Reopen' : '↺ Reopen việc'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="task-btn-action"
              title={(lang === 'en' ? "View details" : "Xem chi tiết")}
              onClick={() => setSelectedTaskDetail(t)}
            >
              <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="task-btn-action"
              title={(lang === 'en' ? "Edit" : "Chỉnh sửa")}
              onClick={() => openEditModal(t)}
            >
              {(lang === 'en' ? "Edit" : "Sửa")}
            </button>
            <button
              type="button"
              className="task-btn-action"
              style={{ color: 'var(--color-danger)' }}
              title={(lang === 'en' ? "Delete task" : "Xóa việc")}
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
    <section className="tasks-page" style={{ maxWidth: '100%', width: '100%', margin: '0 auto', padding: '12px 16px 32px', boxSizing: 'border-box' }}>
      {/* Notification Banner */}
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
            {lang === 'en' ? 'Task Assignment & Management' : 'Phân công và quản lý công việc'}
          </>} description={<>
            {lang === 'en' ? `${totalTasks} tasks · ${todoTasks.length} to do · ${inProgressTasks.length} in progress · ${completedTasks.length} completed at ${selectedFarm?.farmName || 'Farm'}` : `${totalTasks} nhiệm vụ · ${todoTasks.length} cần làm · ${inProgressTasks.length} đang làm · ${completedTasks.length} hoàn thành tại ${selectedFarm?.farmName || 'Trang trại'}`}
          </>}><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            type="button"
            variant="primary"
            disabled={!farmId}
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Icon name="plus" size={16} /> {lang === 'en' ? 'Assign New Task' : 'Giao việc mới'}
          </Button>
        </div></PageHeading>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Clean Filter Bar in ONE line without overflowing */}
        <div className="zone-clean-filter-bar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="zone-clean-search" style={{ flex: 1, minWidth: '200px' }}>
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input aria-label={lang === 'en' ? 'Search by task name, notes, assignee...' : 'Tìm theo tên công việc, ghi chú, người thực hiện...'} id="tasks-page-control-1" className="ui-input"
              type="search"
              placeholder={lang === 'en' ? 'Search by task name, notes, assignee...' : 'Tìm theo tên công việc, ghi chú, người thực hiện...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Filter by Priority */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '135px' }}>
            <select className="ui-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label={(lang === 'en' ? "Filter by priority" : "Lọc theo độ ưu tiên")}
            >
              <option value="all">{translate("All Priorities")}</option>
              <option value="urgent">{lang === 'en' ? 'Urgent' : 'Khẩn cấp'}</option>
              <option value="high">{lang === 'en' ? 'High Priority' : 'Ưu tiên cao'}</option>
              <option value="normal">{lang === 'en' ? 'Normal' : 'Bình thường'}</option>
              <option value="low">{lang === 'en' ? 'Low' : 'Mức thấp'}</option>
            </select>
          </div>

          {/* Filter by Season */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '140px' }}>
            <select className="ui-select"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value ? Number(e.target.value) : '')}
              aria-label={(lang === 'en' ? "Filter by season" : "Lọc theo mùa vụ")}
            >
              <option value="">{translate("All Seasons")}</option>
              {seasons.map((s) => (
                <option key={s.cropSeasonId} value={s.cropSeasonId}>
                  {s.seasonName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Zone */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '135px' }}>
            <select className="ui-select"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value ? Number(e.target.value) : '')}
              aria-label={(lang === 'en' ? "Filter by zone" : "Lọc theo khu vực")}
            >
              <option value="">{translate("All Zones")}</option>
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
            title={(lang === 'en' ? "Reload and reset filters" : "Tải lại và đặt lại bộ lọc")}
            aria-label={(lang === 'en' ? "Reload and reset filters" : "Tải lại và đặt lại bộ lọc")}
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
          <div className="tasks-view-switch" role="group" aria-label={(lang === 'en' ? "View mode" : "Chế độ hiển thị")} style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
              onClick={() => setViewMode('TABLE')}
            >
              {lang === 'en' ? 'List view' : 'Danh sách'}
            </button>
            <button
              type="button"
              className={`tasks-view-btn ${viewMode === 'KANBAN' ? 'active' : ''}`}
              onClick={() => setViewMode('KANBAN')}
            >
              {lang === 'en' ? 'Kanban board' : 'Bảng công việc'}
            </button>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div
          style={{
            padding: '8px 20px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-page)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-body)' }}>
            {lang === 'en' ? 'Status:' : 'Trạng thái:'}
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="task-status-chip" aria-pressed={statusFilter === 'all'}
          >
            {lang === 'en' ? 'All' : 'Tất cả'} ({totalTasks})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('planned')}
            className="task-status-chip" aria-pressed={statusFilter === 'planned'}
          >
            {lang === 'en' ? 'To do' : 'Cần làm'} ({todoTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className="task-status-chip" aria-pressed={statusFilter === 'in_progress'}
          >
            {lang === 'en' ? 'In progress' : 'Đang thực hiện'} ({inProgressTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className="task-status-chip" aria-pressed={statusFilter === 'completed'}
          >
            {lang === 'en' ? 'Completed' : 'Hoàn thành'} ({completedTasks.length})
          </button>
          {urgentTasks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('urgent');
              }}
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: priorityFilter === 'urgent' ? 'var(--color-danger)' : 'var(--color-surface)',
                borderColor: priorityFilter === 'urgent' ? 'var(--color-danger)' : 'var(--color-border)',
                color: priorityFilter === 'urgent' ? 'var(--color-surface)' : 'var(--color-danger)',
                transition: 'all 0.15s ease',
              }}
            >{translate("🚨 Urgent (")}{urgentTasks.length})
            </button>
          )}
        </div>

        {/* Main Content: Table List or Kanban */}
        {viewMode === 'TABLE' ? (
          loading ? (
            <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading tasks..." : "Đang tải danh sách tasks...")}</>} icon={<>⏳</>} />
          ) : tasks.length === 0 ? (
            <EmptyState  className="panel" title={<>
                {(lang === 'en' ? "No matching tasks found" : "Không tìm thấy tasks nào phù hợp")}
              </>} description={<>
                {lang === 'en' ? 'Assign tasks to technical staff to supervise VietGAP crop care progress.' : 'Giao việc và phân công nhân viên kỹ thuật để giám sát tiến độ chăm sóc cây trồng theo tiêu chuẩn VietGAP.'}
              </>} action={<><div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-primary-text)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Icon name="check-circle" size={32} />
              </div><Button
                type="button"
                variant="primary"
                onClick={openCreateModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name="plus" size={16} /> {lang === 'en' ? 'Assign Task Now' : 'Giao việc ngay'}
              </Button></>} />
          ) : (
            <>
              <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0, overflowX: 'auto' }} tabIndex={0}>
                <table className="ui-data-table ui-data-table--wide" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-page)' }}>
                      <th scope="col" style={{ width: '38px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={(lang === 'en' ? "Select all tasks" : "Chọn tất cả việc")} style={{ cursor: 'pointer' }} />
                      </th>
                      <th scope="col" style={{ width: '23%', }}>
                        {lang === 'en' ? 'Task Name & Type' : 'Tên công việc và phân loại'}
                      </th>
                      <th scope="col" style={{ width: '13%', }}>
                        {lang === 'en' ? 'Season & Location' : 'Mùa vụ & Vị trí'}
                      </th>
                      <th scope="col" style={{ width: '10%', textAlign: 'center' }}>
                        {lang === 'en' ? 'Priority' : 'Độ ưu tiên'}
                      </th>
                      <th scope="col" style={{ width: '12%', }}>
                        {lang === 'en' ? 'Assignee' : 'Người phụ trách'}
                      </th>
                      <th scope="col" style={{ width: '10%', }}>
                        {lang === 'en' ? 'Due Date' : 'Hạn hoàn thành'}
                      </th>
                      <th scope="col" style={{ width: '10%', textAlign: 'center' }}>
                        {lang === 'en' ? translate("Status") : 'Trạng thái'}
                      </th>
                      <th scope="col" style={{ width: '11%', textAlign: 'center', }}>
                        {lang === 'en' ? 'Progress' : 'Tiến độ'}
                      </th>
                      <th scope="col" style={{ width: '11%', textAlign: 'center', }}>
                        {lang === 'en' ? 'Actions' : 'Thao tác'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksPagination.items.map((t) => {
                      const isCompleted = t.status === 'completed';
                      const isInProgress = t.status === 'in_progress';

                      return (
                        <tr key={t.taskId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" aria-label={(lang === 'en' ? `Select ${t.taskName}` : `Chọn ${t.taskName}`)} style={{ cursor: 'pointer' }} />
                          </td>

                          <td style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong
                                style={{
                                  cursor: 'pointer',
                                  color: 'var(--color-text)',
                                  fontSize: '13.5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'inline-block',
                                  maxWidth: 'calc(100% - 95px)',
                                  transition: 'color 0.15s ease',
                                }}
                                title={t.taskName}
                                onClick={() => setSelectedTaskDetail(t)}
                                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                              >
                                {t.taskName}
                              </strong>
                              <span
                                className="crop-cat-pill blue"
                                style={{
                                  fontSize: '10.5px',
                                  padding: '1px 6px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                {(lang === 'en' ? t.taskType || translate("Crop care") : t.taskType || 'Chăm sóc')}
                              </span>
                            </div>
                            {t.description && (
                              <p
                                style={{
                                  margin: '2px 0 0',
                                  fontSize: '12px',
                                  color: 'var(--color-muted)',
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'block',
                                  maxWidth: '100%',
                                }}
                                title={t.description}
                              >
                                {t.description}
                              </p>
                            )}
                          </td>

                          <td style={{ overflow: 'hidden' }}>
                            <div
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: 'var(--color-text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={(lang === 'en' ? t.seasonName ? `Season: ${t.seasonName}` : "" : t.seasonName ? `Mùa vụ: ${t.seasonName}` : '')}
                            >
                              {t.seasonName ? `🌱 ${t.seasonName}` : '—'}
                            </div>
                            {(t.zoneName || t.blockName) && (
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--color-muted)',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={`${t.zoneName || ''} • ${t.blockName || ''}`}
                              >
                                {t.zoneName ? `📍 ${t.zoneName}` : ''}
                                {t.blockName ? ` • ${t.blockName}` : ''}
                              </div>
                            )}
                          </td>

                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {getPriorityBadge(t.priority)}
                          </td>

                          <td style={{ overflow: 'hidden' }}>
                            {t.assignees && t.assignees.length > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: 'var(--color-success-bg)',
                                    color: 'var(--color-success)',
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(t.assignees[0].fullName || 'NS').slice(0, 1).toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'var(--color-text)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={t.assignees.map((a) => a.fullName).join(', ')}
                                >
                                  {t.assignees[0].fullName}
                                  {t.assignees.length > 1 && ` +${t.assignees.length - 1}`}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-muted)', fontSize: '12px', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{translate("Unassigned")}</span>
                            )}
                          </td>

                          <td style={{ whiteSpace: 'nowrap' }}>
                            {t.dueAt ? (
                              <span
                                className={`task-due-date ${!isCompleted && t.dueAt < nowIso ? 'is-overdue' : ''}`}
                                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                📅 {displayDate(t.dueAt, lang)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span
                              className={`status-dot-badge ${
                                isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'active'
                              }`}
                            >
                              <span className="dot" />
                              {translate(getStatusLabel(t.status))}
                            </span>
                          </td>

                          {/* Quick progress transition */}
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t.status === 'planned' && (
                              <button
                                type="button"
                                className="btn-status-quick start"
                                title={(lang === 'en' ? "Start task" : "Bắt đầu thực hiện công việc")}
                                onClick={() => void handleQuickStatusChange(t.taskId, 'in_progress')}
                              >{translate("▶ Start")}</button>
                            )}
                            {t.status === 'in_progress' && (
                              <button
                                type="button"
                                className="btn-status-quick done"
                                title={(lang === 'en' ? "Approve completion" : "Nghiệm thu hoàn thành")}
                                onClick={() => void handleQuickStatusChange(t.taskId, 'completed')}
                              >{translate("✓ Complete")}</button>
                            )}
                            {t.status === 'completed' && (
                              <button
                                type="button"
                                className="btn-status-quick reopen"
                                title={translate("Reopen tasks")}
                                onClick={() => void handleQuickStatusChange(t.taskId, 'in_progress')}
                              >{translate("↺ Reopen")}</button>
                            )}
                          </td>

                          {/* Action icons */}
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div className="table-action-btns" style={{ justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={(lang === 'en' ? "View task details" : "Xem chi tiết tasks")}
                                aria-label={(lang === 'en' ? `Details ${t.taskName}` : `Chi tiết ${t.taskName}`)}
                                onClick={() => setSelectedTaskDetail(t)}
                              >
                                <Icon name="eye" size={15} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn edit"
                                title={(lang === 'en' ? "Edit task" : "Chỉnh sửa công việc")}
                                aria-label={(lang === 'en' ? `Edit ${t.taskName}` : `Chỉnh sửa ${t.taskName}`)}
                                onClick={() => openEditModal(t)}
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={(lang === 'en' ? "Delete task" : "Xóa tasks")}
                                aria-label={(lang === 'en' ? `Delete ${t.taskName}` : `Xóa ${t.taskName}`)}
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
              <TablePagination {...tasksPagination} disabled={loading} />
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
                    <span>{lang === 'en' ? 'To Do' : 'Cần làm'}</span>
                  </div>
                  <span className="tasks-column-count">{todoTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {todoTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>{(lang === 'en' ? "No tasks to do" : "Không có việc chờ thực hiện")}</span>
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
                    <span>{lang === 'en' ? 'In Progress' : 'Đang thực hiện'}</span>
                  </div>
                  <span className="tasks-column-count">{inProgressTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {inProgressTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>{(lang === 'en' ? "No tasks in progress" : "Chưa có việc đang làm")}</span>
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
                    <span>{lang === 'en' ? 'Completed' : 'Hoàn thành'}</span>
                  </div>
                  <span className="tasks-column-count">{completedTasks.length}</span>
                </div>
                <div className="tasks-column-body">
                  {completedTasks.length === 0 ? (
                    <div className="tasks-column-empty">
                      <span>{(lang === 'en' ? "No completed tasks" : "Chưa có việc hoàn thành")}</span>
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
        title={editingTask ? (lang === 'en' ? 'Edit Task' : 'Chỉnh sửa công việc') : (lang === 'en' ? 'Assign New Task (VietGAP)' : 'Giao việc mới (VietGAP)')}
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {taskModalError && (
            <p className="form-error-banner" role="alert" style={{ margin: '0 0 4px' }}>
              {translate(taskModalError)}
            </p>
          )}
          <div className="task-form-grid">
            <div className="task-form-field task-field-full structured-field-card">
              <label htmlFor="task-name">{(lang === 'en' ? "Task name *" : "Tên công việc *")}</label>
              <input className="ui-input"
                id="task-name"
                required
                maxLength={160}
                placeholder={(lang === 'en' ? "Example: Prepare nutrient solution and check the drip irrigation system" : "Ví dụ: Pha chế dịch dinh dưỡng và kiểm tra hệ thống tưới nhỏ giọt")}
                value={formTaskName}
                onChange={(e) => setFormTaskName(e.target.value)}
              />
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-type">{(lang === 'en' ? "Task type *" : "Loại công việc *")}</label>
              <select className="ui-select"
                id="task-type"
                value={formTaskType}
                onChange={(e) => setFormTaskType(e.target.value)}
              >
                <option value="Làm đất">{(lang === 'en' ? "Soil Preparation & Substrate Treatment" : "Làm đất & Xử lý giá thể")}</option>
                <option value="Gieo trồng">{(lang === 'en' ? "Seeding & Transplanting" : "Gieo hạt & Cấy cây con")}</option>
                <option value="Bón phân & Tưới">{(lang === 'en' ? "Fertilization & Irrigation" : "Bón phân & Tưới tiêu")}</option>
                <option value="Growth Monitoring">{(lang === 'en' ? "Growth Monitoring & Pruning" : "Theo dõi sinh trưởng và tỉa cành")}</option>
                <option value="Plant Protection">{(lang === 'en' ? "Plant Protection & Biological Spraying" : "Bảo vệ thực vật và phun vi sinh")}</option>
                <option value="Thu hoạch">{(lang === 'en' ? "Harvesting & Packing" : "Thu hoạch & Đóng gói")}</option>
                <option value="VietGAP Compliance">{(lang === 'en' ? "Monitoring & VietGAP Compliance" : "Giám sát và tuân thủ VietGAP")}</option>
                <option value="Khác">{(lang === 'en' ? "Other tasks" : "Công việc khác")}</option>
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-priority">{(lang === 'en' ? "Priority *" : "Mức độ ưu tiên *")}</label>
              <select className="ui-select"
                id="task-priority"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              >
                <option value="urgent">{(lang === 'en' ? "Urgent (Immediate action)" : "Khẩn cấp (xử lý ngay)")}</option>
                <option value="high">{(lang === 'en' ? "High priority" : "Ưu tiên cao")}</option>
                <option value="normal">{lang === 'en' ? 'Normal' : 'Bình thường'}</option>
                <option value="low">{lang === 'en' ? 'Low' : 'Mức thấp'}</option>
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-season">{(lang === 'en' ? "Linked crop season" : "Mùa vụ canh tác liên kết")}</label>
              <select className="ui-select"
                id="task-season"
                value={formSeasonId}
                onChange={(e) => setFormSeasonId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">{(lang === 'en' ? "No specific season" : "Không liên kết vụ cụ thể")}</option>
                {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-status">{(lang === 'en' ? "Task status" : "Trạng thái công việc")}</label>
              <select className="ui-select"
                id="task-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="planned">{lang === 'en' ? 'To Do' : 'Cần làm'}</option>
                <option value="in_progress">{lang === 'en' ? 'In Progress' : 'Đang thực hiện'}</option>
                <option value="completed">{lang === 'en' ? 'Completed' : 'Hoàn thành'}</option>
                <option value="cancelled">{(lang === 'en' ? 'Cancelled' : 'Đã hủy')}</option>
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-zone">{(lang === 'en' ? "Production zone" : "Khu vực sản xuất")}</label>
              <select className="ui-select"
                id="task-zone"
                value={formZoneId}
                onChange={(e) => {
                  setFormZoneId(e.target.value ? Number(e.target.value) : '');
                  setFormBlockId('');
                }}
              >
                <option value="">{(lang === 'en' ? "Select zone" : "Chọn khu vực")}</option>
                {zones.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.zoneName}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-block">
                {(lang === 'en' ? "Growing block" : "Lô sản xuất")}{' '}
                {seasonBlocks.length > 0 && (
                  <span style={{ color: 'var(--color-primary-text)', fontSize: '11.5px', fontWeight: 700 }}>
                    {(lang === 'en' ? "(Within season: " : "(Thuộc mùa vụ: ")} {seasonBlocks.length} {translate('plots)')}
                  </span>
                )}
              </label>
              <select className="ui-select"
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
                <option value="">{(lang === 'en' ? "Select block" : "Chọn plot đất")}</option>
                {seasonBlocks.length > 0
                  ? seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      🌱 {sb.blockName} ({sb.zoneName || `Khu #${sb.zoneId}`} · {sb.plantedArea ?? sb.blockArea}{' '}
                      {translate(sb.areaUnit || 'm²')})
                    </option>
                  ))
                  : blocks.map((b) => (
                    <option key={b.blockId} value={b.blockId}>
                      {b.blockName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-start">{lang === 'en' ? 'Start Time' : 'Thời gian bắt đầu'}</label>
              <input className="ui-input"
                id="task-start"
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
            </div>

            <div className="task-form-field structured-field-card">
              <label htmlFor="task-due">{(lang === 'en' ? "Due date (Deadline)" : "Hạn hoàn thành (Deadline)")}</label>
              <input className="ui-input"
                id="task-due"
                type="datetime-local"
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
              />
            </div>

            <div className="task-form-field task-field-full structured-field-card">
              <label>{(lang === 'en' ? "Assign staff" : "Phân công nhân sự thực hiện")}</label>
              <div
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: '8px',
                  padding: '10px',
                  background: 'var(--color-page)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                }}
              >
                {staffList.length === 0 ? (
                  <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                    {(lang === 'en' ? "The farm has no staff. Add staff under \"Labor & Staff\"." : "Chưa có nhân sự trong trang trại. Hãy thêm nhân sự at mục \"Người lao động\".")}
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
                          <strong>{s.fullName}</strong> ({translate(s.roleLabel)})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="task-form-field task-field-full structured-field-card">
              <label htmlFor="task-desc">{(lang === 'en' ? "Technical Description & Instructions" : "Mô tả kỹ thuật & Hướng dẫn thực hiện")}</label>
              <textarea className="ui-textarea"
                id="task-desc"
                rows={3}
                placeholder={(lang === 'en' ? "Specify procedures, dosage, protective equipment, and VietGAP requirements..." : "Ghi rõ quy trình kỹ thuật, liều lượng, dụng cụ bảo hộ hoặc yêu cầu VietGAP cần tuân thủ...")}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
            >
              {(lang === 'en' ? translate("Cancel") : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              <Icon name={submitting ? 'loader' : 'save'} />
              {submitting ? (lang === 'en' ? translate("Saving...") : 'Đang lưu...') : editingTask ? (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi') : (lang === 'en' ? 'Assign Task Now' : 'Giao việc ngay')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Xem chi tiết tasks */}
      {selectedTaskDetail && (
        <Modal
          open
          onClose={() => setSelectedTaskDetail(null)}
          title={(lang === 'en' ? `Task details #${selectedTaskDetail.taskId}` : `Chi tiết tasks #${selectedTaskDetail.taskId}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="task-type-pill">{(lang === 'en' ? selectedTaskDetail.taskType || translate("Crop care") : selectedTaskDetail.taskType || 'Chăm sóc')}</span>
            {getPriorityBadge(selectedTaskDetail.priority)}
          </div>

          <h2 style={{ fontSize: '19px', color: 'var(--color-text)', margin: '12px 0 6px' }}>
            {selectedTaskDetail.taskName}
          </h2>

          <p style={{ margin: 0, color: 'var(--color-body)', fontSize: '14px', lineHeight: 1.5 }}>
            {(lang === 'en' ? selectedTaskDetail.description || "No detailed description." : selectedTaskDetail.description || 'Không có mô tả chi tiết.')}
          </p>

          <dl className="task-detail-grid">
            <dt>{(lang === 'en' ? "Current status:" : "Trạng thái hiện tại:")}</dt>
            <dd>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    selectedTaskDetail.status === 'completed'
                      ? 'var(--color-success-bg)'
                      : selectedTaskDetail.status === 'in_progress'
                        ? 'var(--color-info-bg)'
                        : 'var(--color-warning-bg)',
                  color:
                    selectedTaskDetail.status === 'completed'
                      ? 'var(--color-success)'
                      : selectedTaskDetail.status === 'in_progress'
                        ? 'var(--color-info)'
                        : 'var(--color-warning)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                }}
              >
                {translate(getStatusLabel(selectedTaskDetail.status))}
              </span>
            </dd>

            <dt>{(lang === 'en' ? "Crop season:" : "Mùa vụ canh tác:")}</dt>
            <dd>{(lang === 'en' ? selectedTaskDetail.seasonName ? `🌱 ${selectedTaskDetail.seasonName}` : "No linked season" : selectedTaskDetail.seasonName ? `🌱 ${selectedTaskDetail.seasonName}` : 'Chưa liên kết mùa vụ')}</dd>

            <dt>{(lang === 'en' ? "Zone & Block:" : "Khu vực & Thửa đất:")}</dt>
            <dd>
              {(lang === 'en' ? selectedTaskDetail.zoneName ? `📍 ${selectedTaskDetail.zoneName}` : "No zone assigned" : selectedTaskDetail.zoneName ? `📍 ${selectedTaskDetail.zoneName}` : 'Chưa gắn khu vực')}
              {selectedTaskDetail.blockName ? ` / ${selectedTaskDetail.blockName}` : ''}
            </dd>

            <dt>{lang === 'en' ? 'Assigned Staff' : 'Nhân sự phụ trách'}:</dt>
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
                (lang === 'en' ? "No staff assigned" : 'Unassigned nhân sự')
              )}
            </dd>

            <dt>{(lang === 'en' ? "Start time:" : "Thời gian bắt đầu:")}</dt>
            <dd>
              {(lang === 'en' ? selectedTaskDetail.startsAt ? displayDateTime(selectedTaskDetail.startsAt, lang) : "Not set" : selectedTaskDetail.startsAt
                ? displayDateTime(selectedTaskDetail.startsAt, lang)
                : 'Chưa đặt')}
            </dd>

            <dt>{(lang === 'en' ? "Due date:" : "Hạn hoàn thành:")}</dt>
            <dd>
              {(lang === 'en' ? selectedTaskDetail.dueAt ? displayDateTime(selectedTaskDetail.dueAt, lang) : "Not set" : selectedTaskDetail.dueAt
                ? displayDateTime(selectedTaskDetail.dueAt, lang)
                : 'Chưa đặt')}
            </dd>

            <dt>{(lang === 'en' ? "Assigned by:" : "Người giao việc:")}</dt>
            <dd>{(lang === 'en' ? selectedTaskDetail.createdByFullName || "Farm administrator" : selectedTaskDetail.createdByFullName || 'Quản trị trang trại')}</dd>
          </dl>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const cur = selectedTaskDetail;
                setSelectedTaskDetail(null);
                openEditModal(cur);
              }}
            >
              {(lang === 'en' ? "Edit" : "Chỉnh sửa")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setSelectedTaskDetail(null)}
            >
              {(lang === 'en' ? "Close" : "Đóng")}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal 3: {lang === 'en' ? 'Delete Task' : 'Xác nhận xóa'} tasks */}
      {deletingTask && (
        <Modal
          open
          onClose={() => {
            if (!submitting) setDeletingTask(null);
          }}
          title={(lang === 'en' ? "Confirm task deletion" : "Xác nhận xóa tasks")}
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '38px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', color: 'var(--color-text)' }}>
              {(lang === 'en' ? "Delete task \"" : "Xóa tasks \"")}{deletingTask.taskName}&quot;?
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', margin: 0 }}>
              {(lang === 'en' ? "This will delete the task and related staff assignments. This cannot be undone." : "Hành động này sẽ xóa tasks và các phân công lao động liên quan. Không thể hoàn tác.")}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setDeletingTask(null)}
            >
              {(lang === 'en' ? translate("Cancel") : "Hủy")}
            </Button>
            <Button
              type="button"
              variant="primary"

              disabled={submitting}
              onClick={handleDeleteConfirm}
            >
              {(lang === 'en' ? submitting ? "Deleting..." : "Confirm deletion" : submitting ? 'Đang xóa...' : 'Xác nhận xóa')}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
