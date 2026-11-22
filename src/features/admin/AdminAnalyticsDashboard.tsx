import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { AdminBadge } from './AdminComponents';
import { StatusBadge } from '../../shared/components/StatusBadge';
import type { AdminRecord } from './adminTypes';
import { AnalyticsDonut, AnalyticsGroupedBars, AnalyticsMissing, AnalyticsPanel, AnalyticsPlot, AnalyticsRecent, analyticsColors, type ChartPoint } from './AdminAnalyticsCharts';
import { areaHectares, loadAdminAnalytics, monthBuckets, validDate, type AnalyticsData, type AnalyticsTab } from './adminAnalyticsData';
import './admin-analytics.css';

export type AnalyticsReport = { rows: string[][]; hasData: boolean };
type Kpi = { title: string; value: string; icon: string; tone?: string; note?: string };
export function AdminAnalyticsDashboard({ tab, months, registrations, registrationsLoading, registrationsError, reloadRegistrations, fromMonth, toMonth, onReport, onChoosePeriod }: {
  tab: AnalyticsTab; months: number; registrations: AdminRecord[]; registrationsLoading?: boolean; registrationsError?: string;
  reloadRegistrations?: () => void; fromMonth: string; toMonth: string; onReport: (report: AnalyticsReport | null) => void; onChoosePeriod?: () => void;
}) {
  const { lang, t: translate } = useLanguage();
  const en = lang === 'en';
  const text = (vi: string, english: string) => en ? english : vi;
  const locale = en ? 'en-US' : 'vi-VN';
  const n = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const money = (value: number) => `${n(value)} ₫`;
  const date = (value?: string | null) => validDate(value)?.toLocaleDateString(locale) ?? '—';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showCostHelp, setShowCostHelp] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false); onReport(null);
    if (tab !== 'registrations') loadAdminAnalytics(tab, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [tab, attempt, onReport]);
  const loading = tab === 'registrations' ? registrationsLoading : !data && !error;
  const failed = tab === 'registrations' ? !!registrationsError : error;
  const buckets = monthBuckets(months);
  const trend = <T,>(items: T[], getDate: (item: T) => string | null | undefined, cumulative = false): ChartPoint[] => buckets.map(bucket => ({
    label: bucket.start.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
    value: items.some(item => validDate(getDate(item))) || items.length === 0 ? items.filter(item => {
      const when = validDate(getDate(item));
      return when && when < bucket.end && when <= new Date() && (cumulative || when >= bucket.start);
    }).length : null,
  }));
  const recent = <T,>(items: T[], getDate: (item: T) => string | null | undefined) => [...items].sort((a, b) => (validDate(getDate(b))?.getTime() ?? 0) - (validDate(getDate(a))?.getTime() ?? 0)).slice(0, 5);
  const unknown = text('Chưa có dữ liệu', 'No data available');
  const kpis: Kpi[] = [];
  let charts: ReactNode = null;
  let table: ReactNode = null;
  let hasData = false;
  if (tab === 'farms' && data) {
    const { farms, zones, blocks } = data;
    hasData = farms.length > 0;
    const areas = zones.map(zone => areaHectares(zone.areaValue, zone.areaUnit));
    const validAreas = areas.filter((area): area is number => area != null);
    const totalArea = validAreas.reduce((sum, area) => sum + area, 0);
    kpis.push(
      { title: text('Tổng số trang trại', 'Total farms'), value: n(farms.length), icon: 'home', note: text(`${farms.filter(item => item.status?.toUpperCase() === 'ACTIVE').length} trang trại đang hoạt động`, `${farms.filter(item => item.status?.toUpperCase() === 'ACTIVE').length} active farms`) },
      { title: text('Tổng số vùng trồng', 'Total growing zones'), value: n(zones.length), icon: 'sprout', note: text('Phân khu sản xuất', 'Production zones') },
      { title: text('Tổng số lô đất', 'Total plots'), value: n(blocks.length), icon: 'layers', note: text('Lô đất đã ghi nhận', 'Recorded plots') },
      { title: text('Tổng diện tích', 'Total area'), value: validAreas.length || !zones.length ? `${n(totalArea)} ha` : '—', icon: 'expand', note: validAreas.length < zones.length ? text('Chưa đủ diện tích của mọi vùng trồng', 'Some zone areas are missing') : text('Tổng diện tích vùng trồng', 'Total growing zone area') },
    );
    charts = <div className="analytics-grid analytics-grid--three">
      <AnalyticsPanel title={text('Phân bố diện tích theo vùng trồng', 'Area by growing zone')}><AnalyticsPlot kind="bar" decimalScale unit={text('Diện tích (ha)', 'Area (ha)')} points={zones.map((zone, index) => ({ label: zone.zoneName, value: areas[index] }))} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Cơ cấu trạng thái trang trại', 'Farm status distribution')} icon="report"><AnalyticsDonut unit={text('Trang trại', 'Farms')} slices={[
        { label: text('Đang hoạt động', 'Active'), value: farms.filter(item => item.status?.toUpperCase() === 'ACTIVE').length },
        { label: text('Tạm ngưng', 'Inactive'), value: farms.filter(item => item.status?.toUpperCase() === 'INACTIVE').length, color: '#f5b900' },
        { label: text('Khác', 'Other'), value: farms.filter(item => !['ACTIVE', 'INACTIVE'].includes(item.status?.toUpperCase())).length, color: '#94a3b8' },
      ]} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Số phân khu và lô đất theo trang trại', 'Zones and plots by farm')}><AnalyticsGroupedBars rows={farms.map(farm => ({ label: farm.farmName, zones: farm.zoneCount, blocks: farm.blockCount }))} /></AnalyticsPanel>
    </div>;
    table = <AnalyticsRecent title={text('Danh sách trang trại', 'Farm list')} to="/admin/farms" headers={[text('Tên trang trại', 'Farm'), text('Trạng thái', 'Status'), text('Số phân khu', 'Zones'), text('Số lô đất', 'Plots'), text('Diện tích (ha)', 'Area (ha)')]} rows={farms.slice(0, 5).map(farm => {
      const farmZones = zones.filter(zone => zone.farmId === (farm.farmId ?? farm.id));
      const values = farmZones.map(zone => areaHectares(zone.areaValue, zone.areaUnit));
      const complete = farmZones.length === farm.zoneCount && values.every(value => value != null);
      return { id: String(farm.farmId ?? farm.id), cells: [<strong>{farm.farmName}</strong>, <AdminBadge collection="farms" status={farm.status?.toUpperCase()} />, n(farm.zoneCount), n(farm.blockCount), complete ? n(values.reduce<number>((sum, value) => sum + (value ?? 0), 0)) : '—'] };
    })} />;
  }
  if (tab === 'seasons' && data) {
    const seasons = data.seasons;
    hasData = seasons.length > 0;
    const count = (status: string) => seasons.filter(item => item.status?.toUpperCase() === status).length;
    kpis.push(
      { title: text('Tổng số mùa vụ', 'Total seasons'), value: n(seasons.length), icon: 'leaf', note: text('Toàn bộ mùa vụ canh tác', 'All crop seasons') },
      { title: text('Đang canh tác', 'Growing'), value: n(count('ACTIVE')), icon: 'sprout', note: text('Mùa vụ đang trong chu kỳ chăm sóc', 'Seasons currently growing') },
      { title: text('Đã thu hoạch', 'Harvested'), value: n(count('HARVESTED')), icon: 'box', tone: 'info', note: text('Mùa vụ đã kết thúc', 'Completed seasons') },
      { title: text('Mùa vụ đã lên kế hoạch', 'Planned seasons'), value: n(count('PLANNED')), icon: 'calendar', tone: 'warning', note: text('Dự kiến triển khai', 'Planned for cultivation') },
    );
    charts = <div className="analytics-grid analytics-grid--two">
      <AnalyticsPanel title={text('Trạng thái mùa vụ', 'Season status')}><AnalyticsDonut unit={text('Mùa vụ', 'Seasons')} slices={[
        { label: text('Đang canh tác', 'Growing'), value: count('ACTIVE') }, { label: text('Đã thu hoạch', 'Harvested'), value: count('HARVESTED') },
        { label: text('Đã lên kế hoạch', 'Planned'), value: count('PLANNED') },
        ...(!count('NEEDS_REVIEW') ? [] : [{ label: text('Cần rà soát', 'Needs review'), value: count('NEEDS_REVIEW'), color: '#5799f3' }]),
        ...(!seasons.some(item => !['ACTIVE', 'HARVESTED', 'PLANNED', 'NEEDS_REVIEW'].includes(item.status?.toUpperCase())) ? [] : [{ label: text('Đã hủy / Khác', 'Cancelled / Other'), value: seasons.filter(item => !['ACTIVE', 'HARVESTED', 'PLANNED', 'NEEDS_REVIEW'].includes(item.status?.toUpperCase())).length, color: '#94a3b8' }]),
      ]} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Phân bố mùa vụ theo loại cây trồng', 'Seasons by crop')}><AnalyticsPlot kind="bar" unit={text('Số mùa vụ', 'Seasons')} points={[...seasons.reduce((groups, season) => { const name = season.cropName?.trim() || text('Chưa xác định', 'Unknown'); groups.set(name, (groups.get(name) ?? 0) + 1); return groups; }, new Map<string, number>())].map(([label, value]) => ({ label, value }))} /></AnalyticsPanel>
    </div>;
    table = <AnalyticsRecent title={text('Danh sách mùa vụ gần đây', 'Recent seasons')} to="/admin/compliance" headers={[text('Tên mùa vụ', 'Season'), text('Cây trồng', 'Crop'), text('Trang trại', 'Farm'), text('Trạng thái', 'Status')]} rows={recent(seasons, item => item.startDate || item.createdAt).map(item => ({ id: String(item.seasonId ?? item.id), cells: [<strong>{item.seasonName}</strong>, item.cropName, item.farmName, item.status?.toUpperCase() === 'PLANNED' ? <StatusBadge label={text('Đã lên kế hoạch', 'Planned')} tone="warning" /> : <AdminBadge collection="compliance" status={item.status?.toUpperCase()} />] }))} />;
  }
  if (tab === 'registrations' && !loading && !failed) {
    hasData = registrations.length > 0;
    const count = (status: string) => registrations.filter(item => item.status === status).length;
    kpis.push(
      { title: text('Tổng hồ sơ trang trại', 'Total applications'), value: n(registrations.length), icon: 'layers', note: text('Hồ sơ đã đăng ký trong hệ thống', 'All registered applications') },
      { title: text('Đã duyệt', 'Approved'), value: n(count('APPROVED')), icon: 'shield', note: text('Đã cấp quyền chủ trang trại', 'Farm owner access granted') },
      { title: text('Chờ duyệt', 'Pending'), value: n(count('PENDING')), icon: 'history', tone: 'warning', note: text('Cần quản trị viên xem xét', 'Awaiting administrator review') },
      { title: text('Bị từ chối', 'Rejected'), value: n(count('REJECTED')), icon: 'close', tone: 'danger', note: text('Không đạt tiêu chuẩn xét duyệt', 'Does not meet approval requirements') },
    );
    const handled = registrations.filter(item => ['APPROVED', 'REJECTED'].includes(item.status));
    charts = <div className="analytics-grid analytics-grid--three">
      <AnalyticsPanel title={text('Trạng thái phê duyệt', 'Approval status')}><AnalyticsDonut unit={text('Hồ sơ', 'Applications')} slices={[
        { label: text('Đã duyệt', 'Approved'), value: count('APPROVED') }, { label: text('Chờ duyệt', 'Pending'), value: count('PENDING'), color: '#f5b900' },
        { label: text('Bị từ chối', 'Rejected'), value: count('REJECTED'), color: 'var(--color-danger)' }, { label: text('Đã hủy / Khác', 'Cancelled / Other'), value: registrations.length - count('APPROVED') - count('PENDING') - count('REJECTED'), color: '#94a3b8' },
      ]} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Số hồ sơ theo tháng', 'Applications by month')}><AnalyticsPlot kind="bar" points={trend(registrations, item => item.createdAt)} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Xu hướng xử lý hồ sơ', 'Application processing trend')} icon="trending-up">{handled.length && !handled.some(item => validDate(item.reviewedAt)) ? <AnalyticsMissing>{text('Chưa có ngày xử lý hồ sơ.', 'Processing dates are unavailable.')}</AnalyticsMissing> : <AnalyticsPlot points={trend(handled, item => item.reviewedAt, true)} secondary={{ label: text('Nhận mới', 'New'), points: trend(registrations, item => item.createdAt) }} />}</AnalyticsPanel>
    </div>;
    table = <AnalyticsRecent title={text('Danh sách hồ sơ trang trại gần đây', 'Recent farm applications')} to="/admin/registrations" headers={[text('Tên trang trại', 'Farm'), text('Người đăng ký', 'Applicant'), text('Ngày đăng ký', 'Submitted'), text('Trạng thái', 'Status')]} rows={recent(registrations, item => item.createdAt).map(item => ({ id: item.id, cells: [<strong>{item.name}</strong>, item.applicant, date(item.createdAt), <AdminBadge collection="registrations" status={item.status} />] }))} />;
  }
  if (tab === 'feedback' && data) {
    const feedback = data.feedback;
    hasData = feedback.length > 0;
    const resolved = feedback.filter(item => item.status?.toUpperCase() === 'RESOLVED').length;
    const ratings = feedback.map(item => item.rating).filter((rating): rating is number => rating != null && Number.isFinite(rating) && rating >= 1 && rating <= 5);
    const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
    kpis.push(
      { title: text('Tổng phản hồi nhận', 'Total feedback'), value: n(feedback.length), icon: 'message' },
      { title: text('Đã xử lý', 'Resolved'), value: n(resolved), icon: 'shield' },
      { title: text('Chờ / Đang xử lý', 'Pending / In progress'), value: n(feedback.length - resolved), icon: 'history', tone: 'warning' },
      { title: text('Điểm đánh giá trung bình', 'Average rating'), value: average == null ? '—' : `${n(average)} / 5`, icon: 'star', tone: 'warning', note: average == null ? text('Chưa có đánh giá bằng điểm', 'No numeric ratings yet') : undefined },
    );
    const quality = buckets.map(bucket => {
      const values = feedback.filter(item => { const when = validDate(item.createdAt); return when && when >= bucket.start && when < bucket.end; }).map(item => item.rating).filter((rating): rating is number => rating != null && rating >= 1 && rating <= 5);
      return { label: bucket.start.toLocaleDateString(locale, { month: 'short', year: '2-digit' }), value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
    });
    charts = <div className="analytics-grid analytics-grid--three">
      <AnalyticsPanel title={text('Trạng thái xử lý phản hồi', 'Feedback processing status')} icon="history"><AnalyticsDonut unit={text('Phản hồi', 'Feedback')} slices={[{ label: text('Đã xử lý', 'Resolved'), value: resolved }, { label: text('Chờ / Đang xử lý', 'Pending / In progress'), value: feedback.length - resolved, color: '#f5b900' }]} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Số phản hồi theo thời gian', 'Feedback over time')}><AnalyticsPlot kind="bar" points={trend(feedback, item => item.createdAt)} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Xu hướng chất lượng AI', 'AI quality trend')} icon="trending-up"><AnalyticsPlot unit={text('Điểm / 5', 'Rating / 5')} maxValue={5} points={quality} /></AnalyticsPanel>
    </div>;
    table = <AnalyticsRecent title={text('Danh sách phản hồi gần đây', 'Recent feedback')} to="/admin/feedback" headers={[text('Nội dung phản hồi', 'Feedback'), text('Người gửi', 'Sender'), text('Thời gian', 'Date'), text('Trạng thái', 'Status'), text('Đánh giá', 'Rating')]} rows={recent(feedback, item => item.createdAt).map(item => ({ id: String(item.feedbackId), cells: [<span className="analytics-feedback-preview" title={item.feedbackText}>{item.feedbackText}</span>, item.senderName, date(item.createdAt), <AdminBadge collection="feedback" status={item.status?.toUpperCase()} />, item.rating != null ? `${n(item.rating)} / 5` : '—'] }))} />;
  }
  if (tab === 'costs' && data && fromMonth <= toMonth) {
    const expenses = data.expenses.filter(item => { const when = validDate(item.expenseDate); if (!when) return false; const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`; return key >= fromMonth && key <= toMonth; });
    hasData = expenses.length > 0;
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const start = validDate(`${fromMonth}-01`)!;
    const end = validDate(`${toMonth}-01`)!;
    const count = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
    const monthly = Array.from({ length: Math.min(120, Math.max(0, count)) }, (_, index) => {
      const when = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const next = new Date(when.getFullYear(), when.getMonth() + 1, 1);
      return { label: when.toLocaleDateString(locale, { month: 'short', year: '2-digit' }), value: expenses.filter(item => { const date = validDate(item.expenseDate)!; return date >= when && date < next; }).reduce((sum, item) => sum + item.amount, 0) / 1e6 };
    });
    const groups = new Map<string, number>();
    for (const item of expenses) groups.set(item.expenseCategory, (groups.get(item.expenseCategory) ?? 0) + item.amount);
    const categoryNames: Record<string, [string, string]> = { MATERIAL: ['Vật tư nông nghiệp', 'Materials'], LABOR: ['Nhân công', 'Labor'], EQUIPMENT: ['Thiết bị, máy móc', 'Equipment'], OTHER: ['Khác', 'Other'], INFRASTRUCTURE: ['Hạ tầng, tưới tiêu', 'Infrastructure'] };
    const category = (value: string) => { const names = categoryNames[value.toUpperCase()]; return names ? text(...names) : translate(value); };
    kpis.push(
      { title: text('Tổng chi phí', 'Total costs'), value: money(total), icon: 'database', note: text(`${count} tháng thống kê`, `${count} months selected`) },
      { title: text('Số khoản chi', 'Expense records'), value: n(expenses.length), icon: 'file-text', note: text('Khoản chi đã ghi nhận', 'Recorded expenses') },
      { title: text('Danh mục chi phí', 'Expense categories'), value: n(groups.size), icon: 'layers', note: [...groups.keys()].map(category).join(', ') || text('Chưa có danh mục phát sinh', 'No categories in this period') },
    );
    charts = <div className="analytics-grid analytics-grid--costs">
      <AnalyticsPanel title={text('Xu hướng chi phí theo tháng', 'Monthly cost trend')}><AnalyticsPlot kind="bar" unit={text('Triệu đồng', 'Million VND')} points={monthly} /></AnalyticsPanel>
      <AnalyticsPanel title={text('Cơ cấu chi phí theo danh mục', 'Costs by category')}><AnalyticsDonut unit={text('Triệu đồng', 'Million VND')} center={n(total / 1e6)} slices={[...groups].map(([label, value], index) => ({ label: category(label), value: value / 1e6, color: analyticsColors[index % analyticsColors.length] }))} /></AnalyticsPanel>
      <AnalyticsPanel className="analytics-cost-guide" title={text('Chi tiết chi phí', 'Expense details')}>
        <div className="analytics-cost-guide-content">
          <div className="analytics-empty-illustration" aria-hidden="true"><Icon name="file-text" size={78} /><Icon name="search" size={42} /></div>
          <h3>{hasData ? text(`Đã ghi nhận ${expenses.length} khoản chi trong khoảng thời gian này`, `${expenses.length} expenses recorded in this period`) : text('Chưa có dữ liệu chi phí trong khoảng thời gian này', 'No expense data in this period')}</h3>
          <p>{hasData ? text('Biểu đồ tổng hợp chi phí đã ghi nhận. Bạn có thể đổi khoảng thời gian để xem thêm các khoản chi.', 'Charts summarize recorded expenses. Change the period to see more records.') : text('Hãy thử thay đổi khoảng thời gian thống kê hoặc kiểm tra xem đã có khoản chi nào được ghi nhận chưa.', 'Try another period or check whether any expenses have been recorded.')}</p>
          <div className="analytics-cost-guide-actions"><Button variant="secondary" onClick={onChoosePeriod}><Icon name="calendar" />{text('Thay đổi khoảng thời gian', 'Change period')}</Button><Button variant="secondary" onClick={() => setShowCostHelp(value => !value)} aria-expanded={showCostHelp}><Icon name="book" />{text('Hướng dẫn kiểm tra', 'How to check')}</Button></div>
          {showCostHelp && <ol className="analytics-cost-help"><li>{text('Kiểm tra ngày ghi nhận khoản chi có nằm trong khoảng tháng đã chọn.', 'Check that expense dates fall within the selected months.')}</li><li>{text('Kiểm tra khoản chi đã được lưu trong trang trại tương ứng.', 'Check that expenses were saved under the correct farm.')}</li><li>{text('Nếu chưa có khoản chi, danh sách sẽ trống và tổng chi phí bằng 0.', 'If no expenses are recorded, the list is empty and the total is zero.')}</li></ol>}
        </div>
      </AnalyticsPanel>
    </div>;
    table = <AnalyticsRecent expandable title={text('Các khoản chi gần đây', 'Recent expenses')} headers={[text('Danh mục', 'Category'), text('Nội dung', 'Description'), text('Trang trại', 'Farm'), text('Số tiền', 'Amount'), text('Ngày ghi nhận', 'Recorded date')]} rows={[...expenses].sort((a, b) => (validDate(b.expenseDate)?.getTime() ?? 0) - (validDate(a.expenseDate)?.getTime() ?? 0)).map(item => ({ id: String(item.expenseId), cells: [<span className={`analytics-category-tag analytics-category-tag--${[...groups.keys()].indexOf(item.expenseCategory) % 4}`}>{category(item.expenseCategory)}</span>, item.description || '—', data.farms.find(farm => (farm.farmId ?? farm.id) === item.farmId)?.farmName || '—', <strong>{money(item.amount)}</strong>, date(item.expenseDate)] }))} />;
  }
  const reportKey = JSON.stringify({ rows: kpis.map(item => [item.title, item.value, item.note || '']), hasData });
  useEffect(() => { onReport(loading || failed ? null : JSON.parse(reportKey) as AnalyticsReport); }, [reportKey, loading, failed, onReport]);
  if (loading) return <div className="analytics-loading" role="status">{text('Đang tải số liệu biểu đồ…', 'Loading chart data…')}</div>;
  if (failed) return <div className="admin-form-error" role="alert"><p>{text('Chưa tải được dữ liệu cho tab này.', 'Unable to load this tab.')}{tab === 'costs' && ` ${text('Cần quyền đọc chi phí của tất cả trang trại để tổng hợp toàn hệ thống.', 'System-wide totals require access to expenses from every farm.')}`}</p><Button onClick={() => { if (tab === 'registrations') reloadRegistrations?.(); else setAttempt(value => value + 1); }} variant="secondary">{text('Thử lại', 'Retry')}</Button></div>;
  return <div className={`analytics-dashboard analytics-dashboard--${tab}`} data-analytics-tab={tab}>
    <div className="analytics-kpis">{kpis.map(item => <article key={item.title} className={`analytics-kpi analytics-kpi--${item.tone || 'success'}`}><span className="analytics-kpi-icon"><Icon name={item.icon} size={29} /></span><div><h3>{item.title}</h3><strong>{item.value}</strong><p>{item.note || text('Số liệu hiện có trong hệ thống', 'Current system records')}</p></div></article>)}</div>
    {charts}{table}
    {!kpis.length && <AnalyticsMissing>{unknown}</AnalyticsMissing>}
  </div>;
}
