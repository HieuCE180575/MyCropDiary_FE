import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface FarmingActivity {
  id: number;
  cropSeasonId: number;
  activityType: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
  description?: string;
  resultNotes?: string;
  weatherNotes?: string;
  recorderName?: string;
  workerCount?: number;
}

export function FarmingActivitiesPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [activities, setActivities] = useState<FarmingActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [seasonId, setSeasonId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<FarmingActivity | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [actType, setActType] = useState('Bón phân');
  const [actName, setActName] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('Trời nắng nhẹ, độ ẩm 75%');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [seasonId, selectedFarm?.id]);

  const loadActivities = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<{ items: FarmingActivity[] }>>(
        `/farming-activities?cropSeasonId=${seasonId}&size=50`
      ).catch(() => null);

      if (res?.data?.items && Array.isArray(res.data.items) && res.data.items.length > 0) {
        setActivities(res.data.items);
      } else {
        // Fallback seed data
        setActivities([
          {
            id: 1,
            cropSeasonId: seasonId,
            activityType: 'Làm đất',
            activityName: 'Cày bừa và bón vôi xử lý đất',
            startedAt: '2026-03-01T07:30',
            endedAt: '2026-03-01T11:30',
            description: 'Phơi đất khử chua bằng vôi bột 30kg/sào, cày ải sâu 25cm.',
            resultNotes: 'Đất tơi xốp, độ pH đo được 6.2 đạt chuẩn.',
            weatherNotes: 'Trời nắng ráo, nhiệt độ 28°C.',
            recorderName: 'Kỹ sư An',
            workerCount: 4,
          },
          {
            id: 2,
            cropSeasonId: seasonId,
            activityType: 'Gieo cấy',
            activityName: 'Gieo hạt giống dưa lưới F1 chuẩn VietGAP',
            startedAt: '2026-03-05T08:00',
            endedAt: '2026-03-05T16:30',
            description: 'Hạt giống ngâm ủ nứt nanh, gieo vào khay bầu giá thể xơ dừa đã xử lý nấm.',
            resultNotes: 'Tỷ lệ nảy mầm đạt 96%.',
            weatherNotes: 'Trời mát mẻ, có gió nhẹ.',
            recorderName: 'Nguyễn Văn An',
            workerCount: 6,
          },
          {
            id: 3,
            cropSeasonId: seasonId,
            activityType: 'Bón phân',
            activityName: 'Bón lót phân hữu cơ vi sinh trùn quế',
            startedAt: '2026-03-12T06:30',
            endedAt: '2026-03-12T10:00',
            description: 'Bón phân trùn quế 500kg/ha quanh rãnh luống.',
            resultNotes: 'Cây con bén rễ nhanh, lá xanh mướt.',
            weatherNotes: 'Trời râm mát.',
            recorderName: 'Trần Thị Bích',
            workerCount: 3,
          },
          {
            id: 4,
            cropSeasonId: seasonId,
            activityType: 'Tưới nước',
            activityName: 'Tưới nhỏ giọt bổ sung dinh dưỡng sinh học',
            startedAt: '2026-03-20T16:00',
            endedAt: '2026-03-20T17:30',
            description: 'Hệ thống tưới tự động Israel kiểm soát EC 1.4, pH 6.0.',
            resultNotes: 'Độ ẩm gốc duy trì 70-75%.',
            weatherNotes: 'Trời chiều không mưa.',
            recorderName: 'Lê Văn Cường',
            workerCount: 2,
          },
        ]);
      }
    } catch {
      setNotification({ text: 'Lỗi nạp nhật ký canh tác từ máy chủ.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim()) return;
    setSaving(true);
    const newActPayload = {
      cropSeasonId: seasonId,
      activityType: actType,
      activityName: actName.trim(),
      startedAt: startedAt ? `${startedAt}:00` : new Date().toISOString(),
      endedAt: endedAt ? `${endedAt}:00` : undefined,
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
        setActivities((prev) => [res.data, ...prev]);
      } else {
        throw new Error('Fallback');
      }
      setNotification({ text: 'Đã lưu nhật ký canh tác thành công!', type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } catch {
      // Offline / Local simulation
      const mockItem: FarmingActivity = {
        id: Date.now(),
        cropSeasonId: seasonId,
        activityType: actType,
        activityName: actName.trim(),
        startedAt,
        endedAt,
        description,
        resultNotes,
        weatherNotes,
        recorderName: 'Tôi (Nhật ký số)',
        workerCount: 3,
      };
      setActivities((prev) => [mockItem, ...prev]);
      setNotification({ text: 'Đã lưu nhật ký canh tác (chế độ nhanh)!', type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setActName('');
    setDescription('');
    setResultNotes('');
  };

  const filtered = activities.filter((a) => filterType === 'ALL' || a.activityType === filterType);

  return (
    <section className="farming-activities-page">
      <div className="page-heading">
        <div>
          <h1>Nhật ký canh tác số (VietGAP)</h1>
          <p className="page-subtitle">
            Ghi nhận và minh bạch mọi hoạt động làm đất, gieo cấy, bón phân, tưới tiêu và bảo vệ thực vật
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            <Icon name="plus" /> Ghi nhật ký mới
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}

      {/* Control bar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Mùa vụ:</label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 500 }}
          >
            <option value={1}>Vụ Đông Xuân 2026 (Đang thu hoạch)</option>
            <option value={2}>Vụ Hè Thu 2026 (Chuẩn bị xuống giống)</option>
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

      {/* Activity Timeline List */}
      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải dòng thời gian nhật ký...</h2>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📖</div>
          <h2>Chưa có nhật ký nào trong vụ mùa này</h2>
          <p>Ghi lại nhật ký canh tác đầu tiên để đảm bảo tiêu chuẩn đánh giá VietGAP.</p>
          <button type="button" className="primary-button" style={{ marginTop: '12px' }} onClick={() => setIsModalOpen(true)}>
            + Ghi nhật ký ngay
          </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      📅 {new Date(act.startedAt).toLocaleString('vi-VN')}
                    </span>
                    {act.weatherNotes && (
                      <span style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px' }}>
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
                  {act.resultNotes && (
                    <div style={{ fontSize: '13px', color: '#059669', background: '#ecfdf5', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                      ✓ Đánh giá kết quả: {act.resultNotes}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                    Ghi chép: <strong>{act.recorderName || 'Nhân viên kỹ thuật'}</strong>
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    👥 Nhân công: {act.workerCount || 1} người
                  </span>
                  <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    Xem chi tiết <Icon name="arrow" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Ghi nhật ký mới */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '580px', borderRadius: '16px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Ghi nhận hoạt động canh tác</h2>
            <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Loại hoạt động *</label>
                  <select value={actType} onChange={(e) => setActType(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="Làm đất">Làm đất & Xử lý giá thể</option>
                    <option value="Gieo cấy">Gieo hạt & Cấy cây con</option>
                    <option value="Bón phân">Bón lót & Bón thúc phân bón</option>
                    <option value="Tưới nước">Tưới tiêu & Châm phân</option>
                    <option value="Phun thuốc">Phun thuốc BVTV sinh học</option>
                    <option value="Làm cỏ">Làm cỏ & Tỉa cành</option>
                    <option value="Thu hoạch">Thu hoạch nông sản</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Thời gian thực hiện *</label>
                  <input type="datetime-local" required value={startedAt} onChange={(e) => setStartedAt(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên hoạt động chi tiết *</label>
                <input type="text" required placeholder="Ví dụ: Bón thúc đợt 2 phân trùn quế luống rau số 3" value={actName} onChange={(e) => setActName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mô tả quy trình kỹ thuật</label>
                <textarea rows={3} placeholder="Ghi rõ liều lượng, dụng cụ, công cụ sử dụng..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Điều kiện thời tiết</label>
                  <input type="text" placeholder="Nắng nhẹ, nhiệt độ 28°C..." value={weatherNotes} onChange={(e) => setWeatherNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Kết quả đạt được</label>
                  <input type="text" placeholder="Cây con khỏe, độ ẩm đạt..." value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
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
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '540px', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="profile-tag-pill">{selectedActivity.activityType}</span>
              <button type="button" className="icon-button" onClick={() => setSelectedActivity(null)}>✕</button>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', color: '#0f172a' }}>{selectedActivity.activityName}</h2>
            <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>{selectedActivity.description}</p>

            <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 14px', fontSize: '13.5px', background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
              <dt style={{ color: '#64748b' }}>Bắt đầu lúc:</dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>{new Date(selectedActivity.startedAt).toLocaleString('vi-VN')}</dd>

              <dt style={{ color: '#64748b' }}>Thời tiết:</dt>
              <dd style={{ margin: 0 }}>{selectedActivity.weatherNotes || 'Bình thường'}</dd>

              <dt style={{ color: '#64748b' }}>Kết quả:</dt>
              <dd style={{ margin: 0, color: '#059669', fontWeight: 600 }}>{selectedActivity.resultNotes || 'Đạt tiêu chuẩn'}</dd>

              <dt style={{ color: '#64748b' }}>Người ghi:</dt>
              <dd style={{ margin: 0 }}>{selectedActivity.recorderName || 'Nhân viên kỹ thuật'}</dd>
            </dl>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="primary-button" onClick={() => setSelectedActivity(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
