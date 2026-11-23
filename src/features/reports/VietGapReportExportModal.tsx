import React, { useState } from 'react';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { fetchCropSeasonDetail, fetchBlocksInSeason, type CropSeasonResp, type CropSeasonBlockResp } from '../operations/cropSeasonService';
import { fetchInputPurchases, type InputPurchaseItem } from '../operations/procurementService';
import { formatNumber } from '../../shared/format/formatters';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Printer } from 'lucide-react';
import type { HazardousWasteLog } from '../compliance/HazardousWasteManager';
import type { EquipmentMaintenanceLog } from '../compliance/EquipmentMaintenanceManager';
import type { CustomerComplaintLog } from '../compliance/CustomerComplaintManager';
import '../../styles/vietgap-report-print.css';

interface VietGapReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: number;
  farmName: string;
  farmAddress?: string | null;
  cropSeasonId: number;
  seasonName: string;
}

interface FarmingActivity {
  id: number;
  farmingActivityId?: number;
  cropSeasonId: number;
  blockId?: number | null;
  blockName?: string | null;
  activityType: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
  description?: string;
  resultNotes?: string;
  weatherNotes?: string;
  recorderFullName?: string;
  supervisorFullName?: string;
}

interface MaterialUsageItem {
  materialUsageId: number;
  farmingActivityId?: number;
  activityName?: string;
  materialName: string;
  materialType?: string;
  usedAt: string;
  quantity: number;
  unit: string;
  dosage?: string | null;
  method?: string | null;
  safetyIntervalDays?: number | null;
  recorderFullName?: string | null;
  notes?: string | null;
}

interface HarvestItem {
  harvestRecordId: number;
  cropSeasonId: number;
  blockName?: string | null;
  harvestLotCode: string | null;
  harvestedAt: string;
  quantity: number;
  discardedQuantity?: number | null;
  unit: string;
  qualityGrade: string | null;
  storageLocation: string | null;
  traceabilityCode: string | null;
  recorderFullName?: string | null;
  notes?: string | null;
}

