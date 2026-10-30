import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
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
  const { selectedFarm } = useFarmWorkspace();
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
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      if (!silent && !hasCache) setNotification({ text: 'Lỗi nạp nhật ký canh tác từ máy chủ.', type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedActName = actName.trim();
    if (!trimmedActName) {
      setActivityModalError('Vui lòng nhập tên hoạt động canh tác.');
      return;
    }
    if (!seasonId) {
      setActivityModalError('Vui lòng chọn mùa vụ canh tác mục tiêu.');
      return;
    }
    if (seasonBlocks.length > 0 && !selectedBlockId) {
      setActivityModalError('Vui lòng chọn lô đất thực hiện (đã được phân bổ vào mùa vụ này).');
      return;
    }
    if (startedAt && endedAt && endedAt < startedAt) {
      setActivityModalError(`Thời gian kết thúc (${endedAt}) không thể trước thời gian bắt đầu (${startedAt}).`);
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
          text: `Đã cập nhật nhật ký canh tác thành công!`,
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
          text: chosenBlock
            ? `Đã lưu nhật ký canh tác tại "${chosenBlock.blockName}" thành công!`
            : 'Đã lưu nhật ký canh tác thành công!',
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
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
          pillBg: '#eff6ff',
          pillColor: '#1e40af',
        };
      case 'Gieo cấy':
        return {
          icon: 'sprout',
          bg: '#ecfdf5',
          color: '#059669',
          border: '#a7f3d0',
          pillBg: '#ecfdf5',
          pillColor: '#065f46',
        };
      case 'Fertilizing':
        return {
          icon: 'granules',
          bg: '#fffbeb',
          color: '#d97706',
          border: '#fde68a',
          pillBg: '#fef3c7',
          pillColor: '#92400e',
        };
      case 'Irrigation':
        return {
          icon: 'drop',
          bg: '#f0fdfa',
          color: '#0d9488',
          border: '#99f6e4',
          pillBg: '#ccfbf1',
          pillColor: '#115e59',
        };
      case 'Spraying':
        return {
          icon: 'flask',
          bg: '#fef2f2',
          color: '#dc2626',
          border: '#fecaca',
          pillBg: '#fee2e2',
          pillColor: '#991b1b',
        };
      case 'Harvest':
        return {
          icon: 'box',
          bg: '#f5f3ff',
          color: '#7c3aed',
          border: '#ddd6fe',
          pillBg: '#ede9fe',
          pillColor: '#5b21b6',
        };
      default:
        return {
          icon: 'activity',
          bg: '#f8fafc',
          color: '#475569',
          border: '#e2e8f0',
          pillBg: '#f1f5f9',
          pillColor: '#334155',
        };
    }
  };

  return (
    <section className="farming-activities-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
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

      {/* Main Page Heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Farming Diary số (VietGAP)
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            Ghi nhận và minh bạch hoạt động làm đất, gieo cấy, bón phân, tưới tiêu và BVTV trên từng lô đất thuộc mùa vụ
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {seasonId && (
            <Link
              to={`/crop-seasons/${seasonId}`}
              className="action-button"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
              }}
            >
              <Icon name="plots" size={16} /> Quản lý lô đất mùa vụ ({seasonBlocks.length})
            </Link>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={!seasonId}
            onClick={() => {
              resetForm();
              setEditingActivity(null);
              setIsModalOpen(true);
            }}
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
            <Icon name="plus" size={17} /> Ghi nhật ký mới
          </button>
        </div>
      </div>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Clean Filter Bar */}
        <div className="zone-clean-filter-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Mùa vụ canh tác */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '220px' }}>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : '')}
              aria-label="Chọn mùa vụ canh tác"
            >
              {seasons.length === 0 ? (
                <option value="">Chưa có mùa vụ canh tác</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName} (
                    {s.seasonStatus === 'active'
                      ? 'Đang canh tác'
                      : s.seasonStatus === 'planned'
                      ? 'Chuẩn bị vụ'
                      : s.seasonStatus}
                    )
                  </option>
                ))
              )}
            </select>
            <span className="select-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Tìm kiếm */}
          <div className="zone-clean-search" style={{ flex: 1, minWidth: '240px' }}>
            <span className="search-icon">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              placeholder="Tìm theo tên hoạt động, quy trình hoặc người ghi..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          {/* Phân loại hoạt động */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '170px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Lọc theo loại hoạt động"
            >
              <option value="ALL">Tất cả loại hoạt động</option>
              <option value="Soil Preparation">Soil Preparation &amp; Xử lý giá thể</option>
              <option value="Gieo cấy">Seeding &amp; Cấy cây con</option>
              <option value="Fertilizing">Fertilizing</option>
              <option value="Irrigation">Irrigation</option>
              <option value="Spraying">Spraying BVTV</option>
              <option value="Làm cỏ">Làm cỏ &amp; Tỉa cành</option>
              <option value="Harvest">Harvest</option>
            </select>
            <span className="select-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Lô đất phân bổ */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '160px' }}>
            <select
              value={filterBlockId}
              onChange={(e) => setFilterBlockId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              aria-label="Lọc theo lô đất"
            >
              <option value="ALL">Tất cả lô đất ({seasonBlocks.length})</option>
              {seasonBlocks.map((sb) => (
                <option key={sb.blockId} value={sb.blockId}>
                  {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {sb.areaUnit || 'm²'})
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
            title="Làm mới bộ lọc"
            aria-label="Làm mới bộ lọc"
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
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Icon name="plots" size={14} /> Lô phân bổ vào {currentSeason?.seasonName || 'vụ'}:
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
                background: filterBlockId === 'ALL' ? '#059669' : '#ffffff',
                borderColor: filterBlockId === 'ALL' ? '#059669' : '#cbd5e1',
                color: filterBlockId === 'ALL' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả lô ({seasonBlocks.length})
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
                  background: filterBlockId === sb.blockId ? '#059669' : '#ffffff',
                  borderColor: filterBlockId === sb.blockId ? '#059669' : '#a7f3d0',
                  color: filterBlockId === sb.blockId ? '#ffffff' : '#065f46',
                  transition: 'all 0.15s ease',
                }}
              >
                🌱 {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {sb.areaUnit || 'm²'})
              </button>
            ))}
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="panel empty-state" style={{ padding: '60px 20px', border: 'none', boxShadow: 'none' }}>
            <div className="empty-icon">⏳</div>
            <h2>Đang tải nhật ký canh tác...</h2>
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel empty-state" style={{ padding: '60px 20px', border: 'none', boxShadow: 'none' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Icon name="book" size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              {seasonId ? 'Chưa có nhật ký canh tác nào' : 'Chưa có mùa vụ canh tác'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              {seasonId
                ? 'Ghi nhận và minh bạch các hoạt động chăm sóc trên từng lô đất để đáp ứng đầy đủ tiêu chuẩn kiểm tra VietGAP.'
                : 'Hãy tạo mùa vụ canh tác trước khi thực hiện ghi nhật ký.'}
            </p>
            {seasonId && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  resetForm();
                  setEditingActivity(null);
                  setIsModalOpen(true);
                }}
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
                <Icon name="plus" size={16} /> Ghi nhật ký ngay
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                      <input type="checkbox" aria-label="Chọn tất cả hoạt động" style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Hoạt động &amp; Nội dung
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Phân loại
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Cultivation Plot
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Thời gian
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Người ghi &amp; Nhân công
                    </th>
                    <th style={{ width: '100px', padding: '14px 16px', textAlign: 'right' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((act) => {
                    const meta = getActivityMeta(act.activityType);
                    const matchedBlockName =
                      act.blockName ||
                      seasonBlocks.find((b) => b.blockId === act.blockId)?.blockName ||
                      (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : null);

                    return (
                      <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            aria-label={`Chọn hoạt động ${act.activityName}`}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <span
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.border}`,
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              <Icon name={meta.icon} size={17} />
                            </span>
                            <div>
                              <strong
                                style={{
                                  display: 'block',
                                  color: '#0f172a',
                                  fontSize: '14.5px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedActivity(act)}
                              >
                                {act.activityName}
                              </strong>
                              {act.description && (
                                <p
                                  style={{
                                    margin: '3px 0 0',
                                    fontSize: '13px',
                                    color: '#64748b',
                                    lineHeight: 1.4,
                                    maxWidth: '460px',
                                  }}
                                >
                                  {act.description}
                                </p>
                              )}
                              {act.resultNotes && act.resultNotes !== act.description && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginTop: '4px',
                                    fontSize: '11.5px',
                                    color: '#059669',
                                    fontWeight: 600,
                                  }}
                                >
                                  ✓ Đánh giá: {act.resultNotes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            className="crop-cat-pill"
                            style={{
                              background: meta.pillBg,
                              color: meta.pillColor,
                              borderColor: meta.border,
                            }}
                          >
                            {act.activityType}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          {matchedBlockName ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              🌱 {matchedBlockName}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Toàn vụ</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#334155', fontSize: '13px', fontWeight: 600 }}>
                            {new Date(act.startedAt).toLocaleDateString('vi-VN')}
                          </div>
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                            {new Date(act.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {act.weatherNotes ? ` · ${act.weatherNotes}` : ''}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>
                            {act.recorderName || 'Kỹ thuật viên'}
                          </div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>
                            👥 {act.workerCount || 1} nhân công
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title="Xem chi tiết nhật ký"
                              aria-label={`Xem chi tiết ${act.activityName}`}
                              onClick={() => setSelectedActivity(act)}
                            >
                              <Icon name="eye" size={15} />
                              <span className="sr-only">Xem chi tiết</span>
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title="Chỉnh sửa nhật ký"
                              aria-label={`Chỉnh sửa ${act.activityName}`}
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
                              <span className="sr-only">Chỉnh sửa</span>
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
                Hiển thị 1–{filtered.length} trong {filtered.length} hoạt động canh tác
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
        )}
      </div>

      {/* Modal: Ghi / Sửa nhật ký */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        title={editingActivity ? 'Cập nhật nhật ký canh tác' : 'Ghi nhận hoạt động canh tác'}
        headerIcon={<Icon name="book" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
          Mùa vụ đang chọn: <strong style={{ color: '#047857' }}>{currentSeason?.seasonName}</strong>
        </p>

        <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activityModalError && (
            <p className="form-error-banner" role="alert" style={{ margin: '0 0 4px' }}>
              {activityModalError}
            </p>
          )}
          {/* Lô đất thực hiện */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="act-block-select" className="structured-field-label">
                Lô đất thực hiện <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{seasonBlocks.length} lô đất</span>
            </div>
            {seasonBlocks.length === 0 ? (
              <p style={{ color: '#b45309', fontSize: '13px', margin: 0 }}>
                ⚠️ Mùa vụ này chưa được gán lô đất nào. Bạn có thể{' '}
                <Link to={`/crop-seasons/${seasonId}`} style={{ color: '#047857', fontWeight: 700 }}>
                  gán lô đất vào mùa vụ tại đây
                </Link>.
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="act-block-select"
                  required
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : '')}
                >
                  {seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      {sb.blockName} ({sb.zoneName || `Khu #${sb.zoneId}`} · {sb.plantedArea ?? sb.blockArea}{' '}
                      {sb.areaUnit || 'm²'})
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
                  Loại hoạt động <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">Quy trình</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="act-type-select"
                  value={actType}
                  onChange={(e) => setActType(e.target.value)}
                >
                  <option value="Soil Preparation">Soil Preparation &amp; Xử lý giá thể</option>
                  <option value="Gieo cấy">Seeding &amp; Cấy cây con</option>
                  <option value="Fertilizing">Bón lót &amp; Bón thúc phân bón</option>
                  <option value="Irrigation">Tưới tiêu &amp; Châm phân</option>
                  <option value="Spraying">Spraying BVTV sinh học</option>
                  <option value="Làm cỏ">Làm cỏ &amp; Tỉa cành</option>
                  <option value="Harvest">Harvest nông sản</option>
                </select>
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-started-at" className="structured-field-label">
                  Thời gian thực hiện <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">Ngày giờ</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
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
                Tên hoạt động chi tiết <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Tiêu đề</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="act-name-input"
                type="text"
                required
                placeholder="VD: Fertilizing NPK đầu vụ cho Vụ Hè Thu tại Lô A01"
                value={actName}
                onChange={(e) => setActName(e.target.value)}
              />
            </div>
          </div>

          {/* Mô tả kỹ thuật */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="act-desc-input" className="structured-field-label">
                Mô tả quy trình kỹ thuật
              </label>
              <span className="structured-field-badge">Chi tiết</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                id="act-desc-input"
                rows={3}
                placeholder="Ghi rõ liều lượng, dụng cụ, phương pháp và ghi chú quy trình VietGAP..."
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
                  Điều kiện thời tiết
                </label>
                <span className="structured-field-badge">Môi trường</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="act-weather-input"
                  type="text"
                  placeholder="Nắng nhẹ, nhiệt độ 28°C..."
                  value={weatherNotes}
                  onChange={(e) => setWeatherNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="act-result-input" className="structured-field-label">
                  Đánh giá kết quả
                </label>
                <span className="structured-field-badge">Nghiệm thu</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="act-result-input"
                  type="text"
                  placeholder="Đạt tiêu chuẩn kỹ thuật..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingActivity(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : editingActivity ? 'Cập nhật nhật ký' : 'Lưu nhật ký'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Xem chi tiết */}
      <Modal
        open={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.activityName || 'Chi tiết nhật ký canh tác'}
        headerIcon={<Icon name="eye" size={20} />}
      >
        {selectedActivity && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span
                className="crop-cat-pill"
                style={{
                  background: getActivityMeta(selectedActivity.activityType).pillBg,
                  color: getActivityMeta(selectedActivity.activityType).pillColor,
                }}
              >
                {selectedActivity.activityType}
              </span>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                📅 {new Date(selectedActivity.startedAt).toLocaleString('vi-VN')}
              </span>
            </div>

            {selectedActivity.description && (
              <p style={{ margin: '0 0 16px', color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
                {selectedActivity.description}
              </p>
            )}

            <div className="structured-field-card" style={{ marginBottom: '16px' }}>
              <dl className="detail-list" style={{ margin: 0 }}>
                <div>
                  <dt>Mùa vụ canh tác</dt>
                  <dd style={{ fontWeight: 700, color: '#047857' }}>
                    {currentSeason?.seasonName || `#${selectedActivity.cropSeasonId}`}
                  </dd>
                </div>
                <div>
                  <dt>Lô đất thực hiện</dt>
                  <dd style={{ fontWeight: 700 }}>
                    {selectedActivity.blockName ||
                      seasonBlocks.find((b) => b.blockId === selectedActivity.blockId)?.blockName ||
                      (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : 'Toàn mùa vụ')}
                  </dd>
                </div>
                <div>
                  <dt>Thời gian thực hiện</dt>
                  <dd>{new Date(selectedActivity.startedAt).toLocaleString('vi-VN')}</dd>
                </div>
                <div>
                  <dt>Điều kiện thời tiết</dt>
                  <dd>{selectedActivity.weatherNotes || 'Bình thường'}</dd>
                </div>
                <div>
                  <dt>Người ghi chép</dt>
                  <dd>{selectedActivity.recorderName || 'Nhân viên kỹ thuật'}</dd>
                </div>
                <div>
                  <dt>Tổng nhân công</dt>
                  <dd>{selectedActivity.workerCount || 1} người</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Đánh giá kết quả</dt>
                  <dd style={{ color: '#059669', fontWeight: 600 }}>
                    {selectedActivity.resultNotes || 'Đạt tiêu chuẩn VietGAP'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="action-button"
                onClick={() => {
                  const act = selectedActivity;
                  setSelectedActivity(null);
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
                <Icon name="edit" size={15} /> Chỉnh sửa
              </button>
              <button type="button" className="primary-button" onClick={() => setSelectedActivity(null)}>
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
