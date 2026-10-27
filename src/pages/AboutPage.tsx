import { Icon } from '../shared/components/Icon';
import '../styles/about.css';

const values = [
  {
    icon: 'sprout',
    title: 'Dễ sử dụng',
    description: 'Giúp nông hộ và hợp tác xã theo dõi công việc canh tác hằng ngày với thông tin dễ đọc, dễ tìm.',
  },
  {
    icon: 'book',
    title: 'Ghi chép rõ ràng',
    description: 'Lưu lại quá trình sản xuất để thuận tiện tra cứu nhật ký, vật tư và chi phí theo từng mùa vụ.',
  },
  {
    icon: 'leaf',
    title: 'Gắn với thực tế',
    description: 'Tập trung vào những nhu cầu quen thuộc của người làm nông, từ quản lý mùa vụ đến tiếp cận kiến thức VietGAP.',
  },
];

export function AboutPage() {
  return (
    <main className="about-page">
      <div className="public-container">
        <section className="about-intro" aria-labelledby="about-heading">
          <div className="about-intro-copy">
            <span className="about-eyebrow">Về chúng tôi</span>
            <h1 id="about-heading">Cùng người làm nông ghi chép hôm nay, vun trồng ngày mai.</h1>
            <p className="about-lead">
              MyCropDiary được xây dựng để giúp nông hộ và hợp tác xã quản lý hoạt động canh tác thuận tiện hơn.
            </p>
            <p>
              Từ ghi chép nhật ký, theo dõi mùa vụ đến quản lý vật tư và chi phí,
              chúng tôi hướng tới việc đưa những thông tin sản xuất về một nơi dễ theo dõi.
            </p>
          </div>
          <figure className="about-farm-photo">
            <img
              src="https://images.unsplash.com/photo-1697897400733-46e12551a012?auto=format&fit=crop&w=1200&q=80"
              alt="Người làm nông chăm sóc các luống chè xanh tại Việt Nam"
              width="1200"
              height="900"
            />
            <figcaption>Đồng hành cùng nông nghiệp Việt.</figcaption>
          </figure>
        </section>

        <section className="about-purpose" aria-labelledby="about-purpose-heading">
          <h2 id="about-purpose-heading">Điều chúng tôi hướng tới</h2>
          <p>
            Đồng hành cùng người làm nông trong việc hình thành thói quen ghi chép rõ ràng,
            tiếp cận kiến thức VietGAP và từng bước số hóa việc quản lý trang trại.
          </p>
        </section>

        <section className="about-values" aria-labelledby="about-values-heading">
          <h2 id="about-values-heading">Những giá trị chúng tôi theo đuổi</h2>
          <div className="about-values-grid">
            {values.map((value) => (
              <article className="about-value" key={value.title}>
                <Icon name={value.icon} className="about-value-icon" />
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
