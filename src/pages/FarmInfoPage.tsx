import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FarmInfoCard } from '../features/farm-management/components/FarmInfoCard';
import { fetchMyFarm } from '../features/farm-management/farmService';
import type { Farm } from '../features/farm-management/types';

// TODO: lấy từ AuthContext/useAuth khi hệ thống đăng nhập thật được tích hợp.
const CURRENT_USER_ID = 'user-current';

export function FarmInfoPage() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    fetchMyFarm(CURRENT_USER_ID)
      .then((data) => {
        if (!ignore) setFarm(data);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Thông tin trang trại</h1>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin trang trại...</h2>
        </div>
      ) : farm ? (
        <FarmInfoCard farm={farm} />
      ) : (
        <div className="panel empty-state">
          <div className="empty-icon">🚜</div>
          <h2>Bạn chưa có trang trại nào</h2>
          <p>Hãy gửi đăng ký trang trại để trở thành chủ trang trại trên MyCropDiary.</p>
          <Link to="/farm-registration" className="primary-button">
            Đăng ký trang trại
          </Link>
        </div>
      )}
    </section>
  );
}
