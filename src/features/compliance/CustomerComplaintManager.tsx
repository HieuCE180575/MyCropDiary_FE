import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { formatDate, formatNumber } from '../../shared/format/formatters';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { MessageSquareWarning, Plus } from 'lucide-react';

export interface CustomerComplaintLog {
  id: string;
  farmId: number;
  date: string;
  customerName: string; // Tên khách hàng / Đại lý phân phối
  phoneOrContact?: string;
  harvestLotCode: string; // Mã lô bị khiếu nại (để truy xuất ngược về nhật ký canh tác)
  complaintReason: string; // Nội dung khiếu nại: Dập nát, sâu bệnh, dư lượng...
  correctiveAction: string; // Biện pháp khắc phục: Đổi trả, bồi hoàn, rút kinh nghiệm
  recallStatus: 'no_recall_needed' | 'recalled' | 'investigating';
  recalledQuantity?: number;
  unit?: string;
  handlerName: string;
}

const STORAGE_KEY = 'mycropdiary_complaint_logs';

export function CustomerComplaintManager({ farmId, farmName }: { farmId: number; farmName: string }) {
  const { lang } = useLanguage();
  const [logs, setLogs] = useState<CustomerComplaintLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterRecall, setFilterRecall] = useState('ALL');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [phoneOrContact, setPhoneOrContact] = useState('');
  const [harvestLotCode, setHarvestLotCode] = useState('');
  const [complaintReason, setComplaintReason] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [recallStatus, setRecallStatus] = useState<CustomerComplaintLog['recallStatus']>('no_recall_needed');
  const [recalledQuantity, setRecalledQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('kg');
  const [handlerName, setHandlerName] = useState('Quản lý trang trại');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${farmId}`);
      if (raw) {
        setLogs(JSON.parse(raw));
      } else {
        const defaultLogs: CustomerComplaintLog[] = [
          {
            id: 'cp-1',
            farmId,
            date: '2026-04-02',
            customerName: 'Hệ thống Siêu thị Co.opmart Chi nhánh Cần Thơ',
            phoneOrContact: '0292.3838.xxx',
            harvestLotCode: 'LOT-2026-02',
            complaintReason: 'Một số quả dưa lưới bị trầy xước vỏ do quá trình vận chuyển xếp thùng.',
            correctiveAction: 'Đổi mới 20kg quả đạt chuẩn xuất khẩu loại 1 ngay trong ngày và gia cố đệm mút lót thùng.',
            recallStatus: 'recalled',
            recalledQuantity: 20,
            unit: 'kg',
            handlerName: 'Phan Quốc Việt',
          },
          {
            id: 'cp-2',
            farmId,
            date: '2026-04-18',
            customerName: 'Cửa hàng Thực phẩm Sạch An Nông',
            phoneOrContact: '0909.123.xxx',
            harvestLotCode: 'LOT-2026-03',
            complaintReason: 'Khách hàng thắc mắc về tem mã QR truy xuất nguồn gốc bị nhăn mờ.',
            correctiveAction: 'Đã gửi lại mã QR điện tử xác thực VietGAP và thay đổi loại giấy in tem chống thấm nước.',
            recallStatus: 'no_recall_needed',
            handlerName: 'Nguyễn Văn Minh',
          },
        ];
        setLogs(defaultLogs);
        localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(defaultLogs));
      }
    } catch {}
  }, [farmId]);

  const saveLogs = (newLogs: CustomerComplaintLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(`${STORAGE_KEY}_${farmId}`, JSON.stringify(newLogs));
    } catch {}
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !complaintReason.trim() || !correctiveAction.trim()) return;

    const newLog: CustomerComplaintLog = {
      id: `cp-${Date.now()}`,
      farmId,
      date,
      customerName: customerName.trim(),
      phoneOrContact: phoneOrContact.trim() || undefined,
      harvestLotCode: harvestLotCode.trim() || 'LOT-CHUNG',
      complaintReason: complaintReason.trim(),
      correctiveAction: correctiveAction.trim(),
      recallStatus,
      recalledQuantity: recalledQuantity ? Number(recalledQuantity) : undefined,
      unit: unit.trim(),
      handlerName: handlerName.trim(),
    };

    saveLogs([newLog, ...logs]);
    setIsModalOpen(false);
    // Reset Form
    setCustomerName('');
    setPhoneOrContact('');
    setHarvestLotCode('');
    setComplaintReason('');
    setCorrectiveAction('');
    setRecalledQuantity('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'en' ? 'Delete this complaint record?' : 'Xóa bản ghi khiếu nại này?')) {
      saveLogs(logs.filter((l) => l.id !== id));
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterRecall === 'ALL') return true;
    return l.recallStatus === filterRecall;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquareWarning size={20} color="#047857" />
            {lang === 'en' ? 'Customer Complaints & Product Recall Log (VietGAP 4.10)' : 'Sổ tiếp nhận khiếu nại khách hàng & Thu hồi sản phẩm (Mục 4.10 VietGAP)'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'en'
              ? 'Log customer feedback, corrective actions, and traceability batch recalls for '
              : 'Quy trình tiếp nhận xử lý phản ánh chất lượng, khắc phục sự cố và thu hồi nông sản trang trại '}
            <strong>{farmName}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          {lang === 'en' ? 'Log Customer Complaint' : 'Ghi nhận phản ánh / Thu hồi'}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{lang === 'en' ? 'Filter by recall status:' : 'Lọc trạng thái thu hồi:'}</span>
        <select
          className="ui-select"
          style={{ width: 'auto', padding: '6px 12px' }}
          value={filterRecall}
          onChange={(e) => setFilterRecall(e.target.value)}
        >
          <option value="ALL">{lang === 'en' ? 'All complaints' : 'Tất cả khiếu nại'}</option>
          <option value="recalled">{lang === 'en' ? 'Product Recalled' : 'Có phát sinh thu hồi'}</option>
          <option value="no_recall_needed">{lang === 'en' ? 'Resolved without recall' : 'Đã xử lý (Không cần thu hồi)'}</option>
          <option value="investigating">{lang === 'en' ? 'Under Investigation' : 'Đang điều tra nguyên nhân'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="zone-clean-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="ui-table-scroll" tabIndex={0}>
          <table className="ui-data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : 'Ngày tiếp nhận'}</th>
                <th>{lang === 'en' ? 'Customer / Buyer' : 'Khách hàng / Đại lý'}</th>
                <th>{lang === 'en' ? 'Batch Code' : 'Mã lô sản phẩm'}</th>
                <th>{lang === 'en' ? 'Issue / Complaint' : 'Nội dung phản ánh'}</th>
                <th>{lang === 'en' ? 'Corrective Action' : 'Biện pháp khắc phục'}</th>
                <th>{lang === 'en' ? 'Recall Status' : 'Thu hồi'}</th>
                <th>{lang === 'en' ? 'Handled By' : 'Người giải quyết'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No customer complaints recorded.' : 'Không có khiếu nại nào từ khách hàng.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{formatDate(log.date, lang)}</strong></td>
                    <td>
                      <strong>{log.customerName}</strong>
                      {log.phoneOrContact && <div style={{ fontSize: '11px', color: '#666' }}>SĐT: {log.phoneOrContact}</div>}
                    </td>
                    <td><span className="vietgap-trace-code">{log.harvestLotCode}</span></td>
                    <td style={{ maxWidth: '280px' }}>{log.complaintReason}</td>
                    <td style={{ maxWidth: '300px', color: '#047857' }}>{log.correctiveAction}</td>
                    <td>
                      {log.recallStatus === 'recalled' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                        }}>
                          ⚠️ Thu hồi {log.recalledQuantity ? `${formatNumber(log.recalledQuantity, lang)} ${log.unit}` : ''}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                        }}>
                          ✓ Không thu hồi
                        </span>
                      )}
                    </td>
                    <td>{log.handlerName}</td>
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
        title={lang === 'en' ? 'Log Customer Complaint & Product Recall' : 'Tiếp nhận khiếu nại khách hàng & Nhật ký thu hồi sản phẩm'}
        style={{ maxWidth: '650px', width: '95vw' }}
      >
        <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Date received' : 'Ngày tiếp nhận'} *
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
                {lang === 'en' ? 'Traceability Lot Code' : 'Mã lô thu hoạch bị sự cố'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                placeholder="VD: LOT-2026-01, GAP-VN-..."
                value={harvestLotCode}
                onChange={(e) => setHarvestLotCode(e.target.value)}
              />
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
                {lang === 'en' ? 'Contact phone' : 'Số điện thoại liên hệ'}
              </label>
              <input
                className="ui-input"
                type="text"
                placeholder="09xx..."
                value={phoneOrContact}
                onChange={(e) => setPhoneOrContact(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Complaint / Quality Issue' : 'Nội dung phản ánh sự cố chất lượng'} *
            </label>
            <textarea
              className="ui-input"
              rows={2}
              required
              placeholder="Mô tả chi tiết phản ánh của khách hàng: quả dập, phát hiện sâu hại, tem mờ..."
              value={complaintReason}
              onChange={(e) => setComplaintReason(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              {lang === 'en' ? 'Corrective action taken' : 'Biện pháp khắc phục & Giải quyết'} *
            </label>
            <textarea
              className="ui-input"
              rows={2}
              required
              placeholder="Biện pháp xử lý: đổi mới sản phẩm, bồi hoàn tiền, rà soát lại quy trình đóng gói..."
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Recall action' : 'Hình thức thu hồi sản phẩm'} *
              </label>
              <select
                className="ui-select"
                value={recallStatus}
                onChange={(e) => setRecallStatus(e.target.value as CustomerComplaintLog['recallStatus'])}
              >
                <option value="no_recall_needed">Đã khắc phục xong (Không cần thu hồi)</option>
                <option value="recalled">Thu hồi lô sản phẩm lỗi</option>
                <option value="investigating">Đang điều tra nguyên nhân</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {lang === 'en' ? 'Handler / Manager' : 'Người giải quyết'} *
              </label>
              <input
                className="ui-input"
                type="text"
                required
                value={handlerName}
                onChange={(e) => setHandlerName(e.target.value)}
              />
            </div>
          </div>

          {recallStatus === 'recalled' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Recalled quantity' : 'Khối lượng thu hồi'} *
                </label>
                <input
                  className="ui-input"
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="Khối lượng sản phẩm thu hồi..."
                  value={recalledQuantity}
                  onChange={(e) => setRecalledQuantity(e.target.value ? Number(e.target.value) : '')}
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
          )}

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
