import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import { fetchKnowledgeArticles } from '../features/knowledge/knowledgeService';
import { useApiData } from '../shared/hooks/useApiData';
import { KNOWLEDGE_CATEGORY_LABEL } from '../features/knowledge/constants';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
import type { KnowledgeArticle } from '../features/knowledge/types';
import { useLanguage } from '../shared/i18n/LanguageContext';

// Core features (Bilingual)
const coreFeaturesData = {
  vi: [
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
  ],
  en: [
    {
      id: 'diary',
      icon: 'book',
      badge: 'Core',
      title: 'Digital VietGAP Farming Diary',
      desc: 'Record soil preparation, seeding, irrigation, fertilizer application, and crop protection in real time. Automatically calculate safe pre-harvest intervals (PHI).',
      tag: 'Real-Time Sync',
    },
    {
      id: 'inventory',
      icon: 'box',
      badge: 'Management',
      title: 'Inventory & Agrochemical Materials',
      desc: 'Track expiration dates, lot origins of certified seeds, fertilizers, and plant protection products. Early low-stock and near-expiry alerts.',
      tag: 'Standardized Stock',
    },
    {
      id: 'finance',
      icon: 'money',
      badge: 'Financials',
      title: 'Cost Accounting & Profit Analysis',
      desc: 'Monitor input expenses for agrochemicals, seed stock, labor, and equipment per production zone and block. Accurately forecast yields and margins.',
      tag: 'Digital Transparency',
    },
    {
      id: 'traceability',
      icon: 'report',
      badge: 'Traceability',
      title: 'Audit Records & QR Traceability',
      desc: 'Export compliant VietGAP inspection documentation and generate verifiable origin QR codes for supermarket distribution networks.',
      tag: 'National Standard',
    },
  ],
};

// Farm showcases (Bilingual)
const farmShowcasesData = {
  vi: [
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
  ],
  en: [
    {
      id: 'dalat',
      name: 'High-Tech Cantaloupe Greenhouse Farm',
      location: 'Da Lat City, Lam Dong',
      area: '3.5 Hectares (8 Greenhouses)',
      type: 'Japanese Orange Melon',
      standard: 'VietGAP Certified',
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80',
      stat: '98% Export Grade A',
      desc: 'Automated Israeli climate and nutrient fertigation system with soil moisture sensors, guaranteeing consistent 15+ brix sweetness.',
    },
    {
      id: 'mekong',
      name: 'Mekong Fruit Tree Cooperative',
      location: 'Cao Lanh District, Dong Thap',
      area: '25 Hectares Dedicated Area',
      type: 'Export Cat Chu Mango',
      standard: 'GlobalGAP & VietGAP',
      image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
      stat: '100% Digital Farm Codes',
      desc: 'Digitized QR origin traceability per tree and biological pest control journals meeting rigorous requirements for Japan and EU markets.',
    },
    {
      id: 'bavi',
      name: 'Ba Vi Ecological Hydroponic Garden',
      location: 'Ba Vi District, Hanoi',
      area: '2.0 Hectares Connected Greenhouses',
      type: 'Leafy Greens & Cherry Tomatoes',
      standard: 'Organic VietGAP',
      image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
      stat: 'Zero Chemical Residue',
      desc: 'Deep groundwater quality monitoring supplying pure micro-minerals, delivering 1.5 tons of clean produce daily to supermarket chains.',
    },
  ],
};

// 4 process steps (Bilingual)
const processStepsData = {
  vi: [
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
  ],
  en: [
    {
      step: '01',
      title: 'Survey & Profile Production Zones',
      desc: 'Evaluate soil health, irrigation water sources, and historical land use to establish verified buffer zones.',
      icon: 'plots',
    },
    {
      step: '02',
      title: 'Control Certified Seed & Farm Inputs',
      desc: 'Catalog registered seeds, certified fertilizers, and plant protection products approved by the Ministry of Agriculture.',
      icon: 'box',
    },
    {
      step: '03',
      title: 'Record Daily Electronic Farming Diary',
      desc: 'Log field operations easily from any device: receive fertilization reminders and auto-calculate pre-harvest safety intervals.',
      icon: 'book',
    },
    {
      step: '04',
      title: 'Harvest, Audit & Print Origin QR Tags',
      desc: 'Maintain export-ready audit records for certifiers and issue consumer QR codes proving food safety provenance.',
      icon: 'award',
    },
  ],
};

