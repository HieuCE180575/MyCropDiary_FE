import { moduleDefinitions } from '../app/routes/moduleDefinitions';

export function DashboardPage() {
  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">MyCropDiary</span><h1>Tổng quan vận hành</h1></div>
        <button className="primary-button">+ Tạo công việc</button>
      </div>
      <div className="stats-grid">
        <article><span>Khu sản xuất</span><strong>04</strong><small>3 đang hoạt động</small></article>
        <article><span>Mùa vụ</span><strong>07</strong><small>5 mùa vụ hiện hành</small></article>
        <article><span>Công việc hôm nay</span><strong>12</strong><small>2 việc ưu tiên cao</small></article>
        <article><span>Hồ sơ hoàn chỉnh</span><strong>86%</strong><small>Theo checklist nội bộ</small></article>
      </div>
      <div className="panel">
        <div className="panel-title"><div><span className="eyebrow">Phạm vi UC</span><h2>Các module đã tạo khung</h2></div><span>{moduleDefinitions.length} module</span></div>
        <div className="module-grid">
          {moduleDefinitions.map((module) => (
            <article key={module.key} className="module-card">
              <span className="module-code">{module.ucRange}</span>
              <h3>{module.title}</h3>
              <p>Đã có route và vị trí module để phát triển màn hình, API và quyền truy cập.</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
