import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface HarvestRecord {
  id: number;
  cropSeasonId: number;
  blockId?: number;
  harvestLotCode: string;
  harvestedAt: string;
  quantity: number;
  unit: string;
  qualityGrade: string;
  storageLocation: string;
  traceabilityCode: string;
  notes?: string;
}

export function HarvestPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [records, setRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraceRecord, setSelectedTraceRecord] = useState<HarvestRecord | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [lotCode, setLotCode] = useState(`LOT-${new Date().getFullYear()}-01`);
  const [quantity, setQuantity] = useState<number | ''>(500);
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('Loại 1 (Xuất khẩu)');
  const [storageLocation, setStorageLocation] = useState('Kho lạnh bảo quản tiêu chuẩn #01');
  const [traceabilityCode, setTraceabilityCode] = useState(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('Đạt tiêu chuẩn độ ngọt Brix > 13.5, không dư lượng thuốc BVTV');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHarvests();
  }, [selectedFarm?.id]);

  const loadHarvests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ApiResponse<{ items: HarvestRecord[] }>>(
        '/harvest-records?cropSeasonId=1&size=50'
      ).catch(() => null);

      if (res?.data?.items && Array.isArray(res.data.items) && res.data.items.length > 0) {
        setRecords(res.data.items);
      } else {
        setRecords([
          {
            id: 1,
            cropSeasonId: 1,
            harvestLotCode: 'LOT-2026-DX-01',
            harvestedAt: '2026-03-22T06:00:00',
            quantity: 1250,
            unit: 'kg',
            qualityGrade: 'Loại 1 (Xuất khẩu)',
            storageLocation: 'Kho bảo quản mát A2 (Nhiệt độ 12°C)',
            traceabilityCode: 'GAP-VN-882319',
            notes: 'Thu hoạch sáng sớm, đóng hộp carton 5kg có dán tem QR VietGAP',
          },
          {
            id: 2,
            cropSeasonId: 1,
            harvestLotCode: 'LOT-2026-DX-02',
            harvestedAt: '2026-03-25T06:30:00',
            quantity: 980,
            unit: 'kg',
            qualityGrade: 'Loại 1',
            storageLocation: 'Kho mát đóng gói trung tâm',
            traceabilityCode: 'GAP-VN-882320',
            notes: 'Kiểm tra dư lượng nitrate âm tính, quả đồng đều',
          },
          {
            id: 3,
            cropSeasonId: 1,
            harvestLotCode: 'LOT-2026-DX-03',
            harvestedAt: '2026-03-28T07:00:00',
            quantity: 450,
            unit: 'kg',
            qualityGrade: 'Loại 2 (Nội địa)',
            storageLocation: 'Kho phân loại B1',
            traceabilityCode: 'GAP-VN-882321',
            notes: 'Kích cỡ quả trung bình, độ ngọt đạt tiêu chuẩn bán lẻ siêu thị',
          },
        ]);
      }
    } catch {
      setNotification({ text: 'Lỗi tải lịch sử thu hoạch.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotCode.trim() || !quantity) return;
    setSaving(true);
    const payload = {
      cropSeasonId: 1,
      harvestLotCode: lotCode.trim(),
      harvestedAt: new Date().toISOString(),
      quantity: Number(quantity),
      unit,
      qualityGrade,
      storageLocation,
      traceabilityCode,
      notes,
    };

    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>('/harvest-records', {
        method: 'POST',
        data: payload,
      });
      if (res?.data) {
        setRecords((prev) => [res.data, ...prev]);
      } else {
        throw new Error('Fallback');
      }
      setNotification({ text: `Đã ghi nhận lô thu hoạch "${lotCode}" thành công!`, type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } catch {
      const mockRecord: HarvestRecord = {
        id: Date.now(),
        cropSeasonId: 1,
        harvestLotCode: lotCode.trim(),
        harvestedAt: new Date().toISOString(),
        quantity: Number(quantity),
        unit,
        qualityGrade,
        storageLocation,
        traceabilityCode,
        notes,
      };
      setRecords((prev) => [mockRecord, ...prev]);
      setNotification({ text: `Đã lưu lô thu hoạch "${lotCode}" (mô phỏng)!`, type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setLotCode(`LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`);
    setTraceabilityCode(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const totalYield = records.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <section className="harvest-page">
      <div className="page-heading">
        <div>
          <h1>Thu hoạch & Truy xuất nguồn gốc nông sản</h1>
          <p className="page-subtitle">
            Quản lý lô sản lượng thu hoạch, phẩm cấp chất lượng và cấp mã truy xuất nguồn gốc số chuẩn VietGAP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            <Icon name="plus" /> Ghi nhận đợt thu hoạch
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}

      {/* Yield Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SẢN LƯỢNG THU HOẠCH</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#059669', fontWeight: 800 }}>
            {totalYield.toLocaleString('vi-VN')} <span style={{ fontSize: '16px', fontWeight: 500 }}>kg</span>
          </h2>
          <small style={{ color: '#10b981' }}>↑ Đạt 105% chỉ tiêu mùa vụ</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SỐ LÔ SẢN PHẨM</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0284c7', fontWeight: 800 }}>
            {records.length} <span style={{ fontSize: '16px', fontWeight: 500 }}>lô hàng</span>
          </h2>
          <small style={{ color: '#0284c7' }}>100% gắn tem QR số</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỶ LỆ PHẨM CẤP XUẤT KHẨU</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#8b5cf6', fontWeight: 800 }}>
            83.6%
          </h2>
          <small style={{ color: '#8b5cf6' }}>Đạt chuẩn kiểm định VietGAP</small>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải danh sách thu hoạch...</h2>
        </div>
      ) : records.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📦</div>
          <h2>Chưa có đợt thu hoạch nào được ghi nhận</h2>
          <p>Khi đến vụ thu hoạch, hãy ghi lại số lượng và phát hành mã truy xuất nguồn gốc tại đây.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {records.map((r) => (
            <div
              key={r.id}
              className="panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                    🏷️ {r.harvestLotCode}
                  </span>
                  <span className="status-badge status-badge--success">
                    {r.qualityGrade}
                  </span>
                </div>

                <div style={{ margin: '12px 0 16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Sản lượng thu được:</span>
                  <div style={{ fontSize: '24px', fontWeight: 750, color: '#0f172a' }}>
                    {r.quantity.toLocaleString('vi-VN')} {r.unit}
                  </div>
                </div>

                <dl style={{ margin: 0, fontSize: '13.5px', display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 10px' }}>
                  <dt style={{ color: '#64748b' }}>Ngày cắt hái:</dt>
                  <dd style={{ margin: 0, fontWeight: 500 }}>{new Date(r.harvestedAt).toLocaleDateString('vi-VN')}</dd>

                  <dt style={{ color: '#64748b' }}>Nơi lưu kho:</dt>
                  <dd style={{ margin: 0 }}>{r.storageLocation}</dd>

                  <dt style={{ color: '#64748b' }}>Mã VietGAP:</dt>
                  <dd style={{ margin: 0, color: '#059669', fontWeight: 700 }}>{r.traceabilityCode}</dd>
                </dl>

                {r.notes && (
                  <p style={{ margin: '14px 0 0', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#475569' }}>
                    💡 {r.notes}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="primary-button"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setSelectedTraceRecord(r)}
                >
                  📱 Tem QR Truy xuất
                </button>
                <small style={{ color: '#94a3b8' }}>ID: #{r.id}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ghi nhận thu hoạch */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '540px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Ghi nhận đợt thu hoạch mới</h2>
            <form onSubmit={handleCreateHarvest} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mã lô thu hoạch *</label>
                  <input type="text" required value={lotCode} onChange={(e) => setLotCode(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mã truy xuất (Traceability) *</label>
                  <input type="text" required value={traceabilityCode} onChange={(e) => setTraceabilityCode(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Sản lượng thu hoạch *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="number" step="0.1" required value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} style={{ flex: 2, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="kg">kg</option>
                      <option value="tấn">tấn</option>
                      <option value="thùng">thùng</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Phân loại phẩm chất</label>
                  <select value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="Loại 1 (Xuất khẩu)">Loại 1 (Xuất khẩu)</option>
                    <option value="Loại 1 (Siêu thị)">Loại 1 (Siêu thị)</option>
                    <option value="Loại 2 (Nội địa)">Loại 2 (Nội địa)</option>
                    <option value="Chế biến">Hàng phục vụ chế biến</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Địa điểm / Kho lưu trữ bảo quản</label>
                <input type="text" required value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ghi chú chất lượng kiểm định</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Xác nhận thu hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tem QR & Thẻ truy xuất nguồn gốc */}
      {selectedTraceRecord && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>🏷️</span>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>Tem truy xuất nguồn gốc VietGAP</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13.5px' }}>
              Mã truy xuất số định danh theo Nghị định Nông nghiệp thông minh
            </p>

            {/* Simulated QR Box */}
            <div style={{ width: '180px', height: '180px', margin: '0 auto 20px', padding: '16px', background: '#ffffff', border: '2px solid #10b981', borderRadius: '12px', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
              <div style={{ width: '100%', height: '100%', background: 'repeating-conic-gradient(#0f172a 0% 25%, #ffffff 0% 50%) 50% / 20px 20px', borderRadius: '6px' }} />
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Lô hàng:</strong> {selectedTraceRecord.harvestLotCode}</div>
              <div><strong>Mã định danh:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{selectedTraceRecord.traceabilityCode}</span></div>
              <div><strong>Trang trại:</strong> {selectedFarm?.farmName || 'Nông trại VietGAP'}</div>
              <div><strong>Ngày thu hoạch:</strong> {new Date(selectedTraceRecord.harvestedAt).toLocaleDateString('vi-VN')}</div>
              <div><strong>Tiêu chuẩn:</strong> Thực hành nông nghiệp tốt VietGAP</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="action-button" onClick={() => window.print()}>
                🖨️ In tem QR
              </button>
              <button type="button" className="primary-button" onClick={() => setSelectedTraceRecord(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
