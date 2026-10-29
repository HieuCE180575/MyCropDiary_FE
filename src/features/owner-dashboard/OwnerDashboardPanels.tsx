import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { formatArea, formatDate, relativeTime, timeProgress, type CropArea, type DashboardSeason, type RecentRecord, type makeDashboardDemo } from './dashboardModel';

export function DemoTag() { return <span className="owner-demo-tag" title="Dữ liệu minh họa, không được lưu vào hệ thống">Dữ liệu mẫu</span>; }

export function DashboardPanel({ title, to, demo, children, className = '', linkLabel = 'Xem tất cả' }: {
  title: string; to?: string; demo?: boolean; children: ReactNode; className?: string; linkLabel?: string;
}) {
  return <section className={'owner-panel ' + className}>
    <div className="owner-panel-heading"><div><h2>{title}</h2>{demo && <DemoTag />}</div>
      {to && <Link to={to}>{linkLabel} <Icon name="arrow" size={14} /></Link>}
    </div>{children}
  </section>;
}

export function SeasonProgressPanel({ seasons, demo }: { seasons: DashboardSeason[]; demo: boolean }) {
  const statuses: Record<string, string> = { active: 'Đang canh tác', planned: 'Chuẩn bị', completed: 'Hoàn thành', paused: 'Tạm dừng', cancelled: 'Đã hủy', archived: 'Đã lưu trữ' };
  return <DashboardPanel title="Tiến độ mùa vụ hiện tại" to="/crop-seasons" demo={demo} className="owner-season-panel">
    <div className="owner-season-list">{seasons.slice(0, 2).map(season => {
      const progress = timeProgress(season.startDate, season.endDate);
      const status = season.seasonStatus.toLowerCase();
      const crop = season.cropCategoryName?.toLowerCase() ?? '';
      const illustration = crop.includes('dưa') ? 'melon' : crop.includes('rau') ? 'lettuce' : 'generic';
      return <Link to="/crop-seasons" className="owner-season-row" key={season.cropSeasonId}>
        <span className={'owner-crop-thumb owner-crop-' + illustration} role="img" aria-label={'Ảnh minh họa ' + (season.cropCategoryName || 'cây trồng')}>{illustration === 'generic' && <Icon name="sprout" size={30} />}</span>
        <div className="owner-season-body"><div className="owner-season-title"><h3>{season.seasonName}</h3><span className={'owner-season-status status-' + status}>{statuses[status] ?? season.seasonStatus}</span></div>
          <p><Icon name="calendar" size={13} /><span>{formatDate(season.startDate)} – {formatDate(season.endDate)}</span></p>
          <div className="owner-progress-row">{progress === null ? <span className="owner-missing">Chưa đủ ngày để tính tiến độ</span> : <>
            <div className="owner-progress-track" role="progressbar" aria-label={'Tiến độ theo thời gian: ' + season.seasonName} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + '%' }} /></div><span>{progress}%</span>
          </>}</div>
        </div>
      </Link>;
    })}</div>
    <p className="owner-panel-footnote">Tiến độ theo thời gian, tính từ ngày bắt đầu đến ngày kết thúc dự kiến.</p>
  </DashboardPanel>;
}

