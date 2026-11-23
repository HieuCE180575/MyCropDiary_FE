import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { Wrench, Plus } from 'lucide-react';

export interface EquipmentMaintenanceLog {
  id: string;
  farmId: number;
  date: string;
  equipmentName: string; // Tên thiết bị: Bình phun thuốc, Cân điện tử, Bút đo pH...
  actionType: 'cleaning_sprayer' | 'calibration' | 'routine_maintenance' | 'repair';
  conditionStatus: 'good' | 'repaired' | 'needs_replacement';
  technicianName: string;
  details: string; // Nội dung súc rửa, sai số hiệu chuẩn...
}

const STORAGE_KEY = 'mycropdiary_equipment_logs';

export function EquipmentMaintenanceManager({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<EquipmentMaintenanceLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterAction, setFilterAction] = useState('ALL');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [equipmentName, setEquipmentName] = useState('Bình phun thuốc sâu động cơ #01');
  const [actionType, setActionType] = useState<EquipmentMaintenanceLog['actionType']>('cleaning_sprayer');
  const [conditionStatus, setConditionStatus] = useState<EquipmentMaintenanceLog['conditionStatus']>('good');
  const [technicianName, setTechnicianName] = useState('Kỹ thuật viên trang trại');
  const [details, setDetails] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${farmId}`);
      if (raw) {
        setLogs(JSON.parse(raw));
      } else {
        const defaultLogs: EquipmentMaintenanceLog[] = [
          {
            id: 'eq-1',
            farmId,
            date: '2026-03-29',
            equipmentName: 'Bình phun thuốc trừ sâu đeo vai Honda WJR4025',
            actionType: 'cleaning_sprayer',
            conditionStatus: 'good',
            technicianName: 'Lê Văn Toàn',
            details: 'Súc rửa sạch sẽ vòi phun và bình chứa bằng nước sạch sau khi phun thuốc trừ nấm tại Lô A1. Nước rửa được đổ vào bể chứa quy định.',
          },
          {
            id: 'eq-2',
            farmId,
            date: '2026-04-05',
            equipmentName: 'Cân điện tử bàn 150kg (Khu sơ chế thu hoạch)',
            actionType: 'calibration',
            conditionStatus: 'good',
            technicianName: 'Nguyễn Văn Minh',
            details: 'Hiệu chuẩn quả cân chuẩn 20kg. Sai số thực tế 0.01kg (Đạt chuẩn dung sai cho phép VietGAP phục vụ cân đóng gói).',
          },
        ];
        setLogs(defaultLogs);
        localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(defaultLogs));
      }
    } catch {}
  }, [farmId]);

  const saveLogs = (newLogs: EquipmentMaintenanceLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(newLogs));
    } catch {}
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentName.trim() || !details.trim()) return;

    const newLog: EquipmentMaintenanceLog = {
      id: `eq-${Date.now()}`,
      farmId,
      date,
      equipmentName: equipmentName.trim(),
      actionType,
      conditionStatus,
      technicianName: technicianName.trim(),
      details: details.trim(),
    };

    saveLogs([newLog, ...logs]);
    setIsModalOpen(false);
    setDetails('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'en' ? 'Delete this equipment log?' : 'Xóa bản ghi bảo dưỡng này?')) {
      saveLogs(logs.filter((l) => l.id !== id));
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction === 'ALL') return true;
    return l.actionType === filterAction;
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'cleaning_sprayer':
        return lang === 'en' ? 'Rinsing/Cleaning Sprayer' : 'Súc rửa vệ sinh bình phun thuốc';
      case 'calibration':
        return lang === 'en' ? 'Measuring Calibration' : 'Hiệu chuẩn cân / Bút đo';
      case 'routine_maintenance':
        return lang === 'en' ? 'Routine Maintenance' : 'Bảo dưỡng định kỳ / Thay thế phụ tùng';
      default:
        return lang === 'en' ? 'Repair' : 'Sửa chữa thiết bị';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
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
          <option value="cleaning_sprayer">{lang === 'en' ? 'Sprayer Cleaning' : 'Súc rửa bình phun'}</option>
          <option value="calibration">{lang === 'en' ? 'Calibration' : 'Hiệu chuẩn cân/dụng cụ đo'}</option>
          <option value="routine_maintenance">{lang === 'en' ? 'Maintenance' : 'Bảo dưỡng định kỳ'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày thực hiện'}</th>
                <th>{lang === 'en' ? 'Equipment Name' : 'Tên thiết bị / Dụng cụ'}</th>
                <th>{lang === 'en' ? 'Action / Service' : 'Hoạt động thực hiện'}</th>
                <th>{lang === 'en' ? 'Details / Calibration Log' : 'Nội dung chi tiết / Kết quả kiểm chuẩn'}</th>
                <th>{lang === 'en' ? 'Status' : 'Tình trạng'}</th>
                <th>{lang === 'en' ? 'Technician' : 'Người thực hiện'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No equipment maintenance records found.' : 'Chưa có bản ghi bảo dưỡng thiết bị nào.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{formatDate(log.date, lang)}</strong></td>
                    <td><strong>{log.equipmentName}</strong></td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: log.actionType === 'cleaning_sprayer' ? '#e0f2fe' : '#fef3c7',
                        color: log.actionType === 'cleaning_sprayer' ? '#0369a1' : '#b45309',
                      }}>
                        {getActionLabel(log.actionType)}
                      </span>
                    </td>
                    <td style={{ maxWidth: '350px' }}>{log.details}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: log.conditionStatus === 'good' ? '#047857' : '#dc2626',
                      }}>
                        {log.conditionStatus === 'good' ? '✓ Đạt chuẩn' : '⚠️ Cần kiểm tra'}
                      </span>
                    </td>
                    <td>{log.technicianName}</td>
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

      {/* Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === 'en' ? 'Log Equipment Cleaning & Maintenance' : 'Ghi chép vệ sinh & Bảo dưỡng thiết bị'}
        style={{ maxWidth: '650px', width: '95vw' }}
      >
        <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date' : 'Ngày thực hiện'} *
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
                {lang === 'en' ? 'Activity type' : 'Hoạt động'} *
              </label>
              <select
                className="ui-select"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as EquipmentMaintenanceLog['actionType'])}
              >
                <option value="cleaning_sprayer">Súc rửa vệ sinh bình phun thuốc</option>
                <option value="calibration">Hiệu chuẩn cân / Bút đo pH, EC</option>
                <option value="routine_maintenance">Bảo dưỡng định kỳ / Thay thế phụ tùng</option>
                <option value="repair">Sửa chữa hỏng hóc</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Equipment Name / Model' : 'Tên thiết bị / Dụng cụ'} *
            </label>
            <input
              className="ui-input"
              type="text"
              required
              placeholder="VD: Bình phun thuốc trừ sâu Honda #01, Cân điện tử 100kg..."
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Details of cleaning or calibration result' : 'Nội dung chi tiết / Kết quả kiểm chuẩn'} *
            </label>
            <textarea
              className="ui-input"
              rows={3}
              required
              placeholder="Ghi rõ quá trình súc rửa bằng nước sạch, kiểm tra đầu béc phun, sai số cân sau hiệu chuẩn..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Condition after action' : 'Tình trạng thiết bị'} *
              </label>
              <select
                className="ui-select"
                value={conditionStatus}
                onChange={(e) => setConditionStatus(e.target.value as EquipmentMaintenanceLog['conditionStatus'])}
              >
                <option value="good">Hoạt động tốt / Đạt chuẩn VietGAP</option>
                <option value="repaired">Đã khắc phục xong lỗi</option>
                <option value="needs_replacement">Cần thay mới phụ tùng</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Technician / Operator' : 'Người thực hiện'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
              />
            </div>
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
