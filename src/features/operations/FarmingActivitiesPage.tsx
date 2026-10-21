import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { toast } from 'sonner';
import { ChevronDown, FunnelX, Search } from 'lucide-react';

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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [seasonId, setSeasonId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<FarmingActivity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);

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
    try {
      const res = await apiRequest<ApiResponse<{ items: FarmingActivity[] }>>(
        `/farming-activities?cropSeasonId=${seasonId}&size=50`
      ).catch(() => null);

      if (res?.data?.items && Array.isArray(res.data.items) && res.data.items.length > 0) {
        setActivities(res.data.items);
      }
    } catch {
      toast.error('Lỗi không thể lấy nhật ký canh tác từ máy chủ.');
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
      const res = await apiRequest<ApiResponse<FarmingActivity>>(
        '/farming-activities',
        {
          method: 'POST',
          data: newActPayload,
        }
      );

      if (!res?.data) {
        throw new Error('Không nhận được dữ liệu từ máy chủ.');
      }

      // Update the list with the activity returned by the backend
      setActivities((prev) => [res.data, ...prev]);

      toast.success('Đã lưu nhật ký canh tác thành công!');


      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      // Handle API or server errors
      console.error('Failed to save farming activity:', error);

      toast.error('Đã lưu nhật ký canh tác thành công!');
    } finally {
      // Always stop the loading state
      setSaving(false);
    }
  }

  const resetForm = () => {
    setActName('');
    setDescription('');
    setResultNotes('');
  };
  const filteredActivities = activities.filter((activity) => {
    const matchesSeason = activity.cropSeasonId === seasonId;

    const matchesType =
      selectedTypes.length === 0 ||
      selectedTypes.includes(activity.activityType);

    const keyword = searchTerm.trim().toLowerCase();

    const matchesSearch =
      activity.activityName.toLowerCase().includes(keyword) ||
      (activity.description ?? '').toLowerCase().includes(keyword);

    return matchesSeason && matchesType && matchesSearch;
  });

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

        <div
          style={{
            position: 'relative',
            width: '280px',
          }}
        >
          <Search
            size={18}
            color="#64748b"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />

          <input
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm hoạt động..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              background: '#ffffff',
              color: '#334155',
            }}
          />
        </div>

        <div style={{ position: 'relative', minWidth: '220px' }}>
          <button
            type="button"
            onClick={() => setIsTypeFilterOpen(prev => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <span>
              {selectedTypes.length === 0
                ? 'Tất cả loại hoạt động'
                : `Đã chọn ${selectedTypes.length} loại`}
            </span>

            <ChevronDown
              size={16}
              style={{
                transform: isTypeFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {isTypeFilterOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '6px',
                padding: '10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                zIndex: 20,
              }}
            >
              {[
                'Làm đất',
                'Gieo cấy',
                'Bón phân',
                'Tưới nước',
                'Phun thuốc',
                'Thu hoạch',
              ].map(type => (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 4px',
                    fontSize: '13px',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() =>
                      setSelectedTypes(prev =>
                        prev.includes(type)
                          ? prev.filter(item => item !== type)
                          : [...prev, type]
                      )
                    }
                  />
                  {type}
                </label>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '6px',
                  paddingTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTypes([])}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Xóa lựa chọn
                </button>

                <button
                  type="button"
                  onClick={() => setIsTypeFilterOpen(false)}
                  style={{
                    border: 'none',
                    borderRadius: '6px',
                    background: '#10b981',
                    color: '#ffffff',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline List */}
      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải dòng thời gian nhật ký...</h2>
        </div>
      ) : filteredActivities.length === 0 ? (
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
          {filteredActivities.map((act) => {
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
                    <option value="Thu hoạch">Thu hoạch nông sản</option>

                    <>'Làm đất', 'Gieo cấy', 'Bón phân', 'Tưới nước', 'Phun thuốc', 'Thu hoạch'</>
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
