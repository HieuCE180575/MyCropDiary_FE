import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import '../styles/features.css';
import { useLanguage } from '../shared/i18n/LanguageContext';

const featuresData = {
  vi: [
    {
      icon: 'plots',
      illustration: 'farm',
      title: 'Quản lý trang trại',
      description: 'Nắm thông tin trang trại và tổ chức khu vực canh tác để thuận tiện theo dõi sản xuất.',
      examples: ['Thông tin trang trại', 'Khu sản xuất và lô đất', 'Hồ sơ người lao động'],
    },
    {
      icon: 'book',
      illustration: 'diary',
      title: 'Nhật ký canh tác',
      description: 'Ghi lại công việc đã thực hiện, giúp tra cứu quá trình chăm sóc cây trồng theo từng mùa vụ.',
      examples: ['Gieo trồng và chăm sóc', 'Tưới nước, bón phân và sử dụng thuốc', 'Lịch sử hoạt động canh tác'],
    },
    {
      icon: 'box',
      illustration: 'materials',
      title: 'Quản lý vật tư',
      description: 'Theo dõi giống, phân bón và thuốc bảo vệ thực vật để chủ động chuẩn bị cho công việc ngoài đồng.',
      examples: ['Danh sách vật tư nông nghiệp', 'Thông tin nhập và xuất kho', 'Theo dõi lượng vật tư sử dụng'],
    },
    {
      icon: 'money',
      illustration: 'costs',
      title: 'Theo dõi chi phí',
      description: 'Tập hợp các khoản chi trong quá trình sản xuất để dễ nhìn lại và lên kế hoạch cho mùa vụ tiếp theo.',
      examples: ['Chi phí giống và vật tư', 'Chi phí nhân công và sản xuất', 'Tổng hợp chi phí theo mùa vụ'],
    },
    {
      icon: 'leaf',
      illustration: 'knowledge',
      title: 'Kiến thức VietGAP',
      description: 'Tìm hiểu hướng dẫn canh tác và các nguyên tắc VietGAP qua thư viện bài viết theo từng chủ đề.',
      examples: ['Tìm kiếm và lọc bài viết', 'Hướng dẫn về đất, nước và cây giống', 'Kiến thức thu hoạch và truy xuất'],
    },
    {
      icon: 'bot',
      illustration: 'assistant',
      title: 'Trợ lý AI',
      description: 'Đặt câu hỏi để tra cứu hướng dẫn từ nguồn kiến thức đã được phê duyệt của hệ thống.',
      examples: ['Hỏi đáp kiến thức nông nghiệp', 'Xem lại lịch sử hội thoại', 'Gửi phản hồi về câu trả lời'],
    },
  ],
  en: [
    {
      icon: 'plots',
      illustration: 'farm',
      title: 'Farm Management',
      description: 'Centralize farm identity, manage production zones and sub-blocks for synchronized cultivation.',
      examples: ['Farm profile & certifications', 'Zones, parcels and blocks', 'Staff and worker directory'],
    },
    {
      icon: 'book',
      illustration: 'diary',
      title: 'Farming Diary',
      description: 'Log all field interventions and treatments with tamper-proof timestamps for VietGAP compliance.',
      examples: ['Planting & land preparation', 'Irrigation, fertilization & pest spraying', 'Comprehensive activity logs'],
    },
    {
      icon: 'box',
      illustration: 'materials',
      title: 'Material Inventory',
      description: 'Track industrial seed batches, fertilizer sacks, and agrochemical bottles with safe pre-harvest intervals.',
      examples: ['Agrochemical catalog (bags/bottles)', 'Warehouse stock & batch numbers', 'Usage tracking per parcel'],
    },
    {
      icon: 'money',
      illustration: 'costs',
      title: 'Financial Accounting',
      description: 'Aggregate production expenditures by season and block to determine exact profit margins.',
      examples: ['Material & agrochemical costs', 'Labor wages & machine hours', 'Seasonal financial summaries'],
    },
    {
      icon: 'leaf',
      illustration: 'knowledge',
      title: 'VietGAP Guidelines',
      description: 'Access official farming standards, safe isolation intervals, and soil/water quality criteria.',
      examples: ['Keyword and category search', 'Soil, water and seed requirements', 'Harvest safety & traceability'],
    },
    {
      icon: 'bot',
      illustration: 'assistant',
      title: 'AI Farming Assistant',
      description: 'Ask agronomy questions answered by verified agricultural standards and official documentation.',
      examples: ['Instant agricultural Q&A', 'Persistent chat history', 'Accuracy feedback review'],
    },
  ],
};

