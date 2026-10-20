import { useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  status: 'COMPLIANT' | 'MINOR_NC' | 'MAJOR_NC';
  evidence: string;
}

interface VietGAPComplianceProps {
  initialTab?: 'checklists' | 'assessments' | 'environment' | 'training';
}

export function VietGAPCompliancePage({ initialTab = 'checklists' }: VietGAPComplianceProps) {
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'checklists' | 'assessments' | 'environment' | 'training'>(initialTab);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'VG-01',
      category: '1. Đất & Giá thể canh tác',
      title: 'Đánh giá nguy cơ ô nhiễm đất',
      requirement: 'Có phiếu kết quả phân tích mẫu đất không chứa dư lượng kim loại nặng vượt ngưỡng quy định.',
      status: 'COMPLIANT',
      evidence: 'Phiếu kiểm nghiệm số 2026/KN-ĐAT ngày 15/01/2026 (Viện Khoa học Nông nghiệp)',
    },
    {
      id: 'VG-02',
      category: '2. Nước tưới tiêu',
      title: 'Nguồn nước tưới đạt chuẩn QCVN 39:2011/BTNMT',
      requirement: 'Nước mặt hoặc nước ngầm không bị ô nhiễm bởi nước thải sinh hoạt hoặc công nghiệp.',
      status: 'COMPLIANT',
      evidence: 'Hệ thống giếng khoan tầng sâu + bể lắng lọc cát thạch anh đã kiểm định',
    },
    {
      id: 'VG-03',
      category: '3. Phân bón & Dinh dưỡng',
      title: 'Sử dụng phân bón trong danh mục cho phép',
      requirement: 'Chỉ dùng phân bón có nguồn gốc rõ ràng, ghi chép sổ nhật ký đầy đủ số lượng và thời gian.',
      status: 'COMPLIANT',
      evidence: 'Nhật ký vật tư số #2026-VTTU, hóa đơn nhà cung cấp VermiFarm',
    },
    {
      id: 'VG-04',
      category: '4. Thuốc BVTV & Thời gian cách ly (PHI)',
      title: 'Tuân thủ thời gian cách ly thu hoạch',
      requirement: 'Thu hoạch phải sau thời gian cách ly tối thiểu ghi trên nhãn thuốc bảo vệ thực vật.',
      status: 'COMPLIANT',
      evidence: 'Đợt phun Neem Oil cách ngày hái 7 ngày (quy định 5 ngày)',
    },
    {
      id: 'VG-05',
      category: '5. Thu hoạch & Bảo quản sau thu hoạch',
      title: 'Vệ sinh dụng cụ chứa đựng và bao bì',
      requirement: 'Thùng sọt, bao bì đựng rau quả phải sạch sẽ, không dùng lại bao bì từng đựng hóa chất/phân bón.',
      status: 'COMPLIANT',
      evidence: 'Khay nhựa HDPE nguyên sinh chuyên dụng có khử khuẩn cồn y tế',
    },
    {
      id: 'VG-06',
      category: '6. An toàn lao động & Phúc lợi',
      title: 'Trang bị bảo hộ lao động đầy đủ',
      requirement: 'Công nhân được cấp khẩu trang, găng tay, ủng và khám sức khỏe định kỳ hàng năm.',
      status: 'MINOR_NC',
      evidence: 'Đã cấp bảo hộ, đang lên lịch khám sức khỏe đợt 2 cho 4 công nhân mới',
    },
  ]);

  const compliantCount = checklist.filter((c) => c.status === 'COMPLIANT').length;
  const complianceScore = Math.round((compliantCount / checklist.length) * 100);

  const handleToggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'COMPLIANT' ? 'MINOR_NC' : 'COMPLIANT';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  return (
    <section className="vietgap-compliance-page">
      <div className="page-heading">
        <div>
          <h1>Đánh giá & Tuân thủ Tiêu chuẩn VietGAP</h1>
          <p className="page-subtitle">
            Hồ sơ kiểm soát chất lượng, đánh giá nội bộ và kiểm định an toàn nông trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="action-button" onClick={() => window.print()}>
            📄 Xuất hồ sơ VietGAP
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('checklists')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'checklists' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'checklists' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          ✓ Bảng kiểm tiêu chí ({checklist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'assessments' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'assessments' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          📋 Đánh giá nội bộ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('environment')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'environment' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'environment' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🌍 Đất, Nước & Môi trường
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('training')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'training' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'training' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🎓 Đào tạo an toàn lao động
        </button>
      </div>

      {/* Tab: Checklists */}
      {activeTab === 'checklists' && (
        <>
          {/* Score summary panel */}
          <div className="panel" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderColor: '#a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span className="profile-tag-pill" style={{ background: '#10b981', color: '#ffffff', fontWeight: 700 }}>
                  CHỨNG NHẬN TIÊU CHUẨN QUỐC GIA TCVN 11892-1:2017
                </span>
                <h2 style={{ margin: '10px 0 4px', fontSize: '24px', color: '#064e3b' }}>
                  Chỉ số tuân thủ VietGAP: <span style={{ color: '#059669', fontWeight: 800 }}>{complianceScore}%</span>
                </h2>
                <p style={{ margin: 0, color: '#047857', fontSize: '14px' }}>
                  Đạt {compliantCount} / {checklist.length} tiêu chí khắt khe · Đủ điều kiện duy trì chứng chỉ VietGAP
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="status-badge status-badge--success" style={{ fontSize: '14px', padding: '6px 14px' }}>
                  ✓ ĐẠT TIÊU CHUẨN
                </span>
                <small style={{ display: 'block', color: '#059669', marginTop: '6px' }}>Hạn kiểm tra tiếp theo: 15/10/2026</small>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {checklist.map((item) => (
              <div
                key={item.id}
                className="panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  borderLeft: `4px solid ${item.status === 'COMPLIANT' ? '#10b981' : '#f59e0b'}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px', color: '#059669' }}>{item.category}</strong>
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Mã tiêu chí: {item.id}</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>{item.title}</h3>
                  <p style={{ margin: '0 0 10px', color: '#475569', fontSize: '13.5px', lineHeight: 1.5 }}>
                    {item.requirement}
                  </p>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#334155' }}>
                    📎 <strong>Minh chứng kiểm tra:</strong> {item.evidence}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      fontSize: '12.5px',
                      fontWeight: 650,
                      cursor: 'pointer',
                      background: item.status === 'COMPLIANT' ? '#ecfdf5' : '#fef3c7',
                      borderColor: item.status === 'COMPLIANT' ? '#10b981' : '#f59e0b',
                      color: item.status === 'COMPLIANT' ? '#059669' : '#b45309',
                    }}
                  >
                    {item.status === 'COMPLIANT' ? '✓ Đạt chuẩn' : '⚠️ Điểm cần khắc phục'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab: Internal Assessments */}
      {activeTab === 'assessments' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Hồ sơ đánh giá nội bộ định kỳ</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Đánh giá độc lập 6 tháng/lần trước kỳ kiểm định cấp chứng nhận
              </p>
            </div>
            <button type="button" className="primary-button" onClick={() => alert('Tạo kỳ đánh giá nội bộ mới')}>
              + Tạo đợt đánh giá mới
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>Đợt đánh giá</th>
                <th style={{ padding: '12px 16px' }}>Thời điểm</th>
                <th style={{ padding: '12px 16px' }}>Trưởng đoàn đánh giá</th>
                <th style={{ padding: '12px 16px' }}>Số lỗi phát hiện</th>
                <th style={{ padding: '12px 16px' }}>Kết luận</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>Đánh giá định kỳ Quý 1/2026</td>
                <td style={{ padding: '14px 16px', color: '#64748b' }}>15/02/2026</td>
                <td style={{ padding: '14px 16px' }}>KS. Nguyễn Văn An</td>
                <td style={{ padding: '14px 16px', color: '#f59e0b', fontWeight: 600 }}>1 lỗi nhỏ (Đã khắc phục)</td>
                <td style={{ padding: '14px 16px' }}><span className="status-badge status-badge--success">Đạt yêu cầu</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>Đánh giá trước mùa vụ 2025</td>
                <td style={{ padding: '14px 16px', color: '#64748b' }}>20/08/2025</td>
                <td style={{ padding: '14px 16px' }}>Chuyên gia Vinacert</td>
                <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 600 }}>0 lỗi</td>
                <td style={{ padding: '14px 16px' }}><span className="status-badge status-badge--success">Xuất sắc</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Environment */}
      {activeTab === 'environment' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a' }}>🧪 Xét nghiệm mẫu đất canh tác</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13.5px' }}>Phiếu kết quả kiểm định chất lượng đất theo chuẩn VietGAP số Đ-2026</p>
            <dl style={{ margin: 0, fontSize: '13.5px', display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px' }}>
              <dt style={{ color: '#64748b' }}>Độ chua pH:</dt>
              <dd style={{ margin: 0, fontWeight: 700, color: '#059669' }}>6.2 (Đạt chuẩn 5.5 - 6.5)</dd>
              <dt style={{ color: '#64748b' }}>Chì (Pb):</dt>
              <dd style={{ margin: 0, color: '#059669' }}>0.02 mg/kg (Ngưỡng cho phép &lt; 70)</dd>
              <dt style={{ color: '#64748b' }}>Cadimi (Cd):</dt>
              <dd style={{ margin: 0, color: '#059669' }}>Không phát hiện (KPH)</dd>
              <dt style={{ color: '#64748b' }}>Độ mặn EC:</dt>
              <dd style={{ margin: 0, color: '#059669' }}>0.4 dS/m (Thích hợp cho rau màu)</dd>
            </dl>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a' }}>💧 Xét nghiệm mẫu nước tưới tiêu</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13.5px' }}>Kiểm định theo Quy chuẩn kỹ thuật QCVN 39:2011/BTNMT</p>
            <dl style={{ margin: 0, fontSize: '13.5px', display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px' }}>
              <dt style={{ color: '#64748b' }}>Coliform tổng số:</dt>
              <dd style={{ margin: 0, color: '#059669', fontWeight: 700 }}>25 MPN/100ml (&lt; 200 quy định)</dd>
              <dt style={{ color: '#64748b' }}>E. Coli:</dt>
              <dd style={{ margin: 0, color: '#059669' }}>Âm tính</dd>
              <dt style={{ color: '#64748b' }}>Asen (Thạch tín):</dt>
              <dd style={{ margin: 0, color: '#059669' }}>KPH</dd>
              <dt style={{ color: '#64748b' }}>Đánh giá an toàn:</dt>
              <dd style={{ margin: 0 }}><span className="status-badge status-badge--success">Nước sạch an toàn</span></dd>
            </dl>
          </div>
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === 'training' && (
        <div className="panel" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>Hồ sơ tập huấn & Đào tạo VietGAP</h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13.5px' }}>
            Ghi nhận các khóa đào tạo nội bộ và chứng chỉ tập huấn an toàn thực phẩm cho công nhân
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>Tập huấn quy trình bón phân và thời gian cách ly PHI 2026</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Giảng viên: Chi cục Trồng trọt & BVTV · Số lượng tham gia: 12 nhân sự
                </p>
              </div>
              <span className="status-badge status-badge--success">Đã cấp chứng nhận</span>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>Quy tắc vệ sinh nhà đóng gói và phòng tránh nhiễm chéo nông sản</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Nội bộ trang trại hướng dẫn · Số lượng tham gia: 8 công nhân đóng gói
                </p>
              </div>
              <span className="status-badge status-badge--success">Hoàn thành</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
