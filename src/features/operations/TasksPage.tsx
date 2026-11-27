import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { EditableSelectCombobox } from '../../shared/components/EditableSelectCombobox';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

import { formatDate as displayDate, formatDateTime as displayDateTime } from '../../shared/format/formatters';
import { getLocalDateInput, getLocalDateTimeInput } from '../../shared/format/localDateTime';
import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

import {
  fetchFarmTasks,
  fetchTaskDetail,
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
  const detailLoader = useDetailRequest(selectedFarm?.id);
  const farmId = selectedFarm?.id;

  const [tasks, setTasks] = useState<FarmTaskResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  // Filters & View mode
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
    setFormStartsAt(getLocalDateTimeInput());
    setFormDueAt(getLocalDateTimeInput(new Date(Date.now() + 2 * 86400000)));
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

    const todayStr = getLocalDateInput();
    const originalStartsAt = editingTask?.startsAt ? editingTask.startsAt.slice(0, 16) : '';
    const originalDueAt = editingTask?.dueAt ? editingTask.dueAt.slice(0, 16) : '';
    const startsAtChanged = !editingTask || formStartsAt !== originalStartsAt;
    const dueAtChanged = !editingTask || formDueAt !== originalDueAt;

    if (startsAtChanged && formStartsAt && formStartsAt.slice(0, 10) < todayStr) {
      setTaskModalError(lang === 'en' ? 'Start date cannot be in the past.' : 'Ngày bắt đầu không được chọn trong quá khứ.');
      return;
    }

    if (dueAtChanged && formDueAt && formDueAt.slice(0, 10) < todayStr) {
      setTaskModalError(lang === 'en' ? 'Due date cannot be in the past.' : 'Hạn hoàn thành không được chọn trong quá khứ.');
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
      setNotification({ text: (lang === 'en' ? "Task deleted successfully!" : 'Đã xóa công việc thành công!'), type: 'success' });
      setDeletingTask(null);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete task." : err instanceof Error ? err.message : 'Không thể xóa công việc.'),
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


  return (
    <section className="tasks-page" style={{ maxWidth: '100%', width: '100%', margin: '0 auto', padding: '12px 16px 32px', boxSizing: 'border-box' }}>
      {detailLoader.feedback}
      {/* Notification Banner */}
      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div
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
        </div>))}

      {/* Main Page Heading matching FarmHub Modern Mockup */}
      <PageHeading   title={<>
            {lang === 'en' ? 'Task Assignment & Management' : 'Phân công và quản lý công việc'}
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
          <div className="zone-clean-search" style={{ flex: '2 1 280px', minWidth: '200px' }}>
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
          <div className="zone-clean-select-wrap" style={{ flex: '1 1 160px', minWidth: '135px' }}>
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
            <span className="select-arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>
          </div>

          {/* Filter by Season */}
          <div className="zone-clean-select-wrap" style={{ flex: '1 1 180px', minWidth: '140px' }}>
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
            <span className="select-arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>
          </div>

          {/* Filter by Zone */}
          <div className="zone-clean-select-wrap" style={{ flex: '1 1 160px', minWidth: '135px' }}>
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
            <span className="select-arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>
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
            onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}
            className="task-status-chip" aria-pressed={statusFilter === 'all' && priorityFilter !== 'urgent'}
          >
            {lang === 'en' ? 'All' : 'Tất cả'} ({totalTasks})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('planned'); if (priorityFilter === 'urgent') setPriorityFilter('all'); }}
            className="task-status-chip" aria-pressed={statusFilter === 'planned' && priorityFilter !== 'urgent'}
          >
            {lang === 'en' ? 'To do' : 'Cần làm'} ({todoTasks.length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('in_progress'); if (priorityFilter === 'urgent') setPriorityFilter('all'); }}
            className="task-status-chip" aria-pressed={statusFilter === 'in_progress' && priorityFilter !== 'urgent'}
          >
            {lang === 'en' ? 'In progress' : 'Đang thực hiện'} ({inProgressTasks.length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('completed'); if (priorityFilter === 'urgent') setPriorityFilter('all'); }}
            className="task-status-chip" aria-pressed={statusFilter === 'completed' && priorityFilter !== 'urgent'}
          >
            {lang === 'en' ? 'Completed' : 'Hoàn thành'} ({completedTasks.length})
          </button>
            <button
              type="button"
              aria-pressed={priorityFilter === 'urgent'}
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
        </div>

        {/* Task list */}
        {loading ? (
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

                      <th scope="col" style={{ width: '23%', }}>
                        {lang === 'en' ? 'Task name' : 'Tên công việc'}
                      </th>
                      <th scope="col" style={{ width: '13%', }}>
                        {lang === 'en' ? 'Season & Block' : 'Mùa vụ & Lô trồng'}
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
                                  maxWidth: '100%',
                                  transition: 'color 0.15s ease',
                                }}
                                title={t.taskName}
                                onClick={() => { void detailLoader.load(() => fetchTaskDetail(t.taskId), setSelectedTaskDetail); }}
                                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                              >
                                {t.taskName}
                              </strong>
                            </div>
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
                              {t.seasonName ? `${t.seasonName}` : '—'}
                            </div>
                            {t.blockName && (
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--color-muted)',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={t.blockName}
                              >
                                {t.blockName}
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
                                  title={t.assignees.map((a) => a.fullName.replace(/\s*\([^()]*\)\s*$/, '').trim()).join(', ')}
                                >
                                  {t.assignees[0].fullName.replace(/\s*\([^()]*\)\s*$/, '').trim()}
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
                                onClick={() => { void detailLoader.load(() => fetchTaskDetail(t.taskId), setSelectedTaskDetail); }}
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
        )}
      </div>

      {/* Modal 1: Tạo mới / Chỉnh sửa công việc */}
      <Modal structured
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
              <div className="structured-field-header">
                <label htmlFor="task-name" className="structured-field-label">{(lang === 'en' ? "Task name" : "Tên công việc")}{' '}<span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <span className="structured-field-badge">{formTaskName.length}/160</span>
              </div>
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
              <div className="structured-field-header">
                <label htmlFor="task-type" className="structured-field-label">{(lang === 'en' ? "Task type" : "Loại công việc")}{' '}<span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
              </div>
              <EditableSelectCombobox
                id="task-type"
                required
                maxLength={60}
                value={formTaskType}
                onChange={setFormTaskType}
                placeholder={lang === 'en' ? 'Select or type task type...' : 'Chọn hoặc nhập loại công việc...'}
                options={[
                  { value: 'Làm đất', label: lang === 'en' ? 'Soil Preparation & Substrate Treatment' : 'Làm đất & Xử lý giá thể' },
                  { value: 'Gieo trồng', label: lang === 'en' ? 'Seeding & Transplanting' : 'Gieo hạt & Cấy cây con' },
                  { value: 'Bón phân & Tưới', label: lang === 'en' ? 'Fertilization & Irrigation' : 'Bón phân & Tưới tiêu' },
                  { value: 'Growth Monitoring', label: lang === 'en' ? 'Growth Monitoring & Pruning' : 'Theo dõi sinh trưởng và tỉa cành' },
                  { value: 'Plant Protection', label: lang === 'en' ? 'Plant Protection & Biological Spraying' : 'Bảo vệ thực vật và phun vi sinh' },
                  { value: 'Thu hoạch', label: lang === 'en' ? 'Harvesting & Packing' : 'Thu hoạch & Đóng gói' },
                  { value: 'VietGAP Compliance', label: lang === 'en' ? 'Monitoring & VietGAP Compliance' : 'Giám sát và tuân thủ VietGAP' },
                  { value: 'Khác', label: lang === 'en' ? 'Other tasks' : 'Công việc khác' },
                ]}
              />
            </div>

            <div className="task-form-field structured-field-card">
              <div className="structured-field-header">
                <label htmlFor="task-priority" className="structured-field-label">{(lang === 'en' ? "Priority" : "Mức độ ưu tiên")}{' '}<span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
              </div>
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
              <div className="structured-field-header">
                <label htmlFor="task-season" className="structured-field-label">{(lang === 'en' ? "Linked crop season" : "Mùa vụ canh tác liên kết")}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
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
              <div className="structured-field-header">
                <label htmlFor="task-status" className="structured-field-label">{(lang === 'en' ? "Task status" : "Trạng thái công việc")}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Status' : 'Trạng thái'}</span>
              </div>
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
              <div className="structured-field-header">
                <label htmlFor="task-zone" className="structured-field-label">{(lang === 'en' ? "Production zone" : "Khu vực sản xuất")}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
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
              <label htmlFor="task-block" className="structured-field-label">
                {(lang === 'en' ? "Growing block" : "Lô trồng")}{' '}
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
                      {sb.blockName} ({sb.zoneName || `Khu`} · {sb.plantedArea ?? sb.blockArea}{' '}
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
              <div className="structured-field-header">
                <label htmlFor="task-start" className="structured-field-label">{lang === 'en' ? 'Start Time' : 'Thời gian bắt đầu'}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Date & time' : 'Ngày giờ'}</span>
              </div>
              <input className="ui-input"
                id="task-start"
                type="datetime-local"
                min={!editingTask ? `${getLocalDateInput()}T00:00` : undefined}
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
            </div>

            <div className="task-form-field structured-field-card">
              <div className="structured-field-header">
                <label htmlFor="task-due" className="structured-field-label">{(lang === 'en' ? "Due date (Deadline)" : "Hạn hoàn thành (Deadline)")}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Date & time' : 'Ngày giờ'}</span>
              </div>
              <input className="ui-input"
                id="task-due"
                type="datetime-local"
                min={!editingTask ? (formStartsAt && formStartsAt >= `${getLocalDateInput()}T00:00` ? formStartsAt : `${getLocalDateInput()}T00:00`) : (formStartsAt || undefined)}
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
              />
            </div>

            <div className="task-form-field task-field-full structured-field-card">
              <label className="structured-field-label">{(lang === 'en' ? "Assign staff" : "Phân công nhân sự thực hiện")}</label>
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
              <div className="structured-field-header">
                <label htmlFor="task-desc" className="structured-field-label">{(lang === 'en' ? "Technical Description & Instructions" : "Mô tả kỹ thuật & Hướng dẫn thực hiện")}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <textarea className="ui-textarea"
                id="task-desc"
                rows={3}
                placeholder={(lang === 'en' ? "Specify procedures, dosage, protective equipment, and VietGAP requirements..." : "Ghi rõ quy trình kỹ thuật, liều lượng, dụng cụ bảo hộ hoặc yêu cầu VietGAP cần tuân thủ...")}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button className={'ui-cancel-button'}
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
            >
              {(lang === 'en' ? translate("Cancel") : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? (lang === 'en' ? translate("Saving...") : 'Đang lưu...') : editingTask ? (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi') : (lang === 'en' ? 'Assign Task Now' : 'Giao việc ngay')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Xem chi tiết tasks */}
      {selectedTaskDetail && (
        <Modal structured
          open
          onClose={() => setSelectedTaskDetail(null)}
          title={lang === 'en' ? 'Task details' : 'Chi tiết công việc'}
        >
          <div className="structured-field-card ui-detail-primary">
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

          </div>

          <dl className="detail-list" style={{ margin: '18px 0 0' }}>
            <div>
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
            </div>

            <div>
              <dt>{(lang === 'en' ? "Crop season:" : "Mùa vụ canh tác:")}</dt>
              <dd>{(lang === 'en' ? selectedTaskDetail.seasonName ? `${selectedTaskDetail.seasonName}` : "No linked season" : selectedTaskDetail.seasonName ? `${selectedTaskDetail.seasonName}` : 'Chưa liên kết mùa vụ')}</dd>
            </div>

            <div>
              <dt>{(lang === 'en' ? "Zone & Block:" : "Khu vực & Lô trồng:")}</dt>
              <dd>
              {(lang === 'en' ? selectedTaskDetail.zoneName ? `📍 ${selectedTaskDetail.zoneName}` : "No zone assigned" : selectedTaskDetail.zoneName ? `📍 ${selectedTaskDetail.zoneName}` : 'Chưa gắn khu vực')}
              {selectedTaskDetail.blockName ? ` / ${selectedTaskDetail.blockName}` : ''}
            </dd>
            </div>

            <div>
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
                (lang === 'en' ? "No staff assigned" : 'Chưa phân công nhân sự')
              )}
            </dd>
            </div>

            <div>
              <dt>{(lang === 'en' ? "Start time:" : "Thời gian bắt đầu:")}</dt>
              <dd>
              {(lang === 'en' ? selectedTaskDetail.startsAt ? displayDateTime(selectedTaskDetail.startsAt, lang) : "Not set" : selectedTaskDetail.startsAt
                ? displayDateTime(selectedTaskDetail.startsAt, lang)
                : 'Chưa đặt')}
            </dd>
            </div>

            <div>
              <dt>{(lang === 'en' ? "Due date:" : "Hạn hoàn thành:")}</dt>
              <dd>
              {(lang === 'en' ? selectedTaskDetail.dueAt ? displayDateTime(selectedTaskDetail.dueAt, lang) : "Not set" : selectedTaskDetail.dueAt
                ? displayDateTime(selectedTaskDetail.dueAt, lang)
                : 'Chưa đặt')}
            </dd>
            </div>

            <div>
              <dt>{(lang === 'en' ? "Assigned by:" : "Người giao việc:")}</dt>
              <dd>{(lang === 'en' ? selectedTaskDetail.createdByFullName || "Farm administrator" : selectedTaskDetail.createdByFullName || 'Quản trị trang trại')}</dd>
            </div>
          </dl>

          <div className="confirm-dialog-actions" style={{ marginTop: '24px' }}>
            <Button className={'ui-edit-action'}
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
            <Button className={'ui-close-action'}
              type="button"
              variant="secondary"
              onClick={() => setSelectedTaskDetail(null)}
            >
              {(lang === 'en' ? "Close" : "Đóng")}
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title={lang === 'en' ? 'Delete task' : 'Xóa công việc'}
        description={lang === 'en'
          ? <>Are you sure you want to delete <strong>{deletingTask?.taskName}</strong>? This also removes related staff assignments and cannot be undone.</>
          : <>Bạn có chắc chắn muốn xóa công việc <strong>{deletingTask?.taskName}</strong>? Các phân công liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác.</>}
        confirmLabel={lang === 'en' ? 'Delete task' : 'Xóa công việc'}
        tone="danger"
        loading={submitting}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => { void handleDeleteConfirm(); }}
      />
    </section>
  );
}
