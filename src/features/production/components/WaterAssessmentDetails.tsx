import type { ReactNode } from 'react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { formatDate } from '../../../shared/format/formatters';
import type { WaterAssessmentBackendResp } from '../zoneBlockService';

/** Shared API detail fields for the block and farm environment screens. */
export function WaterAssessmentDetails({ record, blockName, zoneName }: {
  record: WaterAssessmentBackendResp;
  blockName?: string;
  zoneName?: string;
}) {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const missing = vi ? 'Chưa cập nhật' : 'Not updated';
  const sourceTypes: Record<string, string> = {
    groundwater: vi ? 'Nước ngầm' : 'Groundwater',
    'surface water': vi ? 'Nước mặt' : 'Surface water',
    'tap water': vi ? 'Nước thủy cục' : 'Tap water',
    rainwater: vi ? 'Nước mưa' : 'Rainwater',
    'nước ngầm': vi ? 'Nước ngầm' : 'Groundwater',
    'nước mặt': vi ? 'Nước mặt' : 'Surface water',
    'nước thủy cục': vi ? 'Nước thủy cục' : 'Tap water',
    'bể lắng / nước mưa': vi ? 'Bể lắng / Nước mưa' : 'Rainwater basin',
  };
  const statuses: Record<string, string> = {
    DAT_CHUAN: vi ? 'Đạt chuẩn' : 'Compliant',
    CHO_KIEM_DINH: vi ? 'Chờ kiểm định' : 'Pending test',
    CAN_XU_LY: vi ? 'Cần xử lý' : 'Treatment required',
    KHONG_DAT: vi ? 'Không đạt' : 'Non-compliant',
  };
  const field = (label: string, value: ReactNode, full = false, primary = false) => (
    <div className={`structured-field-card${primary ? ' ui-detail-primary' : ''}`} style={full ? { gridColumn: '1 / -1' } : undefined}>
      <dt>{label}</dt>
      <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value ?? missing}</dd>
    </div>
  );
  const link = (url?: string | null) => url
    ? (/^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : url)
    : missing;
  return <dl className="ui-form-grid detail-list" style={{ gap: '16px', margin: 0 }}>
    {field(vi ? 'Lô trồng áp dụng' : 'Applicable block', record.blockName || blockName || missing, false, true)}
    {field(vi ? 'Khu vực' : 'Zone', record.zoneName || zoneName || missing)}
    {field(vi ? 'Ngày đánh giá' : 'Assessment date', formatDate(record.assessedAt?.slice(0, 10), lang))}
    {field(vi ? 'Người ghi nhận' : 'Recorded by', record.conductedByName || missing)}
    {field(vi ? 'Nguồn nước tưới' : 'Irrigation water source', record.waterSourceName?.replace(/\s*#\d+\s*$/, '').trim() || missing)}
    {field(vi ? 'Loại nguồn nước' : 'Water source type', sourceTypes[record.waterSourceType?.trim().toLowerCase() || ''] || record.waterSourceType || missing)}
    {field(vi ? 'Độ pH nước' : 'Water pH', record.waterPh)}
    {field(vi ? 'Nhiệt độ (°C)' : 'Temperature (°C)', record.temperatureC)}
    {field(vi ? 'Kết luận' : 'Conclusion', record.qualityStatus ? statuses[record.qualityStatus] || record.qualityStatus : missing, true)}
    {field(vi ? 'Ghi chú' : 'Notes', record.notes || missing, true)}
    {field(vi ? 'Đường dẫn ảnh minh chứng' : 'Evidence Image URL', link(record.imageUrl), true)}
    {field(vi ? 'Đường dẫn báo cáo kiểm nghiệm' : 'Laboratory Report URL', link(record.labTestReportUrl), true)}
  </dl>;
}
