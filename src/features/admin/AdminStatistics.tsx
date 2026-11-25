import { AdminAnalyticsDashboard, type AnalyticsReport } from './AdminAnalyticsDashboard';
import { AdminAccountCharts } from './AdminAccountCharts';
import { AdminPageHeading } from './AdminComponents';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';

import { useState, useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import { useAuth } from '../auth';

import { fetchAdminStatistics, type AdminStatisticsData } from './adminService';

const types = {
  users: { vi: 'Tài khoản', en: 'Accounts' },
  farms: { vi: 'Trang trại & Vùng trồng', en: 'Farms & Zones' },
  seasons: { vi: 'Mùa vụ', en: 'Seasons' },
  costs: { vi: 'Chi phí', en: 'Costs' },
  registrations: { vi: 'Hồ sơ trang trại', en: 'Farm Applications' },
  feedback: { vi: 'Phản hồi AI', en: 'AI Feedback' },
};
type StatisticType = keyof typeof types;

export function AdminStatistics() {
  const { lang, t: translate } = useLanguage();
  const { state, registrationsLoading, registrationsError, reloadRegistrations } = useAdmin();
  const { user } = useAuth();
  const [type, setType] = useState<StatisticType>('users');
  const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
  const [accountMonths, setAccountMonths] = useState(6);
  const [costFiltersOpen, setCostFiltersOpen] = useState(false);
  useEffect(() => {
    if (costFiltersOpen && type === 'costs') document.querySelector<HTMLInputElement>('.admin-stat-filters input')?.focus();
  }, [costFiltersOpen, type]);
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const defaultFromMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
  const defaultToMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [fromMonth, setFromMonth] = useState(defaultFromMonth);
  const [toMonth, setToMonth] = useState(defaultToMonth);
  const presetStart = new Date(today.getFullYear(), today.getMonth() - accountMonths + 1, 1);
  const customCostPeriod = type === 'costs' && (fromMonth !== `${presetStart.getFullYear()}-${String(presetStart.getMonth() + 1).padStart(2, '0')}` || toMonth !== defaultToMonth);
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

  const missingMonth = !/^\d{4}-(0[1-9]|1[0-2])$/.test(fromMonth) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(toMonth);
  const invalidMonthRange = missingMonth || fromMonth > toMonth;
  const exportStatsCsv = () => {
    const text = (vi: string, en: string) => lang === 'en' ? en : vi;
    const rows = [
      [text('Chỉ tiêu thống kê', 'Metric'), text('Giá trị', 'Value'), text('Ghi chú', 'Notes')],
      [text('Tổng tài khoản', 'Total accounts'), String(statsData?.accounts?.totalUsers ?? state.users.length), ''],
      [text('Đang hoạt động', 'Active'), String(statsData?.accounts?.activeUsers ?? state.users.filter(item => item.status === 'ACTIVE').length), ''],
      [text('Đã khóa', 'Locked'), String(statsData?.accounts?.lockedUsers ?? state.users.filter(item => item.status === 'LOCKED').length), ''],
    ];
    const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const selectedRows = type === 'users' ? rows : [rows[0], ...(analyticsReport?.rows ?? [])];
    if (type !== 'users' && !analyticsReport?.hasData) return;
    const csv = selectedRows.map(r => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mycropdiary-statistics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-page admin-statistics-page">
      <AdminPageHeading
        hideEyebrow
        title={(lang === 'en' ? "System statistics" : "Thống kê hệ thống")}
        description={(lang === 'en' ? "Monitor users, farm registrations, farms, zones, blocks, crop seasons, and AI feedback quality." : "Theo dõi toàn diện số liệu về người dùng, hồ sơ đăng ký, trang trại, phân khu, lô đất, mùa vụ canh tác và chất lượng phản hồi AI.")}
      >
        <div className="account-page-actions">
        <label className="account-period"><Icon name="calendar" /><select className="ui-select" aria-label={lang === 'en' ? 'Chart period' : 'Khoảng thời gian biểu đồ'} value={customCostPeriod ? 0 : accountMonths} onChange={event => { const value = Number(event.target.value); setAccountMonths(value); if (type === 'costs') { const start = new Date(today.getFullYear(), today.getMonth() - value + 1, 1); setFromMonth(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`); setToMonth(defaultToMonth); } }}>{customCostPeriod && <option value={0} disabled>{lang === 'en' ? 'Custom period' : 'Khoảng thời gian tùy chỉnh'}</option>}{[3, 6, 12].map(value => <option key={value} value={value}>{lang === 'en' ? `Last ${value} months` : `${value} tháng gần nhất`}</option>)}</select></label>
        <Button variant="secondary" onClick={exportStatsCsv} disabled={loadingStats || Boolean(statsError) || (type !== 'users' && !analyticsReport?.hasData) || (type === 'costs' && invalidMonthRange)}>
          <Icon name="report" />
          {lang === 'en' ? 'Export CSV' : 'Xuất báo cáo CSV'}
        </Button>
        </div>
      </AdminPageHeading>

      <div className="admin-stat-tabs" role="group" aria-label={(lang === 'en' ? "Statistics group" : "Nhóm thống kê")}>
        {Object.entries(types).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            className={type === key ? 'active' : ''}
            onClick={() => { if (type !== key) { setAnalyticsReport(null); setType(key as StatisticType); } }}
          >
            {lang === 'en' ? label.en : label.vi}
          </button>
        ))}
      </div>

      <p className="admin-subtle">{type === 'costs' ? (lang === 'en' ? 'Production costs, expense categories and monthly trends.' : 'Các chỉ số thống kê về chi phí sản xuất, bao gồm tổng chi phí, cơ cấu theo danh mục và xu hướng theo thời gian.') : type === 'seasons' ? (lang === 'en' ? 'Crop season statistics across the system.' : 'Các chỉ số thống kê mùa vụ trong hệ thống.') : (lang === 'en' ? 'Cards show current system totals. The selected period applies to time charts.' : 'Các thẻ hiển thị tổng số hiện tại. Khoảng tháng áp dụng cho biểu đồ theo thời gian.')}</p>
      {type === 'costs' && costFiltersOpen && <div className="admin-stat-filters admin-filters">
        <label>
          <span>{(lang === 'en' ? "From month" : "Từ tháng")}</span>
          <input className="ui-input" type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
        </label>
        <label>
          <span>{(lang === 'en' ? "To month" : "Đến tháng")}</span>
          <input className="ui-input" type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
        </label>
        <Button type="button" variant="secondary" className="admin-reset-icon" aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} onClick={() => { setFromMonth(defaultFromMonth); setToMonth(defaultToMonth); setAccountMonths(6); }}><Icon name="refresh" size={18} /></Button>
      </div>}


      {type === 'costs' && invalidMonthRange && (
        <p className="admin-form-error" role="alert">
          {missingMonth ? (lang === 'en' ? 'Select both start and end months.' : 'Vui lòng chọn đủ tháng bắt đầu và tháng kết thúc.') : (lang === 'en' ? "Start month must not be after end month." : "Tháng bắt đầu không được sau tháng kết thúc.")}
        </p>
      )}

      {type === 'costs' && !invalidMonthRange && !loadingStats && !statsError && analyticsReport && !analyticsReport.hasData && (
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
      {type === 'users' && <AdminAccountCharts users={state.users} accounts={statsData?.accounts} months={accountMonths} />}

      {type !== 'users' && (type !== 'costs' || !invalidMonthRange) && <AdminAnalyticsDashboard key={type} tab={type} months={accountMonths} registrations={state.registrations} registrationsLoading={registrationsLoading} registrationsError={registrationsError} reloadRegistrations={reloadRegistrations} fromMonth={fromMonth} toMonth={toMonth} onReport={setAnalyticsReport} onChoosePeriod={() => setCostFiltersOpen(true)} />}
      </>}
    </section>
  );
}
