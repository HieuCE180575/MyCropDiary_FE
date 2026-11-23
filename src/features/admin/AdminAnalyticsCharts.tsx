import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';

export const analyticsColors = ['var(--color-success)', '#80cf75', '#f5b900', '#5799f3', '#a78bfa', 'var(--color-danger)', '#94a3b8'];
export type ChartPoint = { label: string; value: number | null };
export type ChartSlice = { label: string; value: number; color?: string };
export function AnalyticsPanel({ title, icon = 'report', children, className = '' }: { title: string; icon?: string; children: ReactNode; className?: string }) {
  return <article className={`analytics-panel ${className}`}><h2><Icon name={icon} size={22} />{title}</h2>{children}</article>;
}
export function AnalyticsMissing({ children }: { children?: ReactNode }) {
  const { lang } = useLanguage();
  return <div className="analytics-missing">{children || (lang === 'en' ? 'No data available.' : 'Chưa có dữ liệu.')}</div>;
}
export function AnalyticsPlot({ points, secondary, kind = 'line', unit = '', maxValue, decimalScale = false }: { points: ChartPoint[]; secondary?: { label: string; points: ChartPoint[] }; kind?: 'line' | 'bar'; unit?: string; maxValue?: number; decimalScale?: boolean }) {
  const { lang } = useLanguage();
  const number = (value: number) => value.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 2 });
  if (!points.length || points.every(item => item.value == null)) return <AnalyticsMissing />;
  const max = Math.max(decimalScale ? 0 : 1, ...points.map(item => item.value ?? 0), ...(secondary?.points.map(item => item.value ?? 0) ?? []));
  const top = maxValue ?? (decimalScale ? Math.ceil((max || 1) * 1.2 * 10) / 10 : Math.ceil(Math.max(4, max) / 4) * 4);
  const x = (index: number) => 46 + (index + .5) * 550 / points.length;
  const y = (value: number) => 186 - value / top * 142;
  const sequences = (values: ChartPoint[]) => {
    const segments: string[][] = [[]];
    values.forEach((item, index) => { if (item.value == null) segments.push([]); else segments[segments.length - 1].push(`${x(index)},${y(item.value)}`); });
    return segments.filter(segment => segment.length);
  };
  return <>
    {unit && <p className="analytics-unit">{unit}</p>}
    {secondary && <div className="analytics-chart-legend"><span><i />{lang === 'en' ? 'Processed' : 'Đã xử lý'}</span><span><i />{secondary.label}</span></div>}
    <svg className="analytics-plot" viewBox="0 0 620 235" role="img" aria-label={points.map(item => `${item.label}: ${item.value == null ? '—' : number(item.value)}`).join('; ')}>
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="46" x2="596" y1={186 - tick * 35.5} y2={186 - tick * 35.5} className="account-gridline" /><text x="36" y={190 - tick * 35.5} textAnchor="end">{number(top * tick / 4)}</text></g>)}
      {kind === 'line' && sequences(points).map((segment, index) => <g key={index}><polygon points={`${segment[0].split(',')[0]},186 ${segment.join(' ')} ${segment.at(-1)!.split(',')[0]},186`} fill="var(--color-success)" opacity=".12" /><polyline points={segment.join(' ')} fill="none" stroke="var(--color-success)" strokeWidth="2.5" /></g>)}
      {secondary && sequences(secondary.points).map((segment, index) => <polyline key={index} points={segment.join(' ')} fill="none" stroke="#56c98d" strokeWidth="2.5" />)}
      {points.map((item, index) => <g key={index}>
        {item.value != null && <>
          {kind === 'bar' ? <rect x={x(index) - Math.min(34, 180 / points.length)} y={y(item.value)} width={Math.min(68, 360 / points.length)} height={186 - y(item.value)} rx="5" fill={index === points.length - 1 ? 'var(--color-success)' : '#80cf98'}><title>{item.label}: {number(item.value)} {unit}</title></rect> : <circle cx={x(index)} cy={y(item.value)} r="4.5" fill="var(--color-success)" stroke="var(--color-surface, white)" strokeWidth="2"><title>{item.label}: {number(item.value)} {unit}</title></circle>}
          <text x={x(index)} y={y(item.value) - 10} textAnchor="middle" fontWeight="700">{number(item.value)}</text>
        </>}
        <text x={x(index)} y="209" textAnchor="middle" className="analytics-axis-label"><title>{item.label}</title>{item.label.length > 17 ? `${item.label.slice(0, 15)}…` : item.label}</text>
      </g>)}
      {secondary?.points.map((item, index) => item.value != null && <circle key={index} cx={x(index)} cy={y(item.value)} r="4" fill="#56c98d"><title>{item.label}: {number(item.value)}</title></circle>)}
    </svg>
  </>;
}
export function AnalyticsDonut({ slices, center, unit }: { slices: ChartSlice[]; center?: string; unit: string }) {
  const { lang } = useLanguage();
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const format = (value: number) => value.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 });
  return <div className="analytics-donut-layout"><div className="analytics-donut"><svg viewBox="0 0 220 220" role="img" aria-label={slices.map(item => `${item.label}: ${format(item.value)}`).join('; ')}>
    <circle cx="110" cy="110" r="82" fill="none" stroke="var(--color-border, #e2e8f0)" strokeWidth="30" />
    {slices.map((item, index) => { const share = total ? item.value / total * 100 : 0; const start = offset; offset += share;
      return <circle key={item.label} cx="110" cy="110" r="82" fill="none" stroke={item.color || analyticsColors[index % analyticsColors.length]} strokeWidth="30" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"><title>{item.label}: {format(item.value)}</title></circle>;
    })}
    <text x="110" y="107" textAnchor="middle" className="analytics-donut-value">{center ?? format(total)}</text><text x="110" y="133" textAnchor="middle">{unit}</text>
  </svg></div><ul className="analytics-donut-legend">{slices.map((item, index) => <li key={item.label}><i style={{ background: item.color || analyticsColors[index % analyticsColors.length] }} /><span>{item.label}</span><strong>{format(item.value)} ({format(total ? item.value / total * 100 : 0)}%)</strong></li>)}</ul></div>;
}
export function AnalyticsGroupedBars({ rows }: { rows: { label: string; zones: number; blocks: number }[] }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  if (!rows.length) return <AnalyticsMissing />;
  const top = Math.max(4, Math.ceil(Math.max(...rows.flatMap(row => [row.zones, row.blocks]))));
  const height = Math.max(235, rows.length * 62 + 60);
  return <div className="analytics-grouped-bars"><div className="analytics-chart-legend"><span><i />{en ? 'Zones' : 'Phân khu'}</span><span><i />{en ? 'Plots' : 'Lô đất'}</span></div>
    <svg viewBox={`0 0 620 ${height}`} role="img" aria-label={rows.map(row => `${row.label}: ${row.zones} ${en ? 'zones' : 'phân khu'}, ${row.blocks} ${en ? 'plots' : 'lô đất'}`).join('; ')}>
      {[0, 1, 2, 3, 4].map(index => <g key={index}><line x1={170 + index * 100} x2={170 + index * 100} y1="22" y2={height - 43} className="account-gridline" /><text x={170 + index * 100} y={height - 23} textAnchor="middle">{(top * index / 4).toLocaleString(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 })}</text></g>)}
      {rows.map((row, index) => <g key={index}><text x="155" y={48 + index * 62} textAnchor="end"><title>{row.label}</title>{row.label.length > 21 ? `${row.label.slice(0, 19)}…` : row.label}</text>
        {[row.zones, row.blocks].map((value, series) => <g key={series}><rect x="170" y={28 + index * 62 + series * 21} width={value / top * 400} height="18" rx="3" fill={series ? 'var(--color-success)' : '#9ce3a2'}><title>{row.label} — {series ? (en ? 'Plots' : 'Lô đất') : (en ? 'Zones' : 'Phân khu')}: {value}</title></rect><text x={180 + value / top * 400} y={42 + index * 62 + series * 21}>{value}</text></g>)}
      </g>)}
    </svg></div>;
}
export function AnalyticsRecent({ title, to, headers, rows, expandable = false }: { title: string; to?: string; headers: string[]; rows: { id: string; cells: ReactNode[] }[]; expandable?: boolean }) {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const visible = expandable && !expanded ? rows.slice(0, 3) : rows;
  return <article className="analytics-panel analytics-recent"><div className="analytics-table-heading"><h2><Icon name="history" size={22} />{title}</h2>{to && <Link to={to}>{lang === 'en' ? 'View all' : 'Xem tất cả'}<Icon name="arrow" size={16} /></Link>}{expandable && rows.length > 3 && <button type="button" className="analytics-view-all" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? (lang === 'en' ? 'Show less' : 'Thu gọn') : (lang === 'en' ? 'View all' : 'Xem tất cả')}<Icon name="arrow" size={16} /></button>}</div><div className="ui-table-scroll"><table className="account-recent-table"><thead><tr>{['#', ...headers].map((label, index) => <th scope="col" key={index}>{label}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id}><td>{index + 1}</td>{row.cells.map((cell, column) => <td key={column}>{cell ?? '—'}</td>)}</tr>)}</tbody></table></div>{!rows.length && <AnalyticsMissing />}</article>;
}