const highlightsData = {
  vi: [
    { icon: 'shield', title: 'Dễ sử dụng', description: 'Phù hợp nông hộ' },
    { icon: 'sprout', title: 'Hỗ trợ VietGAP', description: 'Quy trình chuẩn hóa' },
    { icon: 'cloud', title: 'Truy cập mọi nơi', description: 'Trên web và mobile' },
  ],
  en: [
    { icon: 'shield', title: 'Intuitive & Simple', description: 'Tailored for growers' },
    { icon: 'sprout', title: 'VietGAP Standard', description: 'Certified processes' },
    { icon: 'cloud', title: 'Cloud Accessible', description: 'Web & mobile responsive' },
  ],
};

export function FeaturesPage() {
  const { lang } = useLanguage();
  const features = featuresData[lang];
  const highlights = highlightsData[lang];

  return (
    <main className="features-page">
      <section className="features-hero" aria-labelledby="features-heading">
        <img className="features-hero-image" src="/images/owner-dashboard/features-hero.jpg" alt="Farmer checking crops with tablet" width="1787" height="880" fetchPriority="high" />
        <div className="features-container features-hero-inner">
          <div className="features-page-heading">
            <span className="features-page-eyebrow">
              <Icon name="leaf" />
              {lang === 'en' ? 'FEATURE HIGHLIGHTS' : 'TÍNH NĂNG NỔI BẬT'}
            </span>
            <h1 id="features-heading">
              {lang === 'en' ? (
                <>Essential Digital Tools<br /><span>for Every Harvest Season <Icon name="leaf" /></span></>
              ) : (
                <>Công cụ thiết thực<br /><span>cho mỗi mùa vụ <Icon name="leaf" /></span></>
              )}
            </h1>
            <p>
              {lang === 'en'
                ? 'From farm organization to field diaries, MyCropDiary helps growers and cooperatives track activities, materials, and finances in one platform.'
                : 'Từ quản lý trang trại đến ghi chép canh tác, MyCropDiary giúp nông hộ và hợp tác xã theo dõi công việc, vật tư và chi phí trên cùng một hệ thống.'}
            </p>
            <ul className="features-highlights">
              {highlights.map(highlight => (
                <li key={highlight.title}>
                  <span className="features-highlight-icon"><Icon name={highlight.icon} /></span>
                  <div>
                    <strong>{highlight.title}</strong>
                    <span>{highlight.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="features-container features-content">
        <section className="features-page-grid" aria-label={lang === 'en' ? 'MyCropDiary Platform Features' : 'Các tính năng của MyCropDiary'}>
          {features.map((feature) => (
            <article className="features-page-card" key={feature.title}>
              <img className="features-card-art" src={`/images/owner-dashboard/features-${feature.illustration}.svg`} alt="" aria-hidden="true" width="240" height="190" loading="lazy" />
              <span className="features-page-icon"><Icon name={feature.icon} /></span>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
              <ul>
                {feature.examples.map((example) => (
                  <li key={example}>
                    <Icon name="check-circle" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="features-page-cta" aria-labelledby="features-cta-heading">
          <div>
            <h2 id="features-cta-heading">
              {lang === 'en' ? 'Get Started with MyCropDiary' : 'Bắt đầu cùng MyCropDiary'}
            </h2>
            <p>
              {lang === 'en' ? 'Register your account to explore our complete farm management suite.' : 'Tạo tài khoản để khám phá các công cụ quản lý canh tác.'}
            </p>
          </div>
          <Link to="/register" className="btn-auth-primary">
            {lang === 'en' ? 'Register Your Farm' : 'Đăng ký trải nghiệm'}
          </Link>
        </section>
      </div>
    </main>
  );
}
