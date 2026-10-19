import { useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';

interface CropSeason {
  id: number;
  seasonName: string;
  cropName: string;
  variety: string;
  startDate: string;
  expectedHarvestDate: string;
  targetYieldKg: number;
  actualYieldKg?: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'HARVESTING' | 'COMPLETED';
  progressPercent: number;
  allocatedAreaM2: number;
}

export function CropSeasonsPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [seasons, setSeasons] = useState<CropSeason[]>([
    {
      id: 1,
      seasonName: 'Mùa vụ Đông Xuân 2026',
      cropName: 'Dưa lưới ruột cam F1',
      variety: 'Inthanon RZ',
      startDate: '2026-01-10',
      expectedHarvestDate: '2026-03-30',
      targetYieldKg: 3500,
      actualYieldKg: 2680,
      status: 'HARVESTING',
      progressPercent: 90,
      allocatedAreaM2: 2500,
    },
    {
      id: 2,
      seasonName: 'Mùa vụ Hè Thu 2026',
      cropName: 'Cà chua bi Cherry Nova',
      variety: 'Nova F1 VietGAP',
      startDate: '2026-04-15',
      expectedHarvestDate: '2026-07-20',
      targetYieldKg: 4200,
      status: 'PLANNING',
      progressPercent: 15,
      allocatedAreaM2: 3000,
    },
    {
      id: 3,
      seasonName: 'Vụ Thu Đông 2025 (Đã kết thúc)',
      cropName: 'Dưa leo baby xuất khẩu',
      variety: 'Baby Cucumber Green',
      startDate: '2025-09-01',
      expectedHarvestDate: '2025-11-25',
      targetYieldKg: 2800,
      actualYieldKg: 3100,
      status: 'COMPLETED',
      progressPercent: 100,
      allocatedAreaM2: 2000,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [startDate, setStartDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [targetYield, setTargetYield] = useState<number | ''>(3000);
  const [areaM2, setAreaM2] = useState<number | ''>(2000);

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonName.trim() || !cropName.trim()) return;
    const newSeason: CropSeason = {
      id: Date.now(),
      seasonName: seasonName.trim(),
      cropName: cropName.trim(),
      variety: variety.trim() || 'Chuẩn giống F1',
      startDate: startDate || new Date().toISOString().split('T')[0],
      expectedHarvestDate: harvestDate || '2026-08-30',
      targetYieldKg: Number(targetYield) || 2000,
      allocatedAreaM2: Number(areaM2) || 1500,
      status: 'PLANNING',
      progressPercent: 0,
    };
    setSeasons([newSeason, ...seasons]);
    setIsModalOpen(false);
    setSeasonName('');
    setCropName('');
    setVariety('');
  };

  const getStatusBadge = (status: CropSeason['status']) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Đang sinh trưởng</span>;
      case 'HARVESTING':
        return <span className="status-badge status-badge--success">Đang thu hoạch</span>;
      case 'COMPLETED':
        return <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>Đã hoàn thành</span>;
      default:
        return <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Lên kế hoạch</span>;
    }
  };

  return (
    <section className="crop-seasons-page">
      <div className="page-heading">
        <div>
          <h1>Quản lý Mùa vụ canh tác</h1>
          <p className="page-subtitle">
            Kế hoạch mùa vụ, tiến độ sinh trưởng cây trồng và chỉ tiêu năng suất nông trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            <Icon name="plus" /> Lập mùa vụ mới
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {seasons.map((s) => (
          <div key={s.id} className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="profile-tag-pill" style={{ background: '#f0fdf4', color: '#166534', fontWeight: 700 }}>
                  🌱 {s.cropName}
                </span>
                {getStatusBadge(s.status)}
              </div>

              <h2 style={{ margin: '0 0 6px', fontSize: '19px', color: '#0f172a' }}>{s.seasonName}</h2>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13.5px' }}>
                Giống: <strong>{s.variety}</strong> · Quy mô: <strong>{s.allocatedAreaM2.toLocaleString('vi-VN')} m²</strong>
              </p>

              {/* Progress Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Tiến độ mùa vụ</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{s.progressPercent}%</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${s.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Ngày gieo cấy:</span>
                  <strong style={{ color: '#0f172a' }}>{new Date(s.startDate).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Dự kiến thu hoạch:</span>
                  <strong style={{ color: '#0f172a' }}>{new Date(s.expectedHarvestDate).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Sản lượng mục tiêu:</span>
                  <strong style={{ color: '#059669' }}>{s.targetYieldKg.toLocaleString('vi-VN')} kg</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Đã thu được:</span>
                  <strong style={{ color: s.actualYieldKg ? '#0284c7' : '#94a3b8' }}>
                    {s.actualYieldKg ? `${s.actualYieldKg.toLocaleString('vi-VN')} kg` : 'Chưa có'}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Mã vụ: #{s.id}</span>
              <button type="button" className="action-button" style={{ fontSize: '13px' }} onClick={() => alert(`Xem chi tiết mùa vụ: ${s.seasonName}`)}>
                Quản lý chi tiết →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Lập mùa vụ mới */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Lập kế hoạch mùa vụ canh tác</h2>
            <form onSubmit={handleCreateSeason} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên mùa vụ *</label>
                <input type="text" required placeholder="Ví dụ: Vụ Mùa 2026 - Dưa lưới" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Cây trồng *</label>
                  <input type="text" required placeholder="Ví dụ: Dưa lưới / Cà chua" value={cropName} onChange={(e) => setCropName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Giống cây trồng</label>
                  <input type="text" placeholder="F1 Inthanon / Thuần chủng" value={variety} onChange={(e) => setVariety(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ngày bắt đầu gieo *</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Dự kiến thu hoạch *</label>
                  <input type="date" required value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Chỉ tiêu năng suất (kg)</label>
                  <input type="number" value={targetYield} onChange={(e) => setTargetYield(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Diện tích phân bổ (m²)</label>
                  <input type="number" value={areaM2} onChange={(e) => setAreaM2(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button">Tạo mùa vụ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
