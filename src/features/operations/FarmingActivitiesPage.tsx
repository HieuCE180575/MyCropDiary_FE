import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { formatDateTime as uiFormatDateTime } from '../../shared/format/formatters';

import { formatDate as displayDate, formatDateTime as displayDateTime } from '../../shared/format/formatters';
import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useState } from 'react';

import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { message, type TranslationMessage } from '../../shared/i18n/translate';
import {
  fetchCropSeasonsByFarm,
  fetchBlocksInSeason,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';

interface FarmingActivity {
  id: number;
  farmingActivityId?: number;
  cropSeasonId: number;
  blockId?: number | null;
  blockName?: string | null;
  activityType: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
  description?: string;
  resultNotes?: string;
  weatherNotes?: string;
  recorderName?: string;
  recorderFullName?: string;
  supervisorFullName?: string;
  workerCount?: number;
  totalWorkers?: number;
}

const activitiesMemoryCache = new Map<number, FarmingActivity[]>();
const seasonBlocksMemoryCache = new Map<number, CropSeasonBlockResp[]>();

export function FarmingActivitiesPage() {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const detailLoader = useDetailRequest(selectedFarm?.id);
  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [seasonId, setSeasonId] = useState<number | ''>('');
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [activities, setActivities] = useState<FarmingActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBlockId, setFilterBlockId] = useState<number | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmingActivity | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<FarmingActivity | null>(null);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  // Form states
  const [selectedBlockId, setSelectedBlockId] = useState<number | ''>('');
  const [actType, setActType] = useState('Fertilizing');
  const [actName, setActName] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('Trời nắng nhẹ, độ ẩm 75%');
  const [saving, setSaving] = useState(false);
  const [activityModalError, setActivityModalError] = useState<string | null>(null);

  const loadSeasons = async () => {
    if (!selectedFarm?.id) {
      setSeasons([]);
      setSeasonId('');
      setSeasonBlocks([]);
      return;
    }
    try {
      const list = await fetchCropSeasonsByFarm(selectedFarm.id);
      setSeasons(list);
      if (list.length > 0) {
        setSeasonId((prev) => (prev && list.some((s) => s.cropSeasonId === prev) ? prev : list[0].cropSeasonId));
      } else {
        setSeasonId('');
        setSeasonBlocks([]);
        setActivities([]);
      }
    } catch {
      setSeasons([]);
    }
  };

  const loadBlocksForSeason = async (targetSeasonId: number) => {
    if (seasonBlocksMemoryCache.has(targetSeasonId)) {
      const cached = seasonBlocksMemoryCache.get(targetSeasonId)!;
      setSeasonBlocks(cached);
      setSelectedBlockId((prev) => {
        if (prev && cached.some((b) => b.blockId === prev)) return prev;
        return cached[0]?.blockId ?? '';
      });
    }
    try {
      const blocks = await fetchBlocksInSeason(targetSeasonId);
      seasonBlocksMemoryCache.set(targetSeasonId, blocks);
      setSeasonBlocks(blocks);
      setSelectedBlockId((prev) => {
        if (prev && blocks.some((b) => b.blockId === prev)) return prev;
        return blocks[0]?.blockId ?? '';
      });
    } catch {
      if (!seasonBlocksMemoryCache.has(targetSeasonId)) {
        setSeasonBlocks([]);
        setSelectedBlockId('');
      }
    }
  };

  useEffect(() => {
    void loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarm?.id]);

  useEffect(() => {
    if (seasonId) {
      setFilterBlockId('ALL');
      const targetId = Number(seasonId);
      if (activitiesMemoryCache.has(targetId)) {
        setActivities(activitiesMemoryCache.get(targetId)!);
      }
      void loadBlocksForSeason(targetId);
      void loadActivities(false);
    } else {
      setSeasonBlocks([]);
      setActivities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, selectedFarm?.id]);

  useRealtimeSync(() => {
    void loadSeasons();
    if (seasonId) {
      void loadBlocksForSeason(Number(seasonId));
      void loadActivities(true);
    }
  });

  const normalizeActivity = (item: FarmingActivity, fallbackSeasonId: number): FarmingActivity => ({
    ...item,
    id: item.farmingActivityId ?? item.id,
    cropSeasonId: item.cropSeasonId ?? fallbackSeasonId,
    recorderName: item.supervisorFullName ?? item.recorderFullName ?? item.recorderName ?? 'Nhân viên kỹ thuật',
    workerCount: item.totalWorkers ?? item.workerCount ?? 1,
  });

  const loadActivities = async (silent = false) => {
    if (!seasonId) return;
    const targetId = Number(seasonId);
    const hasCache = activitiesMemoryCache.has(targetId);
    if (!silent && !hasCache) {
      setLoading(true);
      setNotification(null);
    }
    try {
      const res = await apiRequest<ApiResponse<{ items?: FarmingActivity[]; content?: FarmingActivity[] }>>(
        `/farming-activities?cropSeasonId=${seasonId}&size=50`
      ).catch(() => null);

      const rawItems = res?.data?.items || res?.data?.content;
      if (Array.isArray(rawItems)) {
        const normalized = rawItems.map((item) => normalizeActivity(item, targetId));
        activitiesMemoryCache.set(targetId, normalized);
        setActivities(normalized);
      } else if (!hasCache) {
        setActivities([]);
      }
    } catch {
      if (!silent && !hasCache) setNotification({ text: (lang === 'en' ? "Unable to load farming diary from the server." : 'Lỗi nạp nhật ký canh tác từ máy chủ.'), type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedActName = actName.trim();
    if (!trimmedActName) {
      setActivityModalError((lang === 'en' ? "Enter a farming activity name." : 'Vui lòng nhập tên hoạt động canh tác.'));
      return;
    }
    if (!seasonId) {
      setActivityModalError((lang === 'en' ? "Select a crop season." : 'Vui lòng chọn mùa vụ canh tác mục tiêu.'));
      return;
    }
    if (seasonBlocks.length > 0 && !selectedBlockId) {
      setActivityModalError((lang === 'en' ? "Select a block assigned to this season." : 'Vui lòng chọn lô đất thực hiện (đã được phân bổ vào mùa vụ này).'));
      return;
    }
    if (startedAt && endedAt && endedAt < startedAt) {
      setActivityModalError((lang === 'en' ? `End time (${endedAt}) cannot be before the start time (${startedAt}).` : `Thời gian kết thúc (${endedAt}) không thể trước thời gian bắt đầu (${startedAt}).`));
      return;
    }
    setSaving(true);
    setActivityModalError(null);
    setNotification(null);
    const normalizedStart = startedAt.length === 16 ? `${startedAt}:00` : startedAt;
    const normalizedEnd = endedAt ? (endedAt.length === 16 ? `${endedAt}:00` : endedAt) : undefined;
    const chosenBlock = seasonBlocks.find((b) => b.blockId === Number(selectedBlockId));

    const newActPayload = {
      cropSeasonId: Number(seasonId),
      ...(selectedBlockId ? { blockId: Number(selectedBlockId) } : {}),
      ...(chosenBlock?.zoneId ? { zoneId: chosenBlock.zoneId } : {}),
      activityType: actType,
      activityName: actName.trim(),
      startedAt: normalizedStart || new Date().toISOString().slice(0, 19),
      endedAt: normalizedEnd,
      description: description.trim(),
      resultNotes: resultNotes.trim(),
      weatherNotes: weatherNotes.trim(),
    };

    try {
      if (editingActivity) {
        const res = await apiRequest<ApiResponse<FarmingActivity>>(`/farming-activities/${editingActivity.id}`, {
          method: 'PUT',
          data: newActPayload,
        });
        if (res?.data) {
          const updated = normalizeActivity(
            {
              ...res.data,
              blockId: res.data.blockId ?? (selectedBlockId ? Number(selectedBlockId) : null),
              blockName: res.data.blockName ?? chosenBlock?.blockName ?? null,
            },
            Number(seasonId)
          );
          setActivities((prev) => prev.map((item) => (item.id === editingActivity.id ? updated : item)));
        }
        setNotification({
          text: ("Farming diary updated successfully!"),
          type: 'success',
        });
      } else {
        const res = await apiRequest<ApiResponse<FarmingActivity>>('/farming-activities', {
          method: 'POST',
          data: newActPayload,
        });
        if (res?.data) {
          const created = normalizeActivity(
            {
              ...res.data,
              blockId: res.data.blockId ?? (selectedBlockId ? Number(selectedBlockId) : null),
              blockName: res.data.blockName ?? chosenBlock?.blockName ?? null,
            },
            Number(seasonId)
          );
          setActivities((prev) => [created, ...prev]);
        } else {
          throw new Error(res?.message || 'Không thể lưu nhật ký canh tác.');
        }
        setNotification({
          text: chosenBlock ? message('Farming diary saved for "{value1}" successfully!', { value1: chosenBlock.blockName }) : 'Farming diary saved successfully!',
          type: 'success',
        });
      }
      setIsModalOpen(false);
      setEditingActivity(null);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu nhật ký canh tác.';
      setActivityModalError(msg);
      setNotification({
        text: msg,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setActName('');
    setDescription('');
    setResultNotes('');
    setActivityModalError(null);
    if (seasonBlocks.length > 0 && !selectedBlockId) {
      setSelectedBlockId(seasonBlocks[0].blockId);
    }
  };

  const currentSeason = seasons.find((s) => s.cropSeasonId === Number(seasonId));

  const filtered = activities.filter((a) => {
    const q = searchKeyword.trim().toLowerCase();
    const matchSearch =
      !q ||
      (a.activityName && a.activityName.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.recorderName && a.recorderName.toLowerCase().includes(q)) ||
      (a.blockName && a.blockName.toLowerCase().includes(q));
    const matchType = filterType === 'ALL' || a.activityType === filterType;
    const matchBlock = filterBlockId === 'ALL' || a.blockId === filterBlockId;
    return matchSearch && matchType && matchBlock;
  });

  const getActivityMeta = (type: string) => {
    switch (type) {
      case 'Soil Preparation':
        return {
          icon: 'plots',
          bg: 'var(--color-info-bg)',
          color: 'var(--color-info)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-info-bg)',
          pillColor: 'var(--color-info)',
        };
      case 'Gieo cấy':
        return {
          icon: 'sprout',
          bg: 'var(--color-success-bg)',
          color: 'var(--color-primary-text)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-success-bg)',
          pillColor: 'var(--color-primary-text)',
        };
      case 'Fertilizing':
        return {
          icon: 'granules',
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-warning-bg)',
          pillColor: 'var(--color-warning)',
        };
      case 'Irrigation':
        return {
          icon: 'drop',
          bg: 'var(--color-teal-bg)',
          color: 'var(--color-teal)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-teal-bg)',
          pillColor: 'var(--color-teal)',
        };
      case 'Spraying':
        return {
          icon: 'flask',
          bg: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-danger-bg)',
          pillColor: 'var(--color-danger)',
        };
      case 'Harvest':
        return {
          icon: 'box',
          bg: 'var(--color-accent-bg)',
          color: 'var(--color-accent)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-accent-bg)',
          pillColor: 'var(--color-accent)',
        };
      default:
        return {
          icon: 'activity',
          bg: 'var(--color-page)',
          color: 'var(--color-body)',
          border: 'var(--color-border)',
          pillBg: 'var(--color-subtle)',
          pillColor: 'var(--color-body)',
        };
    }
  };

  const activitiesPagination = usePagination(filtered, JSON.stringify([selectedFarm?.id, seasonId, searchKeyword, filterType, filterBlockId]));

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
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

      {/* Main Page Heading */}
      {detailLoader.feedback}
      <PageHeading className="activities-page-heading" title={<>
            {lang === 'en' ? 'Digital Farming Diary (VietGAP)' : 'Nhật ký canh tác số (VietGAP)'}
          </>}><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {seasonId && (
            <Link className="ui-button ui-button--secondary ui-navigation-action" to={"/crop-seasons/" + seasonId}>
              <Icon name="plots" size={16} />
              {lang === 'en' ? 'Manage growing blocks' : 'Quản lý lô trồng'} ({seasonBlocks.length})
            </Link>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={!seasonId}
            onClick={() => {
              resetForm();
              setEditingActivity(null);
              setIsModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Record New Activity' : 'Ghi nhật ký mới'}
          </Button>
        </div></PageHeading>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Clean Filter Bar */}
        <div className="zone-clean-filter-bar activities-filter-bar">
          {/* Tìm kiếm */}
          <div className="zone-clean-search" >
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input aria-label={lang === 'en' ? 'Search by activity name, process, or recorder...' : 'Tìm theo tên hoạt động, quy trình hoặc người ghi...'} id="farming-activities-page-control-1" className="ui-input"
              type="search"
              placeholder={lang === 'en' ? 'Search by activity name, process, or recorder...' : 'Tìm theo tên hoạt động, quy trình hoặc người ghi...'}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          {/* Mùa vụ canh tác */}
          <div className="activities-season-filter">
            <div className="zone-clean-select-wrap">
            <select className="ui-select"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : '')}
              aria-label={(lang === 'en' ? "Select crop season" : "Chọn mùa vụ canh tác")}
            >
              {seasons.length === 0 ? (
                <option value="">{(lang === 'en' ? "No crop seasons yet" : "Chưa có mùa vụ canh tác")}</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName} (
                    {s.seasonStatus === 'active'
                      ? (lang === 'en' ? 'Active' : 'Đang canh tác')
                      : s.seasonStatus === 'planned'
                      ? (lang === 'en' ? 'Planned' : 'Chuẩn bị vụ')
                      : (lang === 'en' && s.seasonStatus === 'completed' ? 'Completed' : s.seasonStatus)}
                    )
                  </option>
                ))
              )}
            </select>
            <span className="select-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </div>
          </div>

          {/* Phân loại hoạt động */}
          <div className="zone-clean-select-wrap">
            <select className="ui-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label={(lang === 'en' ? "Filter by activity type" : "Lọc theo loại hoạt động")}
            >
              <option value="ALL">{lang === 'en' ? 'All Activity Types' : 'Tất cả loại hoạt động'}</option>
              <option value="Soil Preparation">{(lang === 'en' ? "Soil Preparation & Substrate Treatment" : "Làm đất & Xử lý giá thể")}</option>
              <option value="Gieo cấy">{(lang === 'en' ? "Seeding & Transplanting" : "Gieo hạt & Cấy cây con")}</option>
              <option value="Fertilizing">{translate("Fertilizing")}</option>
              <option value="Irrigation">{translate("Irrigation")}</option>
              <option value="Spraying">{(lang === 'en' ? "Pesticide spraying" : "Spraying BVTV")}</option>
              <option value="Làm cỏ">{(lang === 'en' ? "Weeding & Pruning" : "Làm cỏ & Tỉa cành")}</option>
              <option value="Harvest">{translate("Harvest")}</option>
            </select>
            <span className="select-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Lô đất phân bổ */}
          <div className="zone-clean-select-wrap">
            <select className="ui-select"
              value={filterBlockId}
              onChange={(e) => setFilterBlockId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label={(lang === 'en' ? "Filter by block" : "Lọc theo lô đất")}
            >
              <option value="ALL">{lang === 'en' ? `All Blocks (${seasonBlocks.length})` : `Tất cả lô đất (${seasonBlocks.length})`}</option>
              {seasonBlocks.map((sb) => (
                <option key={sb.blockId} value={sb.blockId}>
                  {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {translate(sb.areaUnit || 'm²')})
                </option>
              ))}
            </select>
            <span className="select-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Reset button */}
          <button
            type="button"
            className="zone-clean-reload-btn"
            title={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
            aria-label={(lang === 'en' ? "Reset filters" : "Làm mới bộ lọc")}
            onClick={() => {
              setSearchKeyword('');
              setFilterType('ALL');
              setFilterBlockId('ALL');
            }}
          >
            <Icon name="refresh" size={16} />
          </button>
        </div>

        {/* Assigned Blocks Filter Bar for the Selected Season */}
        {seasonBlocks.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-page)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-body)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Icon name="plots" size={14} /> {(lang === 'en' ? " Blocks assigned to " : " Lô phân bổ vào ")} {(lang === 'en' ? currentSeason?.seasonName || "seasons" : currentSeason?.seasonName || 'vụ')}:
            </span>
            <button
              type="button"
              onClick={() => setFilterBlockId('ALL')}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                border: '1px solid',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterBlockId === 'ALL' ? 'var(--color-primary-text)' : 'var(--color-surface)',
                borderColor: filterBlockId === 'ALL' ? 'var(--color-primary-text)' : 'var(--color-input-border)',
                color: filterBlockId === 'ALL' ? 'var(--color-surface)' : 'var(--color-body)',
                transition: 'all 0.15s ease',
              }}
            >
              {(lang === 'en' ? "All blocks (" : "Tất cả lô (")}{seasonBlocks.length})
            </button>
            {seasonBlocks.map((sb) => (
              <button
                key={sb.blockId}
                type="button"
                onClick={() => setFilterBlockId(sb.blockId)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterBlockId === sb.blockId ? 'var(--color-primary-text)' : 'var(--color-surface)',
                  borderColor: filterBlockId === sb.blockId ? 'var(--color-primary-text)' : 'var(--color-border)',
                  color: filterBlockId === sb.blockId ? 'var(--color-surface)' : 'var(--color-primary-text)',
                  transition: 'all 0.15s ease',
                }}
              >
                {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {translate(sb.areaUnit || 'm²')})
              </button>
            ))}
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading farming diary..." : "Đang tải nhật ký canh tác...")}</>} icon={<>⏳</>} />
        ) : filtered.length === 0 ? (
          <EmptyState  className="panel" title={<>
              {seasonId ? (lang === 'en' ? 'No farming logs recorded yet' : 'Chưa có nhật ký canh tác nào') : (lang === 'en' ? 'No crop seasons available' : 'Chưa có mùa vụ canh tác')}
            </>} description={<>
              {seasonId
                ? (lang === 'en' ? "Record farming activities transparently for each block to meet VietGAP inspection requirements." : 'Ghi nhận và minh bạch các hoạt động chăm sóc trên từng lô đất để đáp ứng đầy đủ tiêu chuẩn kiểm tra VietGAP.')
                : (lang === 'en' ? 'Please create a crop season before logging activities.' : 'Hãy tạo mùa vụ canh tác trước khi thực hiện ghi nhật ký.')}
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
              <Icon name="book" size={32} />
            </div>{seasonId && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  resetForm();
                  setEditingActivity(null);
                  setIsModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name="plus" size={16} /> {lang === 'en' ? 'Record Activity Now' : 'Ghi nhật ký ngay'}
              </Button>
            )}</>} />
        ) : (
          <>
            <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
              <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--color-page)' }}>

                    <th scope="col">
                      {lang === 'en' ? 'Activity' : 'Hoạt động'}
                    </th>
                    <th scope="col">
                      {lang === 'en' ? 'Category' : 'Phân loại'}
                    </th>
                    <th scope="col">
                      {lang === 'en' ? 'Cultivation Plot' : 'Lô đất canh tác'}
                    </th>
                    <th scope="col">
                      {lang === 'en' ? 'Time / Date' : 'Thời gian'}
                    </th>
                    <th scope="col">
                      {lang === 'en' ? 'Recorded by' : 'Người ghi'}
                    </th>
                    <th scope="col" style={{ width: '100px', textAlign: 'right' }}>
                      {lang === 'en' ? 'Actions' : 'Thao tác'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activitiesPagination.items.map((act) => {
                    const meta = getActivityMeta(act.activityType);
                    const matchedBlockName =
                      act.blockName ||
                      seasonBlocks.find((b) => b.blockId === act.blockId)?.blockName ||
                      (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : null);

                    return (
                      <tr key={act.id} style={{ borderBottom: '1px solid var(--color-border)' }}>


                        <td>
                        <strong
                          style={{
                            display: 'block',
                            color: 'var(--color-text)',
                            fontSize: '14.5px',
                            cursor: 'pointer',
                          }}
                          onClick={() => { void detailLoader.load(async () => { const response = await apiRequest<ApiResponse<FarmingActivity>>(`/farming-activities/${act.id}`); return normalizeActivity(response.data, act.cropSeasonId); }, setSelectedActivity); }}
                        >
                          {act.activityName}
                        </strong>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            className="crop-cat-pill"
                            style={{
                              background: meta.pillBg,
                              color: meta.pillColor,
                              borderColor: meta.border,
                            }}
                          >
                            {translate(act.activityType)}
                          </span>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          {matchedBlockName ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: 'var(--color-success-bg)',
                                color: 'var(--color-primary-text)',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {matchedBlockName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{(lang === 'en' ? "Entire season" : "Toàn vụ")}</span>
                          )}
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--color-body)', fontSize: '13px', fontWeight: 600 }}>
                            {displayDate(act.startedAt, lang)}
                          </div>
                          <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>
                            {uiFormatDateTime(act.startedAt, lang, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--color-text)', fontSize: '13px', fontWeight: 600 }}>
                            {act.recorderName?.replace(/\s*\([^()]*\)\s*$/, '').trim() || (lang === 'en' ? 'Technician' : 'Kỹ thuật viên')}
                          </div>

                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title={(lang === 'en' ? "View diary details" : "Xem chi tiết nhật ký")}
                              aria-label={(lang === 'en' ? `View details ${act.activityName}` : `Xem chi tiết ${act.activityName}`)}
                              onClick={() => { void detailLoader.load(async () => { const response = await apiRequest<ApiResponse<FarmingActivity>>(`/farming-activities/${act.id}`); return normalizeActivity(response.data, act.cropSeasonId); }, setSelectedActivity); }}
                            >
                              <Icon name="eye" size={15} />
                              <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={(lang === 'en' ? "Edit diary entry" : "Chỉnh sửa nhật ký")}
                              aria-label={(lang === 'en' ? `Edit ${act.activityName}` : `Chỉnh sửa ${act.activityName}`)}
                              onClick={() => {
                                setEditingActivity(act);
                                setActName(act.activityName);
                                setActType(act.activityType);
                                setSelectedBlockId(act.blockId ?? (seasonBlocks[0]?.blockId ?? ''));
                                setStartedAt(act.startedAt ? act.startedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
                                setEndedAt(act.endedAt ? act.endedAt.slice(0, 16) : '');
                                setDescription(act.description || '');
                                setResultNotes(act.resultNotes || '');
                                setWeatherNotes(act.weatherNotes || 'Trời nắng nhẹ, độ ẩm 75%');
                                setIsModalOpen(true);
                              }}
                            >
                              <Icon name="edit" size={15} />
                              <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
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
            <TablePagination {...activitiesPagination} disabled={loading} />
          </>
        )}
      </div>

      {/* Modal: Ghi / Sửa nhật ký */}
      <Modal structured customLayout className="modal-form-layout"
        open={isModalOpen}
        onClose={() => {
          if (saving) return;
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        title={editingActivity ? (lang === 'en' ? 'Update Farming Log' : 'Cập nhật nhật ký canh tác') : (lang === 'en' ? 'Record Farming Activity' : 'Ghi nhận hoạt động canh tác')}
      >
        <div className="modal-header">
          <h2>{editingActivity ? (lang === 'en' ? 'Update Farming Log' : 'Cập nhật nhật ký canh tác') : (lang === 'en' ? 'Record Farming Activity' : 'Ghi nhận hoạt động canh tác')}</h2>
          <button type="button" className="modal-close" disabled={saving} aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => { setIsModalOpen(false); setEditingActivity(null); }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <form onSubmit={handleCreateActivity}>
          <div className="modal-body">
          <div className="structured-field-card ui-form-context">
            <div className="structured-field-header">
              <span className="structured-field-label">{lang === 'en' ? 'Selected season' : 'Mùa vụ đang chọn'}</span>
              <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
            </div>
            <strong>{currentSeason?.seasonName || '—'}</strong>
          </div>
          {/* Lô đất thực hiện */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="act-block-select" className="structured-field-label">
                {lang === 'en' ? 'Target Block' : 'Lô đất thực hiện'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{seasonBlocks.length} {lang === 'en' ? 'block(s)' : 'lô đất'}</span>
            </div>
            {seasonBlocks.length === 0 ? (
              <p style={{ color: 'var(--color-warning)', fontSize: '13px', margin: 0 }}>
                {(lang === 'en' ? "⚠️ This season has no assigned blocks. You can" : "⚠️ Mùa vụ này chưa được gán lô đất nào. Bạn có thể")}{' '}
                <Link to={`/crop-seasons/${seasonId}`} style={{ color: 'var(--color-primary-text)', fontWeight: 700 }}>
                  {(lang === 'en' ? "assign blocks to this season here" : "gán lô đất vào mùa vụ tại đây")}
                </Link>.
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="act-block-select"
                  required
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : '')}
                >
                  {seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      {sb.blockName} ({sb.zoneName || `Khu`} · {sb.plantedArea ?? sb.blockArea}{' '}
                      {translate(sb.areaUnit || 'm²')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Loại hoạt động & Thời gian */}
          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-type-select" className="structured-field-label">
                  {lang === 'en' ? 'Activity Type' : 'Loại hoạt động'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <label htmlFor="act-type-select" className="structured-field-badge">{lang === 'en' ? 'Process' : 'Quy trình'}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="act-type-select"
                  value={actType}
                  onChange={(e) => setActType(e.target.value)}
                >
                  <option value="Soil Preparation">{(lang === 'en' ? "Soil Preparation & Substrate Treatment" : "Làm đất & Xử lý giá thể")}</option>
                  <option value="Gieo cấy">{(lang === 'en' ? "Seeding & Transplanting" : "Gieo hạt & Cấy cây con")}</option>
                  <option value="Fertilizing">{(lang === 'en' ? "Basal & Top-dress Fertilization" : "Bón lót & Bón thúc phân bón")}</option>
                  <option value="Irrigation">{(lang === 'en' ? "Irrigation & Fertigation" : "Tưới tiêu & Châm phân")}</option>
                  <option value="Spraying">{(lang === 'en' ? "Biological Pest Control Spraying" : "Phun thuốc bảo vệ thực vật sinh học")}</option>
                  <option value="Làm cỏ">{(lang === 'en' ? "Weeding & Pruning" : "Làm cỏ & Tỉa cành")}</option>
                  <option value="Harvest">{(lang === 'en' ? "Crop Harvesting" : "Thu hoạch nông sản")}</option>
                </select>
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-started-at" className="structured-field-label">
                  {lang === 'en' ? 'Activity Time' : 'Thời gian thực hiện'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <label htmlFor="act-started-at" className="structured-field-badge">{(lang === 'en' ? "Date and time" : "Ngày giờ")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  id="act-started-at"
                  type="datetime-local"
                  required
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tên hoạt động */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="act-name-input" className="structured-field-label">
                {(lang === 'en' ? "Activity name " : "Tên hoạt động chi tiết ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="act-name-input" className="structured-field-badge">{(lang === 'en' ? "Title" : "Tiêu đề")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="act-name-input"
                type="text"
                required
                placeholder={(lang === 'en' ? "Example: Early-season NPK fertilization for the Summer–Autumn season in Block A01" : "VD: Fertilizing NPK đầu vụ cho Vụ Hè Thu tại Lô A01")}
                value={actName}
                onChange={(e) => setActName(e.target.value)}
              />
            </div>
          </div>

          {/* Mô tả kỹ thuật */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="act-desc-input" className="structured-field-label">
                {(lang === 'en' ? "Technical procedure description" : "Mô tả quy trình kỹ thuật")}
              </label>
              <label htmlFor="act-desc-input" className="structured-field-badge">{(lang === 'en' ? "Details" : "Chi tiết")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea className="ui-textarea"
                id="act-desc-input"
                rows={3}
                placeholder={(lang === 'en' ? "Specify dosage, equipment, methods, and VietGAP procedure notes..." : "Ghi rõ liều lượng, dụng cụ, phương pháp và ghi chú quy trình VietGAP...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Thời tiết & Kết quả */}
          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-weather-input" className="structured-field-label">
                  {(lang === 'en' ? "Weather conditions" : "Điều kiện thời tiết")}
                </label>
                <label htmlFor="act-weather-input" className="structured-field-badge">{(lang === 'en' ? "Environment" : "Môi trường")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  id="act-weather-input"
                  type="text"
                  placeholder={(lang === 'en' ? "Mild sunshine, temperature 28°C..." : "Nắng nhẹ, nhiệt độ 28°C...")}
                  value={weatherNotes}
                  onChange={(e) => setWeatherNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-result-input" className="structured-field-label">
                  {(lang === 'en' ? "Result assessment" : "Đánh giá kết quả")}
                </label>
                <label htmlFor="act-result-input" className="structured-field-badge">{(lang === 'en' ? "Review" : "Nghiệm thu")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  id="act-result-input"
                  type="text"
                  placeholder={lang === 'en' ? 'Meets technical standards...' : 'Đạt tiêu chuẩn kỹ thuật...'}
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          </div>
          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
            {activityModalError && (
              <p className="form-error-banner" role="alert" style={{ margin: '0 0 12px' }}>
                {translate(activityModalError)}
              </p>
            )}
          <div className="confirm-dialog-actions" style={{ margin: 0 }}>
            <Button className="ui-cancel-button"
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingActivity(null);
              }}
              disabled={saving}
            >{translate("Cancel")}</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : editingActivity ? (lang === 'en' ? 'Update Log' : 'Cập nhật nhật ký') : (lang === 'en' ? 'Save Log' : 'Lưu nhật ký')}
            </Button>
          </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Xem chi tiết */}
      <Modal structured
        open={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.activityName || (lang === 'en' ? 'Farming Log Details' : 'Chi tiết nhật ký canh tác')}
      >
        {selectedActivity && (
          <div className="staff-profile-content">
            <div className="structured-field-card ui-detail-primary">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span
                className="crop-cat-pill"
                style={{
                  background: getActivityMeta(selectedActivity.activityType).pillBg,
                  color: getActivityMeta(selectedActivity.activityType).pillColor,
                }}
              >
                {translate(selectedActivity.activityType)}
              </span>
              <span className="ui-context-text" style={{ fontSize: '12.5px' }}>
                📅 {displayDateTime(selectedActivity.startedAt, lang)}
              </span>
            </div>

            {selectedActivity.description && (
              <p style={{ margin: 0, color: 'var(--color-body)', fontSize: '14px', lineHeight: 1.6 }}>
                {selectedActivity.description}
              </p>
            )}

            </div>
              <dl className="detail-list" style={{ margin: 0 }}>
                <div>
                  <dt>{lang === 'en' ? 'Crop Season' : 'Mùa vụ canh tác'}</dt>
                  <dd style={{ fontWeight: 700, color: 'var(--color-primary-text)' }}>
                    {currentSeason?.seasonName || '—'}
                  </dd>
                </div>
                <div>
                  <dt>{lang === 'en' ? 'Target Block' : 'Lô trồng thực hiện'}</dt>
                  <dd style={{ fontWeight: 700 }}>
                    {selectedActivity.blockName ||
                      seasonBlocks.find((b) => b.blockId === selectedActivity.blockId)?.blockName ||
                      (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : (lang === 'en' ? "Entire season" : 'Toàn mùa vụ'))}
                  </dd>
                </div>
                <div>
                  <dt>{lang === 'en' ? 'Performed At' : 'Thời gian thực hiện'}</dt>
                  <dd>{displayDateTime(selectedActivity.startedAt, lang)}</dd>
                </div>
                <div>
                  <dt>{lang === 'en' ? 'Weather Conditions' : 'Điều kiện thời tiết'}</dt>
                  <dd>{(lang === 'en' ? selectedActivity.weatherNotes || "Normal" : selectedActivity.weatherNotes || 'Bình thường')}</dd>
                </div>
                <div>
                  <dt>{lang === 'en' ? 'Recorded By' : 'Người ghi chép'}</dt>
                  <dd>{(lang === 'en' ? selectedActivity.recorderName || "Technical staff" : selectedActivity.recorderName || 'Nhân viên kỹ thuật')}</dd>
                </div>
                <div>
                  <dt>{lang === 'en' ? 'Total Workers' : 'Tổng nhân công'}</dt>
                  <dd>{selectedActivity.workerCount || 1} {(lang === 'en' ? " people" : " người")}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{lang === 'en' ? 'Result Assessment' : 'Đánh giá kết quả'}</dt>
                  <dd style={{ color: 'var(--color-primary-text)', fontWeight: 600 }}>
                    {(lang === 'en' ? selectedActivity.resultNotes || "Meets VietGAP standards" : selectedActivity.resultNotes || 'Đạt tiêu chuẩn VietGAP')}
                  </dd>
                </div>
              </dl>

            <div className="confirm-dialog-actions">

              <Button className={'ui-close-action'} type="button" variant="secondary" onClick={() => setSelectedActivity(null)}>
                {(lang === 'en' ? "Close" : "Đóng")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