// Testimonials (Bilingual)
const testimonialsData = {
  vi: [
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
  ],
  en: [
    {
      quote:
        'I used to log everything on paper notebooks which got wet, faded, or led to missed spray dates. With MyCropDiary on my phone, VietGAP inspectors reviewed our digital logs and certified us in 15 minutes!',
      author: 'Tran Van Hung',
      role: 'Owner, Da Lat Cantaloupe Farm (Lam Dong)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      stars: 5,
    },
    {
      quote:
        'The software allows our cooperative to manage over 40 member farmers in sync. Fertilization and harvest data are digitized, enabling long-term wholesale supermarket agreements at 20% higher margins.',
      author: 'Le Thi Mai',
      role: 'Director, Cao Lanh Fruit Cooperative (Dong Thap)',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      stars: 5,
    },
    {
      quote:
        'Clean, accessible interface designed for real growers. The cost breakdown down to each production block helped me eliminate more than 30 million VND in fertilizer overuse every harvest season.',
      author: 'Nguyen Van Thang',
      role: 'Owner, Ba Vi Organic Farm (Hanoi)',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      stars: 5,
    },
  ],
};

const loadFeaturedArticles = (signal: AbortSignal) => fetchKnowledgeArticles({ sort: 'popular', page: 1, pageSize: 4 }, signal);

