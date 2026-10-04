import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export function PublicFooter() {
  return (
    <footer className="public-footer" role="contentinfo">
      <div className="public-footer-top">
        <div className="public-footer-container">
          <section className="footer-col footer-col-brand" aria-labelledby="footer-brand-heading">
            <Link to="/" className="footer-brand" aria-label="MyCropDiary">
              <span className="footer-brand-icon">
                <Icon name="leaf" />
              </span>
              <div className="footer-brand-text">
                <strong id="footer-brand-heading">MyCropDiary</strong>
                <span>Nông nghiệp số VietGAP</span>
              </div>
            </Link>
            <p className="footer-description">
              Hệ thống quản lý trang trại thông minh, đồng hành cùng nhà nông chuẩn hóa nhật ký sản xuất, tối ưu chi phí đầu vào và minh bạch chất lượng nông sản theo tiêu chuẩn VietGAP.
            </p>
            <div className="footer-badges">
              <span className="footer-badge">
                <Icon name="shield" /> Chuẩn VietGAP
              </span>
              <span className="footer-badge">
                <Icon name="lock" /> Bảo mật đám mây
              </span>
            </div>
          </section>

          <nav className="footer-col" aria-labelledby="footer-explore-heading">
            <h3 id="footer-explore-heading">Khám phá &amp; Học tập</h3>
            <ul className="footer-nav-list">
              <li>
                <Link to="/login">Trang chủ &amp; Giới thiệu</Link>
              </li>
              <li>
                <Link to="/knowledge">Thư viện kiến thức VietGAP</Link>
              </li>
              <li>
                <a href="#features-section">Tính năng nổi bật</a>
              </li>
              <li>
                <Link to="/register">Đăng ký tài khoản mới</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-col" aria-labelledby="footer-solutions-heading">
            <h3 id="footer-solutions-heading">Giải pháp quản lý</h3>
            <ul className="footer-nav-list">
              <li>
                <span className="footer-link-text">Nhật ký canh tác số</span>
              </li>
              <li>
                <span className="footer-link-text">Kiểm soát kho &amp; vật tư</span>
              </li>
              <li>
                <span className="footer-link-text">Hạch toán chi phí mùa vụ</span>
              </li>
              <li>
                <span className="footer-link-text">Báo cáo kiểm tra &amp; xuất kho</span>
              </li>
            </ul>
          </nav>

          <section className="footer-col" aria-labelledby="footer-contact-heading">
            <h3 id="footer-contact-heading">Hỗ trợ &amp; Liên hệ</h3>
            <ul className="footer-contact-list">
              <li>
                <Icon name="phone" className="contact-icon" />
                <div>
                  <strong>Hotline kỹ thuật:</strong>
                  <p>1900 6868 (Miễn phí 24/7)</p>
                </div>
              </li>
              <li>
                <Icon name="mail" className="contact-icon" />
                <div>
                  <strong>Email hỗ trợ:</strong>
                  <p>hotro@mycropdiary.vn</p>
                </div>
              </li>
              <li>
                <Icon name="plots" className="contact-icon" />
                <div>
                  <strong>Trụ sở:</strong>
                  <p>Khu Công nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="public-footer-bottom">
        <div className="public-footer-container footer-bottom-inner">
          <p className="copyright-text">
            © 2026 <strong>MyCropDiary</strong>. Nền tảng ghi chép và quản lý trang trại theo tiêu chuẩn VietGAP.
          </p>
          <div className="footer-legal-links">
            <a href="#terms">Điều khoản sử dụng</a>
            <span className="dot-divider">•</span>
            <a href="#privacy">Chính sách bảo mật</a>
            <span className="dot-divider">•</span>
            <a href="#vietgap-compliance">Chứng nhận VietGAP</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
