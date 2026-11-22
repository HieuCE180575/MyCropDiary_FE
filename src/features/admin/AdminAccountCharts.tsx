import { Link } from 'react-router-dom';
import { AdminBadge } from './AdminComponents';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { AdminRecord } from './adminTypes';
import type { AdminStatisticsData } from './adminService';
import './admin-account-charts.css';

export function AdminAccountCharts({ users, accounts, months = 6 }: { users: AdminRecord[]; accounts?: AdminStatisticsData['accounts']; months?: number }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  const total = accounts?.totalUsers ?? users.length;
  const active = accounts?.activeUsers ?? users.filter(user => user.status === 'ACTIVE').length;
  const locked = accounts?.lockedUsers ?? users.filter(user => user.status === 'LOCKED').length;
  const other = Math.max(0, total - active - locked);
  const locale = en ? 'en-US' : 'vi-VN';
  const number = (value: number) => value.toLocaleString(locale);
  const statuses = [
    { label: en ? 'Active' : 'Đang hoạt động', count: active, color: 'var(--color-success)' },
    { label: en ? 'Other / Unknown' : 'Khác / Chưa xác định', count: other, color: '#cbd5e1' },
    { label: en ? 'Locked' : 'Đã khóa', count: locked, color: 'var(--color-danger)' },
  ];
  const now = new Date();
  const datedUsers = users.map(user => ({ user, date: new Date(/^\d{4}-\d{2}-\d{2}$/.test(user.createdAt) ? `${user.createdAt}T00:00:00` : user.createdAt) }))
    .filter(item => Number.isFinite(item.date.getTime()) && item.date <= now);
  const recent = [...datedUsers].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
  const monthly = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + index, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return {
      label: date.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
      count: datedUsers.filter(item => item.date >= date && item.date < next).length,
      cumulative: datedUsers.filter(item => item.date < next).length,
    };
  });
  const lineMax = Math.ceil(Math.max(4, ...monthly.map(item => item.cumulative)) / 4) * 4;
  const points = monthly.map((item, index) => `${48 + index * 600 / (months - 1)},${188 - item.cumulative / lineMax * 152}`);
  const newPoints = monthly.map((item, index) => `${48 + index * 600 / (months - 1)},${188 - item.count / lineMax * 152}`);
  let offset = 0;
  const cards = [
    { title: en ? 'Total accounts' : 'Tổng tài khoản', count: total, icon: 'users', tone: 'success', note: en ? 'All system accounts' : 'Toàn bộ tài khoản trong hệ thống' },
    { title: en ? 'Active' : 'Đang hoạt động', count: active, icon: 'shield', tone: 'success', note: en ? 'Accounts with sign-in access' : 'Tài khoản có quyền đăng nhập' },
    { title: en ? 'Access locked' : 'Đã khóa truy cập', count: locked, icon: 'lock', tone: 'danger', note: en ? 'Accounts temporarily locked for security' : 'Tài khoản bị tạm khóa bảo mật' },
  ];
  return <div className="account-dashboard">
    <div className="account-kpis">{cards.map((card, index) => <article key={card.title} className={`account-kpi account-kpi--${card.tone}`}>
      <span className="account-kpi-icon"><Icon name={card.icon} size={30} /></span>
      <div><h3>{card.title}</h3><strong className={index === 0 ? 'account-total' : ''}>{number(card.count)}</strong><p>{card.note}</p></div>
    </article>)}</div>
    <div className="account-chart-grid">
      <article className="account-chart-panel account-status-panel"><h2>{en ? 'Account status' : 'Trạng thái tài khoản'}</h2>
        <div className="account-donut-layout">
          <div className="account-donut"><svg viewBox="0 0 220 220" role="img" aria-label={en ? 'Account status distribution' : 'Phân bố trạng thái tài khoản'}>
            <circle cx="110" cy="110" r="82" fill="none" stroke="var(--color-border, #e2e8f0)" strokeWidth="30" />
            {statuses.map(item => {
              const share = total ? item.count / total * 100 : 0;
              const start = offset; offset += share;
              return <circle key={item.label} cx="110" cy="110" r="82" fill="none" stroke={item.color} strokeWidth="30" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"><title>{item.label}: {number(item.count)}</title></circle>;
            })}
            <text x="110" y="108" textAnchor="middle" className="account-donut-number">{number(total)}</text>
            <text x="110" y="132" textAnchor="middle">{en ? 'Accounts' : 'Tài khoản'}</text>
          </svg></div>
          <ul className="account-legend">{statuses.map(item => <li key={item.label}><span className="account-legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{number(item.count)} ({(total ? item.count / total : 0).toLocaleString(locale, { style: 'percent', maximumFractionDigits: 1 })})</strong></li>)}</ul>
        </div>
      </article>
      <article className="account-chart-panel account-growth-panel"><div className="account-chart-heading"><h2>{en ? 'Account growth' : 'Tăng trưởng tài khoản'}</h2>
        <div className="account-series-legend"><span><i />{en ? 'Total accounts (cumulative)' : 'Tổng tài khoản (tích lũy)'}</span><span><i />{en ? 'New registrations' : 'Đăng ký mới'}</span></div></div>
        <svg className="account-plot" viewBox="0 0 690 235" role="img" aria-label={en ? 'Account growth' : 'Tăng trưởng tài khoản'}>
          {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="48" x2="648" y1={188 - tick * 38} y2={188 - tick * 38} className="account-gridline" /><text x="34" y={193 - tick * 38} textAnchor="end">{number(Math.ceil(lineMax / 4) * tick)}</text></g>)}
          <polygon points={`48,188 ${points.join(' ')} 648,188`} fill="var(--color-success)" opacity="0.12" />
          <polyline points={points.join(' ')} fill="none" stroke="var(--color-success)" strokeWidth="2.5" />
          <polyline points={newPoints.join(' ')} fill="none" stroke="#56c98d" strokeWidth="2.5" />
          {monthly.map((item, index) => <g key={item.label}>
            <circle className="account-cumulative-point" cx={48 + index * 600 / (months - 1)} cy={188 - item.cumulative / lineMax * 152} r="5" fill="var(--color-success)" stroke="white" strokeWidth="2"><title>{item.label} — {en ? 'Total' : 'Tích lũy'}: {number(item.cumulative)}</title></circle>
            <circle className="account-new-point" cx={48 + index * 600 / (months - 1)} cy={188 - item.count / lineMax * 152} r="4" fill="#56c98d" stroke="white" strokeWidth="1.5"><title>{item.label} — {en ? 'New' : 'Đăng ký mới'}: {number(item.count)}</title></circle>
            <text x={48 + index * 600 / (months - 1)} y={175 - item.cumulative / lineMax * 152} textAnchor="middle" fontWeight="700">{number(item.cumulative)}</text>
            <text x={48 + index * 600 / (months - 1)} y="216" textAnchor="middle" style={{ fontSize: months === 12 ? 10 : 12 }}>{item.label}</text>
          </g>)}
        </svg>
      </article>

    </div>
    <article className="account-chart-panel account-recent-panel">
      <div className="account-chart-heading"><h2><Icon name="history" size={22} />{en ? 'Recently registered accounts' : 'Tài khoản đăng ký gần đây'}</h2><Link to="/admin/users">{en ? 'View all' : 'Xem tất cả'} <Icon name="arrow" size={16} /></Link></div>
      <div className="ui-table-scroll"><table className="account-recent-table"><thead><tr>{['#', en ? 'User name' : 'Tên người dùng', 'Email', en ? 'Registration date' : 'Ngày đăng ký', en ? 'Status' : 'Trạng thái'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{recent.map(({ user, date }, index) => <tr key={user.id}><td>{number(index + 1)}</td><td><span className="account-recent-user"><span className="account-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()}</span><strong>{user.name}</strong></span></td><td>{user.email || '—'}</td><td>{date.toLocaleDateString(locale)}</td><td><AdminBadge collection="users" status={user.status} /></td></tr>)}</tbody>
      </table></div>
      {!recent.length && <p className="admin-subtle">{en ? 'No registered accounts yet.' : 'Chưa có tài khoản đăng ký.'}</p>}
    </article>
  </div>;
}
