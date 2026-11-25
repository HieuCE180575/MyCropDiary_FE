import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate, formatNumber } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { MessageSquareWarning, Plus, CheckCircle2, RotateCcw } from 'lucide-react';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import {
  type CustomerComplaintResp,
  fetchCustomerComplaintsApi,
  createCustomerComplaintApi,
  resolveCustomerComplaintApi,
  recordProductRecallApi,
  deleteCustomerComplaintApi,
} from './vietgapRecordsService';

export type CustomerComplaintLog = CustomerComplaintResp;

interface HarvestOption {
  harvestRecordId: number;
  harvestLotCode?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

interface CustomerComplaintManagerProps {
  farmId: number;
  farmName: string;
  isOwner?: boolean;
}

export function CustomerComplaintManager({ farmId, farmName, isOwner = false }: CustomerComplaintManagerProps) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<CustomerComplaintResp[]>([]);
  const [harvestOptions, setHarvestOptions] = useState<HarvestOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Create Complaint Modal (Staff + Owner)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedHarvestId, setSelectedHarvestId] = useState<number | ''>('');
  const [lotCode, setLotCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [issueType, setIssueType] = useState<'quality_defect' | 'chemical_residue_suspect' | 'packaging_damage' | 'other'>('quality_defect');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'critical'>('medium');
  const [issueDescription, setIssueDescription] = useState('');

  // UC-48.4 Resolve Complaint Modal (Owner-only)
  const [resolveTarget, setResolveTarget] = useState<CustomerComplaintResp | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'investigating' | 'resolved'>('resolved');
  const [resolveNotes, setResolveNotes] = useState('');
  const [savingResolve, setSavingResolve] = useState(false);

  // UC-48.5 Record Product Recall Modal (Owner-only)
  const [recallTarget, setRecallTarget] = useState<CustomerComplaintResp | null>(null);
  const [recalledQuantity, setRecalledQuantity] = useState<number | ''>('');
  const [recallNotes, setRecallNotes] = useState('');
  const [savingRecall, setSavingRecall] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [complaintList, harvestRes] = await Promise.all([
        fetchCustomerComplaintsApi(farmId),
        apiRequest<ApiResponse<{ items?: HarvestOption[]; content?: HarvestOption[] }>>(
          `/harvest-records?farmId=${farmId}&size=100`,
        ).catch(() => null),
      ]);
      setLogs(complaintList);
      const hList = harvestRes?.data?.items || harvestRes?.data?.content || [];
      setHarvestOptions(hList);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setSelectedHarvestId('');
    setLotCode('');
    setCustomerName('');
    setCustomerPhone('');
    setIssueType('quality_defect');
    setSeverity('medium');
    setIssueDescription('');
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !issueDescription.trim()) return;
    setSavingCreate(true);
    setErrorMsg(null);
    try {
      const created = await createCustomerComplaintApi(farmId, {
        harvestRecordId: selectedHarvestId ? Number(selectedHarvestId) : null,
        lotCode: lotCode.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        receivedDate,
        issueType,
        issueDescription: issueDescription.trim(),
        severity,
      });
      setLogs((prev) => [created, ...prev]);
      setIsCreateOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể ghi nhận khiếu nại.');
    } finally {
      setSavingCreate(false);
    }
  };

  const openResolveModal = (log: CustomerComplaintResp) => {
    setResolveTarget(log);
    setResolveStatus(log.status === 'investigating' ? 'investigating' : 'resolved');
    setResolveNotes(log.resolutionNotes || '');
    setErrorMsg(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget || !resolveNotes.trim()) return;
    setSavingResolve(true);
    setErrorMsg(null);
    try {
      const updated = await resolveCustomerComplaintApi(resolveTarget.complaintId, {
        status: resolveStatus,
        resolutionNotes: resolveNotes.trim(),
      });
      setLogs((prev) => prev.map((l) => (l.complaintId === updated.complaintId ? updated : l)));
      setResolveTarget(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể cập nhật phương án xử lý.');
    } finally {
      setSavingResolve(false);
    }
  };

  const openRecallModal = (log: CustomerComplaintResp) => {
    setRecallTarget(log);
    setRecalledQuantity(log.recalledQuantity ?? '');
    setRecallNotes(log.resolutionNotes || '');
    setErrorMsg(null);
  };

  const handleRecallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallTarget || !recalledQuantity || Number(recalledQuantity) <= 0 || !recallNotes.trim()) return;
    setSavingRecall(true);
    setErrorMsg(null);
    try {
      const updated = await recordProductRecallApi(recallTarget.complaintId, {
        recalledQuantity: Number(recalledQuantity),
        resolutionNotes: recallNotes.trim(),
      });
      setLogs((prev) => prev.map((l) => (l.complaintId === updated.complaintId ? updated : l)));
      setRecallTarget(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể ghi nhận thu hồi sản phẩm.');
    } finally {
      setSavingRecall(false);
    }
  };

  const handleDelete = async (complaintId: number) => {
    if (!window.confirm(lang === 'en' ? 'Delete this complaint record?' : 'Xóa hồ sơ khiếu nại này?')) return;
    setErrorMsg(null);
    try {
      await deleteCustomerComplaintApi(complaintId);
      setLogs((prev) => prev.filter((l) => l.complaintId !== complaintId));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể xóa hồ sơ khiếu nại.');
    }
  };

  const filteredLogs = logs.filter((l) => (filterStatus === 'ALL' ? true : l.status === filterStatus));

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'quality_defect': return lang === 'en' ? 'Quality Defect' : 'Lỗi chất lượng nông sản';
      case 'chemical_residue_suspect': return lang === 'en' ? 'Residue Suspect' : 'Nghi ngờ dư lượng BVTV';
      case 'packaging_damage': return lang === 'en' ? 'Packaging / Label' : 'Bao bì / Tem truy xuất';
      default: return lang === 'en' ? 'Other' : 'Phản ánh khác';
    }
  };

  const getSeverityBadge = (sev: string) => {
    if (sev === 'critical') {
      return <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>Nghiêm trọng</span>;
    }
    if (sev === 'medium') {
      return <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>Trung bình</span>;
    }
    return <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>Thấp</span>;
  };

  const getStatusBadge = (log: CustomerComplaintResp) => {
    if (log.status === 'recalled' || log.isRecallRequired) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
          ⚠️ Thu hồi {log.recalledQuantity ? `${formatNumber(log.recalledQuantity, lang)} ${log.harvestedUnit || 'kg'}` : ''}
        </span>
      );
    }
    if (log.status === 'resolved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          ✓ Đã giải quyết
        </span>
      );
    }
    if (log.status === 'investigating') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
          Đang điều tra
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
        Mới tiếp nhận
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
            <MessageSquareWarning size={20} color="#047857" />
            {lang === 'en' ? 'Customer Complaints & Product Recall Log (VietGAP 4.10)' : 'Sổ tiếp nhận khiếu nại khách hàng & Thu hồi sản phẩm (Mục 4.10 VietGAP)'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'en'
              ? 'Staff & Owner can log customer complaints; only Farm Owner can resolve complaints (UC-48.4) or record product recalls (UC-48.5, BR-100) for '
              : 'Nhân viên & Chủ trại ghi nhận khiếu nại; riêng Chủ trang trại duyệt giải quyết (UC-48.4) và thu hồi lô hàng (UC-48.5, BR-100) cho '}
            <strong>{farmName}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} />
          {lang === 'en' ? 'Log Customer Complaint' : 'Ghi nhận khiếu nại'}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{lang === 'en' ? 'Filter by status:' : 'Lọc trạng thái:'}</span>
        <select
          className="ui-select"
          style={{ width: 'auto', padding: '6px 12px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">{lang === 'en' ? 'All complaints' : 'Tất cả khiếu nại'}</option>
          <option value="received">{lang === 'en' ? 'Received' : 'Mới tiếp nhận'}</option>
          <option value="investigating">{lang === 'en' ? 'Investigating' : 'Đang điều tra'}</option>
          <option value="resolved">{lang === 'en' ? 'Resolved' : 'Đã giải quyết'}</option>
          <option value="recalled">{lang === 'en' ? 'Recalled' : 'Đã thu hồi lô'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày tiếp nhận'}</th>
                <th>{lang === 'en' ? 'Customer' : 'Khách hàng / Đại lý'}</th>
                <th>{lang === 'en' ? 'Lot Code' : 'Mã lô thu hoạch'}</th>
                <th>{lang === 'en' ? 'Issue & Severity' : 'Nội dung phản ánh'}</th>
                <th>{lang === 'en' ? 'Resolution Notes' : 'Phương án giải quyết'}</th>
                <th>{lang === 'en' ? 'Status / Recall' : 'Trạng thái / Thu hồi'}</th>
                {isOwner && <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Owner Actions' : 'Xử lý (Chủ trại)'}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading complaints...' : 'Đang tải danh sách khiếu nại...'}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No customer complaints recorded.' : 'Không có khiếu nại nào từ khách hàng.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.complaintId}>
                    <td><strong>{formatDate(log.receivedDate, lang)}</strong></td>
                    <td>
                      <strong>{log.customerName}</strong>
                      {log.customerPhone && <div style={{ fontSize: '11px', color: '#666' }}>SĐT: {log.customerPhone}</div>}
                    </td>
                    <td>
                      {log.lotCode ? <span className="vietgap-trace-code">{log.lotCode}</span> : <span style={{ color: '#888' }}>-</span>}
                      {log.harvestedQuantity != null && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Sản lượng lô: {formatNumber(log.harvestedQuantity, lang)} {log.harvestedUnit || 'kg'}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1' }}>{getIssueTypeLabel(log.issueType)}</span>
                        {getSeverityBadge(log.severity)}
                      </div>
                      <div>{log.issueDescription}</div>
                    </td>
                    <td style={{ maxWidth: '260px', color: log.resolutionNotes ? '#047857' : '#888' }}>
                      {log.resolutionNotes || (lang === 'en' ? 'Pending owner review' : 'Chờ Chủ trang trại xử lý')}
                    </td>
                    <td>{getStatusBadge(log)}</td>
                    {isOwner && (
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openResolveModal(log)}
                          title={lang === 'en' ? 'Resolve Complaint (UC-48.4)' : 'Giải quyết khiếu nại (UC-48.4)'}
                          style={{ marginRight: '6px', color: '#047857' }}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openRecallModal(log)}
                          title={lang === 'en' ? 'Record Product Recall (UC-48.5)' : 'Thu hồi lô sản phẩm (UC-48.5)'}
                          style={{ marginRight: '6px', color: '#b45309' }}
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          onClick={() => void handleDelete(log.complaintId)}
                          title={lang === 'en' ? 'Delete' : 'Xóa'}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Complaint (Staff + Owner) */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={lang === 'en' ? 'Log Customer Complaint' : 'Ghi nhận khiếu nại khách hàng mới'}
        style={{ maxWidth: '640px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleCreateComplaint(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date received' : 'Ngày tiếp nhận'} *
              </label>
              <input
                className="ui-input"
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Linked Harvest Lot (optional)' : 'Liên kết lô thu hoạch (khuyến nghị)'}
              </label>
              <select
                className="ui-select"
                value={selectedHarvestId}
                onChange={(e) => {
                  const idVal = e.target.value ? Number(e.target.value) : '';
                  setSelectedHarvestId(idVal);
                  const found = harvestOptions.find((h) => h.harvestRecordId === idVal);
                  if (found?.harvestLotCode) setLotCode(found.harvestLotCode);
                }}
              >
                <option value="">{lang === 'en' ? '-- Enter lot code manually --' : '-- Nhập mã lô thủ công --'}</option>
                {harvestOptions.map((h) => (
                  <option key={h.harvestRecordId} value={h.harvestRecordId}>
                    {h.harvestLotCode || `LOT-${h.harvestRecordId}`} ({h.quantity ?? 0} {h.unit || 'kg'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Traceability Lot Code' : 'Mã lô sản phẩm'}
              </label>
              <input
                className="ui-input"
                type="text"
                placeholder="VD: LOT-2026-01"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Issue Type' : 'Phân loại phản ánh'} *
              </label>
              <select
                className="ui-select"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as typeof issueType)}
              >
                <option value="quality_defect">Lỗi chất lượng nông sản</option>
                <option value="chemical_residue_suspect">Nghi ngờ dư lượng thuốc BVTV</option>
                <option value="packaging_damage">Lỗi bao bì / Tem truy xuất QR</option>
                <option value="other">Phản ánh khác</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Customer / Buyer name' : 'Tên khách hàng / Đơn vị mua'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                placeholder="VD: Siêu thị Co.opmart, Đại lý nông sản..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Contact phone' : 'Số điện thoại'}
              </label>
              <input
                className="ui-input"
                type="text"
                placeholder="09xx..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Severity' : 'Mức độ nghiêm trọng'} *
            </label>
            <select
              className="ui-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              <option value="low">Thấp (Phản ánh nhẹ / bao bì)</option>
              <option value="medium">Trung bình (Chất lượng sản phẩm)</option>
              <option value="critical">Nghiêm trọng (Nghi ngờ ATTP / Dư lượng)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Complaint Description' : 'Nội dung phản ánh chi tiết'} *
            </label>
            <textarea
              className="ui-input"
              rows={3}
              required
              placeholder="Mô tả chi tiết phản ánh của khách hàng..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} disabled={savingCreate}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={savingCreate}>
              {lang === 'en' ? 'Submit Complaint' : 'Ghi nhận khiếu nại'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: UC-48.4 Resolve Complaint (Owner-only) */}
      <Modal
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        title={lang === 'en' ? 'Resolve Customer Complaint (UC-48.4)' : 'Giải quyết khiếu nại khách hàng (UC-48.4)'}
        style={{ maxWidth: '560px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleResolveSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {resolveTarget && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', fontSize: '13px' }}>
              <strong>{resolveTarget.customerName}</strong> — Mã lô: <strong>{resolveTarget.lotCode || 'N/A'}</strong>
              <div style={{ color: '#475569', marginTop: '4px' }}>{resolveTarget.issueDescription}</div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Resolution Status' : 'Trạng thái xử lý'} *
            </label>
            <select
              className="ui-select"
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value as typeof resolveStatus)}
            >
              <option value="investigating">Đang điều tra nguyên nhân (investigating)</option>
              <option value="resolved">Đã giải quyết xong (resolved)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Corrective Action & Resolution Notes' : 'Biện pháp khắc phục & Kết quả xử lý'} *
            </label>
            <textarea
              className="ui-input"
              rows={3}
              required
              placeholder="Ghi rõ biện pháp khắc phục, bồi hoàn hoặc đổi trả cho khách hàng..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" type="button" onClick={() => setResolveTarget(null)} disabled={savingResolve}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={savingResolve}>
              {lang === 'en' ? 'Save Resolution' : 'Xác nhận xử lý'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: UC-48.5 Record Product Recall (Owner-only, BR-100) */}
      <Modal
        open={Boolean(recallTarget)}
        onClose={() => setRecallTarget(null)}
        title={lang === 'en' ? 'Record Product Recall (UC-48.5 / BR-100)' : 'Ghi nhận thu hồi lô sản phẩm (UC-48.5 / BR-100)'}
        style={{ maxWidth: '560px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleRecallSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {recallTarget && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '13px' }}>
              <strong>{recallTarget.customerName}</strong> — Mã lô: <strong>{recallTarget.lotCode || 'N/A'}</strong>
              {recallTarget.harvestedQuantity != null && (
                <div style={{ color: '#b91c1c', fontWeight: 600, marginTop: '4px' }}>
                  Giới hạn BR-100: Khối lượng thu hồi không được vượt quá sản lượng lô ({formatNumber(recallTarget.harvestedQuantity, lang)} {recallTarget.harvestedUnit || 'kg'}).
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Recalled Quantity' : `Khối lượng thu hồi (${recallTarget?.harvestedUnit || 'kg'})`} *
            </label>
            <input
              className="ui-input"
              type="number"
              min="0.01"
              max={recallTarget?.harvestedQuantity ?? undefined}
              step="any"
              required
              placeholder="Nhập số lượng sản phẩm thu hồi..."
              value={recalledQuantity}
              onChange={(e) => setRecalledQuantity(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Recall Procedure & Disposal Notes' : 'Phương án thu hồi & Xử lý lô hàng lỗi'} *
            </label>
            <textarea
              className="ui-input"
              rows={3}
              required
              placeholder="Ghi rõ quy trình thu hồi, tiêu hủy hoặc đổi trả lô hàng..."
              value={recallNotes}
              onChange={(e) => setRecallNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" type="button" onClick={() => setRecallTarget(null)} disabled={savingRecall}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={savingRecall}>
              {lang === 'en' ? 'Confirm Recall' : 'Xác nhận thu hồi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
