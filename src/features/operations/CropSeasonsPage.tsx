import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

export function CropSeasonsPage() {
  const { selectedFarm } = useFarmWorkspace();

  return (
    <section className="crop-seasons-page">
      <div className="page-heading">
        <div>
          <h1>Quản lý Mùa vụ canh tác</h1>
          <p className="page-subtitle">Mùa vụ của nông trại {selectedFarm?.farmName || ''}</p>
        </div>
      </div>
      <div className="panel empty-state">
        <h2>Danh sách mùa vụ chưa được kết nối</h2>
        <p>Chưa thể tải hoặc tạo mùa vụ trên trang này. Nếu đã có mùa vụ trong database, bạn có thể nhập ID mùa vụ tại trang Thu hoạch để xem và ghi nhận thu hoạch.</p>
        <Link className="primary-button" to="/harvests">Mở trang Thu hoạch</Link>
      </div>
    </section>
  );
}