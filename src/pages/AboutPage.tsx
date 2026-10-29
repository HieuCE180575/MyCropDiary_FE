import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import '../styles/about.css';

const imageRoot = '/images/owner-dashboard/';
const values = [
  { icon: 'leaf', title: 'Dễ sử dụng', description: 'Giao diện thân thiện, phù hợp với nhu cầu quản lý hằng ngày của người làm nông.' },
  { icon: 'book', title: 'Ghi chép rõ ràng', description: 'Lưu trữ và tổ chức thông tin canh tác để thuận tiện theo dõi, tra cứu.' },
  { icon: 'sprout', title: 'Gắn với thực tế', description: 'Tập trung vào những nhu cầu quen thuộc trong sản xuất nông nghiệp.' },
  { icon: 'shield', title: 'Minh bạch thông tin', description: 'Hỗ trợ lưu lại lịch sử sản xuất, tạo cơ sở cho việc kiểm tra và truy xuất nguồn gốc.' },
];
const audiences = [
  { image: 'about-farmer.jpg', alt: 'Chủ trang trại tại vườn rau xanh', title: 'Chủ trang trại', subtitle: 'Quản lý toàn diện hoạt động sản xuất', description: 'Hỗ trợ chủ trang trại tổ chức thông tin khu sản xuất, lô đất, mùa vụ và nhân sự, đồng thời theo dõi hoạt động canh tác trong phạm vi quản lý.' },
  { image: 'about-manager.jpg', alt: 'Người quản lý theo dõi thông tin trên thiết bị di động tại trang trại', title: 'Người quản lý', subtitle: 'Theo dõi và điều phối công việc hiệu quả', description: 'Hỗ trợ quản lý các hoạt động canh tác, theo dõi tiến độ công việc và ghi nhận thông tin sản xuất theo từng mùa vụ.' },
  { image: 'about-worker.jpg', alt: 'Người lao động đội nón lá chăm sóc cây trồng', title: 'Người lao động', subtitle: 'Ghi nhận công việc ngay tại đồng ruộng', description: 'Giúp người lao động theo dõi công việc được phân công và ghi nhận các hoạt động đã thực hiện theo quyền truy cập được cấp.' },
];
const journey = [
  { icon: 'file-text', title: 'Ghi chép', description: 'Chuyển thông tin canh tác từ sổ tay sang nhật ký điện tử.' },
  { icon: 'settings', title: 'Quản lý', description: 'Tổ chức thông tin trang trại, mùa vụ, vật tư và công việc trên cùng hệ thống.' },
  { icon: 'report', title: 'Theo dõi', description: 'Hỗ trợ tra cứu lịch sử hoạt động và theo dõi quá trình sản xuất.' },
  { icon: 'sprout', title: 'Phát triển', description: 'Hướng đến khai thác dữ liệu để hỗ trợ quản lý nông nghiệp hiệu quả hơn.' },
];

function AboutLabel({ children }: { children: string }) {
  return <span className="about-label"><Icon name="leaf" />{children}</span>;
}
function AboutIcon({ name }: { name: string }) {
  return <span className="about-icon-box"><Icon name={name} /></span>;
}

