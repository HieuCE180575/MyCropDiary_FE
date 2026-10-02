import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icon } from '../../shared/components/Icon';
import { useAdmin } from './AdminProvider';
import { AdminBadge, AdminPageHeading } from './AdminComponents';
import { displayValue } from './adminConfig';

export function AdminDashboard() {
  const { user } = useAuth();
  const { state } = useAdmin();
  const pending = state.registrations.filter(item => item.status === 'PENDING');
  const openFeedback = state.feedback.filter(item => item.status !== 'RESOLVED');
  const draftArticles = state.articles.filter(item => item.status === 'DRAFT');
  const cards = [
    { label: 'Tài khoản người dùng', value: state.users.filter(item => item.role === 'USER').length, note: `${state.users.filter(item => item.status === 'LOCKED').length} tài khoản đang khóa`, icon: 'user', tone: 'green', path: 'users' },
    { label: 'Đăng ký chờ duyệt', value: pending.length, note: 'Hồ sơ cần được xem xét', icon: 'plots', tone: 'amber', path: 'registrations' },
    { label: 'Bài viết đã duyệt', value: state.articles.filter(item => item.status === 'APPROVED').length, note: `${draftArticles.length} bài viết đang ở bản nháp`, icon: 'book', tone: 'blue', path: 'articles' },
    { label: 'Phản hồi cần xử lý', value: openFeedback.length, note: 'Góp ý về câu trả lời của AI', icon: 'message', tone: 'purple', path: 'feedback' },
  ];
  const tasks = [
    { title: 'Xét duyệt đăng ký trang trại', text: 'Kiểm tra thông tin trước khi kích hoạt trang trại.', count: pending.length, path: 'registrations', icon: 'plots' },
    { title: 'Kiểm tra bài viết mới', text: 'Rà soát nội dung và nguồn tham khảo trước khi duyệt.', count: draftArticles.length, path: 'articles', icon: 'book' },
    { title: 'Trả lời phản hồi AI', text: 'Xem ngữ cảnh hội thoại và phản hồi cho người dùng.', count: openFeedback.length, path: 'feedback', icon: 'message' },
  ];
  return <section className="admin-page">
    <AdminPageHeading title="Tổng quan quản trị" description={`Chào ${user?.fullName?.trim() || 'quản trị viên'}, cùng theo dõi và vận hành MyCropDiary hôm nay.`}><Link className="action-button" to="/admin/statistics"><Icon name="report" />Xem thống kê</Link></AdminPageHeading>
    <div className="admin-summary-grid">{cards.map(card => <Link className="admin-summary-card" to={'/admin/' + card.path} key={card.path}><div><span>{card.label}</span><strong>{card.value}</strong><p>{card.note}</p></div><span className={`admin-summary-icon ${card.tone}`}><Icon name={card.icon} /></span></Link>)}</div>
    <div className="admin-overview-grid">
      <section className="admin-panel"><div className="admin-list-heading"><div><h2>Công việc cần xử lý</h2><p>Ưu tiên những nội dung đang chờ bạn xem xét.</p></div><span className="admin-dot-label">Hôm nay</span></div><div className="admin-task-list">{tasks.map(task => <Link key={task.path} to={'/admin/' + task.path}><span className="shortcut-icon"><Icon name={task.icon} /></span><div><h3>{task.title}</h3><p>{task.text}</p></div><strong>{task.count}</strong><Icon name="arrow" /></Link>)}</div></section>
      <section className="admin-overview-note"><span className="admin-eyebrow">NỘI DUNG TIN CẬY</span><h2>Kiến thức tốt hơn,<br />hỗ trợ người dùng tốt hơn.</h2><p>Quản lý nguồn kiến thức đã được duyệt và cải thiện hướng dẫn từ những phản hồi của người dùng.</p><Link className="action-button solid" to="/admin/articles">Quản lý bài viết<Icon name="arrow" /></Link></section>
    </div>
    <div className="admin-overview-grid lower">
      <section className="admin-panel"><div className="admin-list-heading"><h2>Đăng ký trang trại gần đây</h2><Link className="text-link" to="/admin/registrations">Xem tất cả <Icon name="arrow" /></Link></div><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Đăng ký trang trại gần đây trong dữ liệu minh họa</caption><thead><tr><th scope="col">Trang trại</th><th scope="col">Ngày gửi</th><th scope="col">Trạng thái</th></tr></thead><tbody>{state.registrations.slice(0, 4).map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.applicant}</small></td><td>{displayValue('createdAt', item.createdAt)}</td><td><AdminBadge collection="registrations" status={item.status} /></td></tr>)}</tbody></table></div></section>
      <section className="admin-panel"><div className="admin-list-heading"><h2>Hoạt động quản trị</h2><Link className="text-link" to="/admin/audit">Xem nhật ký <Icon name="arrow" /></Link></div><div className="admin-timeline">{state.audit.slice(0, 4).map(item => <article key={item.id}><i /><div><strong>{item.name}</strong><p>{item.actor} · {item.resourceId}</p><small>{displayValue('createdAt', item.createdAt)}</small></div></article>)}</div></section>
    </div>
    <div className="admin-quick-links"><Link to="/admin/crops"><Icon name="leaf" /><span>Danh mục cây trồng</span><Icon name="arrow" /></Link><Link to="/admin/rules"><Icon name="check" /><span>Quy tắc bảng kiểm</span><Icon name="arrow" /></Link><Link to="/admin/users"><Icon name="user" /><span>Quản lý tài khoản</span><Icon name="arrow" /></Link></div>
  </section>;
}
