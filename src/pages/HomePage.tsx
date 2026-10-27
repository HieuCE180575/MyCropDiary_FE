import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import { MOCK_KNOWLEDGE_ARTICLES } from '../features/knowledge/mockData';
import { KNOWLEDGE_CATEGORY_LABEL } from '../features/knowledge/constants';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
import type { KnowledgeArticle } from '../features/knowledge/types';

// Danh sách tính năng cốt lõi
const coreFeatures = [
  {
    id: 'diary',
    icon: 'book',
    badge: 'Cốt lõi',
    title: 'Nhật ký canh tác số VietGAP',
    desc: 'Ghi chép chi tiết từng đợt làm đất, xuống giống, tưới tiêu, bón phân và phun thuốc. Tự động tính thời gian cách ly (PHI) an toàn trước thu hoạch.',
    tag: 'Thời gian thực',
  },
  {
    id: 'inventory',
    icon: 'box',
    badge: 'Quản trị',
    title: 'Quản lý kho & Vật tư nông nghiệp',
    desc: 'Theo dõi hạn dùng, nguồn gốc lô hạt giống, phân bón và thuốc BVTV. Cảnh báo sớm vật tư sắp hết hoặc cận date để lên kế hoạch mùa vụ.',
    tag: 'Chuẩn hóa kho',
  },
  {
    id: 'finance',
    icon: 'money',
    badge: 'Tài chính',
    title: 'Hạch toán chi phí & Lợi nhuận',
    desc: 'Kiểm soát chi phí phân thuốc, giống, nhân công và máy móc theo từng khu vực. Dự báo sản lượng thu hoạch và tính toán biên lợi nhuận chính xác.',
    tag: 'Minh bạch số',
  },
  {
    id: 'traceability',
    icon: 'report',
    badge: 'Truy xuất',
    title: 'Hồ sơ kiểm toán & Mã QR minh bạch',
    desc: 'Xuất báo cáo định dạng chuẩn VietGAP phục vụ thanh tra, kiểm định chất lượng và cấp mã QR truy xuất nguồn gốc sản phẩm cho chuỗi siêu thị.',
    tag: 'Chuẩn quốc gia',
  },
];

// Mô hình trang trại tiêu biểu
const farmShowcases = [
  {
    id: 'dalat',
    name: 'Trang Trại Dưa Lưới Công Nghệ Cao',
    location: 'TP. Đà Lạt, Lâm Đồng',
    area: '3.5 Hecta (8 Nhà màng)',
    type: 'Dưa lưới ruột cam Nhật Bản',
    standard: 'VietGAP Certified',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80',
    stat: '98% Loại 1 xuất khẩu',
    desc: 'Hệ thống hồi lưu dinh dưỡng tự động vi khí hậu Israel, tưới nhỏ giọt kết hợp cảm biến độ ẩm, đảm bảo độ ngọt brix 15+ ổn định.',
  },
  {
    id: 'mekong',
    name: 'Hợp Tác Xã Cây Ăn Trái Mekong',
    location: 'Huyện Cao Lãnh, Đồng Tháp',
    area: '25 Hecta vùng chuyên canh',
    type: 'Xoài Cát Chu xuất khẩu',
    standard: 'GlobalGAP & VietGAP',
    image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
    stat: '100% Mã vùng trồng số hóa',
    desc: 'Áp dụng mã QR truy xuất nguồn gốc từng cây xoài, nhật ký phòng trừ dịch hại sinh học an toàn cho các thị trường khó tính như Nhật và EU.',
  },
  {
    id: 'bavi',
    name: 'Vườn Rau Thủy Canh Sinh Thái Ba Vì',
    location: 'Huyện Ba Vì, TP. Hà Nội',
    area: '2.0 Hecta nhà kính liên hoàn',
    type: 'Rau ăn lá & Cà chua bi',
    standard: 'Hữu cơ VietGAP',
    image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    stat: 'Không tồn dư hóa chất',
    desc: 'Kiểm soát chất lượng nước ngầm tầng sâu, cung cấp dinh dưỡng khoáng vi lượng tinh khiết, cung cấp 1,5 tấn rau sạch mỗi ngày cho các siêu thị.',
  },
];

