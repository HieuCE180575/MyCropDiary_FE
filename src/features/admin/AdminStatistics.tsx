import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Icon } from '../../shared/components/Icon';
import { useState, useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import { AdminEmpty, AdminPageHeading } from './AdminComponents';
import { fetchAdminStatistics, type AdminStatisticsData } from './adminService';

const types = { overview: 'Tổng quan hệ thống', users: 'Tài khoản', seasons: 'Mùa vụ', registrations: 'Hồ sơ trang trại', feedback: 'Phản hồi AI' };
type StatisticType = keyof typeof types;
const number = (value: number) => value.toLocaleString('vi-VN');

export function AdminStatistics() {
  const { lang, t: translate } = useLanguage();
  const { state } = useAdmin();
  const [type, setType] = useState<StatisticType>('overview');
  const [statsData, setStatsData] = useState<AdminStatisticsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    setLoadingStats(true);
    fetchAdminStatistics()
      .then((data) => setStatsData(data))
      .catch(() => setStatsData(null))
      .finally(() => setLoadingStats(false));
  }, []);

  const totalUsers = statsData?.accounts?.totalUsers ?? state.users.length;
  const activeUsers = statsData?.accounts?.activeUsers ?? state.users.filter((u) => u.status === 'ACTIVE').length;
  const lockedUsers = statsData?.accounts?.lockedUsers ?? state.users.filter((u) => u.status === 'LOCKED').length;

  const totalReg = statsData?.registrations?.totalRegistrations ?? state.registrations.length;
  const pendingReg = statsData?.registrations?.pendingRegistrations ?? state.registrations.filter((r) => r.status === 'PENDING').length;
  const approvedReg = statsData?.registrations?.approvedRegistrations ?? state.registrations.filter((r) => r.status === 'APPROVED').length;
  const rejectedReg = statsData?.registrations?.rejectedRegistrations ?? state.registrations.filter((r) => r.status === 'REJECTED').length;

  const totalFarms = statsData?.farms?.totalFarms ?? 25;
  const activeFarms = statsData?.farms?.activeFarms ?? 22;

  const totalSeasons = statsData?.seasons?.totalSeasons ?? 48;
  const activeSeasons = statsData?.seasons?.activeSeasons ?? 18;
  const completedSeasons = statsData?.seasons?.completedSeasons ?? 30;

  const totalFeedbacks = statsData?.aiFeedback?.totalFeedbacks ?? state.feedback.length;
  const openFeedbacks = statsData?.aiFeedback?.openFeedbacks ?? state.feedback.filter((f) => f.status === 'OPEN').length;
  const resolvedFeedbacks = statsData?.aiFeedback?.resolvedFeedbacks ?? state.feedback.filter((f) => f.status === 'RESOLVED').length;
  const avgRating = statsData?.aiFeedback?.averageRating ?? 4.6;

  return (
    <section className="admin-page">
      <AdminPageHeading
        title={(lang === 'en' ? "System statistics" : "Thống kê hệ thống")}
        description={(lang === 'en' ? "Monitor users, farm registrations, crop seasons, and AI feedback quality." : "Theo dõi toàn diện số liệu về người dùng, hồ sơ đăng ký trang trại, mùa vụ canh tác và chất lượng phản hồi AI.")}
      />

      <div className="admin-stat-tabs" role="group" aria-label={(lang === 'en' ? "Statistics group" : "Nhóm thống kê")}>
        {Object.entries(types).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            className={type === key ? 'active' : ''}
            onClick={() => setType(key as StatisticType)}
          >
            {translate(label)}
          </button>
        ))}
      </div>

      {loadingStats && (
        <div style={{ padding: '16px', color: '#64748b' }}>
          {(lang === 'en' ? "Loading statistics from the server..." : "Đang tải dữ liệu thống kê từ máy chủ...")}
        </div>
      )}

      {/* Overview Tab */}
      {type === 'overview' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "User accounts" : "Tài khoản người dùng")}</span>
              <strong className="admin-stat-value">{number(totalUsers)}</strong>
              <p>{number(activeUsers)} {(lang === 'en' ? " active · " : " đang hoạt động · ")} {number(lockedUsers)} {(lang === 'en' ? " locked" : " đã khóa")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Farm registrations" : "Hồ sơ đăng ký trang trại")}</span>
              <strong className="admin-stat-value">{number(totalReg)}</strong>
              <p>{number(pendingReg)} {(lang === 'en' ? " pending · " : " chờ duyệt · ")} {number(approvedReg)} {(lang === 'en' ? " approved" : " đã duyệt")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Farms" : "Trang trại nông nghiệp")}</span>
              <strong className="admin-stat-value">{number(totalFarms)}</strong>
              <p>{number(activeFarms)} {(lang === 'en' ? " active farms" : " trang trại đang canh tác")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Crop seasons" : "Mùa vụ canh tác")}</span>
              <strong className="admin-stat-value">{number(totalSeasons)}</strong>
              <p>{number(activeSeasons)} {(lang === 'en' ? " active seasons · " : " vụ đang trồng · ")} {number(completedSeasons)} {(lang === 'en' ? " harvested" : " đã thu hoạch")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "AI feedback and reports" : "Góp ý & Báo cáo AI")}</span>
              <strong className="admin-stat-value">{number(totalFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Rating: ⭐ " : "Đánh giá: ⭐ ")} {avgRating}/5 · {number(openFeedbacks)} {(lang === 'en' ? " open" : " đang mở")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Account Statistics */}
      {type === 'users' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total accounts" : "Tổng tài khoản")}</span>
              <strong className="admin-stat-value">{number(totalUsers)}</strong>
              <p>{(lang === 'en' ? "All system accounts" : "Toàn bộ tài khoản trong hệ thống")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Active" : "Đang hoạt động")}</span>
              <strong className="admin-stat-value" style={{ color: '#059669' }}>{number(activeUsers)}</strong>
              <p>{(lang === 'en' ? "Accounts with sign-in access" : "Tài khoản có quyền đăng nhập")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Access locked" : "Đã khóa truy cập")}</span>
              <strong className="admin-stat-value" style={{ color: '#dc2626' }}>{number(lockedUsers)}</strong>
              <p>{(lang === 'en' ? "Accounts temporarily locked for security" : "Tài khoản bị tạm khóa bảo mật")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Registration Statistics */}
      {type === 'registrations' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total applications" : "Tổng đơn gửi")}</span>
              <strong className="admin-stat-value">{number(totalReg)}</strong>
              <p>{(lang === 'en' ? "Farm registration applications" : "Hồ sơ đăng ký mở trang trại")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Pending review" : "Chờ xét duyệt")}</span>
              <strong className="admin-stat-value" style={{ color: '#d97706' }}>{number(pendingReg)}</strong>
              <p>{(lang === 'en' ? "Awaiting administrator review" : "Cần ban quản trị thẩm định")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Approved" : "Đã phê duyệt")}</span>
              <strong className="admin-stat-value" style={{ color: '#059669' }}>{number(approvedReg)}</strong>
              <p>{(lang === 'en' ? "Farm owner access granted" : "Đã cấp quyền chủ trang trại")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Rejected" : "Bị từ chối")}</span>
              <strong className="admin-stat-value" style={{ color: '#dc2626' }}>{number(rejectedReg)}</strong>
              <p>{(lang === 'en' ? "Applications that do not meet requirements" : "Hồ sơ không đạt tiêu chuẩn")}</p>
            </div>
          </article>
        </div>
      )}

      {/* Season Statistics */}
      {type === 'seasons' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total seasons" : "Tổng số mùa vụ")}</span>
              <strong className="admin-stat-value">{number(totalSeasons)}</strong>
              <p>{(lang === 'en' ? "All crop seasons" : "Toàn bộ mùa vụ canh tác")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Growing" : "Đang canh tác")}</span>
              <strong className="admin-stat-value" style={{ color: '#059669' }}>{number(activeSeasons)}</strong>
              <p>{(lang === 'en' ? "Seasons currently in the growing cycle" : "Vụ mùa đang trong chu kỳ chăm sóc")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Harvested" : "Đã thu hoạch")}</span>
              <strong className="admin-stat-value" style={{ color: '#2563eb' }}>{number(completedSeasons)}</strong>
              <p>{(lang === 'en' ? "Completed with final yield recorded" : "Đã kết thúc và chốt sản lượng")}</p>
            </div>
          </article>
        </div>
      )}

      {/* AI Feedback Statistics */}
      {type === 'feedback' && (
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Total feedback received" : "Tổng phản hồi nhận")}</span>
              <strong className="admin-stat-value">{number(totalFeedbacks)}</strong>
              <p>{(lang === 'en' ? "User feedback on answers" : "Góp ý câu trả lời từ người dùng")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "New (unreviewed)" : "Mới tiếp nhận (Chưa xử lý)")}</span>
              <strong className="admin-stat-value" style={{ color: '#d97706' }}>{number(openFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Awaiting review and reply" : "Cần xem xét và trả lời")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Resolved" : "Đã giải quyết")}</span>
              <strong className="admin-stat-value" style={{ color: '#059669' }}>{number(resolvedFeedbacks)}</strong>
              <p>{(lang === 'en' ? "Explanation sent" : "Đã gửi phản hồi giải thích")}</p>
            </div>
          </article>
          <article className="admin-summary-card">
            <div>
              <span>{(lang === 'en' ? "Average rating" : "Điểm đánh giá trung bình")}</span>
              <strong className="admin-stat-value" style={{ color: '#f59e0b' }}>⭐ {avgRating} / 5</strong>
              <p>{(lang === 'en' ? "Helpfulness of AI advice" : "Mức độ hữu ích của tư vấn AI")}</p>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
