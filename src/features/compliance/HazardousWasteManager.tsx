import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate, formatNumber } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { Trash2, Plus, Pencil } from 'lucide-react';
import {
  type HazardousWasteResp,
  fetchHazardousWastesApi,
  createHazardousWasteApi,
  updateHazardousWasteApi,
  deleteHazardousWasteApi,
} from './vietgapRecordsService';

export type HazardousWasteLog = HazardousWasteResp;

export function HazardousWasteManager({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<HazardousWasteResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<HazardousWasteResp | null>(null);
  const [filterType, setFilterType] = useState('ALL');

  // Form State
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [wasteType, setWasteType] = useState<'pesticide_bottle' | 'fertilizer_pack' | 'medical' | 'other'>('pesticide_bottle');
  const [quantity, setQuantity] = useState<number | ''>(5);
  const [unit, setUnit] = useState('vỏ chai');
  const [disposalMethod, setDisposalMethod] = useState<'store_holding' | 'transfer_contractor' | 'incinerate_farm'>('store_holding');
  const [contractorName, setContractorName] = useState('');
  const [handoverReceiptNo, setHandoverReceiptNo] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [notes, setNotes] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchHazardousWastesApi(farmId);
      setLogs(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải nhật ký rác thải.');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const openCreateModal = () => {
    setEditingLog(null);
    setCollectionDate(new Date().toISOString().slice(0, 10));
    setWasteType('pesticide_bottle');
    setQuantity(5);
    setUnit('vỏ chai');
    setDisposalMethod('store_holding');
    setContractorName('');
    setHandoverReceiptNo('');
    setCollectorName('');
    setNotes('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (log: HazardousWasteResp) => {
    setEditingLog(log);
    setCollectionDate(log.collectionDate);
    setWasteType((log.wasteType as typeof wasteType) || 'other');
    setQuantity(log.quantity);
    setUnit(log.unit);
    setDisposalMethod((log.disposalMethod as typeof disposalMethod) || 'store_holding');
    setContractorName(log.contractorName || '');
    setHandoverReceiptNo(log.handoverReceiptNo || '');
    setCollectorName(log.collectorName);
    setNotes(log.notes || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0 || !collectorName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        wasteType,
        quantity: Number(quantity),
        unit: unit.trim(),
        collectionDate,
        disposalMethod,
        contractorName: disposalMethod === 'transfer_contractor' ? contractorName.trim() : undefined,
        handoverReceiptNo: disposalMethod === 'transfer_contractor' ? handoverReceiptNo.trim() : undefined,
        collectorName: collectorName.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingLog) {
        const updated = await updateHazardousWasteApi(editingLog.wasteLogId, payload);
        setLogs((prev) => prev.map((l) => (l.wasteLogId === updated.wasteLogId ? updated : l)));
      } else {
        const created = await createHazardousWasteApi(farmId, payload);
        setLogs((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu bản ghi rác thải.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (wasteLogId: number) => {
    if (!window.confirm(lang === 'en' ? 'Delete this hazardous waste log?' : 'Xóa bản ghi nhật ký thu gom rác này?')) return;
    setErrorMsg(null);
    try {
      await deleteHazardousWasteApi(wasteLogId);
      setLogs((prev) => prev.filter((l) => l.wasteLogId !== wasteLogId));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể xóa bản ghi rác thải.');
    }
  };

  const filteredLogs = logs.filter((l) => (filterType === 'ALL' ? true : l.wasteType === filterType));

  const getWasteTypeLabel = (type: string) => {
    switch (type) {
      case 'pesticide_bottle': return lang === 'en' ? 'Pesticide Bottles' : 'Vỏ chai/lọ thuốc BVTV';
      case 'fertilizer_pack': return lang === 'en' ? 'Fertilizer Packaging' : 'Bao bì phân bón hóa học';
      case 'medical': return lang === 'en' ? 'Medical / Lab Waste' : 'Rác y tế / Kiểm nghiệm';
      default: return lang === 'en' ? 'Other hazardous waste' : 'Rác thải nguy hại khác';
    }
  };

  const getDisposalBadge = (method: string) => {
    if (method === 'transfer_contractor') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          ✓ {lang === 'en' ? 'Transferred to contractor' : 'Đã bàn giao đơn vị xử lý'}
        </span>
      );
    }
    if (method === 'incinerate_farm') {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
          {lang === 'en' ? 'On-farm processing' : 'Xử lý tại trang trại'}
        </span>
      );
    }
    return (
      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
        ⚠️ {lang === 'en' ? 'Stored in holding tank' : 'Lưu trữ bể chứa có nắp khóa'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} color="#047857" />
            {lang === 'en' ? 'Hazardous Waste & Pesticide Packaging Log (VietGAP 4.8)' : 'Sổ theo dõi thu gom rác & Vỏ bao bì thuốc BVTV (Mục 4.8 VietGAP)'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'en'
              ? 'Record collection, triple rinsing, and safe disposal/handover of chemical waste containers for '
              : 'Ghi chép thu gom, súc rửa 3 lần và lưu trữ/bàn giao xử lý chất thải nguy hại (UC-47, BR-98) cho '}
            <strong>{farmName}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
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
          <option value="fertilizer_pack">{lang === 'en' ? 'Fertilizer Packaging' : 'Bao bì phân bón'}</option>
          <option value="medical">{lang === 'en' ? 'Medical Waste' : 'Rác y tế / Kiểm nghiệm'}</option>
          <option value="other">{lang === 'en' ? 'Other' : 'Rác thải nguy hại khác'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày thu gom'}</th>
                <th>{lang === 'en' ? 'Waste Category' : 'Phân loại rác'}</th>
                <th>{lang === 'en' ? 'Quantity' : 'Số lượng'}</th>
                <th>{lang === 'en' ? 'Disposal Status' : 'Hình thức lưu trữ / Xử lý'}</th>
                <th>{lang === 'en' ? 'Disposal Unit / Receipt #' : 'Đơn vị nhận / Số biên bản'}</th>
                <th>{lang === 'en' ? 'Collector' : 'Người thực hiện'}</th>
                <th>{lang === 'en' ? 'Notes' : 'Ghi chú'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading hazardous waste records...' : 'Đang tải nhật ký rác thải...'}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No hazardous waste records logged yet.' : 'Chưa có bản ghi thu gom rác thải nguy hại nào.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.wasteLogId}>
                    <td><strong>{formatDate(log.collectionDate, lang)}</strong></td>
                    <td><span style={{ fontWeight: 600 }}>{getWasteTypeLabel(log.wasteType)}</span></td>
                    <td><strong style={{ color: '#b91c1c' }}>{formatNumber(log.quantity, lang)} {log.unit}</strong></td>
                    <td>{getDisposalBadge(log.disposalMethod)}</td>
                    <td>
                      {log.contractorName ? (
                        <div>
                          <strong>{log.contractorName}</strong>
                          {log.handoverReceiptNo && <div style={{ fontSize: '11px', color: '#047857' }}>Số BB: {log.handoverReceiptNo}</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#888' }}>Lưu tại bể chứa</span>
                      )}
                    </td>
                    <td>{log.collectorName}</td>
                    <td style={{ maxWidth: '220px' }}>{log.notes || '-'}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div className="table-action-btns" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          onClick={() => openEditModal(log)}
                          title={lang === 'en' ? 'Edit' : 'Cập nhật'}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          onClick={() => void handleDelete(log.wasteLogId)}
                          title={lang === 'en' ? 'Delete' : 'Xóa'}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLog
          ? (lang === 'en' ? 'Update Hazardous Waste Record' : 'Cập nhật nhật ký rác thải nguy hại')
          : (lang === 'en' ? 'Log Hazardous Waste & Container Disposal' : 'Ghi chép thu gom vỏ bao bì & Rác thải nguy hại')}
        style={{ maxWidth: '650px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date of collection' : 'Ngày thu gom'} *
              </label>
              <input
                className="ui-input"
                type="date"
                required
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Waste category' : 'Loại rác thải'} *
              </label>
              <select
                className="ui-select"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as typeof wasteType)}
              >
                <option value="pesticide_bottle">Vỏ chai/lọ thuốc BVTV</option>
                <option value="fertilizer_pack">Bao bì phân bón hóa học</option>
                <option value="medical">Rác thải y tế / kiểm nghiệm</option>
                <option value="other">Rác thải nguy hại khác</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Quantity' : 'Số lượng'} *
              </label>
              <input
                className="ui-input"
                type="number"
                min="0.01"
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
              value={disposalMethod}
              onChange={(e) => setDisposalMethod(e.target.value as typeof disposalMethod)}
            >
              <option value="store_holding">Lưu trữ bể chứa bê tông kín có khóa nắp (Quy chuẩn VietGAP)</option>
              <option value="transfer_contractor">Đã bàn giao đơn vị dịch vụ xử lý chất thải độc hại (BR-98)</option>
              <option value="incinerate_farm">Xử lý tại trang trại theo quy định</option>
            </select>
          </div>

          {disposalMethod === 'transfer_contractor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Disposal contractor (BR-98)' : 'Đơn vị tiếp nhận xử lý (BR-98)'} *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  required
                  placeholder="VD: Cty Môi trường Đô thị..."
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Handover Receipt No. (BR-98)' : 'Số biên bản bàn giao (BR-98)'} *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  required
                  placeholder="VD: BB-BG-2026/01"
                  value={handoverReceiptNo}
                  onChange={(e) => setHandoverReceiptNo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Collector / Technical staff' : 'Người thực hiện / Ghi chép'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              placeholder="VD: Nguyễn Văn Minh"
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Notes / Source location' : 'Ghi chú / Khu vực phát sinh & Quy trình súc rửa'}
            </label>
            <textarea
              className="ui-input"
              rows={2}
              placeholder="VD: Lô A1 - Đã súc rửa 3 lần theo quy định VietGAP và lưu vào bể chứa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={saving}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {lang === 'en' ? 'Save record' : 'Lưu bản ghi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
