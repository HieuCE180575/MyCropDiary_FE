import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { Wrench, Plus, Settings2, Pencil } from 'lucide-react';
import {
  type FarmEquipmentResp,
  type EquipmentMaintenanceResp,
  fetchFarmEquipmentsApi,
  createFarmEquipmentApi,
  updateFarmEquipmentApi,
  deleteFarmEquipmentApi,
  fetchEquipmentMaintenancesApi,
  recordEquipmentMaintenanceApi,
  deleteEquipmentMaintenanceApi,
} from './vietgapRecordsService';

export type EquipmentMaintenanceLog = EquipmentMaintenanceResp;

interface EquipmentMaintenanceManagerProps {
  farmId: number;
  farmName: string;
  isOwner?: boolean;
}

export function EquipmentMaintenanceManager({ farmId, farmName, isOwner = false }: EquipmentMaintenanceManagerProps) {
  const { lang } = useLanguage();
  const [equipments, setEquipments] = useState<FarmEquipmentResp[]>([]);
  const [logs, setLogs] = useState<EquipmentMaintenanceResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('ALL');

  // Maintenance log modal state (Staff + Owner)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | ''>('');
  const [manualEquipmentName, setManualEquipmentName] = useState('');
  const [manualEquipmentCode, setManualEquipmentCode] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionType, setActionType] = useState<'rinse_cleaning' | 'calibration' | 'maintenance_repair'>('rinse_cleaning');
  const [rinseWaterHandling, setRinseWaterHandling] = useState<'holding_tank' | 'diluted_field' | 'special_pit'>('holding_tank');
  const [isSafeForUse, setIsSafeForUse] = useState(true);
  const [performerName, setPerformerName] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Equipment catalog modal state (Owner-only CUD)
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<FarmEquipmentResp | null>(null);
  const [savingEquip, setSavingEquip] = useState(false);
  const [equipCode, setEquipCode] = useState('');
  const [equipName, setEquipName] = useState('');
  const [equipType, setEquipType] = useState<'sprayer' | 'scale' | 'irrigation' | 'machinery' | 'other'>('sprayer');
  const [equipStatus, setEquipStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE');
  const [equipNotes, setEquipNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [eqList, logList] = await Promise.all([
        fetchFarmEquipmentsApi(farmId),
        fetchEquipmentMaintenancesApi(farmId),
      ]);
      setEquipments(eqList);
      setLogs(logList);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải dữ liệu thiết bị.');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --- Owner-only Equipment Catalog Handlers ---
  const openCreateEquipment = () => {
    setEditingEquipment(null);
    setEquipCode('');
    setEquipName('');
    setEquipType('sprayer');
    setEquipStatus('ACTIVE');
    setEquipNotes('');
    setErrorMsg(null);
    setIsEquipModalOpen(true);
  };

  const openEditEquipment = (eq: FarmEquipmentResp) => {
    setEditingEquipment(eq);
    setEquipCode(eq.equipmentCode);
    setEquipName(eq.equipmentName);
    setEquipType((eq.equipmentType as typeof equipType) || 'other');
    setEquipStatus((eq.status as typeof equipStatus) || 'ACTIVE');
    setEquipNotes(eq.notes || '');
    setErrorMsg(null);
    setIsEquipModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipCode.trim() || !equipName.trim()) return;
    setSavingEquip(true);
    setErrorMsg(null);
    try {
      const payload = {
        equipmentCode: equipCode.trim(),
        equipmentName: equipName.trim(),
        equipmentType: equipType,
        status: equipStatus,
        notes: equipNotes.trim() || undefined,
      };
      if (editingEquipment) {
        const updated = await updateFarmEquipmentApi(editingEquipment.equipmentId, payload);
        setEquipments((prev) => prev.map((item) => (item.equipmentId === updated.equipmentId ? updated : item)));
      } else {
        const created = await createFarmEquipmentApi(farmId, payload);
        setEquipments((prev) => [created, ...prev]);
      }
      setIsEquipModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu thiết bị.');
    } finally {
      setSavingEquip(false);
    }
  };

  const handleDeleteEquipment = async (eq: FarmEquipmentResp) => {
    const confirmMsg = lang === 'en'
      ? `Delete/deactivate equipment "${eq.equipmentName}"?`
      : `Xóa thiết bị "${eq.equipmentName}"? (Nếu đã có nhật ký bảo dưỡng, thiết bị sẽ chuyển sang trạng thái INACTIVE theo BR-20)`;
    if (!window.confirm(confirmMsg)) return;
    setErrorMsg(null);
    try {
      await deleteFarmEquipmentApi(eq.equipmentId);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể xóa thiết bị.');
    }
  };

  // --- Staff + Owner Maintenance Log Handlers ---
  const openLogModal = () => {
    const firstActive = equipments.find((e) => e.status === 'ACTIVE');
    setSelectedEquipmentId(firstActive ? firstActive.equipmentId : '');
    setManualEquipmentName('');
    setManualEquipmentCode('');
    setActionDate(new Date().toISOString().slice(0, 10));
    setActionType('rinse_cleaning');
    setRinseWaterHandling('holding_tank');
    setIsSafeForUse(true);
    setPerformerName('');
    setLogNotes('');
    setErrorMsg(null);
    setIsLogModalOpen(true);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!performerName.trim()) return;
    if (!selectedEquipmentId && !manualEquipmentName.trim()) return;

    setSavingLog(true);
    setErrorMsg(null);
    try {
      const created = await recordEquipmentMaintenanceApi(farmId, {
        equipmentId: selectedEquipmentId ? Number(selectedEquipmentId) : null,
        equipmentCode: !selectedEquipmentId ? manualEquipmentCode.trim() || undefined : undefined,
        equipmentName: !selectedEquipmentId ? manualEquipmentName.trim() : undefined,
        actionType,
        actionDate,
        performerName: performerName.trim(),
        rinseWaterHandling,
        isSafeForUse,
        notes: logNotes.trim() || undefined,
      });
      setLogs((prev) => [created, ...prev]);
      setIsLogModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể ghi nhận nhật ký thiết bị.');
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (maintenanceId: number) => {
    if (!window.confirm(lang === 'en' ? 'Delete this equipment maintenance log?' : 'Xóa bản ghi bảo dưỡng này?')) return;
    setErrorMsg(null);
    try {
      await deleteEquipmentMaintenanceApi(maintenanceId);
      setLogs((prev) => prev.filter((l) => l.maintenanceId !== maintenanceId));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể xóa bản ghi bảo dưỡng.');
    }
  };

  const filteredLogs = logs.filter((l) => (filterAction === 'ALL' ? true : l.actionType === filterAction));

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case 'sprayer': return lang === 'en' ? 'Sprayer' : 'Bình phun thuốc';
      case 'scale': return lang === 'en' ? 'Scale / Meter' : 'Cân / Dụng cụ đo';
      case 'irrigation': return lang === 'en' ? 'Irrigation System' : 'Hệ thống tưới';
      case 'machinery': return lang === 'en' ? 'Machinery' : 'Máy móc nông nghiệp';
      default: return lang === 'en' ? 'Other' : 'Thiết bị khác';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'rinse_cleaning': return lang === 'en' ? 'Sprayer Rinse / Cleaning' : 'Súc rửa vệ sinh bình phun';
      case 'calibration': return lang === 'en' ? 'Calibration' : 'Hiệu chuẩn cân / Dụng cụ đo';
      default: return lang === 'en' ? 'Maintenance / Repair' : 'Bảo dưỡng / Sửa chữa';
    }
  };

  const getRinseHandlingLabel = (val: string) => {
    switch (val) {
      case 'holding_tank': return lang === 'en' ? 'Holding tank' : 'Bể chứa quy định';
      case 'diluted_field': return lang === 'en' ? 'Diluted on field' : 'Pha loãng phun lại trên ruộng';
      case 'special_pit': return lang === 'en' ? 'Specialized pit' : 'Hố xử lý chuyên dụng';
      default: return val;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {/* SECTION 1: Farm Equipment Catalog (Owner CUD, Staff Read-only) */}
      <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={18} color="#047857" />
              {lang === 'en' ? 'Farm Equipment Catalog (UC-46)' : 'Danh mục thiết bị nông trại (UC-46)'}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
              {isOwner
                ? (lang === 'en' ? 'Farm Owner can add, edit, or deactivate farm equipment.' : 'Chủ trang trại quản lý danh mục bình phun, cân đo, hệ thống tưới và máy móc của trang trại.')
                : (lang === 'en' ? 'View farm equipment list (Only Farm Owner can add/edit/delete catalog).' : 'Danh sách thiết bị do Chủ trang trại quản lý (Nhân viên chỉ xem và chọn khi ghi nhật ký).')}
            </p>
          </div>
          {isOwner && (
            <Button variant="primary" onClick={openCreateEquipment}>
              <Plus size={16} />
              {lang === 'en' ? 'Add Equipment' : 'Thêm thiết bị'}
            </Button>
          )}
        </div>

        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Code' : 'Mã thiết bị'}</th>
                <th>{lang === 'en' ? 'Equipment Name' : 'Tên thiết bị'}</th>
                <th>{lang === 'en' ? 'Type' : 'Phân loại'}</th>
                <th>{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                <th>{lang === 'en' ? 'Notes' : 'Ghi chú'}</th>
                {isOwner && <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && equipments.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading equipment catalog...' : 'Đang tải danh mục thiết bị...'}
                  </td>
                </tr>
              ) : equipments.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No equipment registered yet.' : 'Chưa có thiết bị nào trong danh mục.'}
                  </td>
                </tr>
              ) : (
                equipments.map((eq) => (
                  <tr key={eq.equipmentId}>
                    <td><span className="vietgap-trace-code">{eq.equipmentCode}</span></td>
                    <td><strong>{eq.equipmentName}</strong></td>
                    <td>{getEquipmentTypeLabel(eq.equipmentType)}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: eq.status === 'ACTIVE' ? '#ecfdf5' : eq.status === 'MAINTENANCE' ? '#fffbeb' : '#f1f5f9',
                        color: eq.status === 'ACTIVE' ? '#047857' : eq.status === 'MAINTENANCE' ? '#b45309' : '#64748b',
                      }}>
                        {eq.status === 'ACTIVE' ? 'Đang sử dụng' : eq.status === 'MAINTENANCE' ? 'Đang bảo dưỡng' : 'Ngưng sử dụng'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>{eq.notes || '-'}</td>
                    {isOwner && (
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns" style={{ justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            onClick={() => openEditEquipment(eq)}
                            title={lang === 'en' ? 'Edit' : 'Chỉnh sửa'}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            onClick={() => void handleDeleteEquipment(eq)}
                            title={lang === 'en' ? 'Delete' : 'Xóa'}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Maintenance & Cleaning Logs (Staff + Owner) */}
      <div className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} color="#047857" />
            {lang === 'en' ? 'Equipment Maintenance & Cleaning Log (VietGAP 4.9)' : 'Sổ theo dõi vệ sinh, súc rửa bình phun & Bảo dưỡng thiết bị (Mục 4.9 VietGAP)'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'en'
              ? 'Track cleaning of chemical sprayers, scales calibration, and equipment maintenance for '
              : 'Ghi chép vệ sinh súc rửa bình xịt, kiểm chuẩn cân đóng gói và bảo dưỡng máy móc nông nghiệp cho '}
            <strong>{farmName}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={openLogModal}>
          <Plus size={16} />
          {lang === 'en' ? 'Log Maintenance / Cleaning' : 'Ghi chép bảo dưỡng / Vệ sinh'}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{lang === 'en' ? 'Filter by operation:' : 'Lọc thao tác:'}</span>
        <select
          className="ui-select"
          style={{ width: 'auto', padding: '6px 12px' }}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="ALL">{lang === 'en' ? 'All operations' : 'Tất cả hoạt động'}</option>
          <option value="rinse_cleaning">{lang === 'en' ? 'Sprayer Cleaning' : 'Súc rửa bình phun'}</option>
          <option value="calibration">{lang === 'en' ? 'Calibration' : 'Hiệu chuẩn cân/dụng cụ đo'}</option>
          <option value="maintenance_repair">{lang === 'en' ? 'Maintenance / Repair' : 'Bảo dưỡng / Sửa chữa'}</option>
        </select>
      </div>

      {/* Maintenance Log Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày thực hiện'}</th>
                <th>{lang === 'en' ? 'Equipment' : 'Thiết bị / Mã'}</th>
                <th>{lang === 'en' ? 'Action' : 'Hoạt động'}</th>
                <th>{lang === 'en' ? 'Rinse Water Handling' : 'Xử lý nước súc rửa'}</th>
                <th>{lang === 'en' ? 'Details / Result' : 'Nội dung chi tiết / Kiểm chuẩn'}</th>
                <th>{lang === 'en' ? 'Safety' : 'An toàn'}</th>
                <th>{lang === 'en' ? 'Performer' : 'Người thực hiện'}</th>
                {isOwner && <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Action' : 'Thao tác'}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading maintenance records...' : 'Đang tải nhật ký bảo dưỡng...'}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No equipment maintenance records found.' : 'Chưa có bản ghi bảo dưỡng thiết bị nào.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.maintenanceId}>
                    <td><strong>{formatDate(log.actionDate, lang)}</strong></td>
                    <td>
                      <strong>{log.equipmentName}</strong>
                      {log.equipmentCode && <div style={{ fontSize: '11px', color: '#64748b' }}>Mã: {log.equipmentCode}</div>}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: log.actionType === 'rinse_cleaning' ? '#e0f2fe' : '#fef3c7',
                        color: log.actionType === 'rinse_cleaning' ? '#0369a1' : '#b45309',
                      }}>
                        {getActionLabel(log.actionType)}
                      </span>
                    </td>
                    <td>{getRinseHandlingLabel(log.rinseWaterHandling)}</td>
                    <td style={{ maxWidth: '300px' }}>{log.notes || '-'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: log.isSafeForUse ? '#047857' : '#dc2626',
                      }}>
                        {log.isSafeForUse ? '✓ Đạt chuẩn' : '⚠️ Chưa đạt'}
                      </span>
                    </td>
                    <td>{log.performerName}</td>
                    {isOwner && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          onClick={() => void handleDeleteLog(log.maintenanceId)}
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

      {/* Modal 1: Owner-only Create/Edit Equipment */}
      <Modal
        open={isEquipModalOpen}
        onClose={() => setIsEquipModalOpen(false)}
        title={editingEquipment
          ? (lang === 'en' ? 'Edit Farm Equipment' : 'Cập nhật thiết bị nông trại')
          : (lang === 'en' ? 'Add Farm Equipment' : 'Thêm thiết bị vào danh mục')}
        style={{ maxWidth: '560px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleSaveEquipment(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Equipment Code' : 'Mã thiết bị'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                placeholder="VD: BP-01, CAN-02..."
                value={equipCode}
                onChange={(e) => setEquipCode(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Type' : 'Phân loại'} *
              </label>
              <select
                className="ui-select"
                value={equipType}
                onChange={(e) => setEquipType(e.target.value as typeof equipType)}
              >
                <option value="sprayer">Bình phun thuốc BVTV</option>
                <option value="scale">Cân điện tử / Dụng cụ đo</option>
                <option value="irrigation">Hệ thống tưới nhỏ giọt</option>
                <option value="machinery">Máy móc nông nghiệp</option>
                <option value="other">Thiết bị khác</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Equipment Name' : 'Tên thiết bị'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              placeholder="VD: Bình phun động cơ Honda WJR4025..."
              value={equipName}
              onChange={(e) => setEquipName(e.target.value)}
            />
          </div>

          {editingEquipment && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Status' : 'Trạng thái'}
              </label>
              <select
                className="ui-select"
                value={equipStatus}
                onChange={(e) => setEquipStatus(e.target.value as typeof equipStatus)}
              >
                <option value="ACTIVE">Đang sử dụng (ACTIVE)</option>
                <option value="MAINTENANCE">Đang bảo dưỡng (MAINTENANCE)</option>
                <option value="INACTIVE">Ngưng sử dụng (INACTIVE)</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Notes' : 'Ghi chú kỹ thuật'}
            </label>
            <textarea
              className="ui-input"
              rows={2}
              placeholder="Vị trí đặt thiết bị, thông số kỹ thuật..."
              value={equipNotes}
              onChange={(e) => setEquipNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsEquipModalOpen(false)} disabled={savingEquip}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={savingEquip}>
              {lang === 'en' ? 'Save Equipment' : 'Lưu thiết bị'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Staff + Owner Record Maintenance / Cleaning Log */}
      <Modal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={lang === 'en' ? 'Log Equipment Cleaning & Maintenance' : 'Ghi chép vệ sinh & Bảo dưỡng thiết bị'}
        style={{ maxWidth: '650px', width: '95vw' }}
      >
        <form onSubmit={(e) => void handleAddLog(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date' : 'Ngày thực hiện'} *
              </label>
              <input
                className="ui-input"
                type="date"
                required
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Activity type' : 'Hoạt động'} *
              </label>
              <select
                className="ui-select"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as typeof actionType)}
              >
                <option value="rinse_cleaning">Súc rửa vệ sinh bình phun thuốc</option>
                <option value="calibration">Hiệu chuẩn cân / Bút đo pH, EC</option>
                <option value="maintenance_repair">Bảo dưỡng định kỳ / Sửa chữa</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Select Equipment from Catalog' : 'Chọn thiết bị từ danh mục trang trại'}
            </label>
            <select
              className="ui-select"
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{lang === 'en' ? '-- Enter manually --' : '-- Nhập thủ công tên thiết bị --'}</option>
              {equipments.filter((eq) => eq.status !== 'INACTIVE').map((eq) => (
                <option key={eq.equipmentId} value={eq.equipmentId}>
                  [{eq.equipmentCode}] {eq.equipmentName}
                </option>
              ))}
            </select>
          </div>

          {!selectedEquipmentId && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Equipment Name' : 'Tên thiết bị / Dụng cụ'} *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  required
                  placeholder="VD: Bình phun thuốc Honda #01..."
                  value={manualEquipmentName}
                  onChange={(e) => setManualEquipmentName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Code (optional)' : 'Mã thiết bị'}
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder="VD: BP-01"
                  value={manualEquipmentCode}
                  onChange={(e) => setManualEquipmentCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Rinse Water Handling (BR-99)' : 'Xử lý nước súc rửa (BR-99)'} *
              </label>
              <select
                className="ui-select"
                value={rinseWaterHandling}
                onChange={(e) => setRinseWaterHandling(e.target.value as typeof rinseWaterHandling)}
              >
                <option value="holding_tank">Đổ vào bể chứa quy định</option>
                <option value="diluted_field">Pha loãng phun lại trên ruộng</option>
                <option value="special_pit">Hố xử lý chuyên dụng</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Safety status after action' : 'Tình trạng an toàn'} *
              </label>
              <select
                className="ui-select"
                value={isSafeForUse ? 'true' : 'false'}
                onChange={(e) => setIsSafeForUse(e.target.value === 'true')}
              >
                <option value="true">Đạt chuẩn an toàn / Sẵn sàng sử dụng</option>
                <option value="false">Chưa đạt / Cần kiểm tra khắc phục</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Technician / Performer' : 'Người thực hiện'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              placeholder="VD: Nguyễn Văn Minh"
              value={performerName}
              onChange={(e) => setPerformerName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Details / Calibration Result' : 'Nội dung chi tiết / Kết quả kiểm chuẩn'}
            </label>
            <textarea
              className="ui-input"
              rows={3}
              placeholder="Ghi rõ quá trình súc rửa 3 lần bằng nước sạch, kiểm tra đầu béc phun, sai số cân sau hiệu chuẩn..."
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsLogModalOpen(false)} disabled={savingLog}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary" type="submit" loading={savingLog}>
              {lang === 'en' ? 'Save record' : 'Lưu bản ghi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
