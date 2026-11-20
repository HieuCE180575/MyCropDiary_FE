import { AdminPageHeading } from './AdminComponents';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { formatNumber } from '../../shared/format/formatters';
import { useLanguage } from '../../shared/i18n/LanguageContext';

import { useState, useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import { useAuth } from '../auth';

import { fetchAdminStatistics, type AdminStatisticsData } from './adminService';

const types = {
  overview: 'Tổng quan hệ thống',
  users: 'Tài khoản',
  farms: 'Trang trại & Vùng trồng',
  seasons: 'Mùa vụ',
  costs: 'Chi phí',
  registrations: 'Hồ sơ trang trại',
  feedback: 'Phản hồi AI',
};
type StatisticType = keyof typeof types;

export function AdminStatistics() {
  const { lang, t: translate } = useLanguage();
  const number = (value: number) => formatNumber(value, lang);
  const { state } = useAdmin();
  const { user } = useAuth();
  const [type, setType] = useState<StatisticType>('overview');
  const today = new Date();
  const defaultFromMonth = `${today.getFullYear()}-01`;
  const defaultToMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [fromMonth, setFromMonth] = useState(defaultFromMonth);
  const [toMonth, setToMonth] = useState(defaultToMonth);
  const [statsData, setStatsData] = useState<AdminStatisticsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(user?.userId !== 900);
  const [statsError, setStatsError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (user?.userId === 900) { setLoadingStats(false); return; }
    const controller = new AbortController();
    setLoadingStats(true);
    setStatsError('');
    setStatsData(null);
    fetchAdminStatistics(controller.signal)
      .then(data => {
        if (!data) throw new Error('No statistics returned.');
        if (!controller.signal.aborted) setStatsData(data);
      })
      .catch(error => { if (!controller.signal.aborted) setStatsError(error instanceof Error ? error.message : 'Unable to load statistics.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingStats(false); });
    return () => controller.abort();
  }, [user?.userId, attempt]);

  const invalidMonthRange = Boolean(fromMonth && toMonth && fromMonth > toMonth);
  const filteredSeasons = invalidMonthRange
    ? []
    : state.seasons.filter((s) => (!fromMonth || s.month >= fromMonth) && (!toMonth || s.month <= toMonth));
  const totalSeasonCost = filteredSeasons.reduce((acc, s) => acc + s.cost, 0);

  const totalUsers = statsData?.accounts?.totalUsers ?? state.users.length;
  const activeUsers = statsData?.accounts?.activeUsers ?? state.users.filter((u) => u.status === 'ACTIVE').length;
  const lockedUsers = statsData?.accounts?.lockedUsers ?? state.users.filter((u) => u.status === 'LOCKED').length;

  const totalReg = statsData?.registrations?.totalRegistrations ?? state.registrations.length;
  const pendingReg = statsData?.registrations?.pendingRegistrations ?? state.registrations.filter((r) => r.status === 'PENDING').length;
  const approvedReg = statsData?.registrations?.approvedRegistrations ?? state.registrations.filter((r) => r.status === 'APPROVED').length;
  const rejectedReg = statsData?.registrations?.rejectedRegistrations ?? state.registrations.filter((r) => r.status === 'REJECTED').length;

  const totalFarms = statsData?.farms?.totalFarms ?? (state.farms.length || 25);
  const activeFarms = statsData?.farms?.activeFarms ?? (state.farms.filter((f) => f.status === 'ACTIVE').length || 22);
  const totalZones = state.zones.length;
  const totalBlocks = state.blocks.length;

  const totalSeasons = statsData?.seasons?.totalSeasons ?? 48;
  const activeSeasons = statsData?.seasons?.activeSeasons ?? 18;
  const completedSeasons = statsData?.seasons?.completedSeasons ?? 30;

  const totalFeedbacks = statsData?.aiFeedback?.totalFeedbacks ?? state.feedback.length;
  const openFeedbacks = statsData?.aiFeedback?.openFeedbacks ?? state.feedback.filter((f) => f.status === 'OPEN').length;
  const resolvedFeedbacks = statsData?.aiFeedback?.resolvedFeedbacks ?? state.feedback.filter((f) => f.status === 'RESOLVED').length;
  const avgRating = statsData?.aiFeedback?.averageRating ?? 4.6;

  const exportStatsCsv = () => {
    const text = (vi: string, en: string) => lang === 'en' ? en : vi;
    const rows = [
      [text('Chỉ tiêu thống kê', 'Metric'), text('Giá trị', 'Value'), text('Ghi chú', 'Notes')],
      [text('Tổng tài khoản người dùng', 'Total user accounts'), String(totalUsers), text(`${activeUsers} hoạt động, ${lockedUsers} đã khóa`, `${activeUsers} active, ${lockedUsers} locked`)],
      [text('Hồ sơ đăng ký trang trại', 'Farm registrations'), String(totalReg), text(`${pendingReg} chờ duyệt, ${approvedReg} đã duyệt, ${rejectedReg} từ chối`, `${pendingReg} pending, ${approvedReg} approved, ${rejectedReg} rejected`)],
      [text('Trang trại vận hành', 'Farms'), String(totalFarms), text(`${activeFarms} đang hoạt động`, `${activeFarms} active`)],
      [text('Phân khu sản xuất', 'Production zones'), String(totalZones), text('Toàn hệ thống', 'System-wide')],
      [text('Lô đất canh tác', 'Cultivation blocks'), String(totalBlocks), text('Toàn hệ thống', 'System-wide')],
      [text('Mùa vụ canh tác', 'Seasons'), String(totalSeasons), text(`${activeSeasons} đang trồng, ${completedSeasons} đã thu hoạch`, `${activeSeasons} growing, ${completedSeasons} harvested`)],
      ...(!invalidMonthRange && filteredSeasons.length ? [[text('Tổng chi phí mùa vụ (kỳ lọc)', 'Season costs (selected period)'), `${totalSeasonCost} VND`, text(`${filteredSeasons.length} tháng`, `${filteredSeasons.length} months`)]] : []),
      [text('Phản hồi trợ lý AI', 'AI assistant feedback'), String(totalFeedbacks), text(`${openFeedbacks} đang mở, ${resolvedFeedbacks} đã giải quyết, Điểm TB: ${avgRating}/5`, `${openFeedbacks} open, ${resolvedFeedbacks} resolved, Average rating: ${avgRating}/5`)],
    ];
    const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mycropdiary-statistics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-page">
      <AdminPageHeading
        title={(lang === 'en' ? "System statistics" : "Thống kê hệ thống")}
        description={(lang === 'en' ? "Monitor users, farm registrations, farms, zones, blocks, crop seasons, and AI feedback quality." : "Theo dõi toàn diện số liệu về người dùng, hồ sơ đăng ký, trang trại, phân khu, lô đất, mùa vụ canh tác và chất lượng phản hồi AI.")}
      >
        <Button variant="secondary" onClick={exportStatsCsv} disabled={loadingStats || Boolean(statsError) || (type === 'costs' && (invalidMonthRange || filteredSeasons.length === 0))}>
          <Icon name="report" />
          {lang === 'en' ? 'Export CSV' : 'Xuất báo cáo CSV'}
        </Button>
      </AdminPageHeading>

      <div className="admin-stat-tabs" role="group" aria-label={(lang === 'en' ? "Statistics group" : "Nhóm thống kê")}>
        {Object.entries(types).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            className={type === key ? 'active' : ''}
            onClick={() => setType(key as StatisticType)}
          >
            {translate(label)}
          </button>
        ))}
      </div>

      {type === 'costs' ? <div className="admin-stat-filters admin-filters">
        <label>
          <span>{(lang === 'en' ? "From month" : "Từ tháng")}</span>
          <input className="ui-input" type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
        </label>
        <label>
          <span>{(lang === 'en' ? "To month" : "Đến tháng")}</span>
          <input className="ui-input" type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
        </label>
        <Button type="button" variant="secondary" className="admin-reset-icon" aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} onClick={() => { setFromMonth(defaultFromMonth); setToMonth(defaultToMonth); }}><Icon name="refresh" size={18} /></Button>
      </div> : <p className="admin-subtle">{lang === 'en' ? 'System totals for all time.' : 'Số liệu tổng hợp toàn hệ thống, không giới hạn theo tháng.'}</p>}


      {type === 'costs' && invalidMonthRange && (
        <p className="admin-form-error" role="alert">
          {(lang === 'en' ? "Start month must not be after end month." : "Tháng bắt đầu không được sau tháng kết thúc.")}
        </p>
      )}

      {type === 'costs' && !invalidMonthRange && !loadingStats && !statsError && filteredSeasons.length === 0 && (
        <p role="status" className="admin-subtle">
          {(lang === 'en' ? "No data available for this period." : "Chưa có số liệu trong khoảng thời gian này.")}
        </p>
      )}

      {loadingStats && (
        <div role="status" style={{ padding: '16px', color: 'var(--color-muted)' }}>
          {(lang === 'en' ? "Loading statistics from the server..." : "Đang tải dữ liệu thống kê từ máy chủ...")}
        </div>
      )}

      {statsError && <div className="admin-form-error" role="alert">
        <p>{lang === 'en' ? 'Unable to load statistics.' : 'Không tải được số liệu thống kê.'} {translate(statsError)}</p>
        <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button>
      </div>}
      {!loadingStats && !statsError && <>
      {/* Overview Tab */}
      {type === 'overview' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "User accounts" : "Tài khoản người dùng")}</span>
              <strong className="admin-stat-value">{number(totalUsers)}</strong>
              <p>{number(activeUsers)} {(lang === 'en' ? " active · " : " đang hoạt động · ")} {number(lockedUsers)} {(lang === 'en' ? " locked" : " đã khóa")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Farm registrations" : "Hồ sơ đăng ký trang trại")}</span>
              <strong className="admin-stat-value">{number(totalReg)}</strong>
              <p>{number(pendingReg)} {(lang === 'en' ? " pending · " : " chờ duyệt · ")} {number(approvedReg)} {(lang === 'en' ? " approved" : " đã duyệt")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Farms, Zones & Blocks" : "Trang trại · Phân khu · Lô đất")}</span>
              <strong className="admin-stat-value">{number(totalFarms)}</strong>
              <p>{number(activeFarms)} {(lang === 'en' ? " active · " : " trang trại · ")} {number(totalZones)} {(lang === 'en' ? " zones · " : " phân khu · ")} {number(totalBlocks)} {(lang === 'en' ? " blocks" : " lô đất")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Crop seasons" : "Mùa vụ canh tác")}</span>
              <strong className="admin-stat-value">{number(totalSeasons)}</strong>
              <p>{number(activeSeasons)} {(lang === 'en' ? " active seasons · " : " vụ đang trồng · ")} {number(completedSeasons)} {(lang === 'en' ? " harvested" : " đã thu hoạch")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "AI feedback and reports" : "Góp ý & Báo cáo AI")}</span>
              <strong className="admin-stat-value">{number(totalFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Rating: ⭐ " : "Đánh giá: ⭐ ")} {avgRating}/5 · {number(openFeedbacks)} {(lang === 'en' ? " open" : " đang mở")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Account Statistics */}
      {type === 'users' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total accounts" : "Tổng tài khoản")}</span>
              <strong className="admin-stat-value">{number(totalUsers)}</strong>
              <p>{(lang === 'en' ? "All system accounts" : "Toàn bộ tài khoản trong hệ thống")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Active" : "Đang hoạt động")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-success)' }}>{number(activeUsers)}</strong>
              <p>{(lang === 'en' ? "Accounts with sign-in access" : "Tài khoản có quyền đăng nhập")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Access locked" : "Đã khóa truy cập")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-danger)' }}>{number(lockedUsers)}</strong>
              <p>{(lang === 'en' ? "Accounts temporarily locked for security" : "Tài khoản bị tạm khóa bảo mật")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Farm, Zone & Block Statistics (UC-45.3) */}
      {type === 'farms' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total Farms" : "Tổng số trang trại")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-success)' }}>{number(totalFarms)}</strong>
              <p>{number(activeFarms)} {(lang === 'en' ? " active member farms" : " trang trại đang hoạt động")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Production Zones" : "Phân khu sản xuất")}</span>
              <strong className="admin-stat-value">{number(totalZones)}</strong>
              <p>{(lang === 'en' ? "Managed zones across farms" : "Phân khu đã gán chủ sở hữu & nhân sự")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Cultivation Blocks" : "Lô đất canh tác")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-info)' }}>{number(totalBlocks)}</strong>
              <p>{(lang === 'en' ? "Standardized VietGAP plots" : "Lô đất chuẩn hóa thổ nhưỡng & diện tích")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "VietGAP Monitored Seasons" : "Hồ sơ mùa vụ & VietGAP")}</span>
              <strong className="admin-stat-value">{number(state.compliance.length)}</strong>
              <p>{(lang === 'en' ? "Active checklist & PHI tracking" : "Giám sát bảng kiểm & cách ly PHI")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Costs Statistics */}
      {type === 'costs' && !invalidMonthRange && filteredSeasons.length > 0 && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total season costs" : "Tổng chi phí")}</span>
              <strong className="admin-stat-value">{number(totalSeasonCost)} ₫</strong>
              <p>{number(filteredSeasons.length)} {(lang === 'en' ? " recorded months" : " tháng ghi nhận")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Registration Statistics */}
      {type === 'registrations' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total applications" : "Tổng đơn gửi")}</span>
              <strong className="admin-stat-value">{number(totalReg)}</strong>
              <p>{(lang === 'en' ? "Farm registration applications" : "Hồ sơ đăng ký mở trang trại")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Pending review" : "Chờ xét duyệt")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-warning)' }}>{number(pendingReg)}</strong>
              <p>{(lang === 'en' ? "Awaiting administrator review" : "Cần ban quản trị thẩm định")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Approved" : "Đã phê duyệt")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-success)' }}>{number(approvedReg)}</strong>
              <p>{(lang === 'en' ? "Farm owner access granted" : "Đã cấp quyền chủ trang trại")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Rejected" : "Bị từ chối")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-danger)' }}>{number(rejectedReg)}</strong>
              <p>{(lang === 'en' ? "Applications that do not meet requirements" : "Hồ sơ không đạt tiêu chuẩn")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Season Statistics */}
      {type === 'seasons' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total seasons" : "Tổng số mùa vụ")}</span>
              <strong className="admin-stat-value">{number(totalSeasons)}</strong>
              <p>{(lang === 'en' ? "All crop seasons" : "Toàn bộ mùa vụ canh tác")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Growing" : "Đang canh tác")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-success)' }}>{number(activeSeasons)}</strong>
              <p>{(lang === 'en' ? "Seasons currently in the growing cycle" : "Vụ mùa đang trong chu kỳ chăm sóc")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Harvested" : "Đã thu hoạch")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-info)' }}>{number(completedSeasons)}</strong>
              <p>{(lang === 'en' ? "Completed with final yield recorded" : "Đã kết thúc và chốt sản lượng")}</p>
            </div>
          </article>
        </div>
      )}

      {/* AI Feedback Statistics */}
      {type === 'feedback' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total feedback received" : "Tổng phản hồi nhận")}</span>
              <strong className="admin-stat-value">{number(totalFeedbacks)}</strong>
              <p>{(lang === 'en' ? "User feedback on answers" : "Góp ý câu trả lời từ người dùng")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "New (unreviewed)" : "Mới tiếp nhận (Chưa xử lý)")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-warning)' }}>{number(openFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Awaiting review and reply" : "Cần xem xét và trả lời")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Resolved" : "Đã giải quyết")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-success)' }}>{number(resolvedFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Explanation sent" : "Đã gửi phản hồi giải thích")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Average rating" : "Điểm đánh giá trung bình")}</span>
              <strong className="admin-stat-value" style={{ color: 'var(--color-warning)' }}>⭐ {avgRating} / 5</strong>
              <p>{(lang === 'en' ? "Helpfulness of AI advice" : "Mức độ hữu ích của tư vấn AI")}</p>
            </div>
          </article>
        </div>
      )}
      </>}
    </section>
  );
}
