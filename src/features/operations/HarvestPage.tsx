import { useEffect, useRef, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface HarvestRecord {
  harvestRecordId: number;
  cropSeasonId: number;
  farmId: number;
  seasonName?: string | null;
  farmName?: string | null;
  blockId?: number;
  blockName?: string | null;
  recorderFullName?: string | null;
  harvestLotCode: string | null;
  harvestedAt: string;
  quantity: number;
  unit: string;
  qualityGrade: string | null;
  storageLocation: string | null;
  traceabilityCode: string | null;
  notes?: string | null;
}

export function HarvestPage() {
  const { selectedFarm } = useFarmWorkspace();
  return <HarvestContent key={selectedFarm?.id ?? 'no-farm'} />;
}

function HarvestContent() {
  const { selectedFarm } = useFarmWorkspace();
  const [seasonInput, setSeasonInput] = useState('');
  const [cropSeasonId, setCropSeasonId] = useState<number | null>(null);
  const [records, setRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraceRecord, setSelectedTraceRecord] = useState<HarvestRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<HarvestRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [lotCode, setLotCode] = useState(`LOT-${new Date().getFullYear()}-01`);
  const [quantity, setQuantity] = useState<number | ''>(500);
  const [harvestedAt, setHarvestedAt] = useState('');
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('Loại 1 (Xuất khẩu)');
  const [storageLocation, setStorageLocation] = useState('');
  const [traceabilityCode, setTraceabilityCode] = useState(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    detailRequest.current?.abort();
    listRequest.current?.abort();
  }, []);

  const loadHarvests = async (id: number | null) => {
    if (!selectedFarm || id === null) return;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      setNotification({ text: 'ID mùa vụ phải là số nguyên dương hợp lệ.', type: 'error' });
      return;
    }
    listRequest.current?.abort();
    detailRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setCropSeasonId(null);
    setRecords([]);
    setSelectedTraceRecord(null);
    setIsModalOpen(false);
    setLoading(true);
    setLoadError(null);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<{ items: HarvestRecord[] }>>(
        `/harvest-records?cropSeasonId=${id}&size=50`, { signal: controller.signal }
      );
      if (!res.success || !Array.isArray(res.data?.items)) throw new Error(res.message || 'Không tải được lịch sử thu hoạch.');
      if (controller.signal.aborted) return;
      if (res.data.items.some(record => record.farmId !== selectedFarm.id || record.cropSeasonId !== id)) {
        throw new Error('Dữ liệu thu hoạch không thuộc mùa vụ và trang trại đang chọn. Hãy kiểm tra lại ID mùa vụ.');
      }
      setCropSeasonId(id);
      setRecords(res.data.items);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Lỗi tải lịch sử thu hoạch.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const openHarvest = async (id: number, edit = false) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetailLoading(true);
    setNotification(null);
    setSelectedTraceRecord(null);
    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>(`/harvest-records/${id}`, { signal: controller.signal });
      if (!res.success || !res.data) throw new Error(res.message || 'Không tải được chi tiết thu hoạch.');
      if (controller.signal.aborted) return;
      if (edit) {
        setEditingRecord(res.data);
        setLotCode(res.data.harvestLotCode ?? '');
        setTraceabilityCode(res.data.traceabilityCode ?? '');
        setHarvestedAt(res.data.harvestedAt);
        setQuantity(res.data.quantity);
        setUnit(res.data.unit);
        setQualityGrade(res.data.qualityGrade ?? '');
        setStorageLocation(res.data.storageLocation ?? '');
        setNotes(res.data.notes ?? '');
        setIsModalOpen(true);
      } else setSelectedTraceRecord(res.data);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không tải được chi tiết thu hoạch.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  const handleSaveHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || cropSeasonId === null || !selectedFarm) return;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0 || !unit.trim() || !harvestedAt) {
      setNotification({ text: 'Nhập ngày thu hoạch, đơn vị và sản lượng lớn hơn 0.', type: 'error' });
      return;
    }
    setSaving(true);
    setNotification(null);
    const payload = {
      ...(!editingRecord && { cropSeasonId, harvestLotCode: lotCode.trim(), traceabilityCode: traceabilityCode.trim() }),
      harvestedAt,
      quantity: Number(quantity),
      unit: unit.trim(),
      qualityGrade,
      storageLocation,
      notes,
    };

    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>(editingRecord ? `/harvest-records/${editingRecord.harvestRecordId}` : '/harvest-records', {
        method: editingRecord ? 'PUT' : 'POST',
        data: payload,
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được bản ghi thu hoạch.');
      setRecords(prev => editingRecord
        ? prev.map(record => record.harvestRecordId === editingRecord.harvestRecordId ? res.data : record)
        : [res.data, ...prev]);
      setNotification({ text: editingRecord ? 'Đã cập nhật thu hoạch thành công!' : `Đã ghi nhận lô thu hoạch "${lotCode}" thành công!`, type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setNotification({ text: error instanceof Error ? error.message : 'Không lưu được thu hoạch.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setLotCode(`LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`);
    setTraceabilityCode(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
    setHarvestedAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setQuantity(500);
    setUnit('kg');
    setQualityGrade('Loại 1 (Xuất khẩu)');
    setStorageLocation('');
    setNotes('');
  };

  const yieldUnit = records[0]?.unit ?? 'kg';
  const sameUnit = records.every(record => record.unit === yieldUnit);
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
          <button type="button" className="action-button" onClick={() => loadHarvests(cropSeasonId)} disabled={cropSeasonId === null || loading || saving || detailLoading}>
            <Icon name="refresh" /> Làm mới
          </button>
          <button type="button" className="primary-button" disabled={cropSeasonId === null || loading || detailLoading || saving} onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Icon name="plus" /> Ghi nhận đợt thu hoạch
          </button>
        </div>
      </div>

      <form className="panel" style={{ padding: '20px', marginBottom: '20px' }} onSubmit={event => { event.preventDefault(); loadHarvests(Number(seasonInput)); }}>
        <label htmlFor="harvest-season-id">ID mùa vụ của {selectedFarm?.farmName || 'trang trại'}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
          <input id="harvest-season-id" type="number" min="1" max="2147483647" step="1" required value={seasonInput} onChange={event => setSeasonInput(event.target.value)} disabled={!selectedFarm || loading || saving || detailLoading} />
          <button type="submit" className="action-button" disabled={!selectedFarm || loading || saving || detailLoading}>Xem thu hoạch</button>
        </div>
        <p className="page-subtitle">Nhập ID mùa vụ đã lưu trong database và thuộc trang trại đang chọn. Danh sách chọn mùa vụ chưa khả dụng.</p>
        {cropSeasonId !== null && <p role="status">Đang xem mùa vụ #{cropSeasonId}.</p>}
      </form>

      {notification && (
        <div role={notification.type === 'error' && !isModalOpen ? 'alert' : 'status'} className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}
      {detailLoading && <p role="status">Đang tải chi tiết thu hoạch...</p>}

      {/* Yield Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SẢN LƯỢNG THU HOẠCH</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#059669', fontWeight: 800 }}>
            {cropSeasonId === null || loading || loadError || !sameUnit ? '—' : totalYield.toLocaleString('vi-VN')} <span style={{ fontSize: '16px', fontWeight: 500 }}>{sameUnit ? yieldUnit : 'Nhiều đơn vị'}</span>
          </h2>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SỐ LÔ SẢN PHẨM</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0284c7', fontWeight: 800 }}>
            {cropSeasonId === null || loading || loadError ? '—' : records.length} <span style={{ fontSize: '16px', fontWeight: 500 }}>lô hàng</span>
          </h2>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỶ LỆ PHẨM CẤP XUẤT KHẨU</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#8b5cf6', fontWeight: 800 }}>
            —
          </h2>
          <small style={{ color: '#8b5cf6' }}>Chưa có dữ liệu thống kê</small>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải danh sách thu hoạch...</h2>
        </div>
      ) : loadError ? (
        <div className="panel" role="alert"><p>{loadError}</p><button type="button" className="action-button" onClick={() => loadHarvests(Number(seasonInput))}>Thử lại</button></div>
      ) : cropSeasonId === null ? (
        <div className="panel empty-state"><h2>{selectedFarm ? 'Nhập ID mùa vụ để xem thu hoạch' : 'Hãy chọn trang trại trước'}</h2></div>
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
              key={r.harvestRecordId}
              data-harvest-id={r.harvestRecordId}
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
                    🏷️ {r.harvestLotCode || `#${r.harvestRecordId}`}
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

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <button type="button" className="action-button" disabled={detailLoading} onClick={() => openHarvest(r.harvestRecordId)}>
                  <Icon name="eye" /> Chi tiết
                </button>
                <button type="button" className="action-button" disabled={detailLoading} onClick={() => openHarvest(r.harvestRecordId, true)}>
                  <Icon name="edit" /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  disabled={detailLoading}
                  onClick={() => openHarvest(r.harvestRecordId)}
                >
                  📱 Tem QR Truy xuất
                </button>
                <small style={{ color: '#94a3b8' }}>ID: #{r.harvestRecordId}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ghi nhận thu hoạch */}
      <Modal open={isModalOpen} onClose={() => { if (!saving) setIsModalOpen(false); }} title={editingRecord ? 'Chỉnh sửa thu hoạch' : 'Ghi nhận đợt thu hoạch mới'}>
            <form onSubmit={handleSaveHarvest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="page-subtitle">Mùa vụ #{editingRecord?.cropSeasonId ?? cropSeasonId}</p>
              {notification?.type === 'error' && <p role="alert" className="form-error-banner">{notification.text}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="harvest-lot-code" style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mã lô thu hoạch *</label>
                  <input id="harvest-lot-code" type="text" required={!editingRecord} readOnly={Boolean(editingRecord)} maxLength={60} value={lotCode} onChange={(e) => setLotCode(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label htmlFor="harvest-trace-code" style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mã truy xuất (Traceability) *</label>
                  <input id="harvest-trace-code" type="text" required={!editingRecord} readOnly={Boolean(editingRecord)} value={traceabilityCode} onChange={(e) => setTraceabilityCode(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label htmlFor="harvest-date">Ngày thu hoạch *</label>
                <input id="harvest-date" type="datetime-local" step="any" required value={harvestedAt} onChange={e => setHarvestedAt(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Sản lượng thu hoạch *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input aria-label="Sản lượng thu hoạch" type="number" step="any" min="0.0001" required value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} style={{ flex: 2, minWidth: 0, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <select aria-label="Đơn vị" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      {!['kg', 'tấn', 'thùng'].includes(unit) && <option value={unit}>{unit}</option>}
                      <option value="kg">kg</option>
                      <option value="tấn">tấn</option>
                      <option value="thùng">thùng</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Phân loại phẩm chất</label>
                  <select aria-label="Phân loại phẩm chất" value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    {!['Loại 1 (Xuất khẩu)', 'Loại 1 (Siêu thị)', 'Loại 2 (Nội địa)', 'Chế biến'].includes(qualityGrade) && <option value={qualityGrade}>{qualityGrade || 'Chưa phân loại'}</option>}
                    <option value="Loại 1 (Xuất khẩu)">Loại 1 (Xuất khẩu)</option>
                    <option value="Loại 1 (Siêu thị)">Loại 1 (Siêu thị)</option>
                    <option value="Loại 2 (Nội địa)">Loại 2 (Nội địa)</option>
                    <option value="Chế biến">Hàng phục vụ chế biến</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Địa điểm / Kho lưu trữ bảo quản</label>
                <input aria-label="Kho lưu trữ" type="text" maxLength={200} value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ghi chú chất lượng kiểm định</label>
                <textarea aria-label="Ghi chú" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" disabled={saving} onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingRecord ? 'Lưu thay đổi' : 'Xác nhận thu hoạch'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: Tem QR & Thẻ truy xuất nguồn gốc */}
      {selectedTraceRecord && (
        <Modal open onClose={() => setSelectedTraceRecord(null)} title="Chi tiết thu hoạch">
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>🏷️</span>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>Tem truy xuất nguồn gốc VietGAP</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13.5px' }}>
              Thông tin lô thu hoạch từ hệ thống
            </p>

            {/* Simulated QR Box */}
            <div style={{ width: '180px', height: '180px', margin: '0 auto 20px', padding: '16px', background: '#ffffff', border: '2px solid #10b981', borderRadius: '12px', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
              <div style={{ width: '100%', height: '100%', background: 'repeating-conic-gradient(#0f172a 0% 25%, #ffffff 0% 50%) 50% / 20px 20px', borderRadius: '6px' }} />
            </div>
            <p className="page-subtitle">Hình QR minh họa, chưa dùng để quét truy xuất.</p>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Lô hàng:</strong> {selectedTraceRecord.harvestLotCode}</div>
              <div><strong>Sản lượng:</strong> {selectedTraceRecord.quantity.toLocaleString('vi-VN')} {selectedTraceRecord.unit}</div>
              <div><strong>Phẩm chất:</strong> {selectedTraceRecord.qualityGrade || 'Chưa cập nhật'}</div>
              <div><strong>Mã định danh:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{selectedTraceRecord.traceabilityCode}</span></div>
              <div><strong>Trang trại:</strong> {selectedTraceRecord.farmName || selectedFarm?.farmName}</div>
              <div><strong>Mùa vụ:</strong> {selectedTraceRecord.seasonName || `#${selectedTraceRecord.cropSeasonId}`}</div>
              <div><strong>Lô đất:</strong> {selectedTraceRecord.blockName || 'Chưa cập nhật'}</div>
              <div><strong>Ngày thu hoạch:</strong> {new Date(selectedTraceRecord.harvestedAt).toLocaleDateString('vi-VN')}</div>
              <div><strong>Tiêu chuẩn:</strong> Thực hành nông nghiệp tốt VietGAP</div>
              <div><strong>Kho lưu trữ:</strong> {selectedTraceRecord.storageLocation || 'Chưa cập nhật'}</div>
              <div><strong>Người ghi nhận:</strong> {selectedTraceRecord.recorderFullName || 'Chưa cập nhật'}</div>
              <div><strong>Ghi chú:</strong> {selectedTraceRecord.notes || 'Chưa cập nhật'}</div>
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
        </Modal>
      )}
    </section>
  );
}
