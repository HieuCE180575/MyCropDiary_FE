import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface MaterialUsage {
  id: number;
  farmingActivityId: number;
  materialId: number;
  materialName: string;
  materialType?: string;
  quantity: number;
  unit: string;
  dosage?: string;
  method?: string;
  safetyIntervalDays?: number; // PHI
  usedAt: string;
  notes?: string;
}

export function MaterialUsagePage() {
  const { selectedFarm } = useFarmWorkspace();
  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState('Phân bón hữu cơ');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [unit, setUnit] = useState('kg');
  const [dosage, setDosage] = useState('50g / gốc');
  const [method, setMethod] = useState('Bón quanh gốc và tưới ẩm');
  const [safetyDays, setSafetyDays] = useState<number>(0);
  const [notes, setNotes] = useState('Đạt tiêu chuẩn vật tư danh mục VietGAP cho phép');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsages();
  }, [selectedFarm?.id]);

  const loadUsages = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ApiResponse<{ items: MaterialUsage[] }>>(
        '/material-usages?farmingActivityId=1&size=50'
      ).catch(() => null);

      if (res?.data?.items && Array.isArray(res.data.items) && res.data.items.length > 0) {
        setUsages(res.data.items);
      } else {
        setUsages([
          {
            id: 1,
            farmingActivityId: 1,
            materialId: 101,
            materialName: 'Phân trùn quế nguyên chất Vermicompost',
            materialType: 'Phân bón hữu cơ',
            quantity: 250,
            unit: 'kg',
            dosage: '0.5kg / gốc',
            method: 'Bón lót theo rãnh luống',
            safetyIntervalDays: 0,
            usedAt: '2026-03-01T08:30:00',
            notes: 'Vật tư hữu cơ an toàn sinh học 100%',
          },
          {
            id: 2,
            farmingActivityId: 2,
            materialId: 102,
            materialName: 'Chế phẩm sinh học Trichoderma Bacillus',
            materialType: 'Chế phẩm sinh học',
            quantity: 5,
            unit: 'lít',
            dosage: '50ml / bình 20L',
            method: 'Phun sương phòng nấm gốc',
            safetyIntervalDays: 3,
            usedAt: '2026-03-10T07:15:00',
            notes: 'Thời gian cách ly 3 ngày trước thu hoạch',
          },
          {
            id: 3,
            farmingActivityId: 3,
            materialId: 103,
            materialName: 'Tinh dầu Neem Oil nguyên chất 3000PPM',
            materialType: 'Thuốc BVTV sinh học',
            quantity: 2,
            unit: 'lít',
            dosage: '20ml / bình 16L',
            method: 'Phun trừ bọ trĩ và rầy mềm',
            safetyIntervalDays: 5,
            usedAt: '2026-03-18T16:45:00',
            notes: 'Không gây độc hại cho thiên địch',
          },
        ]);
      }
    } catch {
      setNotification({ text: 'Lỗi nạp danh sách vật tư sử dụng.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim() || !quantity) return;
    setSaving(true);
    const payload = {
      farmingActivityId: 1,
      materialId: 999,
      usedAt: new Date().toISOString(),
      quantity: Number(quantity),
      unit,
      dosage,
      method,
      safetyIntervalDays: Number(safetyDays),
      notes: `${matName} (${matType}): ${notes}`,
    };

    try {
      const res = await apiRequest<ApiResponse<MaterialUsage>>('/material-usages', {
        method: 'POST',
        data: payload,
      });
      if (res?.data) {
        setUsages((prev) => [res.data, ...prev]);
      } else {
        throw new Error('Fallback');
      }
      setNotification({ text: `Đã ghi nhận sử dụng "${matName}" thành công!`, type: 'success' });
      setIsModalOpen(false);
      setMatName('');
    } catch {
      const mockNew: MaterialUsage = {
        id: Date.now(),
        farmingActivityId: 1,
        materialId: Date.now(),
        materialName: matName.trim(),
        materialType: matType,
        quantity: Number(quantity),
        unit,
        dosage,
        method,
        safetyIntervalDays: Number(safetyDays),
        usedAt: new Date().toISOString(),
        notes,
      };
      setUsages((prev) => [mockNew, ...prev]);
      setNotification({ text: `Đã ghi nhận sử dụng "${matName}" (mô phỏng)!`, type: 'success' });
      setIsModalOpen(false);
      setMatName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="material-usage-page">
      <div className="page-heading">
        <div>
          <h1>Sổ tay sử dụng vật tư nông nghiệp</h1>
          <p className="page-subtitle">
            Giám sát liều lượng phân bón, thuốc BVTV sinh học và thời gian cách ly an toàn (PHI) theo chuẩn VietGAP
          </p>
        </div>
        <div>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            <Icon name="plus" /> Ghi nhận sử dụng vật tư
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}

      {/* Safety Notice Banner */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderColor: '#a7f3d0', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
        <span style={{ fontSize: '26px' }}>🛡️</span>
        <div>
          <strong style={{ display: 'block', color: '#065f46', fontSize: '15px' }}>Nguyên tắc 4 đúng trong sử dụng vật tư VietGAP:</strong>
          <span style={{ color: '#047857', fontSize: '13.5px' }}>
            Đúng thuốc · Đúng lúc · Đúng nồng độ, liều lượng · Đúng cách & Tuân thủ nghiêm ngặt thời gian cách ly (PHI).
          </span>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải nhật ký vật tư...</h2>
        </div>
      ) : usages.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📦</div>
          <h2>Chưa ghi nhận lần sử dụng vật tư nào</h2>
          <p>Hãy bắt đầu ghi chép việc dùng phân bón, chế phẩm sinh học vào hồ sơ canh tác.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                <th style={{ padding: '14px 20px' }}>Tên vật tư & Chủng loại</th>
                <th style={{ padding: '14px 20px' }}>Số lượng sử dụng</th>
                <th style={{ padding: '14px 20px' }}>Nồng độ / Liều lượng</th>
                <th style={{ padding: '14px 20px' }}>Cách thức bón/phun</th>
                <th style={{ padding: '14px 20px' }}>Thời gian cách ly (PHI)</th>
                <th style={{ padding: '14px 20px' }}>Thời điểm dùng</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{u.materialName}</strong>
                    <span className="profile-tag-pill" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                      {u.materialType || 'Vật tư đầu vào'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#059669' }}>
                    {u.quantity} {u.unit}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>
                    {u.dosage || 'Theo khuyến cáo'}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748b' }}>
                    {u.method || 'Bón lót/tưới ẩm'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {u.safetyIntervalDays && u.safetyIntervalDays > 0 ? (
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '12px' }}>
                        ⏳ {u.safetyIntervalDays} ngày
                      </span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                        ✓ An toàn (0 ngày)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '13px' }}>
                    {new Date(u.usedAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Ghi nhận sử dụng vật tư */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Ghi nhận sử dụng vật tư nông nghiệp</h2>
            <form onSubmit={handleCreateUsage} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên vật tư / phân bón / thuốc BVTV *</label>
                <input type="text" required placeholder="Ví dụ: Phân trùn quế Vermicompost" value={matName} onChange={(e) => setMatName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Phân loại vật tư</label>
                  <select value={matType} onChange={(e) => setMatType(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="Phân bón hữu cơ">Phân bón hữu cơ</option>
                    <option value="Phân vô cơ / NPK">Phân vô cơ / NPK</option>
                    <option value="Chế phẩm sinh học">Chế phẩm sinh học</option>
                    <option value="Thuốc BVTV sinh học">Thuốc BVTV sinh học</option>
                    <option value="Chất cải tạo đất">Chất cải tạo đất</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Số lượng & Đơn vị *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} style={{ flex: 2, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="kg">kg</option>
                      <option value="tấn">tấn</option>
                      <option value="lít">lít</option>
                      <option value="chai">chai</option>
                      <option value="gói">gói</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Liều lượng / nồng độ</label>
                  <input type="text" placeholder="Ví dụ: 50g / gốc" value={dosage} onChange={(e) => setDosage(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Thời gian cách ly (PHI)</label>
                  <input type="number" min="0" placeholder="Số ngày (0 nếu hữu cơ)" value={safetyDays} onChange={(e) => setSafetyDays(Number(e.target.value))} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Phương pháp sử dụng</label>
                <input type="text" placeholder="Bón lót / Bón thúc / Phun sương qua lá..." value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ghi chú chứng nhận / Nguồn gốc</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Ghi nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
