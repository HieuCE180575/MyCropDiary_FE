import { StatusBadge } from '../../shared/components/StatusBadge';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { formatNumber as uiFormatNumber, formatDate as uiFormatDate } from '../../shared/format/formatters';
import { useState, type ReactNode } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';


import { formatArea, formatDate, relativeTime, timeProgress, type CropArea, type DashboardSeason, type RecentRecord, type makeDashboardDemo } from './dashboardModel';

export function DemoTag() {
  const { lang, t: translate } = useLanguage();
  return <span className="owner-demo-tag" title={lang === 'en' ? 'Illustrative sample data, not persisted' : 'Dữ liệu minh họa, không được lưu vào hệ thống'}>{translate("Sample Data")}</span>;
}

export function DashboardPanel({ title, to, demo, children, className = '', linkLabel }: {
  title: string; to?: string; demo?: boolean; children: ReactNode; className?: string; linkLabel?: string;
}) {
  const { t: translate } = useLanguage();
  const resolvedLinkLabel = linkLabel || 'View all';
  return <section className={'owner-panel ' + className}>
    <div className="owner-panel-heading"><div><h2>{translate(title)}</h2>{demo && <DemoTag />}</div>
      {to && <Link to={to}>{translate(resolvedLinkLabel)} <Icon name="arrow" size={14} /></Link>}
    </div>{children}
  </section>;
}

export function SeasonProgressPanel({ seasons, demo }: { seasons: DashboardSeason[]; demo: boolean }) {
  const { lang } = useLanguage();
  const statuses: Record<string, string> = {
    active: 'Active',
    planned: 'Planned',
    completed: 'Completed',
    paused: 'Paused',
    cancelled: 'Cancelled',
    archived: 'Archived',
  };
  return <DashboardPanel title='Current Crop Season Progress' to="/crop-seasons" demo={demo} className="owner-season-panel">
    <div className="owner-season-list">{seasons.slice(0, 2).map(season => {
      const progress = timeProgress(season.startDate, season.endDate);
      const status = season.seasonStatus.toLowerCase();
      const crop = season.cropCategoryName?.toLowerCase() ?? '';
      const illustration = crop.includes('dưa') ? 'melon' : crop.includes('rau') ? 'lettuce' : 'generic';
      return <Link to="/crop-seasons" className="owner-season-row" key={season.cropSeasonId}>
        <span className={'owner-crop-thumb owner-crop-' + illustration} role="img" aria-label={(lang === 'en' ? "Illustration " + (season.cropCategoryName || "crop") : 'Ảnh minh họa ' + (season.cropCategoryName || 'cây trồng'))}>{illustration === 'generic' && <Icon name="sprout" size={30} />}</span>
        <div className="owner-season-body"><div className="owner-season-title"><h3>{season.seasonName}</h3><StatusBadge tone={status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'neutral'} label={statuses[status] ?? season.seasonStatus} /></div>
          <p><Icon name="calendar" size={13} /><span>{formatDate(season.startDate, lang)} – {formatDate(season.endDate, lang)}</span></p>
          <div className="owner-progress-row">{progress === null ? <span className="owner-missing">{(lang === 'en' ? "Not enough date information to calculate progress" : "Chưa đủ ngày để tính tiến độ")}</span> : <>
            <div className="owner-progress-track" role="progressbar" aria-label={(lang === 'en' ? "Progress over time: " + season.seasonName : 'Tiến độ theo thời gian: ' + season.seasonName)} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + '%' }} /></div><span>{progress}%</span>
          </>}</div>
        </div>
      </Link>;
    })}</div>
    <p className="owner-panel-footnote">{lang === 'en' ? 'Progress over time, calculated from start date to estimated end date.' : 'Tiến độ theo thời gian, tính từ ngày bắt đầu đến ngày kết thúc dự kiến.'}</p>
  </DashboardPanel>;
}

