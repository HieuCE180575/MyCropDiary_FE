import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { canAccessModule, farmRole } from '../features/auth/accessPolicy';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { moduleDefinitions } from '../app/routes/moduleDefinitions';
import { RegistrationGuide } from '../features/farm-management/RegistrationGuide';
import { Icon } from '../shared/components/Icon';

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedFarm, farms, loading, error, retry } = useFarmWorkspace();
  const isAdmin = user?.systemRole === 'ADMIN';
  if (isAdmin) return <Navigate to="/admin" replace />;
  const name = user?.fullName?.trim() || 'bạn';
  const shortcuts = moduleDefinitions.filter((module) =>
    canAccessModule(module, user?.systemRole, selectedFarm)
    && (selectedFarm ? module.access === 'farm' || module.access === 'owner' : module.key !== 'password'));
  return <section className="personal-dashboard">
    <div className="dashboard-heading">
      <div><p className="welcome-kicker">{selectedFarm ? 'Không gian trang trại' : isAdmin ? 'Quản trị hệ thống' : 'Không gian cá nhân của bạn'}</p>
        <h1>{selectedFarm ? selectedFarm.farmName : `Xin chào, ${name}!`} <Icon name="hand" className="wave" /></h1>
        <p>{selectedFarm ? `Vai trò của bạn: ${farmRole(selectedFarm) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên trang trại'}. Chọn chức năng để bắt đầu.` : isAdmin ? 'Quản lý tài khoản, xét duyệt yêu cầu và nội dung dùng chung.' : 'Tìm hiểu kiến thức, hỏi trợ lý AI và chuẩn bị cho trang trại của bạn.'}</p>
      </div>
      {!selectedFarm && !isAdmin && <Link className="action-button solid" to="/farm-registration"><Icon name="plus" />Đăng ký trang trại</Link>}
    </div>
    {!selectedFarm && !isAdmin && <section className="personal-welcome" aria-labelledby="personal-welcome-title">
      <div className="welcome-illustration"><Icon name="leaf" /></div>
      <div><span className="personal-kicker">BẮT ĐẦU TỪ ĐÂY</span><h2 id="personal-welcome-title">Đồng hành cùng bạn trên hành trình canh tác</h2><p>Bạn có thể tìm hiểu kiến thức VietGAP, trò chuyện với trợ lý AI và gửi yêu cầu đăng ký trang trại ngay trong không gian cá nhân.</p>
        <div className="welcome-links"><Link className="action-button solid" to="/ai"><Icon name="bot" />Hỏi trợ lý AI</Link><Link className="action-button" to="/knowledge">Khám phá kiến thức<Icon name="arrow" /></Link></div>
      </div>
    </section>}
    {!isAdmin && <div className="workspace-status">
      {loading ? <p role="status">Đang tải các trang trại bạn tham gia…</p> : error ? <div role="alert"><p>Chưa tải được thông tin trang trại. Bạn vẫn có thể sử dụng các chức năng cá nhân.</p><button className="action-button" onClick={retry}>Thử lại</button></div> : selectedFarm ? <p><Icon name="plots" />Bạn đang làm việc tại <strong>{selectedFarm.farmName}</strong>. Quyền truy cập áp dụng cho trang trại này.</p> : farms.length ? <p><Icon name="plots" />Bạn đang tham gia <strong>{farms.length} trang trại</strong>. Chọn trang trại ở thanh trên để mở chức năng được cấp quyền.</p> : <p><Icon name="lock" />Các chức năng canh tác sẽ mở khi bạn có tư cách thành viên đang hoạt động trong trang trại. Chủ trang trại được cấp quyền sau khi yêu cầu đăng ký được duyệt.</p>}
    </div>}
    <div className="personal-section-heading"><h2>{selectedFarm ? 'Công việc trong trang trại' : 'Tiện ích của bạn'}</h2><p>{selectedFarm ? 'Các chức năng phù hợp với vai trò của bạn tại trang trại đang chọn.' : 'Truy cập nhanh các chức năng dành cho tài khoản của bạn.'}</p></div>
    <div className="personal-shortcuts">{shortcuts.map((module) => <Link className={'personal-shortcut shortcut-' + module.key} to={'/' + module.path} key={module.key}>
      <span className="shortcut-icon"><Icon name={module.icon} /></span><h3>{module.title}</h3><p>{module.description}</p><span className="shortcut-link">Mở <Icon name="arrow" /></span>
    </Link>)}</div>
    {!selectedFarm && !isAdmin && <RegistrationGuide status={farms.some((farm) => farmRole(farm) === 'OWNER') ? 'APPROVED' : undefined} loading={loading} error={Boolean(error)} />}
  </section>;
}