export function CropAreaChart({ crops, demo }: { crops: CropArea[]; demo: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mode, setMode] = useState('area');
  const categories = crops.length > 4 ? [...crops.slice(0, 3), { name: 'Khác', areaM2: crops.slice(3).reduce((sum, crop) => sum + crop.areaM2, 0) }] : crops;
  const total = categories.reduce((sum, crop) => sum + crop.areaM2, 0);
  const showArea = (area: number) => total >= 10000
    ? `${(area / 10000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ha` : formatArea(area);
  const circumference = 2 * Math.PI * 66;
  let offset = 0;
  const selected = hovered === null ? null : categories[hovered];
  return <section className="owner-panel owner-crop-panel">
    <div className="owner-panel-heading"><div><h2>Biểu đồ diện tích theo loại cây trồng</h2>{demo && <DemoTag />}</div>
      <select aria-label="Cách hiển thị diện tích cây trồng" value={mode} onChange={event => setMode(event.target.value)}><option value="area">Theo diện tích</option><option value="percent">Theo tỷ lệ</option></select>
    </div>
    <div className="owner-chart-layout">
      <div className="owner-donut">
        <svg viewBox="0 0 160 160" role="img" aria-label={'Diện tích theo loại cây trồng, tổng ' + formatArea(total)}>
          {categories.map((crop, index) => {
            const length = total ? crop.areaM2 / total * circumference : 0;
            const start = offset; offset += length;
            return <circle key={crop.name} cx="80" cy="80" r="66" fill="none" stroke={'var(--owner-chart-' + index + ')'} strokeWidth="26" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 80 80)"
              opacity={hovered === null || hovered === index ? 1 : .35} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
              <title>{crop.name}: {showArea(crop.areaM2)} ({total ? Math.round(crop.areaM2 / total * 100) : 0}%)</title>
            </circle>;
          })}
        </svg><div className="owner-donut-label" aria-live="polite"><strong>{showArea(selected?.areaM2 ?? total)}</strong><span>{selected?.name ?? 'Tổng diện tích'}</span></div>
      </div>
      <div className="owner-chart-legend">{categories.map((crop, index) => {
        const percentage = total ? Math.round(crop.areaM2 / total * 100) : 0;
        return <button key={crop.name} type="button" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => setHovered(hovered === index ? null : index)}>
          <span className="owner-legend-dot" style={{ background: 'var(--owner-chart-' + index + ')' }} /><span>{crop.name}</span><strong>{mode === 'area' ? `${showArea(crop.areaM2)} (${percentage}%)` : `${percentage}% · ${showArea(crop.areaM2)}`}</strong>
        </button>;
      })}</div>
    </div>
  </section>;
}

type Demo = ReturnType<typeof makeDashboardDemo>;
export function UpcomingTasksPanel({ tasks }: { tasks: Demo['tasks'] }) {
  return <DashboardPanel title="Công việc sắp tới" to="/tasks" demo>
    <div className="owner-task-list">{tasks.map(task => {
      const date = new Date(task.date + 'T00:00:00');
      return <Link to="/tasks" key={task.name} className="owner-task-row"><span className="owner-task-date"><strong>{date.getDate().toString().padStart(2, '0')}</strong><span>Th{date.getMonth() + 1}</span></span><span className={'owner-small-icon icon-' + task.icon}><Icon name={task.icon} /></span><span className="owner-task-info"><strong>{task.name}</strong><span>{task.detail}</span></span></Link>;
    })}</div>
  </DashboardPanel>;
}

export function EnvironmentPanel() {
  const measurements = [
    { name: 'Nhiệt độ', value: '28,5', unit: '°C', change: '+1,2°C', icon: 'thermometer', tone: 'red' },
    { name: 'Độ ẩm', value: '75', unit: '%', change: '+5%', icon: 'drop', tone: 'blue' },
    { name: 'Ánh sáng', value: '12.400', unit: 'lux', change: '+8%', icon: 'sun', tone: 'amber' },
    { name: 'Độ pH đất', value: '6,5', unit: '', change: '— 0', icon: 'flask', tone: 'brown' },
  ];
  return <DashboardPanel title="Điều kiện & môi trường" demo className="owner-environment-panel" to="/environment" linkLabel="Xem chi tiết">
    <div className="owner-environment-grid">{measurements.map(measurement => <div className={'owner-measurement tone-' + measurement.tone} key={measurement.name}>
      <Icon name={measurement.icon} size={25} /><div><span>{measurement.name}</span><strong>{measurement.value}<small>{measurement.unit}</small></strong><span className="owner-change">{measurement.change.startsWith('+') && <Icon name="arrow-up" size={11} />}{measurement.change}</span></div>
    </div>)}</div>
  </DashboardPanel>;
}

export function RecentActivityPanel({ records, demo }: { records: RecentRecord[]; demo: boolean }) {
  return <DashboardPanel title="Nhật ký hoạt động gần đây" to="/activities" demo>
    <div className="owner-recent-list">{records.map(record => <Link to={record.to} key={record.id} className="owner-recent-row">
      <span className={'owner-small-icon icon-' + record.icon}><Icon name={record.icon} /></span><span className="owner-recent-body"><strong>{record.title}</strong><span>{record.detail}</span></span><time dateTime={record.at}>{relativeTime(record.at)}</time>
    </Link>)}</div>
  </DashboardPanel>;
}
