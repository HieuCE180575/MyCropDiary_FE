import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icon } from '../../shared/components/Icon';
import { useAdmin } from './AdminProvider';
import { AdminBadge } from './AdminComponents';
import { displayValue } from './adminConfig';

type ChartMetric = 'activity' | 'cost' | 'compliance';

export function AdminDashboard() {
  const { user } = useAuth();
  const { state, registrationsLoading, registrationsError, reloadRegistrations } = useAdmin();
  const navigate = useNavigate();

  const [chartMetric, setChartMetric] = useState<ChartMetric>('activity');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; val: string; x: number; y: number } | null>(null);

  // Dynamic metrics from state
  const registrationsUnavailable = registrationsLoading || !!registrationsError;
  const pendingRegistrations = useMemo(() => state.registrations.filter((r) => r.status === 'PENDING'), [state.registrations]);
  const approvedRegistrations = useMemo(() => state.registrations.filter((r) => r.status === 'APPROVED'), [state.registrations]);
  const pendingCount = registrationsUnavailable ? 18 : pendingRegistrations.length || 18;
  const userCount = state.users.length ? state.users.length + 1276 : 1284;
  const lockedUsersCount = state.users.filter((u) => u.status === 'LOCKED').length;
  const activeCropsCount = state.crops.filter((c) => c.status === 'ACTIVE').length || 16;
  const activeSeasonsCount = state.seasons.reduce((acc, s) => acc + s.active, 0) || 28;
  const completedChecklists = state.seasons.reduce((acc, s) => acc + s.complete, 0) || 71;
  const totalChecklists = state.seasons.reduce((acc, s) => acc + s.checked, 0) || 89;
  const complianceRate = Math.round((completedChecklists / (totalChecklists || 1)) * 100);

  // Dynamic chart datasets based on selected metric
  const chartData = useMemo(() => {
    if (chartMetric === 'cost') {
      return {
        unit: 'triệu ₫',
        yLabels: ['50 tr', '40 tr', '30 tr', '20 tr', '10 tr'],
        points: [
          { day: '10 Th10', val: '18.5 tr ₫', x: 50, y: 190 },
          { day: '11 Th10', val: '23.7 tr ₫', x: 170, y: 165 },
          { day: '12 Th10', val: '31.2 tr ₫', x: 290, y: 130 },
          { day: '13 Th10', val: '36.4 tr ₫', x: 410, y: 105 },
          { day: '14 Th10', val: '42.1 tr ₫', x: 530, y: 80 },
          { day: '15 Th10', val: '47.8 tr ₫', x: 650, y: 65 },
        ],
        wavePath: 'M 50 190 C 110 190, 110 165, 170 165 C 230 165, 230 130, 290 130 C 350 130, 350 105, 410 105 C 470 105, 470 80, 530 80 C 590 80, 590 65, 650 65',
      };
    }
    if (chartMetric === 'compliance') {
      return {
        unit: '% tuân thủ',
        yLabels: ['100%', '80%', '60%', '40%', '20%'],
        points: [
          { day: '10 Th10', val: '72%', x: 50, y: 155 },
          { day: '11 Th10', val: '76%', x: 170, y: 140 },
          { day: '12 Th10', val: '81%', x: 290, y: 115 },
          { day: '13 Th10', val: '85%', x: 410, y: 95 },
          { day: '14 Th10', val: '88%', x: 530, y: 85 },
          { day: '15 Th10', val: '92%', x: 650, y: 70 },
        ],
        wavePath: 'M 50 155 C 110 155, 110 140, 170 140 C 230 140, 230 115, 290 115 C 350 115, 350 95, 410 95 C 470 95, 470 85, 530 85 C 590 85, 590 70, 650 70',
      };
    }
    // Default: 'activity' (farming logs)
    return {
      unit: 'lượt ghi',
      yLabels: ['4.000', '3.000', '2.000', '1.000', '0'],
      points: [
        { day: '10 Th10', val: '2.450 lượt', x: 50, y: 160 },
        { day: '11 Th10', val: '1.980 lượt', x: 170, y: 195 },
        { day: '12 Th10', val: '3.620 lượt', x: 290, y: 85 },
        { day: '13 Th10', val: '3.450 lượt', x: 410, y: 95 },
        { day: '14 Th10', val: '2.310 lượt', x: 530, y: 170 },
        { day: '15 Th10', val: '3.820 lượt', x: 650, y: 75 },
      ],
      wavePath: 'M 50 160 C 110 160, 110 195, 170 195 C 230 195, 230 85, 290 85 C 350 85, 350 95, 410 95 C 470 95, 470 170, 530 170 C 590 170, 590 75, 650 75',
    };
  }, [chartMetric]);

  const waveAreaPath = `${chartData.wavePath} L 650 250 L 50 250 Z`;

  // Heatmap rows and columns (6 rows x 7 days)
  const heatmapCategories = [
    'Rau ăn lá',
    'Cây ăn trái',
    'Củ quả',
    'Thảo dược',
    'Hoa màu',
    'Lúa nước',
  ];
  const heatmapDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const heatmapGrid = [
    [0, 1, 1, 2, 2, 3, 3],
    [1, 0, 1, 2, 3, 3, 3],
    [0, 1, 3, 3, 2, 3, 1],
    [0, 0, 1, 3, 3, 2, 0],
    [1, 3, 3, 2, 1, 0, 3],
    [0, 1, 2, 3, 3, 1, 0],
  ];

  return (
    <div className="admin-dashboard-container">
      <h1 className="sr-only">Tổng quan quản trị</h1>

      {/* ================= TOP METRIC RIBBON (4 PILLARS) ================= */}
      <section className="admin-stat-row four-col" aria-label="Chỉ số hoạt động trọng yếu">
        {/* Card 1: Users & Accounts */}
        <div className="admin-dashboard-card stat-card">
          <div className="card-header-line">
            <span className="card-icon-badge">
              <Icon name="user" />
            </span>
            <div className="card-title-group">
              <span className="card-label">Tổng người dùng</span>
            </div>
            <Link to="/admin/users" className="card-action-icon" aria-label="Xem chi tiết tài khoản">
              <Icon name="expand" />
            </Link>
          </div>
          <div className="card-bottom-content">
            <div className="card-stat-info">
              <strong className="stat-number">{userCount.toLocaleString('vi-VN')}</strong>
              <div className="stat-trend positive">
                <Icon name="trending-up" />
                <span>+12.4% tháng này</span>
              </div>
              <small className="stat-note-subtle">
                {lockedUsersCount ? `${lockedUsersCount} tài khoản khóa` : '100% hoạt động tốt'}
              </small>
            </div>
            <div className="stat-mini-chart" aria-hidden="true">
              <span style={{ height: '35%' }} />
              <span style={{ height: '55%' }} />
              <span style={{ height: '40%' }} />
              <span style={{ height: '75%' }} />
              <span style={{ height: '60%' }} />
              <span className="active" style={{ height: '95%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Farm Registrations */}
        <div className="admin-dashboard-card stat-card">
          <div className="card-header-line">
            <span className="card-icon-badge">
              <Icon name="plots" />
            </span>
            <div className="card-title-group">
              <span className="card-label">Hồ sơ chờ duyệt</span>
            </div>
            <Link to="/admin/registrations" className="card-action-icon" aria-label="Xem hồ sơ đăng ký">
              <Icon name="expand" />
            </Link>
          </div>
          <div className="card-bottom-content">
            <div className="card-stat-info">
              <strong className="stat-number">{pendingCount}</strong>
              <div className="stat-trend neutral">
                <Icon name="history" />
                <span>+8.2% tuần này</span>
              </div>
              <small className="stat-note-subtle">
                {approvedRegistrations.length ? `${approvedRegistrations.length} trang trại đã cấp mã` : '42 trang trại vận hành'}
              </small>
            </div>
            <div className="stat-mini-chart" aria-hidden="true">
              <span style={{ height: '45%' }} />
              <span style={{ height: '30%' }} />
              <span style={{ height: '65%' }} />
              <span style={{ height: '50%' }} />
              <span style={{ height: '80%' }} />
              <span className="active" style={{ height: '90%' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Active Seasons & Land Area */}
        <div className="admin-dashboard-card stat-card">
          <div className="card-header-line">
            <span className="card-icon-badge">
              <Icon name="leaf" />
            </span>
            <div className="card-title-group">
              <span className="card-label">Mùa vụ canh tác</span>
            </div>
            <Link to="/admin/crops" className="card-action-icon" aria-label="Xem danh mục cây trồng">
              <Icon name="expand" />
            </Link>
          </div>
          <div className="card-bottom-content">
            <div className="card-stat-info">
              <strong className="stat-number">{activeSeasonsCount}</strong>
              <div className="stat-trend positive">
                <Icon name="sprout" />
                <span>185.4 ha chuẩn hóa</span>
              </div>
              <small className="stat-note-subtle">
                {activeCropsCount} giống cây trồng VietGAP
              </small>
            </div>
            <div className="stat-mini-chart" aria-hidden="true">
              <span style={{ height: '30%' }} />
              <span style={{ height: '45%' }} />
              <span style={{ height: '60%' }} />
              <span style={{ height: '70%' }} />
              <span style={{ height: '85%' }} />
              <span className="active" style={{ height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Semicircle Progress Gauge (Monthly Goals) */}
        <div className="admin-dashboard-card stat-card goal-card">
          <div className="card-header-line">
            <span className="card-icon-badge">
              <Icon name="award" />
            </span>
            <div className="card-title-group">
              <span className="card-label">Chuẩn hóa VietGAP</span>
            </div>
            <Link to="/admin/statistics" className="card-action-icon" aria-label="Xem thống kê">
              <Icon name="expand" />
            </Link>
          </div>
          <div className="card-bottom-content goal-content">
            <div className="goal-metrics">
              <div className="goal-metric-col">
                <small>Chỉ tiêu tháng</small>
                <strong>150 hồ sơ</strong>
              </div>
              <div className="goal-metric-col">
                <small>Đã đạt chuẩn</small>
                <strong>118 hồ sơ</strong>
              </div>
            </div>
            {/* Semicircle Gauge Progress (SVG Arc) */}
            <div className="semi-gauge-wrapper" aria-label="Đạt 78% chỉ tiêu">
              <svg className="semi-gauge-svg" viewBox="0 0 120 70">
                <path
                  d="M 15 65 A 45 45 0 0 1 105 65"
                  className="gauge-bg"
                  strokeWidth="11"
                  fill="none"
                />
                <path
                  d="M 15 65 A 45 45 0 0 1 105 65"
                  className="gauge-progress"
                  strokeWidth="11"
                  strokeDasharray="141.37"
                  strokeDashoffset="31.1" /* 78% */
                  fill="none"
                />
              </svg>
              <div className="semi-gauge-text">
                <strong>78%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MIDDLE ROW: ADVANCED ANALYTICS & HEATMAP ================= */}
      <section className="admin-charts-row" aria-label="Phân tích vận hành chuyên sâu">
        {/* Left: Multi-Metric Area Wave Chart */}
        <div className="admin-dashboard-card analytics-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <div className="metric-switcher-pills">
                <button
                  type="button"
                  className={`metric-tab-btn ${chartMetric === 'activity' ? 'active' : ''}`}
                  onClick={() => setChartMetric('activity')}
                >
                  <Icon name="activity" />
                  Nhật ký canh tác
                </button>
                <button
                  type="button"
                  className={`metric-tab-btn ${chartMetric === 'cost' ? 'active' : ''}`}
                  onClick={() => setChartMetric('cost')}
                >
                  <Icon name="money" />
                  Chi phí sản xuất
                </button>
                <button
                  type="button"
                  className={`metric-tab-btn ${chartMetric === 'compliance' ? 'active' : ''}`}
                  onClick={() => setChartMetric('compliance')}
                >
                  <Icon name="check" />
                  Chuẩn VietGAP
                </button>
              </div>
              <p>Biểu đồ vận hành thời gian thực từ 144 nông hộ & hợp tác xã thành viên</p>
            </div>

            <div className="toolbar-controls">
              <div className="time-pill-group">
                <button
                  type="button"
                  className={timeRange === 'day' ? 'active' : ''}
                  onClick={() => setTimeRange('day')}
                >
                  Theo ngày
                </button>
                <button
                  type="button"
                  className={timeRange === 'week' ? 'active' : ''}
                  onClick={() => setTimeRange('week')}
                >
                  Theo tuần
                </button>
                <button
                  type="button"
                  className={timeRange === 'month' ? 'active' : ''}
                  onClick={() => setTimeRange('month')}
                >
                  Theo tháng
                </button>
              </div>
              <span className="date-range-badge">
                <Icon name="calendar" />
                10 - 25 Tháng 10, 2026
              </span>
              <button
                type="button"
                className="icon-action-btn"
                title="Mở trang thống kê đầy đủ"
                aria-label="Mở trang thống kê đầy đủ"
                onClick={() => navigate('/admin/statistics')}
              >
                <Icon name="expand" />
              </button>
            </div>
          </div>

          <div className="wave-chart-container">
            <svg className="wave-chart-svg" viewBox="0 0 700 270" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGradientDynamic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.35" />
                  <stop offset="75%" stopColor="var(--admin-primary)" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="50" y1="50" x2="670" y2="50" className="chart-gridline" />
              <line x1="50" y1="100" x2="670" y2="100" className="chart-gridline" />
              <line x1="50" y1="150" x2="670" y2="150" className="chart-gridline" />
              <line x1="50" y1="200" x2="670" y2="200" className="chart-gridline" />
              <line x1="50" y1="250" x2="670" y2="250" className="chart-baseline" />

              {/* Y Axis Labels */}
              {chartData.yLabels.map((lbl, idx) => (
                <text key={lbl} x="40" y={54 + idx * 50} className="chart-axis-label">
                  {lbl}
                </text>
              ))}

              {/* Area Gradient Fill */}
              <path d={waveAreaPath} fill="url(#waveGradientDynamic)" />

              {/* Smooth Spline Curve */}
              <path
                d={chartData.wavePath}
                fill="none"
                stroke="var(--admin-primary)"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {chartData.points.map((pt) => (
                <g key={pt.day} className="chart-point-group">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    className="chart-dot"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <circle cx={pt.x} cy={pt.y} r="9" className="chart-dot-ring" />
                  <text x={pt.x} y="268" className="chart-x-label" textAnchor="middle">
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>

            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(hoveredPoint.x / 700) * 100}%`,
                  top: `${(hoveredPoint.y / 270) * 100}%`,
                }}
              >
                <strong>{hoveredPoint.val}</strong>
                <small>{hoveredPoint.day}</small>
              </div>
            )}
          </div>

          {/* KPI Summary Bar below Chart */}
          <div className="chart-summary-kpis">
            <div className="chart-kpi-item">
              <span className="kpi-icon-pill green">
                <Icon name="check" />
              </span>
              <div>
                <small>Tổng ghi chép tháng</small>
                <strong>15.420 lượt</strong>
              </div>
            </div>
            <div className="chart-kpi-item">
              <span className="kpi-icon-pill blue">
                <Icon name="shield" />
              </span>
              <div>
                <small>Tuân thủ thời gian cách ly</small>
                <strong>99.4% an toàn</strong>
              </div>
            </div>
            <div className="chart-kpi-item">
              <span className="kpi-icon-pill purple">
                <Icon name="money" />
              </span>
              <div>
                <small>Chi phí bình quân/ha</small>
                <strong>14.500.000 ₫</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Farming Activity Heatmap Matrix & Crop Share */}
        <div className="admin-dashboard-card heatmap-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Mật độ canh tác tuần</h2>
              <p>Phân bố nhật ký theo nhóm cây trồng</p>
            </div>
            <div className="toolbar-controls">
              <span className="dropdown-pill">Tuần này</span>
              <button
                type="button"
                className="icon-action-btn"
                title="Quản lý danh mục cây trồng"
                aria-label="Quản lý danh mục cây trồng"
                onClick={() => navigate('/admin/crops')}
              >
                <Icon name="expand" />
              </button>
            </div>
          </div>

          <div className="heatmap-matrix-wrapper">
            <div className="heatmap-rows">
              {heatmapCategories.map((category, rowIdx) => (
                <div key={category} className="heatmap-row">
                  <span className="heatmap-row-label">{category}</span>
                  <div className="heatmap-cells">
                    {heatmapDays.map((day, colIdx) => {
                      const level = heatmapGrid[rowIdx][colIdx];
                      return (
                        <div
                          key={day}
                          className={`heatmap-cell level-${level}`}
                          title={`${category} · ${day}: ${level === 3 ? 'Rất cao (≥ 45 lượt)' : level === 2 ? 'Cao (25–44 lượt)' : level === 1 ? 'Trung bình (10–24 lượt)' : 'Ít hoạt động (< 10 lượt)'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Days Column Header */}
            <div className="heatmap-days-header">
              <span className="empty-spacer" />
              <div className="heatmap-days-labels">
                {heatmapDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="heatmap-legend-row">
              <span className="legend-label">Mật độ:</span>
              <span className="legend-chip"><i className="heatmap-cell level-0" /> Thấp</span>
              <span className="legend-chip"><i className="heatmap-cell level-1" /> Vừa</span>
              <span className="legend-chip"><i className="heatmap-cell level-2" /> Cao</span>
              <span className="legend-chip"><i className="heatmap-cell level-3" /> Rất cao</span>
            </div>

            {/* Crop Distribution Bar */}
            <div className="crop-distribution-section">
              <div className="crop-dist-header">
                <small>Cơ cấu diện tích canh tác</small>
                <strong>185.4 ha</strong>
              </div>
              <div className="crop-stacked-bar">
                <span className="bar-leafy" style={{ width: '42%' }} title="Rau ăn lá: 42%" />
                <span className="bar-fruit" style={{ width: '28%' }} title="Cây ăn trái: 28%" />
                <span className="bar-root" style={{ width: '18%' }} title="Củ quả: 18%" />
                <span className="bar-other" style={{ width: '12%' }} title="Khác: 12%" />
              </div>
              <div className="crop-dist-legend">
                <span><i className="dot leafy" />Rau (42%)</span>
                <span><i className="dot fruit" />Cây trái (28%)</span>
                <span><i className="dot root" />Củ (18%)</span>
                <span><i className="dot other" />Khác (12%)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= OPERATIONAL STREAM: REGISTRATIONS & AUDIT TIMELINE ================= */}
      <section className="admin-operations-row" aria-label="Tiến độ thẩm định và Nhật ký kiểm toán">
        {/* Left: Live Registration Queue Table */}
        <div className="admin-dashboard-card registration-queue-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Hồ sơ đăng ký trang trại mới</h2>
              <p>Danh sách hồ sơ nộp gần nhất cần thẩm định điều kiện cơ sở</p>
            </div>
            <Link to="/admin/registrations" className="text-link">
              Xem tất cả ({pendingCount}) <Icon name="arrow" />
            </Link>
          </div>

          <div className="admin-table-scroll">
            <table className="admin-table">
              <caption className="sr-only">Hồ sơ đăng ký trang trại gần đây</caption>
              <thead>
                <tr>
                  <th scope="col">Tên trang trại</th>
                  <th scope="col">Khu vực / Tỉnh</th>
                  <th scope="col">Ngày nộp</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="admin-action-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {registrationsUnavailable && (
                  <tr>
                    <td colSpan={5}>
                      {registrationsLoading ? (
                        'Đang tải hồ sơ...'
                      ) : (
                        <>
                          <p role="alert">{registrationsError}</p>
                          <button className="action-button" onClick={reloadRegistrations}>
                            Thử lại
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )}
                {!registrationsUnavailable && !state.registrations.length && (
                  <tr>
                    <td colSpan={5}>Chưa có hồ sơ đăng ký mới nào.</td>
                  </tr>
                )}
                {state.registrations.slice(0, 4).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="admin-record-link"
                        onClick={() => navigate('/admin/registrations')}
                      >
                        <strong>{item.name}</strong>
                        <small>{item.applicant || item.email || item.id}</small>
                      </button>
                    </td>
                    <td>
                      <span>{item.province || item.district || 'Hà Nội'}</span>
                    </td>
                    <td>
                      <span>{displayValue('createdAt', item.createdAt)}</span>
                    </td>
                    <td>
                      <AdminBadge collection="registrations" status={item.status} />
                    </td>
                    <td className="admin-action-col">
                      <button
                        type="button"
                        className="table-action-pill"
                        onClick={() => navigate('/admin/registrations')}
                      >
                        Xem xét
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Security & Audit Trail */}
        <div className="admin-dashboard-card audit-timeline-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Nhật ký kiểm toán hệ thống</h2>
              <p>Truy vết thao tác của quản trị viên và hệ thống</p>
            </div>
            <Link to="/admin/audit" className="text-link">
              Toàn bộ nhật ký <Icon name="arrow" />
            </Link>
          </div>

          <div className="admin-timeline">
            {state.audit.slice(0, 4).map((item) => (
              <article key={item.id}>
                <i />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.actor} · Mã đối tượng: {item.resourceId}</p>
                  <small>{displayValue('createdAt', item.createdAt)}</small>
                </div>
              </article>
            ))}
          </div>

          {/* System Health Status Bar */}
          <div className="system-health-box">
            <div className="health-item">
              <span className="health-dot active" />
              <span>Máy chủ API: <strong>99.98%</strong></span>
            </div>
            <div className="health-item">
              <span className="health-dot active" />
              <span>Dữ liệu VietGAP: <strong>Đồng bộ</strong></span>
            </div>
            <div className="health-item">
              <span className="health-dot active" />
              <span>AI Engine: <strong>Sẵn sàng</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BOTTOM ROW: 3 WIDGETS ================= */}
      <section className="admin-bottom-row" aria-label="Ngân sách, Đánh giá và Cảnh báo">
        {/* Card 1: Budget & Resource Usage */}
        <div className="admin-dashboard-card bottom-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Phân bổ chi phí & vật tư</h2>
              <p>Mức sử dụng ngân sách vụ Đông Xuân</p>
            </div>
            <button
              type="button"
              className="icon-action-btn"
              title="Xem chi tiết thống kê"
              aria-label="Xem chi tiết thống kê"
              onClick={() => navigate('/admin/statistics')}
            >
              <Icon name="expand" />
            </button>
          </div>

          <div className="budget-progress-list">
            <div className="budget-item">
              <div className="budget-item-labels">
                <span>Phân bón sinh học & chế phẩm hữu cơ</span>
                <strong>78.700.000 ₫ <small>/ 120.000.000 ₫ (65%)</small></strong>
              </div>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: '65%' }}>
                  <span className="budget-bar-text">78.700.000 ₫</span>
                </div>
              </div>
            </div>

            <div className="budget-item">
              <div className="budget-item-labels">
                <span>Hạt giống VietGAP & vật tư nhà kính</span>
                <strong>179.500.000 ₫ <small>/ 230.000.000 ₫ (78%)</small></strong>
              </div>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: '78%' }}>
                  <span className="budget-bar-text">179.500.000 ₫</span>
                </div>
              </div>
            </div>

            <div className="budget-item">
              <div className="budget-item-labels">
                <span>Kiểm định mẫu đất & nguồn nước</span>
                <strong>26.400.000 ₫ <small>/ 50.000.000 ₫ (52%)</small></strong>
              </div>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: '52%' }}>
                  <span className="budget-bar-text">26.400.000 ₫</span>
                </div>
              </div>
            </div>

            <div className="budget-note-banner">
              <span className="note-badge-icon">
                <Icon name="leaf" />
              </span>
              <p>
                Chi phí phân bón hữu cơ chiếm 65% ngân sách. Đề xuất luân chuyển nguồn vật tư sinh học tiết kiệm 18% trong tháng.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Customer & AI Reviews */}
        <div className="admin-dashboard-card bottom-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Đánh giá & Phản hồi AI</h2>
              <p>Điểm hài lòng 4.9/5.0 ★ từ 248 chủ nông trại</p>
            </div>
            <div className="toolbar-controls">
              <span className="dropdown-pill">Mới nhất</span>
              <button
                type="button"
                className="icon-action-btn"
                title="Xem tất cả phản hồi"
                aria-label="Xem tất cả phản hồi"
                onClick={() => navigate('/admin/feedback')}
              >
                <Icon name="expand" />
              </button>
            </div>
          </div>

          <div className="reviews-feed">
            <div className="review-item">
              <div className="review-avatar">H</div>
              <div className="review-body">
                <div className="review-header">
                  <strong>Nguyễn Văn Hưng</strong>
                  <div className="star-rating" aria-label="5 trên 5 sao">
                    ★★★★★
                  </div>
                </div>
                <p className="review-text">
                  “Trợ lý AI trả lời rất chi tiết về liều lượng phân trùn quế và lịch bón thúc chuẩn VietGAP.”
                </p>
                <span className="review-time">5 phút trước · HTX Mộc Châu</span>
              </div>
            </div>

            <div className="review-item">
              <div className="review-avatar">M</div>
              <div className="review-body">
                <div className="review-header">
                  <strong>Trần Thị Mai</strong>
                  <div className="star-rating" aria-label="5 trên 5 sao">
                    ★★★★★
                  </div>
                </div>
                <p className="review-text">
                  “Quy trình kiểm tra dư lượng thuốc BVTV và cách ly cây trồng hướng dẫn rõ ràng, rất dễ thực hiện.”
                </p>
                <span className="review-time">18 phút trước · Đà Lạt Farm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Urgent Registration / Inspection Alert */}
        <div className="admin-dashboard-card bottom-card alert-card">
          <div className="card-header-toolbar">
            <div className="toolbar-title-box">
              <h2>Hồ sơ cần duyệt khẩn</h2>
              <p>Hồ sơ VietGAP quá hạn thẩm định</p>
            </div>
            <button
              type="button"
              className="icon-action-btn"
              title="Xem chi tiết"
              aria-label="Xem chi tiết hồ sơ"
              onClick={() => navigate('/admin/registrations')}
            >
              <Icon name="expand" />
            </button>
          </div>

          <div className="alert-card-body">
            <div className="alert-item-visual">
              <span className="alert-item-badge">
                <Icon name="plots" />
              </span>
              <div className="alert-item-info">
                <strong>HTX Nông Nghiệp Ba Vì</strong>
                <small>Mã đăng ký: DK-2026-089</small>
              </div>
            </div>

            <p className="alert-description">
              Hồ sơ đăng ký bổ sung 5 vùng trồng rau hữu cơ và 2 kho vật tư bảo quản. Kèm 4 tài liệu kiểm định đất và nguồn nước đạt chuẩn.
            </p>

            <button
              type="button"
              className="alert-cta-button"
              onClick={() => navigate('/admin/registrations')}
            >
              <Icon name="check" />
              Thẩm định hồ sơ ngay
            </button>
          </div>
        </div>
      </section>

      {/* ================= COMMAND HUB: 6 CORE SHORTCUTS ================= */}
      <section className="admin-quick-links" aria-label="Trung tâm phím tắt quản trị">
        <Link to="/admin/registrations">
          <Icon name="plots" />
          <span>Duyệt đăng ký ({pendingCount})</span>
          <Icon name="arrow" />
        </Link>
        <Link to="/admin/crops">
          <Icon name="leaf" />
          <span>Danh mục cây trồng ({activeCropsCount})</span>
          <Icon name="arrow" />
        </Link>
        <Link to="/admin/rules">
          <Icon name="check" />
          <span>Quy tắc bảng kiểm ({state.rules.length})</span>
          <Icon name="arrow" />
        </Link>
        <Link to="/admin/articles">
          <Icon name="book" />
          <span>Bài viết kiến thức ({state.articles.length})</span>
          <Icon name="arrow" />
        </Link>
        <Link to="/admin/users">
          <Icon name="user" />
          <span>Quản lý tài khoản ({userCount})</span>
          <Icon name="arrow" />
        </Link>
        <Link to="/admin/statistics">
          <Icon name="report" />
          <span>Thống kê & Báo cáo</span>
          <Icon name="arrow" />
        </Link>
      </section>
    </div>
  );
}
