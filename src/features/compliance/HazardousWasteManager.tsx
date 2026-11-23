import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate, formatNumber } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { Trash2, Plus } from 'lucide-react';

export interface HazardousWasteLog {
  id: string;
  farmId: number;
  date: string;
  sourceLocation: string; // Lô vừa phun hoặc kho
  wasteType: 'pesticide_bottle' | 'fertilizer_bag' | 'chemical_packaging' | 'other';
  quantity: number;
  unit: string;
  storageMethod: 'secure_sealed_tank' | 'handed_over' | 'temporary_bin';
  disposalPartner?: string;
  handoverDocNo?: string;
  recorderName: string;
  notes?: string;
}

const STORAGE_KEY = 'mycropdiary_hazardous_waste_logs';

export function HazardousWasteManager({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<HazardousWasteLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceLocation, setSourceLocation] = useState('');
  const [wasteType, setWasteType] = useState<HazardousWasteLog['wasteType']>('pesticide_bottle');
  const [quantity, setQuantity] = useState<number | ''>(5);
  const [unit, setUnit] = useState('vỏ chai');
  const [storageMethod, setStorageMethod] = useState<HazardousWasteLog['storageMethod']>('secure_sealed_tank');
  const [disposalPartner, setDisposalPartner] = useState('');
  const [handoverDocNo, setHandoverDocNo] = useState('');
  const [recorderName, setRecorderName] = useState('Kỹ thuật viên trang trại');
  const [notes, setNotes] = useState('');

  // Initial load from localStorage (scoped by farmId)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${farmId}`);
      if (raw) {
        setLogs(JSON.parse(raw));
      } else {
        // Seed default representative records for demo & audit compliance
        const defaultLogs: HazardousWasteLog[] = [
          {
            id: 'hw-1',
            farmId,
            date: '2026-03-28',
            sourceLocation: 'Lô A1 (Sau đợt phun phòng bọ trĩ)',
            wasteType: 'pesticide_bottle',
            quantity: 12,
            unit: 'vỏ chai',
            storageMethod: 'secure_sealed_tank',
            recorderName: 'Nguyễn Văn Minh',
            notes: 'Đã súc rửa 3 lần theo quy định VietGAP và chuyển vào bể chứa chuyên dụng có khóa nắp.',
          },
          {
            id: 'hw-2',
            farmId,
            date: '2026-04-10',
            sourceLocation: 'Bể rác nguy hại tập trung khu B',
            wasteType: 'chemical_packaging',
            quantity: 25,
            unit: 'kg',
            storageMethod: 'handed_over',
            disposalPartner: 'Công ty Môi trường Đô thị & Xử lý Chất thải Nguy hại',
            handoverDocNo: 'BB-BG-2026/04-CTNH',
            recorderName: 'Trần Thị Thu Thảo',
            notes: 'Bàn giao trọn gói xử lý chất thải theo hợp đồng định kỳ kèm biên bản ký nhận 2 bên.',
          },
        ];
        setLogs(defaultLogs);
        localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(defaultLogs));
      }
    } catch {
      // fallback
    }
  }, [farmId]);

  const saveLogs = (newLogs: HazardousWasteLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(newLogs));
    } catch {}
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocation.trim() || !quantity) return;

    const newLog: HazardousWasteLog = {
      id: `hw-${Date.now()}`,
      farmId,
      date,
      sourceLocation: sourceLocation.trim(),
      wasteType,
      quantity: Number(quantity),
      unit: unit.trim(),
      storageMethod,
      disposalPartner: disposalPartner.trim() || undefined,
      handoverDocNo: handoverDocNo.trim() || undefined,
      recorderName: recorderName.trim(),
      notes: notes.trim() || undefined,
    };

    saveLogs([newLog, ...logs]);
    setIsModalOpen(false);
    // Reset Form
    setSourceLocation('');
    setQuantity(5);
    setNotes('');
    setHandoverDocNo('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'en' ? 'Delete this hazardous waste log?' : 'Xóa bản ghi nhật ký thu gom rác này?')) {
      saveLogs(logs.filter((l) => l.id !== id));
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'ALL') return true;
    return l.wasteType === filterType;
  });

  const getWasteTypeLabel = (type: string) => {
    switch (type) {
      case 'pesticide_bottle':
        return lang === 'en' ? 'Pesticide Bottles' : 'Vỏ chai/lọ thuốc BVTV';
      case 'fertilizer_bag':
        return lang === 'en' ? 'Fertilizer Bags' : 'Bao bì phân bón hóa học';
      case 'chemical_packaging':
        return lang === 'en' ? 'Chemical Packaging' : 'Vỏ bao gói hóa chất nguy hại';
      default:
        return lang === 'en' ? 'Other hazardous waste' : 'Rác thải nguy hại khác';
    }
  };

  const getStorageBadge = (method: string) => {
    if (method === 'handed_over') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          ✓ {lang === 'en' ? 'Handed over for disposal' : 'Đã bàn giao đơn vị xử lý'}
        </span>
      );
    }
    return (
      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
        ⚠️ {lang === 'en' ? 'In Sealed Concrete Tank' : 'Lưu trữ bể chứa có nắp khóa'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} color="#047857" />
            {lang === 'en' ? 'Hazardous Waste & Pesticide Packaging Log (VietGAP 4.8)' : 'Sổ theo dõi thu gom rác & Vỏ bao bì thuốc BVTV (Mục 4.8 VietGAP)'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'en'
              ? 'Record collection, triple rinsing, and safe disposal/handover of chemical waste containers for '
              : 'Ghi chép thu gom, súc rửa 3 lần và lưu trữ/bàn giao xử lý chất thải nguy hại trang trại '}
            <strong>{farmName}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          {lang === 'en' ? 'Record Waste Collection' : 'Ghi chép đợt thu gom rác'}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{lang === 'en' ? 'Filter by type:' : 'Lọc loại rác:'}</span>
        <select
          className="ui-select"
          style={{ width: 'auto', padding: '6px 12px' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="ALL">{lang === 'en' ? 'All waste types' : 'Tất cả loại rác thải'}</option>
          <option value="pesticide_bottle">{lang === 'en' ? 'Pesticide Bottles' : 'Vỏ chai/lọ thuốc BVTV'}</option>
          <option value="fertilizer_bag">{lang === 'en' ? 'Fertilizer Bags' : 'Bao bì phân bón'}</option>
          <option value="chemical_packaging">{lang === 'en' ? 'Chemical Packaging' : 'Vỏ bao gói hóa chất'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày thu gom'}</th>
                <th>{lang === 'en' ? 'Source / Plot' : 'Khu vực phát sinh'}</th>
                <th>{lang === 'en' ? 'Waste Category' : 'Phân loại rác'}</th>
                <th>{lang === 'en' ? 'Quantity' : 'Số lượng'}</th>
                <th>{lang === 'en' ? 'Storage / Disposal Status' : 'Hình thức lưu trữ / Xử lý'}</th>
                <th>{lang === 'en' ? 'Disposal Unit / Doc #' : 'Đơn vị nhận / Số biên bản'}</th>
                <th>{lang === 'en' ? 'Recorder' : 'Người ghi chép'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No hazardous waste records logged yet.' : 'Chưa có bản ghi thu gom rác thải nguy hại nào.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{formatDate(log.date, lang)}</strong></td>
                    <td>{log.sourceLocation}</td>
                    <td><span style={{ fontWeight: 600 }}>{getWasteTypeLabel(log.wasteType)}</span></td>
                    <td><strong style={{ color: '#b91c1c' }}>{formatNumber(log.quantity, lang)} {log.unit}</strong></td>
                    <td>{getStorageBadge(log.storageMethod)}</td>
                    <td>
                      {log.disposalPartner ? (
                        <div>
                          <strong>{log.disposalPartner}</strong>
                          {log.handoverDocNo && <div style={{ fontSize: '11px', color: '#047857' }}>Số BB: {log.handoverDocNo}</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#888' }}>Lưu tại bể chứa</span>
                      )}
                    </td>
                    <td>{log.recorderName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-icon-btn danger"
                        onClick={() => handleDelete(log.id)}
                        title={lang === 'en' ? 'Delete' : 'Xóa'}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === 'en' ? 'Log Hazardous Waste & Container Disposal' : 'Ghi chép thu gom vỏ bao bì & Rác thải nguy hại'}
        style={{ maxWidth: '650px', width: '95vw' }}
      >
        <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date of collection' : 'Ngày thu gom'} *
              </label>
              <input
                className="ui-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Waste category' : 'Loại rác thải'} *
              </label>
              <select
                className="ui-select"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as HazardousWasteLog['wasteType'])}
              >
                <option value="pesticide_bottle">Vỏ chai/lọ thuốc BVTV</option>
                <option value="fertilizer_bag">Bao bì phân bón hóa học</option>
                <option value="chemical_packaging">Vỏ bao gói hóa chất nguy hại</option>
                <option value="other">Rác thải nguy hại khác</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Source plot or collection point' : 'Nguồn gốc phát sinh (Lô đất / Kho)'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              placeholder="VD: Lô A1 (sau đợt phun thuốc trừ sâu), Kho vật tư..."
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Quantity' : 'Số lượng'} *
              </label>
              <input
                className="ui-input"
                type="number"
                min="0.1"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Unit' : 'Đơn vị'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Storage or disposal method' : 'Hình thức lưu trữ / Xử lý'} *
            </label>
            <select
              className="ui-select"
              value={storageMethod}
              onChange={(e) => setStorageMethod(e.target.value as HazardousWasteLog['storageMethod'])}
            >
              <option value="secure_sealed_tank">Bể chứa bê tông kín có khóa nắp (Quy chuẩn VietGAP)</option>
              <option value="handed_over">Đã bàn giao đơn vị dịch vụ xử lý chất thải độc hại</option>
              <option value="temporary_bin">Thùng rác phân loại tạm thời tại đồng ruộng</option>
            </select>
          </div>

          {storageMethod === 'handed_over' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Disposal company' : 'Đơn vị tiếp nhận xử lý'} *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  required
                  placeholder="VD: Cty Môi trường Đô thị..."
                  value={disposalPartner}
                  onChange={(e) => setDisposalPartner(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Handover Doc No.' : 'Số biên bản bàn giao'} *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  required
                  placeholder="VD: BB-BG-2026/01"
                  value={handoverDocNo}
                  onChange={(e) => setHandoverDocNo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Recorder / Technical staff' : 'Người thực hiện / Ghi chép'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              value={recorderName}
              onChange={(e) => setRecorderName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Notes' : 'Ghi chú / Quy trình súc rửa'}
            </label>
            <textarea
              className="ui-input"
              rows={2}
              placeholder="Ghi chú thêm về việc súc rửa 3 lần hoặc vị trí bể chứa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit">
              {lang === 'en' ? 'Save record' : 'Lưu bản ghi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