export function CropAreaChart({ crops, demo }: { crops: CropArea[]; demo: boolean }) {
  const { lang, t: translate } = useLanguage();
  const [hovered, setHovered] = useState<number | null>(null);
  const [mode, setMode] = useState('area');
  const categories = crops.length > 4 ? [...crops.slice(0, 3), { name: lang === 'en' ? 'Other' : 'Khác', areaM2: crops.slice(3).reduce((sum, crop) => sum + crop.areaM2, 0) }] : crops;
  const total = categories.reduce((sum, crop) => sum + crop.areaM2, 0);
  const showArea = (area: number) => total >= 10000
    ? `${uiFormatNumber((area / 10000), lang, { maximumFractionDigits: 2 })} ha` : formatArea(area, lang);
  const circumference = 2 * Math.PI * 66;
  let offset = 0;
  const selected = hovered === null ? null : categories[hovered];
  return <section className="owner-panel owner-crop-panel">
    <div className="owner-panel-heading"><div><h2>{translate("Area by Crop Type")}</h2>{demo && <DemoTag />}</div>
      <select className="ui-select" aria-label={(lang === 'en' ? "Crop area display mode" : "Cách hiển thị diện tích cây trồng")} value={mode} onChange={event => setMode(event.target.value)}><option value="area">{translate("By Area")}</option><option value="percent">{translate("By Percentage")}</option></select>
    </div>
    <div className="owner-chart-layout">
      <div className="owner-donut">
        <svg viewBox="0 0 160 160" role="img" aria-label={(lang === 'en' ? "Area by crop type, total " + formatArea(total, lang) : 'Diện tích theo loại cây trồng, tổng ' + formatArea(total, lang))}>
          {categories.map((crop, index) => {
            const length = total ? crop.areaM2 / total * circumference : 0;
            const start = offset; offset += length;
            return <circle key={crop.name} cx="80" cy="80" r="66" fill="none" stroke={'var(--owner-chart-' + index + ')'} strokeWidth="26" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 80 80)"
              opacity={hovered === null || hovered === index ? 1 : .35} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
              <title>{demo ? translate(crop.name) : crop.name}: {showArea(crop.areaM2)} ({total ? Math.round(crop.areaM2 / total * 100) : 0}%)</title>
            </circle>;
          })}
        </svg><div className="owner-donut-label" aria-live="polite"><strong>{showArea(selected?.areaM2 ?? total)}</strong><span>{(selected ? (demo ? translate(selected.name) : selected.name) : null) ?? (lang === 'en' ? 'Total Area' : 'Tổng diện tích')}</span></div>
      </div>
      <div className="owner-chart-legend">{categories.map((crop, index) => {
        const percentage = total ? Math.round(crop.areaM2 / total * 100) : 0;
        return <button key={crop.name} type="button" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => setHovered(hovered === index ? null : index)}>
          <span className="owner-legend-dot" style={{ background: 'var(--owner-chart-' + index + ')' }} /><span>{demo ? translate(crop.name) : crop.name}</span><strong>{mode === 'area' ? `${showArea(crop.areaM2)} (${percentage}%)` : `${percentage}% · ${showArea(crop.areaM2)}`}</strong>
        </button>;
      })}</div>
    </div>
  </section>;
}

type Demo = ReturnType<typeof makeDashboardDemo>;
export function UpcomingTasksPanel({ tasks }: { tasks: Demo['tasks'] }) {
  const { lang, t: translate } = useLanguage();
  return <DashboardPanel title={lang === 'en' ? 'Upcoming Tasks' : 'Công việc sắp tới'} to="/tasks" demo>
    <div className="owner-task-list">{tasks.map(task => {
      const date = new Date(task.date + 'T00:00:00');
      return <Link to="/tasks" key={task.name} className="owner-task-row"><span className="owner-task-date"><strong>{date.getDate().toString().padStart(2, '0')}</strong><span>{lang === 'en' ? uiFormatDate(date, lang, { month: 'short' }) : 'Th' + (date.getMonth() + 1)}</span></span><span className={'owner-small-icon icon-' + task.icon}><Icon name={task.icon} /></span><span className="owner-task-info"><strong>{translate(task.name)}</strong><span>{translate(task.detail)}</span></span></Link>;
    })}</div>
  </DashboardPanel>;
}

export function EnvironmentPanel() {
  const { lang, t: translate } = useLanguage();
  const measurements = [
    { name: lang === 'en' ? 'Temperature' : 'Nhiệt độ', value: uiFormatNumber(28.5, lang), unit: '°C', change: '+' + uiFormatNumber(1.2, lang) + '°C', icon: 'thermometer', tone: 'red' },
    { name: lang === 'en' ? 'Humidity' : 'Độ ẩm', value: '75', unit: '%', change: '+5%', icon: 'drop', tone: 'blue' },
    { name: lang === 'en' ? 'Light' : 'Ánh sáng', value: uiFormatNumber(12400, lang), unit: 'lux', change: '+8%', icon: 'sun', tone: 'amber' },
    { name: lang === 'en' ? 'Soil pH' : 'Độ pH đất', value: uiFormatNumber(6.5, lang), unit: '', change: '— 0', icon: 'flask', tone: 'brown' },
  ];
  return <DashboardPanel title={lang === 'en' ? 'Environment & Field Conditions' : 'Điều kiện & môi trường'} demo className="owner-environment-panel" to="/environment" linkLabel="View Details">
    <div className="owner-environment-grid">{measurements.map(measurement => <div className={'owner-measurement tone-' + measurement.tone} key={measurement.name}>
      <Icon name={measurement.icon} size={25} /><div><span>{measurement.name}</span><strong>{measurement.value}<small>{translate(measurement.unit)}</small></strong><span className="owner-change">{measurement.change.startsWith('+') && <Icon name="arrow-up" size={11} />}{measurement.change}</span></div>
    </div>)}</div>
  </DashboardPanel>;
}

export function RecentActivityPanel({ records, demo }: { records: RecentRecord[]; demo: boolean }) {
  const { lang, t: translate } = useLanguage();
  return <DashboardPanel title={lang === 'en' ? 'Recent Activity Log' : 'Nhật ký hoạt động gần đây'} to="/activities" demo>
    <div className="owner-recent-list">{records.map(record => <Link to={record.to} key={record.id} className="owner-recent-row">
      <span className={'owner-small-icon icon-' + record.icon}><Icon name={record.icon} /></span><span className="owner-recent-body"><strong>{translate(record.title)}</strong><span>{demo ? translate(record.detail) : record.detail}</span></span><time dateTime={record.at}>{relativeTime(record.at, lang)}</time>
    </Link>)}</div>
  </DashboardPanel>;
}
