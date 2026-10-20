import { useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';

interface ReportsPageProps {
  initialTab?: 'reports' | 'expenses' | 'purchases' | 'suppliers';
}

export function ReportsPage({ initialTab = 'reports' }: ReportsPageProps) {
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'reports' | 'expenses' | 'purchases' | 'suppliers'>(initialTab);

  const [expenses] = useState([
    { id: 1, category: 'Phân bón & Dinh dưỡng', description: 'Phân trùn quế Vermicompost 5 tấn', amount: 15000000, date: '2026-02-10' },
    { id: 2, category: 'Hạt giống F1', description: 'Hạt giống dưa lưới Inthanon RZ 3000 hạt', amount: 8400000, date: '2026-02-15' },
    { id: 3, category: 'Thuốc BVTV sinh học', description: 'Chế phẩm Trichoderma & Dầu Neem', amount: 3200000, date: '2026-02-25' },
    { id: 4, category: 'Nhân công lao động', description: 'Công làm đất, gieo hạt, tỉa nhánh tháng 2-3', amount: 24000000, date: '2026-03-20' },
    { id: 5, category: 'Bao bì & Tem QR', description: 'Hộp carton 5kg và 1000 tem QR VietGAP', amount: 4500000, date: '2026-03-22' },
  ]);

  const [purchases] = useState([
    { id: 1, invoiceCode: 'HD-2026-081', supplierName: 'Công ty Cổ phần Nông nghiệp Xanh Vermi', totalAmount: 18200000, purchaseDate: '2026-02-10', status: 'PAID' },
    { id: 2, invoiceCode: 'HD-2026-095', supplierName: 'Tập đoàn Hạt giống Rijk Zwaan Việt Nam', totalAmount: 8400000, purchaseDate: '2026-02-15', status: 'PAID' },
    { id: 3, invoiceCode: 'HD-2026-112', supplierName: 'Công ty Sinh học Nông dược An Phát', totalAmount: 3200000, purchaseDate: '2026-02-25', status: 'PAID' },
  ]);

  const [suppliers] = useState([
    { id: 1, supplierName: 'Công ty Cổ phần Nông nghiệp Xanh Vermi', contactPerson: 'Ông Trần Hữu Đức', phone: '0988112233', address: 'Bến Tre', itemsSupplied: 'Phân trùn quế, giá thể hữu cơ' },
    { id: 2, supplierName: 'Tập đoàn Hạt giống Rijk Zwaan Việt Nam', contactPerson: 'Bà Mai Phương', phone: '0903445566', address: 'TP. Hồ Chí Minh', itemsSupplied: 'Hạt giống rau quả F1 chất lượng cao' },
    { id: 3, supplierName: 'Công ty Sinh học Nông dược An Phát', contactPerson: 'KS. Hoàng Nam', phone: '0912778899', address: 'Đồng Nai', itemsSupplied: 'Thuốc BVTV sinh học, nấm đối kháng' },
  ]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <section className="reports-page">
      <div className="page-heading">
        <div>
          <h1>Báo cáo sản xuất & Quản trị tài chính</h1>
          <p className="page-subtitle">
            Tổng hợp dữ liệu canh tác, hạch toán chi phí đầu vào và theo dõi nhà cung cấp vật tư trang trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div>
          <button type="button" className="action-button" onClick={() => window.print()}>
            📊 Xuất báo cáo PDF / Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
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
          💰 Chi phí sản xuất ({expenses.length})
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
          🧾 Hóa đơn mua vật tư ({purchases.length})
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
          🏭 Danh bạ nhà cung cấp ({suppliers.length})
        </button>
      </div>

      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG SẢN LƯỢNG MÙA VỤ</span>
              <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#059669', fontWeight: 800 }}>2,680 kg</h2>
              <small style={{ color: '#10b981' }}>Tỷ lệ loại 1: 83.6%</small>
            </div>
            <div className="panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG CHI PHÍ ĐÃ CHI</span>
              <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#b45309', fontWeight: 800 }}>
                {totalExpense.toLocaleString('vi-VN')} đ
              </h2>
              <small style={{ color: '#64748b' }}>Chi phí bình quân: 20,559 đ/kg</small>
            </div>
            <div className="panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ƯỚC TÍNH DOANH THU</span>
              <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#0284c7', fontWeight: 800 }}>120,600,000 đ</h2>
              <small style={{ color: '#0284c7' }}>Giá bán sỉ: 45,000 đ/kg</small>
            </div>
            <div className="panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>LỢI NHUẬN RÒNG DỰ KIẾN</span>
              <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#10b981', fontWeight: 800 }}>65,500,000 đ</h2>
              <small style={{ color: '#10b981' }}>Biên lợi nhuận: 54.3%</small>
            </div>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Tỷ trọng chi phí sản xuất</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Nhân công lao động', pct: 43.5, color: '#059669' },
                { name: 'Phân bón & Dinh dưỡng hữu cơ', pct: 27.2, color: '#10b981' },
                { name: 'Hạt giống F1', pct: 15.2, color: '#0284c7' },
                { name: 'Bao bì, tem QR & Đóng gói', pct: 8.2, color: '#8b5cf6' },
                { name: 'Thuốc BVTV sinh học', pct: 5.9, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                <th style={{ padding: '14px 20px' }}>Hạng mục chi phí</th>
                <th style={{ padding: '14px 20px' }}>Nội dung chi tiết</th>
                <th style={{ padding: '14px 20px' }}>Ngày chi</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Số tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="profile-tag-pill">{e.category}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#0f172a', fontWeight: 500 }}>{e.description}</td>
                  <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                    {e.amount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '14px 20px', textAlign: 'right', color: '#0f172a' }}>
                  Tổng cộng:
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right', color: '#059669', fontSize: '16px' }}>
                  {totalExpense.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                <th style={{ padding: '14px 20px' }}>Mã hóa đơn</th>
                <th style={{ padding: '14px 20px' }}>Nhà cung cấp</th>
                <th style={{ padding: '14px 20px' }}>Ngày mua hàng</th>
                <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Tổng thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0284c7' }}>{p.invoiceCode}</td>
                  <td style={{ padding: '14px 20px', color: '#0f172a' }}>{p.supplierName}</td>
                  <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(p.purchaseDate).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="status-badge status-badge--success">Đã thanh toán</span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {p.totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {suppliers.map((s) => (
            <div key={s.id} className="panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669' }}>
                  Đã kiểm định VietGAP
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{s.id}</span>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>{s.supplierName}</h3>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                Hàng hóa cung ứng: {s.itemsSupplied}
              </p>
              <dl style={{ margin: 0, fontSize: '13px', display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px 8px' }}>
                <dt style={{ color: '#64748b' }}>Đại diện:</dt>
                <dd style={{ margin: 0, color: '#334155' }}>{s.contactPerson}</dd>
                <dt style={{ color: '#64748b' }}>Điện thoại:</dt>
                <dd style={{ margin: 0, color: '#334155' }}>{s.phone}</dd>
                <dt style={{ color: '#64748b' }}>Địa chỉ:</dt>
                <dd style={{ margin: 0, color: '#334155' }}>{s.address}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
