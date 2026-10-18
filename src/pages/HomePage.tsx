import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';

const features = [
  {
    icon: 'book',
    title: 'Nhật ký canh tác số',
    desc: 'Ghi chép chi tiết từng lần bón phân, tưới nước, phun thuốc theo chuẩn VietGAP.',
  },
  {
    icon: 'box',
    title: 'Quản lý vật tư & kho',
    desc: 'Kiểm soát số lượng hạt giống, phân bón, thuốc BVTV nhập - xuất chính xác.',
  },
  {
    icon: 'money',
    title: 'Theo dõi chi phí vụ mùa',
    desc: 'Hạch toán chi phí đầu vào, nhân công và ước tính lợi nhuận thu hoạch.',
  },
  {
    icon: 'report',
    title: 'Báo cáo & Xuất dữ liệu',
    desc: 'Sẵn sàng dữ liệu cho cơ quan kiểm tra và truy xuất nguồn gốc nông sản.',
  },
];

export function HomePage() {
  return (
    <main className="home-page">
      <section className="auth-showcase" aria-labelledby="showcase-title">
        <div className="home-hero-layout">
          <div className="showcase-inner">
            <div className="showcase-badge">
              <Icon name="leaf" />
              <span>Nền tảng Nông nghiệp Số Thông minh</span>
            </div>

            <div className="showcase-content">
              <h1 id="showcase-title">
                Nhật ký canh tác số.<br />
                <span className="gradient-text">Minh bạch chi phí.</span><br />
                Tối ưu mùa vụ.
              </h1>
              <p className="showcase-desc">
                Đồng hành cùng nhà nông Việt Nam quản lý thông tin trang trại, chuẩn hoá quy trình sản xuất theo tiêu chuẩn VietGAP và nâng cao giá trị nông sản.
              </p>
            </div>

            <Link to="/register" className="home-register-link">
              Bắt đầu đăng ký <Icon name="arrow" />
            </Link>
          </div>

          {/* Thay khung trống này bằng ảnh của bạn khi đã có ảnh. */}
          <div className="home-hero-image" aria-hidden="true" />
        </div>
      </section>

      <section className="home-features" aria-label="Tính năng nổi bật" id="features-section">
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon-wrapper">
                <Icon name={feature.icon} className="feature-icon" />
              </div>
              <div className="feature-body">
                <strong>{feature.title}</strong>
                <p>{feature.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