export function AboutPage() {
  function scrollToStory() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const story = document.getElementById('about-story');
    story?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    story?.focus({ preventScroll: true });
  }
  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-heading">
        <img className="about-hero-image" src={`${imageRoot}about-hero.jpg`} alt="Người nông dân đội nón lá sử dụng điện thoại trong vườn rau" width="1536" height="768" fetchPriority="high" />
        <div className="about-container about-hero-inner">
          <div className="about-hero-copy">
            <AboutLabel>VỀ CHÚNG TÔI</AboutLabel>
            <h1 id="about-heading">Cùng người làm nông<br />ghi chép hôm nay,<br /><em>vun trồng ngày mai.</em></h1>
            <p>MyCropDiary được xây dựng để giúp nông hộ và hợp tác xã quản lý hoạt động canh tác thuận tiện hơn.</p>
            <p>Từ ghi chép nhật ký, theo dõi mùa vụ đến quản lý vật tư và chi phí, chúng tôi hướng tới việc đưa những thông tin sản xuất về một nơi để theo dõi, phục vụ cho quá trình canh tác bền vững.</p>
            <div className="about-hero-actions">
              <button className="about-button about-button-primary" type="button" onClick={scrollToStory}>Tìm hiểu thêm<Icon name="arrow" /></button>
              <Link className="about-button about-button-secondary" to="/features"><Icon name="play-circle" />Xem tính năng nổi bật</Link>
            </div>
          </div>
          <div className="about-hero-note"><Icon name="leaf" /><div><strong>Nhật ký hôm nay</strong><span>Cho một mùa vụ bền vững hơn</span></div></div>
        </div>
      </section>
      <div className="about-container about-content">
        <section className="about-story" id="about-story" tabIndex={-1} aria-labelledby="about-story-heading">
          <img className="about-story-image" src={`${imageRoot}about-story.jpg`} alt="Người nông dân ghi chép nhật ký canh tác vào sổ tay ngay tại vườn" width="900" height="600" loading="lazy" />
          <div>
            <AboutLabel>CÂU CHUYỆN HÌNH THÀNH</AboutLabel>
            <h2 id="about-story-heading">Từ những ghi chép trên đồng ruộng<br className="about-desktop-break" /> đến quản lý nông nghiệp số</h2>
            <p>Trong thực tế sản xuất nông nghiệp, nhiều thông tin vẫn được ghi chép thủ công bằng sổ tay hoặc lưu trữ rời rạc, khiến việc tra cứu, tổng hợp và theo dõi gặp nhiều khó khăn.</p>
            <p>Xuất phát từ nhu cầu đó, MyCropDiary được xây dựng với mong muốn mang đến một công cụ quản lý đơn giản, dễ tiếp cận và phù hợp với hoạt động sản xuất nông nghiệp thực tế.</p>
            <ul className="about-story-benefits">
              {[['file-text', 'Giảm sự phụ thuộc', 'vào ghi chép thủ công'], ['database', 'Tập trung thông tin', 'trên một hệ thống'], ['report', 'Hỗ trợ quản lý và', 'tra cứu dễ dàng']].map(([icon, title, description]) => (
                <li key={icon}><AboutIcon name={icon} /><div><strong>{title}</strong><span>{description}</span></div></li>
              ))}
            </ul>
          </div>
        </section>
        <section aria-labelledby="about-purpose-heading">
          <AboutLabel>SỨ MỆNH &amp; TẦM NHÌN</AboutLabel>
          <h2 id="about-purpose-heading">Định hướng cho một nền nông nghiệp bền vững</h2>
          <div className="about-purpose-grid">
            <article className="about-card about-purpose-card about-mission">
              <div className="about-purpose-header"><AboutIcon name="target" /><div><h3>Sứ mệnh</h3><strong>Đơn giản hóa quản lý canh tác cho người làm nông</strong></div></div>
              <p>MyCropDiary hướng đến việc cung cấp một nền tảng quản lý nông nghiệp trực quan, dễ sử dụng, giúp nông hộ và hợp tác xã ghi nhận hoạt động sản xuất, theo dõi mùa vụ và quản lý thông tin canh tác một cách thuận tiện.</p>
              <p>Thông qua việc số hóa dữ liệu sản xuất, hệ thống góp phần giảm bớt khó khăn trong ghi chép, nâng cao khả năng theo dõi và hỗ trợ người dùng tiếp cận phương pháp quản lý nông nghiệp có hệ thống.</p>
            </article>
            <article className="about-card about-purpose-card about-vision">
              <div className="about-purpose-header"><AboutIcon name="telescope" /><div><h3>Tầm nhìn</h3><strong>Hướng đến nền nông nghiệp minh bạch và bền vững</strong></div></div>
              <p>MyCropDiary hướng đến việc trở thành một công cụ hỗ trợ người làm nông trong quá trình chuyển đổi số nông nghiệp.</p>
              <p>Trong tương lai, hệ thống mong muốn tiếp tục hoàn thiện các chức năng quản lý, nâng cao khả năng khai thác dữ liệu canh tác và hỗ trợ người dùng từng bước tiếp cận những phương pháp sản xuất an toàn, hiệu quả và có khả năng truy xuất nguồn gốc.</p>
            </article>
          </div>
        </section>
        <section aria-labelledby="about-values-heading">
          <h2 className="about-badge-heading" id="about-values-heading"><AboutLabel>NHỮNG GIÁ TRỊ CHÚNG TÔI THEO ĐUỔI</AboutLabel></h2>
          <div className="about-values-grid">
            {values.map(value => <article className="about-card about-value" key={value.title}><AboutIcon name={value.icon} /><div><h3>{value.title}</h3><p>{value.description}</p></div></article>)}
          </div>
        </section>
        <section aria-labelledby="about-audience-heading">
          <AboutLabel>MYCROPDIARY DÀNH CHO AI?</AboutLabel>
          <h2 id="about-audience-heading">Được xây dựng cho những người trực tiếp làm nông</h2>
          <div className="about-audience-grid">
            {audiences.map(audience => <article className="about-card about-audience" key={audience.title}>
              <img src={`${imageRoot}${audience.image}`} alt={audience.alt} width="300" height="400" loading="lazy" />
              <div><h3>{audience.title}</h3><strong>{audience.subtitle}</strong><p>{audience.description}</p></div>
            </article>)}
          </div>
        </section>
        <section aria-labelledby="about-journey-heading">
          <AboutLabel>HÀNH TRÌNH HƯỚNG ĐẾN NÔNG NGHIỆP SỐ</AboutLabel>
          <h2 id="about-journey-heading">Từng bước cùng người làm nông chuyển đổi số</h2>
          <ol className="about-journey">
            {journey.map((step, index) => <li key={step.title}><span className="about-step-number">{String(index + 1).padStart(2, '0')}</span><AboutIcon name={step.icon} /><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
          </ol>
        </section>
      </div>
    </main>
  );
}
