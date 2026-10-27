import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import '../styles/features.css';

const features = [
  {
    icon: 'plots',
    title: 'Quản lý trang trại',
    description: 'Nắm thông tin trang trại và tổ chức khu vực canh tác để thuận tiện theo dõi sản xuất.',
    examples: ['Thông tin trang trại', 'Khu sản xuất và lô đất', 'Hồ sơ người lao động'],
  },
  {
    icon: 'book',
    title: 'Nhật ký canh tác',
    description: 'Ghi lại công việc đã thực hiện, giúp tra cứu quá trình chăm sóc cây trồng theo từng mùa vụ.',
    examples: ['Gieo trồng và chăm sóc', 'Tưới nước, bón phân và sử dụng thuốc', 'Lịch sử hoạt động canh tác'],
  },
  {
    icon: 'box',
    title: 'Quản lý vật tư',
    description: 'Theo dõi giống, phân bón và thuốc bảo vệ thực vật để chủ động chuẩn bị cho công việc ngoài đồng.',
    examples: ['Danh sách vật tư nông nghiệp', 'Thông tin nhập và xuất kho', 'Theo dõi lượng vật tư sử dụng'],
  },
  {
    icon: 'money',
    title: 'Theo dõi chi phí',
    description: 'Tập hợp các khoản chi trong quá trình sản xuất để dễ nhìn lại và lên kế hoạch cho mùa vụ tiếp theo.',
    examples: ['Chi phí giống và vật tư', 'Chi phí nhân công và sản xuất', 'Tổng hợp chi phí theo mùa vụ'],
  },
  {
    icon: 'leaf',
    title: 'Kiến thức VietGAP',
    description: 'Tìm hiểu hướng dẫn canh tác và các nguyên tắc VietGAP qua thư viện bài viết theo từng chủ đề.',
    examples: ['Tìm kiếm và lọc bài viết', 'Hướng dẫn về đất, nước và cây giống', 'Kiến thức thu hoạch và truy xuất'],
  },
  {
    icon: 'bot',
    title: 'Trợ lý AI',
    description: 'Đặt câu hỏi để tra cứu hướng dẫn từ nguồn kiến thức đã được phê duyệt của hệ thống.',
    examples: ['Hỏi đáp kiến thức nông nghiệp', 'Xem lại lịch sử hội thoại', 'Gửi phản hồi về câu trả lời'],
  },
];

export function FeaturesPage() {
  return (
    <main className="features-page">
      <div className="public-container">
        <header className="features-page-heading">
          <span className="features-page-eyebrow">Tính năng nổi bật</span>
          <h1>Công cụ thiết thực cho mỗi mùa vụ</h1>
          <p>
            Từ quản lý trang trại đến ghi chép canh tác, MyCropDiary giúp nông hộ và
            hợp tác xã theo dõi công việc, vật tư và chi phí trên cùng một hệ thống.
          </p>
        </header>

        <section className="features-page-grid" aria-label="Các tính năng của MyCropDiary">
          {features.map((feature) => (
            <article className="features-page-card" key={feature.title}>
              <span className="features-page-icon"><Icon name={feature.icon} /></span>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
              <ul>
                {feature.examples.map((example) => (
                  <li key={example}><Icon name="check-circle" /><span>{example}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="features-page-cta" aria-labelledby="features-cta-heading">
          <div>
            <h2 id="features-cta-heading">Bắt đầu cùng MyCropDiary</h2>
            <p>Tạo tài khoản để khám phá các công cụ quản lý canh tác.</p>
          </div>
          <Link to="/register" className="btn-auth-primary">Đăng ký trải nghiệm</Link>
        </section>
      </div>
    </main>
  );
}
