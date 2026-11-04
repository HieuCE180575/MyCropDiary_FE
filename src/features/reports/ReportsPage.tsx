import { useState, useEffect } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { InputPurchasesPage } from '../operations/InputPurchasesPage';
import { SuppliersPage } from '../operations/SuppliersPage';
import { ExpensesPage } from '../operations/ExpensesPage';
import { WarehouseInventoryPage } from '../inventory/WarehouseInventoryPage';
import {
  fetchFarmReportSummaryApi,
  fetchCropSeasonReportApi,
  FarmReportResp,
  CropSeasonReportResp,
} from './reportService';

interface ReportsPageProps {
  initialTab?: 'reports' | 'expenses' | 'purchases' | 'suppliers' | 'warehouses';
}

export function ReportsPage({ initialTab = 'reports' }: ReportsPageProps) {
  const { lang } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'reports' | 'expenses' | 'purchases' | 'suppliers' | 'warehouses'>(initialTab);

  const [farmReport, setFarmReport] = useState<FarmReportResp | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | 'ALL'>('ALL');
  const [seasonReport, setSeasonReport] = useState<CropSeasonReportResp | null>(null);
  const [loadingSeasonReport, setLoadingSeasonReport] = useState(false);

  useEffect(() => {
    if (selectedFarm?.id) {
      void loadFarmReport(selectedFarm.id);
    }
  }, [selectedFarm?.id]);

  const loadFarmReport = async (farmId: number) => {
    setLoadingReport(true);
    try {
      const data = await fetchFarmReportSummaryApi(farmId);
      setFarmReport(data);
    } catch {
      // Keep null or fallback gracefully
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSelectSeason = async (seasonIdStr: string) => {
    if (seasonIdStr === 'ALL') {
      setSelectedSeasonId('ALL');
      setSeasonReport(null);
      return;
    }
    const sId = Number(seasonIdStr);
    setSelectedSeasonId(sId);
    setLoadingSeasonReport(true);
    try {
      const data = await fetchCropSeasonReportApi(sId);
      setSeasonReport(data);
    } catch {
      setSeasonReport(null);
    } finally {
      setLoadingSeasonReport(false);
    }
  };

  const currentYield = selectedSeasonId !== 'ALL' && seasonReport ? seasonReport.totalYield : (farmReport?.totalHarvestYield ?? 0);
  const currentUnit = selectedSeasonId !== 'ALL' && seasonReport ? seasonReport.unit : (farmReport?.yieldUnit ?? 'kg');
  const currentExpense = selectedSeasonId !== 'ALL' && seasonReport ? seasonReport.totalExpenses : (farmReport?.totalExpenseAmount ?? 0);
  const currentBreakdown = selectedSeasonId !== 'ALL' && seasonReport ? seasonReport.expenseBreakdown : (farmReport?.expenseBreakdown ?? []);

  return (
    <section className="reports-page">
      <div className="page-heading">
        <div>
          <h1>Báo cáo sản xuất & Quản trị tài chính</h1>
          <p className="page-subtitle">
            Tổng hợp dữ liệu canh tác, hạch toán chi phí đầu vào, quản trị kho và theo dõi nhà cung cấp vật tư trang trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="action-button" onClick={() => window.print()}>
            📊 Xuất báo cáo PDF / In ấn
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'reports' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'reports' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          📈 Báo cáo sản xuất mùa vụ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'warehouses' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'warehouses' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🏢 Kho hàng & Tồn kho vật tư
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'expenses' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'expenses' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          💰 Chi phí sản xuất
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'purchases' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'purchases' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🧾 Hóa đơn mua vật tư
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'suppliers' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'suppliers' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🏭 Danh bạ nhà cung cấp
        </button>
      </div>

      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Season Selector Filter */}
          <div className="panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 650, color: '#334155', fontSize: '14px' }}>Chọn vụ mùa thống kê:</span>
              <select
                className="input-select"
                style={{ minWidth: '240px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={selectedSeasonId}
                onChange={(e) => void handleSelectSeason(e.target.value)}
              >
                <option value="ALL">Toàn trang trại (Tất cả mùa vụ)</option>
                {farmReport?.seasonSummaries?.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName} {s.cropCategoryName ? `(${s.cropCategoryName})` : ''} - [{s.status}]
                  </option>
                ))}
              </select>
            </div>
            {selectedFarm?.id && (
              <button
                type="button"
                className="action-button"
                style={{ fontSize: '13px', padding: '6px 14px' }}
                onClick={() => void loadFarmReport(selectedFarm.id)}
              >
                <Icon name="refresh-cw" /> Làm mới dữ liệu
              </button>
            )}
          </div>

          {loadingReport || loadingSeasonReport ? (
            <div className="panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <p>Đang tổng hợp báo cáo sản xuất...</p>
            </div>
          ) : (
            <>
              {/* Top KPI Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SẢN LƯỢNG THU HOẠCH</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#059669', fontWeight: 800 }}>
                    {currentYield.toLocaleString('vi-VN')} {currentUnit}
                  </h2>
                  <small style={{ color: '#10b981' }}>
                    {selectedSeasonId !== 'ALL' && seasonReport
                      ? `Số đợt thu hoạch: ${seasonReport.harvestCount}`
                      : `Tỷ lệ loại 1: ${farmReport?.gradeOnePercentage ?? 0}% (${farmReport?.totalHarvestBatches ?? 0} đợt)`}
                  </small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG CHI PHÍ ĐÃ CHI</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#b45309', fontWeight: 800 }}>
                    {currentExpense.toLocaleString('vi-VN')} đ
                  </h2>
                  <small style={{ color: '#64748b' }}>
                    {selectedSeasonId !== 'ALL' && seasonReport
                      ? `${seasonReport.activityCount} nhật ký canh tác`
                      : `Hóa đơn vật tư: ${(farmReport?.totalPurchasesAmount ?? 0).toLocaleString('vi-VN')} đ`}
                  </small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ƯỚC TÍNH DOANH THU</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#0284c7', fontWeight: 800 }}>
                    {(farmReport?.estimatedRevenue ?? 0).toLocaleString('vi-VN')} đ
                  </h2>
                  <small style={{ color: '#0284c7' }}>Dựa trên năng suất và phân loại</small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>LỢI NHUẬN RÒNG DỰ KIẾN</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#10b981', fontWeight: 800 }}>
                    {(farmReport?.estimatedProfit ?? 0).toLocaleString('vi-VN')} đ
                  </h2>
                  <small style={{ color: '#10b981' }}>Biên lợi nhuận: {farmReport?.profitMarginPercent ?? 0}%</small>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="panel" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Tỷ trọng chi phí sản xuất</h3>
                {currentBreakdown.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>Chưa có phát sinh chi phí nào được ghi nhận.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {currentBreakdown.map((item) => (
                      <div key={item.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.category}</span>
                          <span style={{ fontWeight: 700, color: item.color || '#10b981' }}>
                            {item.amount.toLocaleString('vi-VN')} đ ({item.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.percentage}%`, height: '100%', background: item.color || '#10b981', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crop Seasons Overview Table */}
              {selectedSeasonId === 'ALL' && farmReport?.seasonSummaries && farmReport.seasonSummaries.length > 0 && (
                <div className="panel" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Danh sách mùa vụ canh tác</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}>Tên mùa vụ</th>
                          <th style={{ padding: '10px 14px' }}>Loại cây trồng</th>
                          <th style={{ padding: '10px 14px' }}>Sản lượng</th>
                          <th style={{ padding: '10px 14px' }}>Chi phí</th>
                          <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmReport.seasonSummaries.map((s) => (
                          <tr key={s.cropSeasonId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{s.seasonName}</td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{s.cropCategoryName || 'N/A'}</td>
                            <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 650 }}>{s.harvestYield.toLocaleString('vi-VN')} kg</td>
                            <td style={{ padding: '10px 14px', color: '#b45309', fontWeight: 650 }}>{s.totalExpense.toLocaleString('vi-VN')} đ</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: s.status === 'ACTIVE' || s.status === 'IN_PROGRESS' ? '#ecfdf5' : '#f1f5f9',
                                color: s.status === 'ACTIVE' || s.status === 'IN_PROGRESS' ? '#059669' : '#64748b'
                              }}>
                                {s.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="action-button"
                                style={{ fontSize: '12px', padding: '4px 10px' }}
                                onClick={() => void handleSelectSeason(String(s.cropSeasonId))}
                              >
                                Xem chi tiết vụ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'warehouses' && <WarehouseInventoryPage />}

      {activeTab === 'expenses' && <ExpensesPage />}

      {activeTab === 'purchases' && <InputPurchasesPage />}

      {activeTab === 'suppliers' && <SuppliersPage />}
    </section>
  );
}