import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import '../styles/about.css';
import { useLanguage } from '../shared/i18n/LanguageContext';

const imageRoot = '/images/owner-dashboard/';

const valuesData = {
  vi: [
    { icon: 'leaf', title: 'Dễ sử dụng', description: 'Giao diện thân thiện, phù hợp với nhu cầu quản lý hằng ngày của người làm nông.' },
    { icon: 'book', title: 'Ghi chép rõ ràng', description: 'Lưu trữ và tổ chức thông tin canh tác để thuận tiện theo dõi, tra cứu.' },
    { icon: 'sprout', title: 'Gắn với thực tế', description: 'Tập trung vào những nhu cầu quen thuộc trong sản xuất nông nghiệp.' },
    { icon: 'shield', title: 'Minh bạch thông tin', description: 'Hỗ trợ lưu lại lịch sử sản xuất, tạo cơ sở cho việc kiểm tra và truy xuất nguồn gốc.' },
  ],
  en: [
    { icon: 'leaf', title: 'Intuitive & Easy', description: 'User-friendly interface designed for the daily practical needs of growers.' },
    { icon: 'book', title: 'Clear Records', description: 'Organize and store crop operations for effortless auditing and historical queries.' },
    { icon: 'sprout', title: 'Practical Agtech', description: 'Focused on realistic agricultural workflows from land prep to harvest.' },
    { icon: 'shield', title: 'Full Transparency', description: 'Maintain audit-ready operational history for certifiers and origin traceability.' },
  ],
};

const audiencesData = {
  vi: [
    { image: 'about-farmer.jpg', alt: 'Chủ trang trại', title: 'Chủ trang trại', subtitle: 'Quản lý toàn diện hoạt động sản xuất', description: 'Hỗ trợ chủ trang trại tổ chức thông tin khu sản xuất, lô đất, mùa vụ và nhân sự, đồng thời theo dõi hoạt động canh tác trong phạm vi quản lý.' },
    { image: 'about-manager.jpg', alt: 'Người quản lý', title: 'Người quản lý', subtitle: 'Theo dõi và điều phối công việc hiệu quả', description: 'Hỗ trợ quản lý các hoạt động canh tác, theo dõi tiến độ công việc và ghi nhận thông tin sản xuất theo từng mùa vụ.' },
    { image: 'about-worker.jpg', alt: 'Người lao động', title: 'Người lao động', subtitle: 'Ghi nhận công việc ngay tại đồng ruộng', description: 'Giúp người lao động theo dõi công việc được phân công và ghi nhận các hoạt động đã thực hiện theo quyền truy cập được cấp.' },
  ],
  en: [
    { image: 'about-farmer.jpg', alt: 'Farm Owner', title: 'Farm Owners', subtitle: 'Comprehensive Operational Management', description: 'Empower farm owners to structure production zones, blocks, seasons, and staffing while tracking overall yields and compliance.' },
    { image: 'about-manager.jpg', alt: 'Farm Manager', title: 'Farm Managers', subtitle: 'Efficient Workflow Coordination', description: 'Coordinate agricultural operations, monitor daily task execution, and log field inputs systematically across crop seasons.' },
    { image: 'about-worker.jpg', alt: 'Agricultural Worker', title: 'Field Workers', subtitle: 'Instant Mobile Record Keeping', description: 'Allow field workers to view assigned responsibilities and record completed field actions right on the ground.' },
  ],
};

const journeyData = {
  vi: [
    { icon: 'file-text', title: 'Ghi chép', description: 'Chuyển thông tin canh tác từ sổ tay sang nhật ký điện tử.' },
    { icon: 'settings', title: 'Quản lý', description: 'Tổ chức thông tin trang trại, mùa vụ, vật tư và công việc trên cùng hệ thống.' },
    { icon: 'report', title: 'Theo dõi', description: 'Hỗ trợ tra cứu lịch sử hoạt động và theo dõi quá trình sản xuất.' },
    { icon: 'sprout', title: 'Phát triển', description: 'Hướng đến khai thác dữ liệu để hỗ trợ quản lý nông nghiệp hiệu quả hơn.' },
  ],
  en: [
    { icon: 'file-text', title: 'Digitize Logs', description: 'Transition handwritten field notebooks to tamper-proof digital diaries.' },
    { icon: 'settings', title: 'Unify Operations', description: 'Organize farm assets, crop seasons, input materials, and worker tasks in one platform.' },
    { icon: 'report', title: 'Audit & Track', description: 'Query historical treatments and monitor production milestones accurately.' },
    { icon: 'sprout', title: 'Sustainable Scale', description: 'Harness operational analytics to optimize farm productivity and commercial scale.' },
  ],
};

