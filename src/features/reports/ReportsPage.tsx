import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { InputPurchasesPage } from '../operations/InputPurchasesPage';
import { SuppliersPage } from '../operations/SuppliersPage';
import { ExpensesPage } from '../operations/ExpensesPage';
import { WarehouseInventoryPage } from '../inventory/WarehouseInventoryPage';


import { formatNumber as displayNumber, formatCurrency as displayCurrency } from '../../shared/format/formatters';
import { useState, useEffect } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

import { useLanguage } from '../../shared/i18n/LanguageContext';

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
  const { lang, t: translate } = useLanguage();
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
      <PageHeading   title={<>{(lang === 'en' ? "Production Reports & Financial Management" : "Báo cáo sản xuất & Quản trị tài chính")}</>} description={<>
            {(lang === 'en' ? "Summarize farming data, input costs, inventory, and material suppliers for farm " : "Tổng hợp dữ liệu canh tác, hạch toán chi phí đầu vào, quản trị kho và theo dõi nhà cung cấp vật tư trang trại ")} {selectedFarm?.farmName || ''}
          </>}><div style={{ display: 'flex', gap: '10px' }}>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            {(lang === 'en' ? "📊 Export PDF / Print" : "📊 Xuất báo cáo PDF / In ấn")}
          </Button>
        </div></PageHeading>

      <TabList idPrefix="reports" label={lang === 'en' ? 'Report sections' : 'Các mục báo cáo'}
        value={activeTab} onChange={setActiveTab} items={[
          { value: 'reports', label: <>{(lang === 'en' ? "📈 Seasonal production reports" : "📈 Báo cáo sản xuất mùa vụ")}</> },
          { value: 'warehouses', label: <>{(lang === 'en' ? "🏢 Warehouses & Material inventory" : "🏢 Kho hàng & Tồn kho vật tư")}</> },
          { value: 'expenses', label: <>{(lang === 'en' ? "💰 Production costs" : "💰 Chi phí sản xuất")}</> },
          { value: 'purchases', label: <>{(lang === 'en' ? "🧾 Material purchase invoices" : "🧾 Hóa đơn mua vật tư")}</> },
          { value: 'suppliers', label: <>{(lang === 'en' ? "🏭 Supplier directory" : "🏭 Danh bạ nhà cung cấp")}</> },
        ]} />

      {activeTab === 'reports' && (
        <div {...tabPanelProps('reports', 'reports')} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Season Selector Filter */}
          <div className="panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label htmlFor="reports-page-control-1" style={{ fontWeight: 650, color: 'var(--color-body)', fontSize: '14px' }}>{(lang === 'en' ? "Select report season:" : "Chọn vụ mùa thống kê:")}</label>
              <select id="reports-page-control-1"
                className="input-select ui-select"
                style={{ minWidth: '240px', padding: '6px 12px' }}
                value={selectedSeasonId}
                onChange={(e) => void handleSelectSeason(e.target.value)}
              >
                <option value="ALL">{(lang === 'en' ? "Entire farm (All seasons)" : "Toàn trang trại (Tất cả mùa vụ)")}</option>
                {farmReport?.seasonSummaries?.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>
                    {s.seasonName} {s.cropCategoryName ? `(${s.cropCategoryName})` : ''} - [{s.status}]
                  </option>
                ))}
              </select>
            </div>
            {selectedFarm?.id && (
              <Button
                type="button"
                variant="secondary"

                onClick={() => void loadFarmReport(selectedFarm.id)}
              >
                <Icon name="refresh" /> {(lang === 'en' ? " Refresh data" : " Làm mới dữ liệu")}
              </Button>
            )}
          </div>

          {loadingReport || loadingSeasonReport ? (
            <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
              <p>{(lang === 'en' ? "Compiling production reports..." : "Đang tổng hợp báo cáo sản xuất...")}</p>
            </div>
          ) : (
            <>
              {/* Top KPI Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: 600 }}>{(lang === 'en' ? "TOTAL HARVEST YIELD" : "TỔNG SẢN LƯỢNG THU HOẠCH")}</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800 }}>
                    {displayNumber(currentYield, lang)} {translate(currentUnit)}
                  </h2>
                  <small style={{ color: 'var(--color-success)' }}>
                    {(lang === 'en' ? selectedSeasonId !== 'ALL' && seasonReport ? `Harvest count: ${seasonReport.harvestCount}` : `Grade 1 rate: ${farmReport?.gradeOnePercentage ?? 0}% (${farmReport?.totalHarvestBatches ?? 0} batches)` : selectedSeasonId !== 'ALL' && seasonReport
                      ? `Số đợt thu hoạch: ${seasonReport.harvestCount}`
                      : `Tỷ lệ loại 1: ${farmReport?.gradeOnePercentage ?? 0}% (${farmReport?.totalHarvestBatches ?? 0} đợt)`)}
                  </small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: 600 }}>{(lang === 'en' ? "TOTAL EXPENSES" : "TỔNG CHI PHÍ ĐÃ CHI")}</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: 'var(--color-warning)', fontWeight: 800 }}>
                    {displayCurrency(currentExpense, lang)}
                  </h2>
                  <small style={{ color: 'var(--color-muted)' }}>
                    {(lang === 'en' ? selectedSeasonId !== 'ALL' && seasonReport ? `${seasonReport.activityCount} farming diary entries` : `Material invoices: ${displayCurrency(farmReport?.totalPurchasesAmount ?? 0, lang)}` : selectedSeasonId !== 'ALL' && seasonReport
                      ? `${seasonReport.activityCount} nhật ký canh tác`
                      : `Hóa đơn vật tư: ${displayCurrency(farmReport?.totalPurchasesAmount ?? 0, lang)}`)}
                  </small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: 600 }}>{(lang === 'en' ? "ESTIMATED REVENUE" : "ƯỚC TÍNH DOANH THU")}</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: 'var(--color-info)', fontWeight: 800 }}>
                    {displayCurrency(farmReport?.estimatedRevenue ?? 0, lang)}
                  </h2>
                  <small style={{ color: 'var(--color-info)' }}>{(lang === 'en' ? "Based on yield and grade" : "Dựa trên năng suất và phân loại")}</small>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: 600 }}>{(lang === 'en' ? "PROJECTED NET PROFIT" : "LỢI NHUẬN RÒNG DỰ KIẾN")}</span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: 'var(--color-success)', fontWeight: 800 }}>
                    {displayCurrency(farmReport?.estimatedProfit ?? 0, lang)}
                  </h2>
                  <small style={{ color: 'var(--color-success)' }}>{(lang === 'en' ? "Profit margin: " : "Biên lợi nhuận: ")} {farmReport?.profitMarginPercent ?? 0}%</small>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="panel" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Production cost breakdown" : "Tỷ trọng chi phí sản xuất")}</h3>
                {currentBreakdown.length === 0 ? (
                  <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{(lang === 'en' ? "No expenses have been recorded." : "Chưa có phát sinh chi phí nào được ghi nhận.")}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {currentBreakdown.map((item) => (
                      <div key={item.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-body)' }}>{item.category}</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                            {displayNumber(item.amount, lang)} {(lang === 'en' ? " VND (" : " đ (")}{item.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--color-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.percentage}%`, height: '100%', background: item.color || 'var(--color-success)', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crop Seasons Overview Table */}
              {selectedSeasonId === 'ALL' && farmReport?.seasonSummaries && farmReport.seasonSummaries.length > 0 && (
                <div className="panel" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Crop season list" : "Danh sách mùa vụ canh tác")}</h3>
                  <div className="ui-table-scroll" tabIndex={0}>
                    <table className="ui-data-table">
                      <thead>
                        <tr>
                          <th scope="col">{(lang === 'en' ? "Season name" : "Tên mùa vụ")}</th>
                          <th scope="col">{(lang === 'en' ? "Crop type" : "Loại cây trồng")}</th>
                          <th scope="col">{(lang === 'en' ? "Yield" : "Sản lượng")}</th>
                          <th scope="col">{(lang === 'en' ? "Expenses" : "Chi phí")}</th>
                          <th scope="col">{(lang === 'en' ? "Status" : "Trạng thái")}</th>
                          <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmReport.seasonSummaries.map((s) => (
                          <tr key={s.cropSeasonId}>
                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{s.seasonName}</td>
                            <td style={{ color: 'var(--color-muted)' }}>{s.cropCategoryName || 'N/A'}</td>
                            <td style={{ color: 'var(--color-primary-text)', fontWeight: 650 }}>{displayNumber(s.harvestYield, lang)} kg</td>
                            <td style={{ color: 'var(--color-warning)', fontWeight: 650 }}>{displayCurrency(s.totalExpense, lang)}</td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: s.status === 'ACTIVE' || s.status === 'IN_PROGRESS' ? 'var(--color-success-bg)' : 'var(--color-subtle)',
                                color: s.status === 'ACTIVE' || s.status === 'IN_PROGRESS' ? 'var(--color-primary-text)' : 'var(--color-muted)'
                              }}>
                                {s.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <Button
                                type="button"
                                variant="secondary"

                                onClick={() => void handleSelectSeason(String(s.cropSeasonId))}
                              >
                                {(lang === 'en' ? "View season details" : "Xem chi tiết vụ")}
                              </Button>
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

      {activeTab === 'warehouses' && <div {...tabPanelProps('reports', 'warehouses')}><WarehouseInventoryPage embedded /></div>}

      {activeTab === 'expenses' && <div {...tabPanelProps('reports', 'expenses')}><ExpensesPage embedded /></div>}

      {activeTab === 'purchases' && <div {...tabPanelProps('reports', 'purchases')}><InputPurchasesPage embedded /></div>}

      {activeTab === 'suppliers' && <div {...tabPanelProps('reports', 'suppliers')}><SuppliersPage embedded /></div>}
    </section>
  );
}
