import { Icon } from '../../shared/components/Icon';
import { useState } from 'react';
import { useAdmin } from './AdminProvider';
import { AdminEmpty, AdminPageHeading } from './AdminComponents';

const types = { users: 'Người dùng', seasons: 'Mùa vụ', costs: 'Chi phí', checklists: 'Bảng kiểm' };
type StatisticType = keyof typeof types;
const number = (value: number) => value.toLocaleString('vi-VN');
const money = (value: number) => value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function AdminStatistics() {
  const { state } = useAdmin();
  const [type, setType] = useState<StatisticType>('users');
  const [from, setFrom] = useState('2026-04');
  const [to, setTo] = useState('2026-09');
  const invalid = !!from && !!to && from > to;
  const months = invalid ? [] : state.seasons.filter(item => (!from || item.month >= from) && (!to || item.month <= to));
  const accounts = invalid ? [] : state.users.filter(item => (!from || item.createdAt.slice(0, 7) >= from) && (!to || item.createdAt.slice(0, 7) <= to));
  const sum = (key: 'planned' | 'active' | 'completed' | 'cancelled' | 'cost' | 'checked' | 'complete') => months.reduce((total, item) => total + item[key], 0);
  const stats = type === 'users' ? [ ['Tài khoản đăng ký', number(accounts.length)], ['Đang hoạt động', number(accounts.filter(item => item.status === 'ACTIVE').length)], ['Đã khóa', number(accounts.filter(item => item.status === 'LOCKED').length)], ['Quản trị viên', number(accounts.filter(item => item.role === 'ADMIN').length)] ]
    : type === 'seasons' ? [['Lên kế hoạch', number(sum('planned'))], ['Đang thực hiện', number(sum('active'))], ['Đã hoàn thành', number(sum('completed'))], ['Đã hủy', number(sum('cancelled'))]]
      : type === 'costs' ? [['Tổng chi phí', money(sum('cost'))], ['Bình quân mỗi tháng', money(months.length ? sum('cost') / months.length : 0)], ['Tháng cao nhất', money(Math.max(0, ...months.map(item => item.cost)))], ['Số tháng có dữ liệu', number(months.length)]]
        : [['Lượt kiểm tra', number(sum('checked'))], ['Hồ sơ đầy đủ', number(sum('complete'))], ['Cần bổ sung', number(sum('checked') - sum('complete'))], ['Tỷ lệ đầy đủ', `${sum('checked') ? Math.round(sum('complete') / sum('checked') * 100) : 0}%`]];
  const rows = months.map(item => {
    const value = type === 'users' ? accounts.filter(account => account.createdAt.startsWith(item.month)).length : type === 'seasons' ? item.planned + item.active + item.completed + item.cancelled : type === 'costs' ? item.cost : item.checked;
    return { ...item, label: `Tháng ${Number(item.month.slice(5))}/${item.month.slice(0, 4)}`, value };
  });
  const maximum = Math.max(1, ...rows.map(item => item.value));
  const valueLabel = type === 'users' ? 'Tài khoản đăng ký' : type === 'seasons' ? 'Mùa vụ ghi nhận' : type === 'costs' ? 'Chi phí tổng hợp' : 'Lượt kiểm tra';
  return <section className="admin-page"><AdminPageHeading title="Thống kê hệ thống" description="Theo dõi số liệu tổng hợp về người dùng, mùa vụ, chi phí và chất lượng hồ sơ." />
    <div className="admin-stat-tabs" role="group" aria-label="Nhóm thống kê">{Object.entries(types).map(([key, label]) => <button key={key} aria-pressed={type === key} className={type === key ? 'active' : ''} onClick={() => setType(key as StatisticType)}>{label}</button>)}</div>
    <div className="admin-panel admin-stat-filters"><strong>Kỳ thống kê</strong><label>Từ tháng<input type="month" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Đến tháng<input type="month" value={to} onChange={event => setTo(event.target.value)} /></label><button className="admin-reset" onClick={() => { setFrom('2026-04'); setTo('2026-09'); }}><Icon name="refresh" />Đặt lại</button><span className="admin-subtle">Dữ liệu minh họa tháng 4–9/2026</span></div>
    {invalid && <p className="admin-form-error" role="alert">Tháng bắt đầu không được sau tháng kết thúc.</p>}
    <div className="admin-summary-grid">{stats.map(([label, value]) => <article className="admin-summary-card" key={label}><div><span>{label}</span><strong className="admin-stat-value">{value}</strong><p>Trong kỳ thống kê được chọn</p></div></article>)}</div>
    <div className="admin-panel"><div className="admin-list-heading"><div><h2>{valueLabel} theo tháng</h2><p>Số liệu tổng hợp trong bản xem trước.</p></div><span className="admin-chart-legend"><i />{types[type]}</span></div>
      {rows.length ? <div className="admin-bar-chart" role="img" aria-label={`Biểu đồ ${valueLabel.toLocaleLowerCase('vi-VN')}. Số liệu chi tiết trong bảng bên dưới.`}>{rows.map(item => <div className="admin-bar-column" key={item.month}><span>{type === 'costs' ? `${number(item.value / 1000000)} tr` : number(item.value)}</span><div className="admin-bar-track"><div style={{ height: `${item.value / maximum * 100}%` }} /></div><small>{item.label}</small></div>)}</div> : <AdminEmpty title="Chưa có số liệu trong khoảng thời gian này" text="Hãy chọn một khoảng thời gian khác để xem thống kê." />}
    </div>
    <section className="admin-panel admin-stat-table"><div className="admin-list-heading"><h2>Số liệu chi tiết</h2></div><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Số liệu thống kê {types[type].toLocaleLowerCase('vi-VN')} theo tháng</caption><thead><tr><th scope="col">Tháng</th><th scope="col">{valueLabel}</th>{type === 'checklists' && <><th scope="col">Hồ sơ đầy đủ</th><th scope="col">Cần bổ sung</th></>}{type === 'seasons' && <><th scope="col">Lên kế hoạch</th><th scope="col">Đang thực hiện</th><th scope="col">Đã hoàn thành</th><th scope="col">Đã hủy</th></>}</tr></thead><tbody>{rows.map(item => <tr key={item.month}><td>{item.label}</td><td><strong>{type === 'costs' ? money(item.value) : number(item.value)}</strong></td>{type === 'checklists' && <><td>{number(item.complete)}</td><td>{number(item.checked - item.complete)}</td></>}{type === 'seasons' && <><td>{number(item.planned)}</td><td>{number(item.active)}</td><td>{number(item.completed)}</td><td>{number(item.cancelled)}</td></>}</tr>)}</tbody></table></div>{!rows.length && <p className="admin-no-data">Không có dữ liệu.</p>}</section>
  </section>;
}
