import type { ModuleDefinition } from '../shared/types/module';

export function ModulePage({ module }: { module: ModuleDefinition }) {
  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">{module.ucRange}</span><h1>{module.title}</h1></div>
        <button className="primary-button">+ Thêm mới</button>
      </div>
      <div className="panel empty-state">
        <div className="empty-icon">◫</div>
        <h2>Module đã sẵn sàng để phát triển</h2>
        <p>Thêm components, hooks, services và types vào thư mục feature tương ứng.</p>
      </div>
    </section>
  );
}
