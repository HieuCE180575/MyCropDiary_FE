import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
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

export function FarmingActivitiesPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [seasonId, setSeasonId] = useState<number | ''>('');
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [activities, setActivities] = useState<FarmingActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [filterBlockId, setFilterBlockId] = useState<number | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<FarmingActivity | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [selectedBlockId, setSelectedBlockId] = useState<number | ''>('');
  const [actType, setActType] = useState('Bón phân');
  const [actName, setActName] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('Trời nắng nhẹ, độ ẩm 75%');
  const [saving, setSaving] = useState(false);

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
    try {
      const blocks = await fetchBlocksInSeason(targetSeasonId);
      setSeasonBlocks(blocks);
      setSelectedBlockId((prev) => {
        if (prev && blocks.some((b) => b.blockId === prev)) return prev;
        return blocks[0]?.blockId ?? '';
      });
    } catch {
      setSeasonBlocks([]);
      setSelectedBlockId('');
    }
  };

  useEffect(() => {
    void loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarm?.id]);

  useEffect(() => {
    if (seasonId) {
      setFilterBlockId('ALL');
      void loadBlocksForSeason(Number(seasonId));
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
    if (!silent) {
      setLoading(true);
      setNotification(null);
    }
    try {
      const res = await apiRequest<ApiResponse<{ items?: FarmingActivity[]; content?: FarmingActivity[] }>>(
        `/farming-activities?cropSeasonId=${seasonId}&size=50`
      ).catch(() => null);

      const rawItems = res?.data?.items || res?.data?.content;
      if (Array.isArray(rawItems)) {
        setActivities(rawItems.map((item) => normalizeActivity(item, Number(seasonId))));
      } else {
        setActivities([]);
      }
    } catch {
      if (!silent) setNotification({ text: 'Lỗi nạp nhật ký canh tác từ máy chủ.', type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim() || !seasonId) return;
    if (seasonBlocks.length > 0 && !selectedBlockId) {
      setNotification({
        text: 'Vui lòng chọn lô đất thực hiện (đã được phân bổ vào mùa vụ này).',
        type: 'error',
      });
      return;
    }
    setSaving(true);
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
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể lưu nhật ký canh tác.',
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
    if (seasonBlocks.length > 0 && !selectedBlockId) {
      setSelectedBlockId(seasonBlocks[0].blockId);
    }
  };

  const currentSeason = seasons.find((s) => s.cropSeasonId === Number(seasonId));

  const filtered = activities.filter((a) => {
    const matchType = filterType === 'ALL' || a.activityType === filterType;
    const matchBlock = filterBlockId === 'ALL' || a.blockId === filterBlockId;
    return matchType && matchBlock;
  });

  return (
    <section className="farming-activities-page">
      <div className="page-heading">
        <div>
          <h1>Nhật ký canh tác số (VietGAP)</h1>
          <p className="page-subtitle">
            Ghi nhận và minh bạch hoạt động làm đất, gieo cấy, bón phân, tưới tiêu và BVTV trên từng lô đất thuộc mùa vụ
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {seasonId && (
            <Link
              to={`/crop-seasons/${seasonId}`}
              className="action-button"
              style={{ textDecoration: 'none' }}
            >
              🌱 Quản lý lô đất mùa vụ ({seasonBlocks.length})
            </Link>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={!seasonId}
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Icon name="plus" /> Ghi nhật ký mới
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`}
          style={{ marginBottom: '16px', position: 'static' }}
        >
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}

      {/* Control bar */}
      <div
        className="panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>🌾 Mùa vụ canh tác:</label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : '')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                fontWeight: 600,
              }}
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
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Phân loại:</label>
            {['ALL', 'Làm đất', 'Gieo cấy', 'Bón phân', 'Tưới nước', 'Phun thuốc', 'Thu hoạch'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filterType === type ? '#10b981' : '#ffffff',
                  borderColor: filterType === type ? '#10b981' : '#cbd5e1',
                  color: filterType === type ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {type === 'ALL' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned Blocks Filter Bar for the Selected Season */}
        {seasonId && (
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                🌱 Lô đất được phân bổ vào {currentSeason?.seasonName || 'mùa vụ này'}:
              </span>
              {seasonBlocks.length === 0 ? (
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Chưa có lô đất nào được gán vào mùa vụ này.{' '}
                  <Link to={`/crop-seasons/${seasonId}`} style={{ color: '#059669', fontWeight: 700 }}>
                    + Gán lô đất ngay
                  </Link>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterBlockId('ALL')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      border: '1px solid',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: filterBlockId === 'ALL' ? '#047857' : '#f8fafc',
                      borderColor: filterBlockId === 'ALL' ? '#047857' : '#cbd5e1',
                      color: filterBlockId === 'ALL' ? '#ffffff' : '#334155',
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
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: filterBlockId === sb.blockId ? '#059669' : '#ecfdf5',
                        borderColor: filterBlockId === sb.blockId ? '#059669' : '#a7f3d0',
                        color: filterBlockId === sb.blockId ? '#ffffff' : '#065f46',
                      }}
                    >
                      🌱 {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {sb.areaUnit || 'm²'})
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline List */}
      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải dòng thời gian nhật ký...</h2>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📖</div>
          <h2>{seasonId ? 'Chưa có nhật ký nào khớp bộ lọc trong mùa vụ này' : 'Trang trại chưa có mùa vụ canh tác'}</h2>
          <p>
            {seasonId
              ? 'Ghi lại nhật ký canh tác trên các lô đất đã phân bổ để đảm bảo tiêu chuẩn truy xuất VietGAP.'
              : 'Hãy tạo mùa vụ canh tác tại mục Mùa vụ canh tác trước khi ghi nhật ký.'}
          </p>
          {seasonId && (
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: '12px' }}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              + Ghi nhật ký ngay
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((act) => {
            const badgeBg =
              act.activityType === 'Bón phân'
                ? '#fef3c7'
                : act.activityType === 'Phun thuốc'
                ? '#fee2e2'
                : act.activityType === 'Thu hoạch'
                ? '#dcfce7'
                : '#e0f2fe';
            const badgeColor =
              act.activityType === 'Bón phân'
                ? '#b45309'
                : act.activityType === 'Phun thuốc'
                ? '#b91c1c'
                : act.activityType === 'Thu hoạch'
                ? '#15803d'
                : '#0369a1';
            const matchedBlockName =
              act.blockName ||
              seasonBlocks.find((b) => b.blockId === act.blockId)?.blockName ||
              (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : null);

            return (
              <div
                key={act.id}
                className="panel"
                style={{
                  padding: '20px 24px',
                  borderLeft: `5px solid ${badgeColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => setSelectedActivity(act)}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: badgeBg,
                        color: badgeColor,
                        fontSize: '12.5px',
                        fontWeight: 700,
                      }}
                    >
                      {act.activityType}
                    </span>
                    {matchedBlockName && (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}
                      >
                        🌱 {matchedBlockName}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      📅 {new Date(act.startedAt).toLocaleString('vi-VN')}
                    </span>
                    {act.weatherNotes && (
                      <span
                        style={{
                          fontSize: '12.5px',
                          color: '#64748b',
                          background: '#f8fafc',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        ⛅ {act.weatherNotes}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '17.5px', color: '#0f172a', fontWeight: 650 }}>
                    {act.activityName}
                  </h3>
                  <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                    {act.description}
                  </p>
                  {act.resultNotes && act.resultNotes !== act.description && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#059669',
                        background: '#ecfdf5',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    >
                      ✓ Đánh giá kết quả: {act.resultNotes}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                    Ghi chép: <strong>{act.recorderName || 'Nhân viên kỹ thuật'}</strong>
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    👥 Nhân công: {act.workerCount || 1} người
                  </span>
                  <div className="table-action-btns" style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      className="table-icon-btn primary"
                      title="Xem chi tiết nhật ký"
                      aria-label={`Xem chi tiết ${act.activityName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(act);
                      }}
                    >
                      <Icon name="eye" size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Ghi nhật ký mới */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '600px',
              borderRadius: '16px',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '4px', fontSize: '20px', color: '#0f172a' }}>
              Ghi nhận hoạt động canh tác
            </h2>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
              Mùa vụ đang chọn: <strong style={{ color: '#047857' }}>{currentSeason?.seasonName}</strong>
            </p>

            <form
              onSubmit={handleCreateActivity}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}
            >
              {/* LÔ ĐẤT THỰC HIỆN (CHỈ CHO PHÉP CHỌN LÔ ĐÃ GÁN VÀO MÙA VỤ NÀY) */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46' }}>
                    🌱 Chọn lô đất thực hiện (Thuộc {currentSeason?.seasonName}) *
                  </label>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#047857',
                      background: '#d1fae5',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    Đã phân bổ: {seasonBlocks.length} lô
                  </span>
                </div>

                {seasonBlocks.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#b45309', background: '#fffbeb', padding: '8px 10px', borderRadius: '8px' }}>
                    ⚠️ Mùa vụ này chưa được gán lô đất nào. Bạn có thể{' '}
                    <Link to={`/crop-seasons/${seasonId}`} style={{ color: '#047857', fontWeight: 700 }}>
                      gán lô đất vào mùa vụ tại đây
                    </Link>{' '}
                    hoặc tiếp tục ghi nhật ký chung cho cả vụ.
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={selectedBlockId}
                      onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : '')}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #6ee7b7',
                        background: '#ffffff',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {seasonBlocks.map((sb) => (
                        <option key={sb.blockId} value={sb.blockId}>
                          {sb.blockName} ({sb.zoneName || `Khu #${sb.zoneId}`} · Diện tích trồng: {sb.plantedArea ?? sb.blockArea}{' '}
                          {sb.areaUnit || 'm²'} · Gieo: {sb.plantedAt || currentSeason?.startDate})
                        </option>
                      ))}
                    </select>
                    <small style={{ display: 'block', marginTop: '5px', fontSize: '12px', color: '#047857' }}>
                      ✓ Hệ thống chỉ hiển thị các lô đất đã được phân bổ vào mùa vụ &quot;{currentSeason?.seasonName}&quot;.
                    </small>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Loại hoạt động *
                  </label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Làm đất">Làm đất &amp; Xử lý giá thể</option>
                    <option value="Gieo cấy">Gieo hạt &amp; Cấy cây con</option>
                    <option value="Bón phân">Bón lót &amp; Bón thúc phân bón</option>
                    <option value="Tưới nước">Tưới tiêu &amp; Châm phân</option>
                    <option value="Phun thuốc">Phun thuốc BVTV sinh học</option>
                    <option value="Làm cỏ">Làm cỏ &amp; Tỉa cành</option>
                    <option value="Thu hoạch">Thu hoạch nông sản</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Thời gian thực hiện *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Tên hoạt động chi tiết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hôm nay bón phân NPK cho Vụ Hè Thu 2026 tại Lô A1"
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Mô tả quy trình kỹ thuật
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ liều lượng, dụng cụ, công cụ sử dụng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Điều kiện thời tiết
                  </label>
                  <input
                    type="text"
                    placeholder="Nắng nhẹ, nhiệt độ 28°C..."
                    value={weatherNotes}
                    onChange={(e) => setWeatherNotes(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Kết quả đạt được
                  </label>
                  <input
                    type="text"
                    placeholder="Cây con khỏe, độ ẩm đạt..."
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết */}
      {selectedActivity && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '540px', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="profile-tag-pill">{selectedActivity.activityType}</span>
              <button type="button" className="icon-button" onClick={() => setSelectedActivity(null)}>
                ✕
              </button>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', color: '#0f172a' }}>{selectedActivity.activityName}</h2>
            <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
              {selectedActivity.description}
            </p>

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '10px 14px',
                fontSize: '13.5px',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
              }}
            >
              <dt style={{ color: '#64748b' }}>Mùa vụ canh tác:</dt>
              <dd style={{ margin: 0, fontWeight: 700, color: '#047857' }}>
                {currentSeason?.seasonName || `#${selectedActivity.cropSeasonId}`}
              </dd>

              <dt style={{ color: '#64748b' }}>Lô đất thực hiện:</dt>
              <dd style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                {selectedActivity.blockName ||
                  seasonBlocks.find((b) => b.blockId === selectedActivity.blockId)?.blockName ||
                  (seasonBlocks.length === 1 ? seasonBlocks[0].blockName : 'Toàn mùa vụ')}
              </dd>

              <dt style={{ color: '#64748b' }}>Bắt đầu lúc:</dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>
                {new Date(selectedActivity.startedAt).toLocaleString('vi-VN')}
              </dd>

              <dt style={{ color: '#64748b' }}>Thời tiết:</dt>
              <dd style={{ margin: 0 }}>{selectedActivity.weatherNotes || 'Bình thường'}</dd>

              <dt style={{ color: '#64748b' }}>Kết quả:</dt>
              <dd style={{ margin: 0, color: '#059669', fontWeight: 600 }}>
                {selectedActivity.resultNotes || 'Đạt tiêu chuẩn VietGAP'}
              </dd>

              <dt style={{ color: '#64748b' }}>Người ghi:</dt>
              <dd style={{ margin: 0 }}>{selectedActivity.recorderName || 'Nhân viên kỹ thuật'}</dd>
            </dl>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="primary-button" onClick={() => setSelectedActivity(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
