export type RegistrationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const steps = [
  { title: 'Gửi đăng ký', description: 'Chuẩn bị và gửi thông tin trang trại.' },
  { title: 'Chờ xét duyệt', description: 'Xem trạng thái; sửa hoặc hủy yêu cầu khi còn chờ duyệt.' },
  { title: 'Bắt đầu quản lý', description: 'Khi được duyệt, mở không gian trang trại với vai trò chủ trang trại.' },
];

// Undefined means unavailable; null means a confirmed absence of registrations.
export function RegistrationGuide({ status, loading = false, error = false }: {
  status?: RegistrationStatus | null;
  loading?: boolean;
  error?: boolean;
}) {
  const currentStep = loading || error || status === undefined ? null
    : status === 'APPROVED' ? 2 : status === 'PENDING' ? 1 : 0;
  const message = loading ? 'Đang tải tiến độ đăng ký…'
    : error ? 'Chưa tải được tiến độ đăng ký.'
    : status === undefined ? 'Chưa có dữ liệu trạng thái xét duyệt. Theo dõi yêu cầu tại mục Đăng ký trang trại.'
    : status === 'REJECTED' ? 'Yêu cầu đã bị từ chối. Kiểm tra lý do trước khi gửi đăng ký mới.'
    : status === 'CANCELLED' ? 'Yêu cầu đã hủy. Bạn có thể chuẩn bị đăng ký mới.'
    : 'Theo dõi yêu cầu của bạn tại mục Đăng ký trang trại.';

  return <section className="registration-guide" aria-labelledby="registration-guide-title" aria-busy={loading}>
    <div><h2 id="registration-guide-title">Từ tài khoản cá nhân đến trang trại của bạn</h2><p role="status">{message}</p></div>
    <ol>{steps.map((step, index) => {
      const current = index === currentStep;
      const complete = currentStep !== null && index < currentStep;
      return <li key={step.title} className={`registration-step${current ? ' is-current' : complete ? ' is-complete' : ''}`} aria-current={current ? 'step' : undefined}>
        <span>{index + 1}</span>
        <div><strong>{step.title}</strong><p>{step.description}</p>
          {(current || complete) && <small className="registration-step-status">{current ? 'Hiện tại' : 'Đã hoàn thành'}</small>}
        </div>
      </li>;
    })}</ol>
  </section>;
}