// 4 bước quy trình VietGAP
const processSteps = [
  {
    step: '01',
    title: 'Khảo sát & Lập hồ sơ vùng trồng',
    desc: 'Đánh giá môi trường đất, nguồn nước tưới và lịch sử canh tác để xác lập vùng đệm an toàn theo tiêu chuẩn VietGAP.',
    icon: 'plots',
  },
  {
    step: '02',
    title: 'Kiểm soát giống & vật tư đầu vào',
    desc: 'Nhập thông tin giống rõ xuất xứ, phân bón và thuốc BVTV nằm trong danh mục được Bộ Nông nghiệp & PTNT cấp phép.',
    icon: 'box',
  },
  {
    step: '03',
    title: 'Ghi chép nhật ký điện tử mỗi ngày',
    desc: 'Thực hiện thao tác canh tác trên điện thoại: nhắc lịch bón phân, tưới nước và tự động tính ngày cách ly an toàn.',
    icon: 'book',
  },
  {
    step: '04',
    title: 'Thu hoạch, kiểm định & xuất tem QR',
    desc: 'Sẵn sàng hồ sơ kiểm toán phục vụ tổ chức chứng nhận, in tem QR truy xuất nguồn gốc nông sản cho người tiêu dùng.',
    icon: 'award',
  },
];

// Đánh giá từ chủ vườn & nông hộ
const testimonials = [
  {
    quote:
      'Trước đây tôi ghi sổ tay rất hay bị ướt, mờ chữ và quên mất ngày phun thuốc. Từ ngày dùng MyCropDiary trên điện thoại, đoàn kiểm tra đánh giá VietGAP chỉ xem 15 phút là đạt ngay!',
    author: 'Anh Trần Văn Hùng',
    role: 'Chủ Trang trại Dưa lưới Đà Lạt (Lâm Đồng)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    stars: 5,
  },
  {
    quote:
      'Phần mềm giúp chúng tôi quản lý hơn 40 hộ xã viên canh tác xoài đồng bộ. Mọi lần bón phân, thu hoạch đều được số hóa, siêu thị ký hợp đồng bao tiêu dài hạn với giá cao hơn 20%.',
    author: 'Chị Lê Thị Mai',
    role: 'Giám đốc HTX Cây ăn trái Cao Lãnh (Đồng Tháp)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    stars: 5,
  },
  {
    quote:
      'Giao diện rất gần gũi và dễ dùng cho nông dân. Bảng hạch toán chi phí rõ ràng đến từng luống rau, giúp tôi cắt giảm hơn 30 triệu đồng tiền phân bón dư thừa mỗi mùa vụ.',
    author: 'Bác Nguyễn Văn Thắng',
    role: 'Chủ Vườn rau hữu cơ Ba Vì (Hà Nội)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    stars: 5,
  },
];