function AboutLabel({ children }: { children: string }) {
  return <span className="about-label"><Icon name="leaf" />{children}</span>;
}
function AboutIcon({ name }: { name: string }) {
  return <span className="about-icon-box"><Icon name={name} /></span>;
}

export function AboutPage() {
  const { lang } = useLanguage();
  const values = valuesData[lang];
  const audiences = audiencesData[lang];
  const journey = journeyData[lang];

  function scrollToStory() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const story = document.getElementById('about-story');
    story?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    story?.focus({ preventScroll: true });
  }

  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-heading">
        <img className="about-hero-image" src={`${imageRoot}about-hero.jpg`} alt="Farmer in green farm" width="1536" height="768" fetchPriority="high" />
        <div className="about-container about-hero-inner">
          <div className="about-hero-copy">
            <AboutLabel>{lang === 'en' ? 'ABOUT US' : 'VỀ CHÚNG TÔI'}</AboutLabel>
            <h1 id="about-heading">
              {lang === 'en' ? (
                <>Together with growers,<br />recording today,<br /><em>cultivating tomorrow.</em></>
              ) : (
                <>Cùng người làm nông<br />ghi chép hôm nay,<br /><em>vun trồng ngày mai.</em></>
              )}
            </h1>
            <p>
              {lang === 'en'
                ? 'MyCropDiary is built to empower commercial farms and cooperatives with seamless digital operations.'
                : 'MyCropDiary được xây dựng để giúp nông hộ và hợp tác xã quản lý hoạt động canh tác thuận tiện hơn.'}
            </p>
            <p>
              {lang === 'en'
                ? 'From electronic diaries and seasonal schedules to industrial material inventory and cost accounting, we unify agricultural data to foster sustainable farming.'
                : 'Từ ghi chép nhật ký, theo dõi mùa vụ đến quản lý vật tư và chi phí, chúng tôi hướng tới việc đưa những thông tin sản xuất về một nơi để theo dõi, phục vụ cho quá trình canh tác bền vững.'}
            </p>
            <div className="about-hero-actions">
              <button className="about-button about-button-primary" type="button" onClick={scrollToStory}>
                {lang === 'en' ? 'Discover Our Story' : 'Tìm hiểu thêm'}
                <Icon name="arrow" />
              </button>
              <Link className="about-button about-button-secondary" to="/features">
                <Icon name="play-circle" />
                {lang === 'en' ? 'Explore Key Features' : 'Xem tính năng nổi bật'}
              </Link>
            </div>
          </div>
          <div className="about-hero-note">
            <Icon name="leaf" />
            <div>
              <strong>{lang === 'en' ? 'Smart Diary Today' : 'Nhật ký hôm nay'}</strong>
              <span>{lang === 'en' ? 'For a sustainable harvest tomorrow' : 'Cho một mùa vụ bền vững hơn'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="about-container about-content">
        <section className="about-story" id="about-story" tabIndex={-1} aria-labelledby="about-story-heading">
          <img className="about-story-image" src={`${imageRoot}about-story.jpg`} alt="Farmer writing diary" width="900" height="600" loading="lazy" />
          <div>
            <AboutLabel>{lang === 'en' ? 'OUR ORIGIN STORY' : 'CÂU CHUYỆN HÌNH THÀNH'}</AboutLabel>
            <h2 id="about-story-heading">
              {lang === 'en' ? (
                <>From handwritten notebooks in the field<br className="about-desktop-break" /> to digital agriculture management</>
              ) : (
                <>Từ những ghi chép trên đồng ruộng<br className="about-desktop-break" /> đến quản lý nông nghiệp số</>
              )}
            </h2>
            <p>
              {lang === 'en'
                ? 'In practical agriculture, field data has historically been jotted down on paper or fragmented across spreadsheets, creating bottlenecks for audits and traceability.'
                : 'Trong thực tế sản xuất nông nghiệp, nhiều thông tin vẫn được ghi chép thủ công bằng sổ tay hoặc lưu trữ rời rạc, khiến việc tra cứu, tổng hợp và theo dõi gặp nhiều khó khăn.'}
            </p>
            <p>
              {lang === 'en'
                ? 'MyCropDiary solves this with an intuitive, field-ready platform tailored specifically for real agricultural operational routines.'
                : 'Xuất phát từ nhu cầu đó, MyCropDiary được xây dựng với mong muốn mang đến một công cụ quản lý đơn giản, dễ tiếp cận và phù hợp với hoạt động sản xuất nông nghiệp thực tế.'}
            </p>
            <ul className="about-story-benefits">
              {(lang === 'en'
                ? [['file-text', 'Eliminate reliance', 'on paper notebooks'], ['database', 'Centralize all farm data', 'in a unified cloud system'], ['report', 'Instant audit records', 'and origin traceability']]
                : [['file-text', 'Giảm sự phụ thuộc', 'vào ghi chép thủ công'], ['database', 'Tập trung thông tin', 'trên một hệ thống'], ['report', 'Hỗ trợ quản lý và', 'tra cứu dễ dàng']]
              ).map(([icon, title, description]) => (
                <li key={icon}>
                  <AboutIcon name={icon} />
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="about-purpose-heading">
          <AboutLabel>{lang === 'en' ? 'MISSION & VISION' : 'SỨ MỆNH & TẦM NHÌN'}</AboutLabel>
          <h2 id="about-purpose-heading">
            {lang === 'en' ? 'Pioneering Sustainable and Verifiable Agriculture' : 'Định hướng cho một nền nông nghiệp bền vững'}
          </h2>
          <div className="about-purpose-grid">
            <article className="about-card about-purpose-card about-mission">
              <div className="about-purpose-header">
                <AboutIcon name="target" />
                <div>
                  <h3>{lang === 'en' ? 'Our Mission' : 'Sứ mệnh'}</h3>
                  <strong>{lang === 'en' ? 'Simplifying farm management for every grower' : 'Đơn giản hóa quản lý canh tác cho người làm nông'}</strong>
                </div>
              </div>
              <p>
                {lang === 'en'
                  ? 'MyCropDiary aims to deliver an intuitive, transparent platform that helps cooperatives and growers record field operations, track crop seasons, and control farm inputs effortlessly.'
                  : 'MyCropDiary hướng đến việc cung cấp một nền tảng quản lý nông nghiệp trực quan, dễ sử dụng, giúp nông hộ và hợp tác xã ghi nhận hoạt động sản xuất, theo dõi mùa vụ và quản lý thông tin canh tác một cách thuận tiện.'}
              </p>
            </article>
            <article className="about-card about-purpose-card about-vision">
              <div className="about-purpose-header">
                <AboutIcon name="telescope" />
                <div>
                  <h3>{lang === 'en' ? 'Our Vision' : 'Tầm nhìn'}</h3>
                  <strong>{lang === 'en' ? 'Transparent, safe, and sustainable agriculture' : 'Hướng đến nền nông nghiệp minh bạch và bền vững'}</strong>
                </div>
              </div>
              <p>
                {lang === 'en'
                  ? 'Becoming the standard operational companion for agricultural digital transformation, guaranteeing food safety and high-value export readiness.'
                  : 'MyCropDiary hướng đến việc trở thành một công cụ hỗ trợ người làm nông trong quá trình chuyển đổi số nông nghiệp.'}
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="about-values-heading">
          <h2 className="about-badge-heading" id="about-values-heading">
            <AboutLabel>{lang === 'en' ? 'CORE VALUES WE EMBODY' : 'NHỮNG GIÁ TRỊ CHÚNG TÔI THEO ĐUỔI'}</AboutLabel>
          </h2>
          <div className="about-values-grid">
            {values.map(value => (
              <article className="about-card about-value" key={value.title}>
                <AboutIcon name={value.icon} />
                <div>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-audience-heading">
          <AboutLabel>{lang === 'en' ? 'WHO IS MYCROPDIARY FOR?' : 'MYCROPDIARY DÀNH CHO AI?'}</AboutLabel>
          <h2 id="about-audience-heading">
            {lang === 'en' ? 'Built for Everyone in the Agricultural Value Chain' : 'Được xây dựng cho những người trực tiếp làm nông'}
          </h2>
          <div className="about-audience-grid">
            {audiences.map(audience => (
              <article className="about-card about-audience" key={audience.title}>
                <img src={`${imageRoot}${audience.image}`} alt={audience.alt} width="300" height="400" loading="lazy" />
                <div>
                  <h3>{audience.title}</h3>
                  <strong>{audience.subtitle}</strong>
                  <p>{audience.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-journey-heading">
          <AboutLabel>{lang === 'en' ? 'OUR DIGITAL TRANSFORMATION JOURNEY' : 'HÀNH TRÌNH HƯỚNG ĐẾN NÔNG NGHIỆP SỐ'}</AboutLabel>
          <h2 id="about-journey-heading">
            {lang === 'en' ? 'Guiding Agricultural Growers Step-by-Step' : 'Từng bước cùng người làm nông chuyển đổi số'}
          </h2>
          <ol className="about-journey">
            {journey.map((step, index) => (
              <li key={step.title}>
                <span className="about-step-number">{String(index + 1).padStart(2, '0')}</span>
                <AboutIcon name={step.icon} />
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