export function HomePage() {
  const { lang, t } = useLanguage();
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const { data, loading, error, retry } = useApiData(loadFeaturedArticles);
  const featuredArticles = !loading && !error ? data?.items ?? [] : [];

  const coreFeatures = coreFeaturesData[lang];
  const farmShowcases = farmShowcasesData[lang];
  const processSteps = processStepsData[lang];
  const testimonials = testimonialsData[lang];

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
                <span>{lang === 'en' ? 'Leading Digital VietGAP Agricultural Platform' : 'VietGAP Digital Agriculture Platform hàng đầu'}</span>
              </div>

              <h1 id="showcase-title" className="hero-main-title">
                {lang === 'en' ? (
                  <>
                    Digital Crop Diary.<br />
                    <span className="hero-highlight-gradient">Transparent Costs.</span><br />
                    Elevating Quality Produce.
                  </>
                ) : (
                  <>
                    Nhật ký canh tác số.<br />
                    <span className="hero-highlight-gradient">Minh bạch chi phí.</span><br />
                    Nâng tầm nông sản Việt.
                  </>
                )}
              </h1>

              <p className="hero-description">
                {lang === 'en' ? (
                  <>
                    Partnering with over <strong>1,500 growers &amp; cooperatives</strong> nationwide to standardize
                    VietGAP farming processes, optimize fertilizer and chemical inputs, and expand supermarket and export opportunities.
                  </>
                ) : (
                  <>
                    Đồng hành cùng hơn <strong>1,500 nhà vườn &amp; hợp tác xã</strong> trên toàn quốc chuẩn hoá
                    quy trình sản xuất VietGAP, tối ưu chi phí phân bón vật tư, số hóa mùa vụ và mở rộng cơ hội vào siêu thị, xuất khẩu.
                  </>
                )}
              </p>

              <div className="hero-cta-group">
                <Link to="/register" className="btn-hero-primary">
                  <span>{lang === 'en' ? 'Register Your Farm Now' : 'Đăng ký trang trại ngay'}</span>
                  <Icon name="arrow" />
                </Link>
                <Link to="/knowledge" className="btn-hero-secondary">
                  <Icon name="book" />
                  <span>{lang === 'en' ? 'VietGAP Library' : 'Thư viện VietGAP'}</span>
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
                    <strong>{lang === 'en' ? '1,500+ Farm Growers' : '1,500+ Nhà vườn'}</strong>
                    <span>{lang === 'en' ? 'partnered in digital farming' : 'đã đồng hành số hóa'}</span>
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
                    <strong>{lang === 'en' ? '4.9 / 5.0 Rating' : '4.9 / 5.0 Đánh giá'}</strong>
                    <span>{lang === 'en' ? 'National VietGAP Standard' : 'Chuẩn VietGAP quốc gia'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Khối ảnh Hero đa tầng với các thẻ tương tác sinh động */}
            <div className="hero-visual-block">
              <div className="visual-card-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80"
                  alt="High tech VietGAP agriculture"
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
                    <span className="floating-tag">{lang === 'en' ? 'VietGAP Certified' : 'Chứng nhận VietGAP'}</span>
                    <strong>{lang === 'en' ? '100% Export Grade' : 'Đạt chuẩn xuất khẩu 100%'}</strong>
                    <small>{lang === 'en' ? 'Audit Code: VGAP-2026-DL' : 'Mã kiểm định: VGAP-2026-DL'}</small>
                  </div>
                </div>

                {/* Floating Widget 2: Tiết kiệm chi phí */}
                <div className="hero-floating-card card-saving">
                  <div className="floating-icon-box bg-amber">
                    <Icon name="trending-up" />
                  </div>
                  <div className="floating-card-body">
                    <span className="floating-tag">{lang === 'en' ? 'Input Optimization' : 'Tối ưu vật tư'}</span>
                    <strong className="text-emerald">{lang === 'en' ? '-30% Agrochemical Cost' : '-30% Chi phí phân thuốc'}</strong>
                    <small>{lang === 'en' ? 'Waste reduction per season' : 'Cắt giảm lãng phí vụ mùa'}</small>
                  </div>
                </div>

                {/* Floating Widget 3: Live Diary Status */}
                <div className="hero-floating-card card-status">
                  <div className="pulse-indicator" />
                  <div className="floating-card-body">
                    <strong>{lang === 'en' ? "Today's Farming Diary" : 'Nhật ký canh tác hôm nay'}</strong>
                    <small>{lang === 'en' ? 'Nutrient irrigation Block A • 08:30' : 'Đã tưới dinh dưỡng Block A • 08:30'}</small>
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
              <span>{lang === 'en' ? 'Why Choose ' : 'Vì sao chọn '}<span className="benefits-brand">MyCropDiary?</span></span>
              <Icon name="leaf" className="benefits-heading-leaf" />
            </h2>
            <p>
              {lang === 'en'
                ? 'Comprehensive, intuitive, and effective digital farming management built for commercial agriculture.'
                : 'Giải pháp quản lý nông nghiệp toàn diện, đơn giản và hiệu quả cho nhà vườn Việt.'}
            </p>
          </header>
          <div className="home-benefits-grid">
            {(lang === 'en'
              ? [
                  { icon: 'book', title: 'Farming Diary', desc: 'Log daily activities effortlessly; searchable across crop seasons.' },
                  { icon: 'money', title: 'Cost Tracking', desc: 'Control farm inputs, labor costs, and operational margins.' },
                  { icon: 'shield', title: 'VietGAP Compliance', desc: 'Full audit logs, digital checklists, and QR food traceability.' },
                  { icon: 'sprout', title: 'AI Farm Assistant', desc: 'Automated guidance, scheduled reminders, and smart agronomy tips.' },
                ]
              : [
                  { icon: 'book', title: 'Nhật ký canh tác', desc: 'Ghi chép hoạt động hằng ngày, dễ tra cứu theo mùa vụ.' },
                  { icon: 'money', title: 'Theo dõi chi phí', desc: 'Kiểm soát vật tư, chi phí và hiệu quả sản xuất.' },
                  { icon: 'shield', title: 'Tuân thủ VietGAP', desc: 'Lưu hồ sơ, checklist và truy xuất nguồn gốc rõ ràng.' },
                  { icon: 'sprout', title: 'Trợ lý AI nông nghiệp', desc: 'Gợi ý quy trình, nhắc việc và hỗ trợ ra quyết định.' },
                ]
            ).map((benefit) => (
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
            <span className="section-pill">{lang === 'en' ? 'COMPREHENSIVE SOLUTION' : 'GIẢI PHÁP TOÀN DIỆN'}</span>
            <h2 id="features-heading" className="section-title">
              {lang === 'en' ? 'Every Tool Modern Growers Need in One Platform' : 'Mọi công cụ nhà nông cần trong một ứng dụng duy nhất'}
            </h2>
            <p className="section-subtitle">
              {lang === 'en'
                ? 'Completely replace paper notebooks with a unified cloud system: time-stamped, tamper-proof, and secure.'
                : 'Thay thế hoàn toàn sổ tay ghi chép dễ thất lạc bằng hệ thống số hóa thông minh, chuẩn xác từng ngày giờ và bảo mật dữ liệu an toàn trên đám mây.'}
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
              <span className="section-pill">{lang === 'en' ? 'GUIDES & TECHNIQUES' : 'CẨM NANG & KỸ THUẬT'}</span>
              <h2 id="knowledge-spotlight-heading" className="section-title">
                {lang === 'en' ? 'Standard VietGAP Farming Knowledge' : 'Kiến thức canh tác VietGAP chuẩn mực'}
              </h2>
              <p className="section-subtitle">
                {lang === 'en'
                  ? 'Authored by agricultural specialists, helping growers handle pests, optimize inputs, and master compliance standards.'
                  : 'Được biên soạn bởi các chuyên gia nông nghiệp đầu ngành, hỗ trợ nông hộ xử lý sâu bệnh, sử dụng phân bón hiệu quả và nắm vững các quy định kiểm nghiệm.'}
              </p>
            </div>
            <Link to="/knowledge" className="btn-view-all-knowledge">
              <span>{lang === 'en' ? 'View All Articles' : 'Xem tất cả bài viết'}</span>
              <Icon name="arrow" />
            </Link>
          </div>

          {loading && <p role="status">{lang === 'en' ? 'Loading articles...' : 'Đang tải bài viết...'}</p>}
          {error && <div role="alert"><p>{error}</p><button type="button" className="action-button" onClick={retry}>{lang === 'en' ? 'Retry' : 'Thử lại'}</button></div>}
          {!loading && !error && featuredArticles.length === 0 && <p>{lang === 'en' ? 'No articles published yet.' : 'Chưa có bài viết được xuất bản.'}</p>}
          <div className="knowledge-cards-grid">
            {featuredArticles.map((article) => {
              return (
                <article key={article.id} className="knowledge-spotlight-card">
                  <div className="card-thumb-wrap">
                    {article.image && <img src={article.image} alt={article.title} className="card-thumb-img" loading="lazy" />}
                    <span className="card-category-badge">
                      {article.category ? KNOWLEDGE_CATEGORY_LABEL[article.category] : (lang === 'en' ? 'Agricultural Knowledge' : 'Kiến thức nông nghiệp')}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="card-meta-line">
                      <span>⏱ {article.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}</span>
                      <span>👁 {article.viewCount.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')} {lang === 'en' ? 'views' : 'lượt xem'}</span>
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
                        <span>{lang === 'en' ? 'Quick Summary' : 'Đọc tóm tắt nhanh'}</span>
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
            <span className="section-pill">{lang === 'en' ? 'REAL-WORLD MODELS' : 'MÔ HÌNH THỰC TẾ'}</span>
            <h2 id="showcase-heading" className="section-title">
              {lang === 'en' ? 'Featured Farms Powered by MyCropDiary' : 'Các vùng trồng tiêu biểu ứng dụng MyCropDiary'}
            </h2>
            <p className="section-subtitle">
              {lang === 'en'
                ? 'From Dalat highlands to the Mekong delta, MyCropDiary proudly empowers leading producers in high-standard agriculture.'
                : 'Từ cao nguyên Đà Lạt đến đồng bằng sông Cửu Long, MyCropDiary tự hào đồng hành cùng các đơn vị tiên phong trong cuộc cách mạng nông nghiệp chất lượng cao.'}
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
                    <strong>{lang === 'en' ? 'Specialty: ' : 'Chuyên canh: '}</strong> {farm.type}
                  </p>
                  <p className="farm-area-text">
                    <strong>{lang === 'en' ? 'Scale: ' : 'Quy mô: '}</strong> {farm.area}
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
            <span className="section-pill">{lang === 'en' ? 'SIMPLE ROADMAP' : 'LỘ TRÌNH ĐƠN GIẢN'}</span>
            <h2 id="process-heading" className="section-title">
              {lang === 'en' ? '4 Steps to Effortless VietGAP Certification' : '4 bước số hoá đạt chứng nhận VietGAP dễ dàng'}
            </h2>
            <p className="section-subtitle">
              {lang === 'en'
                ? 'Optimized workflows tailored to the daily operational routine of agricultural growers.'
                : 'Quy trình làm việc được thiết kế tối ưu, phù hợp với thói quen làm vườn của bà con nông dân.'}
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
            <span className="section-pill">{lang === 'en' ? 'REAL GROWERS' : 'NGƯỜI THẬT VIỆC THẬT'}</span>
            <h2 id="testimonials-heading" className="section-title">
              {lang === 'en' ? 'What Producers Say About MyCropDiary' : 'Nhà nông nói gì về MyCropDiary?'}
            </h2>
            <p className="section-subtitle">
              {lang === 'en'
                ? 'Farmer satisfaction and abundant harvest seasons are the greatest testament to the platform value.'
                : 'Sự hài lòng và mùa màng bội thu của bà con là minh chứng rõ ràng nhất cho giá trị nền tảng mang lại.'}
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
              <span className="cta-pill">{lang === 'en' ? 'ADVANCING AGRICULTURE' : 'ĐỒNG HÀNH CÙNG NÔNG NGHIỆP VIỆT'}</span>
              <h2 id="cta-heading" className="cta-title">
                {lang === 'en' ? 'Ready to Transform Your Farm Operations Today?' : 'Sẵn sàng nâng tầm trang trại của bạn hôm nay?'}
              </h2>
              <p className="cta-desc">
                {lang === 'en'
                  ? 'Register free in 2 minutes. Start logging your season diary, standardize operations, and certify your clean farm produce brand.'
                  : 'Đăng ký tài khoản miễn phí chỉ trong 2 phút. Bắt đầu ghi nhật ký mùa vụ, chuẩn hóa quy trình và khẳng định thương hiệu nông sản sạch của bạn.'}
              </p>
              <div className="cta-buttons">
                <Link to="/register" className="btn-cta-white">
                  <span>{lang === 'en' ? 'Register Your Farm Now' : 'Tạo tài khoản trang trại ngay'}</span>
                  <Icon name="arrow" />
                </Link>
                <Link to="/knowledge" className="btn-cta-outline">
                  <Icon name="book" />
                  <span>{lang === 'en' ? 'Read VietGAP Guidelines' : 'Đọc quy trình VietGAP'}</span>
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