export function HomePage() {
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  // Chọn ra 4 bài viết kiến thức nổi bật
  const featuredArticles = MOCK_KNOWLEDGE_ARTICLES.filter((a) =>
    ['kn-01', 'kn-09', 'kn-05', 'kn-10'].includes(a.id)
  );

  return (
    <main className="home-page-root" role="main">
      {/* 1. HERO SECTION */}
      <section className="home-hero-wrap" aria-labelledby="showcase-title">
        <div className="home-hero-mesh" aria-hidden="true" />
        <div className="home-container">
          <div className="home-hero-grid">
            {/* Cột trái: Nội dung giới thiệu */}
            <div className="hero-text-block">
              <div className="hero-badge-pill">
                <Icon name="sparkles" className="badge-sparkle-icon" />
                <span>Nền tảng Nông nghiệp Số Chuẩn VietGAP hàng đầu</span>
              </div>

              <h1 id="showcase-title" className="hero-main-title">
                Nhật ký canh tác số.<br />
                <span className="hero-highlight-gradient">Minh bạch chi phí.</span><br />
                Nâng tầm nông sản Việt.
              </h1>

              <p className="hero-description">
                Đồng hành cùng hơn <strong>1,500 nhà vườn &amp; hợp tác xã</strong> trên toàn quốc chuẩn hoá
                quy trình sản xuất VietGAP, tối ưu chi phí phân bón vật tư, số hóa mùa vụ và mở rộng cơ hội vào siêu thị, xuất khẩu.
              </p>

              <div className="hero-cta-group">
                <Link to="/register" className="btn-hero-primary">
                  <span>Đăng ký trang trại ngay</span>
                  <Icon name="arrow" />
                </Link>
                <Link to="/knowledge" className="btn-hero-secondary">
                  <Icon name="book" />
                  <span>Thư viện VietGAP</span>
                </Link>
              </div>

              {/* Chỉ số niềm tin (Trust metrics) */}
              <div className="hero-trust-bar">
                <div className="trust-item">
                  <div className="trust-avatar-stack">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" alt="Farmer" />
                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80" alt="Farmer" />
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80" alt="Farmer" />
                  </div>
                  <div className="trust-text">
                    <strong>1,500+ Nhà vườn</strong>
                    <span>đã đồng hành số hóa</span>
                  </div>
                </div>

                <div className="trust-divider" />

                <div className="trust-item">
                  <div className="trust-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="star-icon">★</span>
                    ))}
                  </div>
                  <div className="trust-text">
                    <strong>4.9 / 5.0 Đánh giá</strong>
                    <span>Chuẩn VietGAP quốc gia</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Khối ảnh Hero đa tầng với các thẻ tương tác sinh động */}
            <div className="hero-visual-block">
              <div className="visual-card-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80"
                  alt="Trang trại nhà màng nông nghiệp công nghệ cao VietGAP"
                  className="hero-main-photo"
                  loading="eager"
                />
                <div className="hero-photo-gradient" />

                {/* Floating Widget 1: VietGAP Verified */}
                <div className="hero-floating-card card-vietgap">
                  <div className="floating-icon-box bg-emerald">
                    <Icon name="shield" />
                  </div>
                  <div className="floating-card-body">
                    <span className="floating-tag">Chứng nhận VietGAP</span>
                    <strong>Đạt chuẩn xuất khẩu 100%</strong>
                    <small>Mã kiểm định: VGAP-2026-DL</small>
                  </div>
                </div>

                {/* Floating Widget 2: Tiết kiệm chi phí */}
                <div className="hero-floating-card card-saving">
                  <div className="floating-icon-box bg-amber">
                    <Icon name="trending-up" />
                  </div>
                  <div className="floating-card-body">
                    <span className="floating-tag">Tối ưu vật tư</span>
                    <strong className="text-emerald">-30% Chi phí phân thuốc</strong>
                    <small>Cắt giảm lãng phí vụ mùa</small>
                  </div>
                </div>

                {/* Floating Widget 3: Live Diary Status */}
                <div className="hero-floating-card card-status">
                  <div className="pulse-indicator" />
                  <div className="floating-card-body">
                    <strong>Nhật ký canh tác hôm nay</strong>
                    <small>Đã tưới dinh dưỡng Block A • 08:30</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VÌ SAO CHỌN MYCROPDIARY */}
      <section className="home-benefits-section" aria-labelledby="home-benefits-heading">
        <div className="home-container">
          <header className="home-benefits-header">
            <h2 id="home-benefits-heading">
              <Icon name="leaf" className="benefits-heading-leaf" />
              <span>Vì sao chọn <span className="benefits-brand">MyCropDiary?</span></span>
              <Icon name="leaf" className="benefits-heading-leaf" />
            </h2>
            <p>Giải pháp quản lý nông nghiệp toàn diện, đơn giản và hiệu quả cho nhà vườn Việt.</p>
          </header>
          <div className="home-benefits-grid">
            {[
              { icon: 'book', title: 'Nhật ký canh tác', desc: 'Ghi chép hoạt động hằng ngày, dễ tra cứu theo mùa vụ.' },
              { icon: 'money', title: 'Theo dõi chi phí', desc: 'Kiểm soát vật tư, chi phí và hiệu quả sản xuất.' },
              { icon: 'shield', title: 'Tuân thủ VietGAP', desc: 'Lưu hồ sơ, checklist và truy xuất nguồn gốc rõ ràng.' },
              { icon: 'sprout', title: 'Trợ lý AI nông nghiệp', desc: 'Gợi ý quy trình, nhắc việc và hỗ trợ ra quyết định.' },
            ].map((benefit) => (
              <article className="home-benefit-card" key={benefit.title}>
                <div className="home-benefit-icon">
                  <Icon name={benefit.icon} size={30} />
                </div>
                <div className="home-benefit-info">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TÍNH NĂNG NỔI BẬT */}
      <section className="home-features-section" id="features-section" aria-labelledby="features-heading">
        <div className="home-container">
          <div className="section-head text-center">
            <span className="section-pill">GIẢI PHÁP TOÀN DIỆN</span>
            <h2 id="features-heading" className="section-title">
              Mọi công cụ nhà nông cần trong một ứng dụng duy nhất
            </h2>
            <p className="section-subtitle">
              Thay thế hoàn toàn sổ tay ghi chép dễ thất lạc bằng hệ thống số hóa thông minh,
              chuẩn xác từng ngày giờ và bảo mật dữ liệu an toàn trên đám mây.
            </p>
          </div>

          <div className="feature-cards-grid">
            {coreFeatures.map((f) => (
              <article key={f.id} className="feature-box">
                <div className="feature-top-row">
                  <div className="feature-icon-circle">
                    <Icon name={f.icon} />
                  </div>
                  <span className="feature-badge">{f.badge}</span>
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-footer">
                  <span className="feature-tag">
                    <Icon name="check" /> {f.tag}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ĐIỂM SÁNG KIẾN THỨC VIETGAP (KNOWLEDGE SPOTLIGHT) */}
      <section className="home-knowledge-section" aria-labelledby="knowledge-spotlight-heading">
        <div className="home-container">
          <div className="section-head flex-between">
            <div>
              <span className="section-pill">CẨM NANG &amp; KỸ THUẬT</span>
              <h2 id="knowledge-spotlight-heading" className="section-title">
                Kiến thức canh tác VietGAP chuẩn mực
              </h2>
              <p className="section-subtitle">
                Được biên soạn bởi các chuyên gia nông nghiệp đầu ngành, hỗ trợ nông hộ xử lý sâu bệnh,
                sử dụng phân bón hiệu quả và nắm vững các quy định kiểm nghiệm.
              </p>
            </div>
            <Link to="/knowledge" className="btn-view-all-knowledge">
              <span>Xem tất cả bài viết</span>
              <Icon name="arrow" />
            </Link>
          </div>

          <div className="knowledge-cards-grid">
            {featuredArticles.map((article) => {
              return (
                <article key={article.id} className="knowledge-spotlight-card">
                  <div className="card-thumb-wrap">
                    {article.image && <img src={article.image} alt={article.title} className="card-thumb-img" loading="lazy" />}
                    <span className="card-category-badge">
                      {KNOWLEDGE_CATEGORY_LABEL[article.category] || 'Tiêu chuẩn'}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="card-meta-line">
                      <span>⏱ {article.readTimeMinutes} phút đọc</span>
                      <span>👁 {article.viewCount.toLocaleString('vi-VN')} lượt xem</span>
                    </div>

                    <h3 className="card-article-title">
                      <button
                        type="button"
                        className="btn-title-link"
                        onClick={() => setSelectedArticle(article)}
                      >
                        {article.title}
                      </button>
                    </h3>

                    <p className="card-article-summary">{article.summary}</p>

                    <div className="card-footer-action">
                      <button
                        type="button"
                        className="btn-read-quick"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <span>Đọc tóm tắt nhanh</span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. MÔ HÌNH TRANG TRẠI TIÊU BIỂU (FARM GALLERY) */}
      <section className="home-showcase-section" aria-labelledby="showcase-heading">
        <div className="home-container">
          <div className="section-head text-center">
            <span className="section-pill">MÔ HÌNH THỰC TẾ</span>
            <h2 id="showcase-heading" className="section-title">
              Các vùng trồng tiêu biểu ứng dụng MyCropDiary
            </h2>
            <p className="section-subtitle">
              Từ cao nguyên Đà Lạt đến đồng bằng sông Cửu Long, MyCropDiary tự hào đồng hành cùng các đơn vị tiên phong
              trong cuộc cách mạng nông nghiệp chất lượng cao.
            </p>
          </div>

          <div className="farm-showcase-grid">
            {farmShowcases.map((farm) => (
              <div key={farm.id} className="farm-card">
                <div className="farm-image-box">
                  <img src={farm.image} alt={farm.name} className="farm-image" loading="lazy" />
                  <span className="farm-standard-badge">
                    <Icon name="shield" /> {farm.standard}
                  </span>
                  <div className="farm-stat-overlay">
                    <Icon name="sparkles" />
                    <span>{farm.stat}</span>
                  </div>
                </div>

                <div className="farm-card-content">
                  <div className="farm-location-row">
                    <Icon name="plots" />
                    <span>{farm.location}</span>
                  </div>

                  <h3 className="farm-name">{farm.name}</h3>
                  <p className="farm-crop-type">
                    <strong>Chuyên canh:</strong> {farm.type}
                  </p>
                  <p className="farm-area-text">
                    <strong>Quy mô:</strong> {farm.area}
                  </p>
                  <p className="farm-description">{farm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. QUY TRÌNH 4 BƯỚC CHUẨN HOÁ VIETGAP */}
      <section className="home-process-section" aria-labelledby="process-heading">
        <div className="home-container">
          <div className="section-head text-center">
            <span className="section-pill">LỘ TRÌNH ĐƠN GIẢN</span>
            <h2 id="process-heading" className="section-title">
              4 bước số hoá đạt chứng nhận VietGAP dễ dàng
            </h2>
            <p className="section-subtitle">
              Quy trình làm việc được thiết kế tối ưu, phù hợp với thói quen làm vườn của bà con nông dân.
            </p>
          </div>

          <div className="process-timeline">
            {processSteps.map((p) => (
              <div key={p.step} className="process-step-item">
                <div className="step-circle-badge">
                  <span>{p.step}</span>
                </div>
                <div className="step-content-box">
                  <div className="step-icon-box">
                    <Icon name={p.icon} />
                  </div>
                  <h3 className="step-title">{p.title}</h3>
                  <p className="step-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PHẢN HỒI TỪ NHÀ VƯỜN (TESTIMONIALS) */}
      <section className="home-testimonials-section" aria-labelledby="testimonials-heading">
        <div className="home-container">
          <div className="section-head text-center">
            <span className="section-pill">NGƯỜI THẬT VIỆC THẬT</span>
            <h2 id="testimonials-heading" className="section-title">
              Nhà nông nói gì về MyCropDiary?
            </h2>
            <p className="section-subtitle">
              Sự hài lòng và mùa màng bội thu của bà con là minh chứng rõ ràng nhất cho giá trị nền tảng mang lại.
            </p>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="star">★</span>
                  ))}
                </div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author-row">
                  <img src={t.avatar} alt={t.author} className="author-avatar" loading="lazy" />
                  <div className="author-info">
                    <strong className="author-name">{t.author}</strong>
                    <span className="author-role">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION (CTA BANNER) */}
      <section className="home-cta-wrap" aria-labelledby="cta-heading">
        <div className="home-container">
          <div className="home-cta-card">
            <div className="cta-backdrop-glow" aria-hidden="true" />
            <div className="cta-content">
              <span className="cta-pill">ĐỒNG HÀNH CÙNG NÔNG NGHIỆP VIỆT</span>
              <h2 id="cta-heading" className="cta-title">
                Sẵn sàng nâng tầm trang trại của bạn hôm nay?
              </h2>
              <p className="cta-desc">
                Đăng ký tài khoản miễn phí chỉ trong 2 phút. Bắt đầu ghi nhật ký mùa vụ,
                chuẩn hóa quy trình và khẳng định thương hiệu nông sản sạch của bạn.
              </p>
              <div className="cta-buttons">
                <Link to="/register" className="btn-cta-white">
                  <span>Tạo tài khoản trang trại ngay</span>
                  <Icon name="arrow" />
                </Link>
                <Link to="/knowledge" className="btn-cta-outline">
                  <Icon name="book" />
                  <span>Đọc quy trình VietGAP</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal hiển thị chi tiết bài viết kiến thức khi người dùng bấm xem */}
      <KnowledgeDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </main>
  );
}