export function VietGapReportExportModal({
  isOpen,
  onClose,
  farmId,
  farmName,
  farmAddress,
  cropSeasonId,
  seasonName,
}: VietGapReportExportModalProps) {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [seasonDetail, setSeasonDetail] = useState<CropSeasonResp | null>(null);
  const [blocks, setBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [activities, setActivities] = useState<FarmingActivity[]>([]);
  const [materialUsages, setMaterialUsages] = useState<MaterialUsageItem[]>([]);
  const [purchases, setPurchases] = useState<InputPurchaseItem[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestItem[]>([]);
  const [wasteLogs, setWasteLogs] = useState<HazardousWasteLog[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentMaintenanceLog[]>([]);
  const [complaintLogs, setComplaintLogs] = useState<CustomerComplaintLog[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [seasonRes, blocksRes, actRes, matRes, purRes, harvRes] = await Promise.all([
        fetchCropSeasonDetail(cropSeasonId).catch(() => null),
        fetchBlocksInSeason(cropSeasonId).catch(() => []),
        apiRequest<ApiResponse<{ items?: FarmingActivity[]; content?: FarmingActivity[] }>>(
          `/farming-activities?cropSeasonId=${cropSeasonId}&size=200`
        ).catch(() => null),
        apiRequest<ApiResponse<{ items?: MaterialUsageItem[]; content?: MaterialUsageItem[] }>>(
          `/material-usages?cropSeasonId=${cropSeasonId}&size=200`
        ).catch(() => null),
        fetchInputPurchases(farmId).catch(() => []),
        apiRequest<ApiResponse<{ items?: HarvestItem[]; content?: HarvestItem[] }>>(
          `/harvest-records?cropSeasonId=${cropSeasonId}&size=200`
        ).catch(() => null),
      ]);

      setSeasonDetail(seasonRes);
      setBlocks(blocksRes || []);
      
      const actList = actRes?.data?.items || actRes?.data?.content || [];
      setActivities(actList);

      const matList = matRes?.data?.items || matRes?.data?.content || [];
      setMaterialUsages(matList);

      setPurchases(purRes || []);

      const harvList = harvRes?.data?.items || harvRes?.data?.content || [];
      setHarvestRecords(harvList);

      // Load VietGAP 4.8, 4.9, 4.10 compliance logs from storage
      try {
        const rawWaste = localStorage.getItem(`mycropdiary_hazardous_waste_logs_${farmId}`);
        if (rawWaste) setWasteLogs(JSON.parse(rawWaste));
        const rawEq = localStorage.getItem(`mycropdiary_equipment_logs_${farmId}`);
        if (rawEq) setEquipmentLogs(JSON.parse(rawEq));
        const rawCp = localStorage.getItem(`mycropdiary_complaint_logs_${farmId}`);
        if (rawCp) setComplaintLogs(JSON.parse(rawCp));
      } catch {}

      setDataLoaded(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && cropSeasonId) {
      void loadAllData();
    }
  }, [isOpen, cropSeasonId]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Format date DD/MM/YYYY helper
  const formatDdMmYyyy = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Associate material usage with activities
  const materialsByActivityId = new Map<number, MaterialUsageItem[]>();
  materialUsages.forEach((m) => {
    if (m.farmingActivityId) {
      const arr = materialsByActivityId.get(m.farmingActivityId) || [];
      arr.push(m);
      materialsByActivityId.set(m.farmingActivityId, arr);
    }
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={(lang === 'en' ? "VietGAP Cultivation Diary & Compliance Dossier (TCVN 11892-1:2017)" : "Hồ sơ Nhật ký Canh tác & Đánh giá Tiêu chuẩn VietGAP (TCVN 11892-1:2017)")}
      style={{ maxWidth: '1000px', width: '95vw' }}
    >
      <div className="vietgap-modal-actions no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            {(lang === 'en' ? "Close" : "Đóng")}
          </Button>
          <Button variant="primary" onClick={handlePrint} disabled={loading || !dataLoaded}>
            <Printer size={16} />
            {(lang === 'en' ? "Print Dossier / Save as PDF (A4)" : "In Hồ sơ / Lưu file PDF (A4)")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-muted)' }}>
          <p>{(lang === 'en' ? "Loading full seasonal records, material logs, and traceability batches..." : "Đang trích xuất toàn bộ dữ liệu vụ canh tác, nhật ký vật tư và mẻ thu hoạch...")}</p>
        </div>
      ) : (
        <div className="vietgap-print-document" id="vietgap-print-area">
          {/* HEADER SECTION */}
          <div className="vietgap-doc-header">
            <div className="vietgap-national-header">
              <p className="vietgap-motto-top">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="vietgap-motto-bottom">Độc lập - Tự do - Hạnh phúc</p>
              <div className="vietgap-divider-line" />
            </div>

            <div className="vietgap-doc-title-block">
              <h1 className="vietgap-main-title">SỔ NHẬT KÝ CANH TÁC & TRUY XUẤT NGUỒN GỐC VIETGAP</h1>
              <p className="vietgap-sub-title">(Theo Tiêu chuẩn Quốc gia TCVN 11892-1:2017 - Quy trình thực hành nông nghiệp tốt VietGAP)</p>
            </div>
          </div>

          {/* SECTION 1: THÔNG TIN VÙNG TRỒNG & VỤ CANH TÁC */}
          <div className="vietgap-section">
            <h2 className="vietgap-section-title">PHẦN I. THÔNG TIN CƠ SỞ & VỤ CANH TÁC</h2>
            <table className="vietgap-info-table">
              <tbody>
                <tr>
                  <td className="info-label" style={{ width: '22%' }}>Tên cơ sở / Trang trại:</td>
                  <td className="info-value" style={{ width: '28%', fontWeight: 700 }}>{farmName}</td>
                  <td className="info-label" style={{ width: '22%' }}>Người phụ trách kỹ thuật:</td>
                  <td className="info-value" style={{ width: '28%' }}>{seasonDetail?.createdByFullName || 'Ban Quản trị Trang trại'}</td>
                </tr>
                <tr>
                  <td className="info-label">Địa chỉ vùng trồng:</td>
                  <td className="info-value" colSpan={3}>{farmAddress || 'Khu sản xuất nông nghiệp công nghệ cao VietGAP'}</td>
                </tr>
                <tr>
                  <td className="info-label">Vụ canh tác:</td>
                  <td className="info-value" style={{ fontWeight: 650 }}>{seasonName}</td>
                  <td className="info-label">Cây trồng & Giống:</td>
                  <td className="info-value">{seasonDetail?.cropCategoryName || 'Cây trồng theo mùa vụ'}</td>
                </tr>
                <tr>
                  <td className="info-label">Thời gian vụ mùa:</td>
                  <td className="info-value">
                    {formatDdMmYyyy(seasonDetail?.startDate)} đến {formatDdMmYyyy(seasonDetail?.endDate) || 'Đang canh tác'}
                  </td>
                  <td className="info-label">Trạng thái mùa vụ:</td>
                  <td className="info-value">
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{seasonDetail?.seasonStatus || 'Đang thực hiện'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="info-label">Danh sách Lô / Thửa:</td>
                  <td className="info-value" colSpan={3}>
                    {blocks.length === 0 ? (
                      'Tất cả các lô thuộc cơ sở'
                    ) : (
                      <div className="vietgap-blocks-summary">
                        {blocks.map((b, idx) => (
                          <span key={b.blockId} className="vietgap-block-badge">
                            {idx + 1}. {b.blockName || `Lô #${b.blockId}`} {b.zoneName ? `(${b.zoneName})` : ''} - Diện tích: {b.plantedArea || b.blockArea || 'N/A'} {b.areaUnit || b.blockAreaUnit || 'm²'}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 2: NHẬT KÝ CANH TÁC & BẢO VỆ THỰC VẬT */}
          <div className="vietgap-section">
            <h2 className="vietgap-section-title">PHẦN II. NHẬT KÝ CANH TÁC & SỬ DỤNG VẬT TƯ NÔNG NGHIỆP</h2>
            <p className="vietgap-section-note">
              * Ghi chép chi tiết các công việc làm đất, xuống giống, tưới nước, bón phân và phòng trừ sâu bệnh. Với thuốc BVTV / phân bón, bắt buộc ghi rõ nồng độ, lý do và thời gian cách ly (PHI).
            </p>
            <table className="vietgap-data-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>STT</th>
                  <th style={{ width: '10%' }}>Ngày thực hiện</th>
                  <th style={{ width: '12%' }}>Lô / Thửa</th>
                  <th style={{ width: '16%' }}>Công việc / Hoạt động</th>
                  <th style={{ width: '22%' }}>Vật tư & Liều lượng sử dụng</th>
                  <th style={{ width: '14%' }}>Phương pháp / Nồng độ</th>
                  <th style={{ width: '10%' }}>Cách ly (PHI)</th>
                  <th style={{ width: '12%' }}>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                      Chưa có ghi chép nhật ký hoạt động nào trong vụ canh tác này.
                    </td>
                  </tr>
                ) : (
                  activities.map((act, idx) => {
                    const mats = materialsByActivityId.get(act.id || act.farmingActivityId || 0) || [];
                    const isPest = act.activityType?.toLowerCase().includes('sâu') || act.activityType?.toLowerCase().includes('pest') || act.activityName?.toLowerCase().includes('thuốc');
                    
                    return (
                      <tr key={act.id || idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDdMmYyyy(act.startedAt)}</td>
                        <td>{act.blockName || 'Cả vùng'}</td>
                        <td>
                          <strong>{act.activityName}</strong>
                          {act.description && <div style={{ fontSize: '11px', color: '#555' }}>{act.description}</div>}
                        </td>
                        <td>
                          {mats.length === 0 ? (
                            <span style={{ color: '#888' }}>-</span>
                          ) : (
                            mats.map((m, mIdx) => (
                              <div key={m.materialUsageId || mIdx} style={{ marginBottom: mIdx < mats.length - 1 ? '4px' : 0 }}>
                                • <strong>{m.materialName}</strong>: {formatNumber(m.quantity, lang)} {m.unit}
                                {m.dosage ? ` (${m.dosage})` : ''}
                              </div>
                            ))
                          )}
                        </td>
                        <td>
                          {mats.length > 0 ? (
                            mats.map((m, mIdx) => (
                              <div key={m.materialUsageId || mIdx}>{m.method || act.activityType}</div>
                            ))
                          ) : (
                            act.activityType
                          )}
                          {isPest && act.resultNotes && (
                            <div style={{ fontSize: '11px', color: '#047857' }}>{act.resultNotes}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {mats.some(m => m.safetyIntervalDays && m.safetyIntervalDays > 0) ? (
                            mats.filter(m => m.safetyIntervalDays && m.safetyIntervalDays > 0).map((m, mIdx) => (
                              <div key={m.materialUsageId || mIdx} style={{ fontWeight: 650, color: '#b91c1c' }}>
                                {m.safetyIntervalDays} ngày
                              </div>
                            ))
                          ) : (
                            <span style={{ color: '#888' }}>Không áp dụng</span>
                          )}
                        </td>
                        <td>{act.recorderFullName || act.supervisorFullName || 'Kỹ thuật viên'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 3: SỔ NHẬP VẬT TƯ ĐẦU VÀO */}
          <div className="vietgap-section">
            <h2 className="vietgap-section-title">PHẦN III. SỔ THEO DÕI MUA & NHẬP VẬT TƯ ĐẦU VÀO (GIỐNG, PHÂN BÓN, THUỐC BVTV)</h2>
            <p className="vietgap-section-note">
              * Minh chứng nguồn gốc xuất xứ vật tư phục vụ quy trình VietGAP. Đối với thuốc BVTV ghi rõ tên thương mại, mã chứng từ hóa đơn.
            </p>
            <table className="vietgap-data-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>STT</th>
                  <th style={{ width: '11%' }}>Ngày nhập</th>
                  <th style={{ width: '13%' }}>Mã chứng từ / HĐ</th>
                  <th style={{ width: '24%' }}>Tên vật tư / Hoạt chất</th>
                  <th style={{ width: '12%' }}>Số lượng</th>
                  <th style={{ width: '22%' }}>Nhà cung cấp / Nguồn gốc</th>
                  <th style={{ width: '14%' }}>Người mua / Nhận</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                      Chưa ghi nhận hóa đơn nhập vật tư nào.
                    </td>
                  </tr>
                ) : (
                  purchases.flatMap((pur, pIdx) => {
                    const items = pur.items && pur.items.length > 0 ? pur.items : [null];
                    return items.map((item, iIdx) => (
                      <tr key={`${pur.purchaseId}-${item?.purchaseItemId || iIdx}`}>
                        {iIdx === 0 && (
                          <>
                            <td rowSpan={items.length} style={{ textAlign: 'center' }}>{pIdx + 1}</td>
                            <td rowSpan={items.length} style={{ textAlign: 'center' }}>{formatDdMmYyyy(pur.purchaseDate)}</td>
                            <td rowSpan={items.length} style={{ fontWeight: 600 }}>{pur.referenceNo || pur.warehouseReceiptNo || `PO-${pur.purchaseId}`}</td>
                          </>
                        )}
                        <td>
                          <strong>{item?.materialName || pur.notes || 'Vật tư nông nghiệp'}</strong>
                          {item?.materialType && <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>Loại: {item.materialType}</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {item ? `${formatNumber(item.quantity, lang)} ${item.unit}` : '-'}
                        </td>
                        {iIdx === 0 && (
                          <>
                            <td rowSpan={items.length}>{pur.supplierName || 'Đại lý vật tư uy tín đạt chuẩn'}</td>
                            <td rowSpan={items.length}>{pur.purchasedByName || 'Thủ kho'}</td>
                          </>
                        )}
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 4: THU HOẠCH, SƠ CHẾ, TRUY XUẤT VÀ XUẤT BÁN */}
          <div className="vietgap-section">
            <h2 className="vietgap-section-title">PHẦN IV. THEO DÕI THU HOẠCH, SƠ CHẾ & PHÂN PHỐI SẢN PHẨM</h2>
            <p className="vietgap-section-note">
              * Quản lý sản lượng thu hoạch, đối chiếu lượng đạt chuẩn, lượng loại bỏ và mã truy xuất nguồn gốc QR VietGAP.
            </p>
            <table className="vietgap-data-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>STT</th>
                  <th style={{ width: '10%' }}>Ngày thu hoạch</th>
                  <th style={{ width: '12%' }}>Mã lô trồng</th>
                  <th style={{ width: '14%' }}>Mã mẻ / Lô sản phẩm</th>
                  <th style={{ width: '14%' }}>Mã truy xuất VietGAP</th>
                  <th style={{ width: '12%' }}>Khối lượng thu</th>
                  <th style={{ width: '10%' }}>Loại bỏ</th>
                  <th style={{ width: '12%' }}>Phân loại</th>
                  <th style={{ width: '12%' }}>Nơi sơ chế / Kho</th>
                </tr>
              </thead>
              <tbody>
                {harvestRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                      Chưa có đợt thu hoạch nào được ghi nhận cho mùa vụ này.
                    </td>
                  </tr>
                ) : (
                  harvestRecords.map((harv, hIdx) => (
                    <tr key={harv.harvestRecordId || hIdx}>
                      <td style={{ textAlign: 'center' }}>{hIdx + 1}</td>
                      <td style={{ textAlign: 'center' }}>{formatDdMmYyyy(harv.harvestedAt)}</td>
                      <td>{harv.blockName || 'Lô chính'}</td>
                      <td><strong>{harv.harvestLotCode || `LOT-${harv.harvestRecordId}`}</strong></td>
                      <td>
                        <span className="vietgap-trace-code">{harv.traceabilityCode || `GAP-VN-${harv.harvestRecordId}`}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 650 }}>
                        {formatNumber(harv.quantity, lang)} {harv.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: '#b91c1c' }}>
                        {harv.discardedQuantity ? `${formatNumber(harv.discardedQuantity, lang)} ${harv.unit}` : '0 kg'}
                      </td>
                      <td>{harv.qualityGrade || 'Đạt chuẩn VietGAP'}</td>
                      <td>{harv.storageLocation || 'Nhà sơ chế trung tâm'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Reconciliation Summary Box */}
            <div className="vietgap-reconciliation-box">
              <div className="reconciliation-item">
                <span>Tổng sản lượng thu hoạch:</span>
                <strong>
                  {formatNumber(harvestRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0), lang)} kg
                </strong>
              </div>
              <div className="reconciliation-item">
                <span>Khối lượng hao hụt / Loại bỏ:</span>
                <strong style={{ color: '#b91c1c' }}>
                  {formatNumber(harvestRecords.reduce((sum, r) => sum + (Number(r.discardedQuantity) || 0), 0), lang)} kg
                </strong>
              </div>
              <div className="reconciliation-item">
                <span>Khối lượng xuất bán / Đạt chuẩn:</span>
                <strong style={{ color: '#047857' }}>
                  {formatNumber(
                    harvestRecords.reduce((sum, r) => sum + ((Number(r.quantity) || 0) - (Number(r.discardedQuantity) || 0)), 0),
                    lang
                  )} kg
                </strong>
              </div>
            </div>
          </div>

          {/* SECTION 5: QUẢN LÝ RÁC THẢI, VỆ SINH THIẾT BỊ & KHIẾU NẠI (MỤC 4.8 - 4.10 VIETGAP) */}
          <div className="vietgap-section">
            <h2 className="vietgap-section-title">PHẦN V. SỔ THEO DÕI RÁC THẢI, BẢO DƯỠNG THIẾT BỊ & XỬ LÝ KHIẾU NẠI</h2>
            
            {/* 5.1 Rác thải & Vỏ thuốc */}
            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '10.5pt', color: '#047857' }}>1. Sổ theo dõi thu gom rác & Vỏ bao bì thuốc BVTV (Mục 4.8 VietGAP):</strong>
              <table className="vietgap-data-table" style={{ marginTop: '6px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>STT</th>
                    <th style={{ width: '15%' }}>Ngày thu gom</th>
                    <th style={{ width: '25%' }}>Khu vực phát sinh</th>
                    <th style={{ width: '18%' }}>Loại rác & Số lượng</th>
                    <th style={{ width: '22%' }}>Hình thức lưu trữ / Xử lý</th>
                    <th style={{ width: '15%' }}>Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '10px', color: '#888' }}>
                        Đã súc rửa 3 lần và chứa tại bể chứa chất thải nguy hại có nắp đậy của trang trại.
                      </td>
                    </tr>
                  ) : (
                    wasteLogs.map((w, wIdx) => (
                      <tr key={w.id || wIdx}>
                        <td style={{ textAlign: 'center' }}>{wIdx + 1}</td>
                        <td style={{ textAlign: 'center' }}>{formatDdMmYyyy(w.date)}</td>
                        <td>{w.sourceLocation}</td>
                        <td><strong>{formatNumber(w.quantity, lang)} {w.unit}</strong></td>
                        <td>{w.storageMethod === 'handed_over' ? `Đã bàn giao: ${w.disposalPartner || 'Đơn vị xử lý'}` : 'Bể bê tông kín có khóa nắp'}</td>
                        <td>{w.recorderName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 5.2 Bảo dưỡng & súc rửa thiết bị */}
            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '10.5pt', color: '#047857' }}>2. Sổ theo dõi vệ sinh, súc rửa bình phun & Hiệu chuẩn dụng cụ đo (Mục 4.9 VietGAP):</strong>
              <table className="vietgap-data-table" style={{ marginTop: '6px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>STT</th>
                    <th style={{ width: '15%' }}>Ngày thực hiện</th>
                    <th style={{ width: '25%' }}>Thiết bị / Dụng cụ</th>
                    <th style={{ width: '35%' }}>Nội dung súc rửa / Kiểm chuẩn sai số</th>
                    <th style={{ width: '20%' }}>Người kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '10px', color: '#888' }}>
                        Thiết bị phun xịt được súc rửa sạch sẽ sau mỗi lần phun; cân bàn được hiệu chuẩn định kỳ đạt chuẩn dung sai.
                      </td>
                    </tr>
                  ) : (
                    equipmentLogs.map((eq, eqIdx) => (
                      <tr key={eq.id || eqIdx}>
                        <td style={{ textAlign: 'center' }}>{eqIdx + 1}</td>
                        <td style={{ textAlign: 'center' }}>{formatDdMmYyyy(eq.date)}</td>
                        <td><strong>{eq.equipmentName}</strong></td>
                        <td>{eq.details}</td>
                        <td>{eq.technicianName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 5.3 Tiếp nhận khiếu nại & Thu hồi */}
            <div>
              <strong style={{ fontSize: '10.5pt', color: '#047857' }}>3. Sổ tiếp nhận khiếu nại khách hàng & Nhật ký thu hồi sản phẩm (Mục 4.10 VietGAP):</strong>
              <table className="vietgap-data-table" style={{ marginTop: '6px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>STT</th>
                    <th style={{ width: '15%' }}>Ngày tiếp nhận</th>
                    <th style={{ width: '20%' }}>Khách hàng / Đại lý</th>
                    <th style={{ width: '15%' }}>Mã lô sản phẩm</th>
                    <th style={{ width: '25%' }}>Nội dung & Biện pháp khắc phục</th>
                    <th style={{ width: '20%' }}>Kết quả thu hồi</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '10px', color: '#888' }}>
                        Không phát sinh khiếu nại chất lượng sản phẩm trong vụ canh tác này.
                      </td>
                    </tr>
                  ) : (
                    complaintLogs.map((cp, cpIdx) => (
                      <tr key={cp.id || cpIdx}>
                        <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
                        <td style={{ textAlign: 'center' }}>{formatDdMmYyyy(cp.date)}</td>
                        <td>{cp.customerName}</td>
                        <td><strong>{cp.harvestLotCode}</strong></td>
                        <td>{cp.complaintReason} - {cp.correctiveAction}</td>
                        <td>{cp.recallStatus === 'recalled' ? `Thu hồi ${cp.recalledQuantity || 0} ${cp.unit || 'kg'}` : 'Đã giải quyết, không thu hồi'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6: SIGNATURES & VERIFICATION */}
          <div className="vietgap-signatures-section">
            <div className="vietgap-sig-block">
              <p className="sig-title">NGƯỜI GHI CHÉP NHẬT KÝ</p>
              <p className="sig-subtitle">(Ký, ghi rõ họ tên)</p>
              <div className="sig-space" />
              <p className="sig-name">{seasonDetail?.createdByFullName || 'Kỹ thuật viên canh tác'}</p>
            </div>
            <div className="vietgap-sig-block">
              <p className="sig-title">CÁN BỘ GIÁM SÁT KỸ THUẬT</p>
              <p className="sig-subtitle">(Ký, ghi rõ họ tên)</p>
              <div className="sig-space" />
              <p className="sig-name">Ban Quản lý Chất lượng</p>
            </div>
            <div className="vietgap-sig-block">
              <p className="sig-date">Ngày ...... tháng ...... năm 20......</p>
              <p className="sig-title">ĐẠI DIỆN CƠ SỞ / CHỦ TRANG TRẠI</p>
              <p className="sig-subtitle">(Ký tên và đóng dấu)</p>
              <div className="sig-space" />
              <p className="sig-name">{farmName}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
