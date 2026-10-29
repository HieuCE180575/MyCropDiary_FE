import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { ZoneModal } from '../../features/production/components/ZoneModal';
import { BlockModal } from '../../features/production/components/BlockModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';
import { AssignStaffModal } from '../../features/production/components/AssignStaffModal';
import {
  fetchZonesByFarm,
  fetchAssignedZones,
  fetchBlocks,
  fetchZoneAssignments,
  deleteZone,
  deleteBlock,
} from '../../features/production/zoneBlockService';
import type {
  Zone,
  Block,
  AssignedZoneResp,
  StaffZoneAssignment,
  BlockConditionObservation,
} from '../../features/production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

export function ZoneListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTabParam =
    location.pathname.startsWith('/blocks') || searchParams.get('tab') === 'blocks'
      ? 'blocks'
      : 'zones';

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm #${farmId}`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  // Screen mode: Zones vs Blocks
  const [activeTab, setActiveTab] = useState<'zones' | 'blocks'>(initialTabParam);

  // Data states
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignedZones, setAssignedZones] = useState<AssignedZoneResp[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Screen 1: Zones Filters
  const [zoneKeyword, setZoneKeyword] = useState('');
  const [assignedStaffFilter, setAssignedStaffFilter] = useState<string>('all');

  // Screen 3: Blocks Filters
  const [blockKeyword, setBlockKeyword] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<number | 'all'>('all');

  // Modals state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [zoneForAssignment, setZoneForAssignment] = useState<Zone | null>(null);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [targetZoneForNewBlock, setTargetZoneForNewBlock] = useState<{ id: number; name: string }>({ id: 1, name: '' });

  // Record Block Conditions modal
  const [conditionBlock, setConditionBlock] = useState<Block | null>(null);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);

  useEffect(() => {
    void loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadData(true);
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadData(silent: boolean | unknown = false) {
    const isSilent = silent === true;
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [zonesData, blocksData] = await Promise.all([
        fetchZonesByFarm(farmId),
        fetchBlocks(farmId),
      ]);
      setZones(zonesData);
      setBlocks(blocksData);

      const [assignedRes, assignListRes] = await Promise.allSettled([
        fetchAssignedZones(farmId),
        fetchZoneAssignments(farmId),
      ]);
      setAssignedZones(assignedRes.status === 'fulfilled' ? assignedRes.value : []);
      setAssignments(
        assignListRes.status === 'fulfilled' ? assignListRes.value.filter((a) => a.active) : []
      );
      if (isSilent) setError(null);
    } catch (err) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phân khu & lô đất.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  // Staff only sees assigned Zones
  const visibleZones = useMemo(() => {
    if (isOwner) return zones;
    if (assignedZones.length > 0) {
      const assignedIds = new Set(assignedZones.map((az) => az.zoneId));
      const matched = zones.filter((z) => assignedIds.has(z.zoneId));
      if (matched.length > 0) return matched;
    }
    return zones;
  }, [zones, assignedZones, isOwner]);

  const staffByZoneMap = useMemo(() => {
    const map = new Map<number, StaffZoneAssignment[]>();
    assignments.forEach((a) => {
      if (!a.active) return;
      const list = map.get(a.zoneId) || [];
      list.push(a);
      map.set(a.zoneId, list);
    });
    return map;
  }, [assignments]);

  const staffFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => {
      if (!a.active) return;
      map.set(String(a.farmMemberId), a.staffName || `Staff #${a.farmMemberId}`);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const blockCountByZoneMap = useMemo(() => {
    const map = new Map<number, number>();
    blocks.forEach((b) => {
      map.set(b.zoneId, (map.get(b.zoneId) || 0) + 1);
    });
    return map;
  }, [blocks]);

  const filteredZones = useMemo(() => {
    return visibleZones.filter((z) => {
      const code = `ZN-${String(z.zoneId).padStart(3, '0')}`;
      const kw = zoneKeyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        z.zoneName.toLowerCase().includes(kw) ||
        code.toLowerCase().includes(kw) ||
        Boolean(z.description && z.description.toLowerCase().includes(kw));

      if (!matchKw) return false;

      if (isOwner && assignedStaffFilter !== 'all') {
        const zoneStaff = staffByZoneMap.get(z.zoneId) || [];
        const hasStaff = zoneStaff.some((s) => String(s.farmMemberId) === assignedStaffFilter);
        if (!hasStaff) return false;
      }

      return true;
    });
  }, [visibleZones, zoneKeyword, isOwner, assignedStaffFilter, staffByZoneMap]);

  const visibleBlocks = useMemo(() => {
    if (isOwner) return blocks;
    const accessibleZoneIds = new Set(visibleZones.map((z) => z.zoneId));
    return blocks.filter((b) => accessibleZoneIds.has(b.zoneId));
  }, [blocks, visibleZones, isOwner]);

  const filteredBlocks = useMemo(() => {
    return visibleBlocks.filter((b) => {
      const code = `BLK-${String(b.blockId).padStart(3, '0')}`;
      const kw = blockKeyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        b.blockName.toLowerCase().includes(kw) ||
        code.toLowerCase().includes(kw) ||
        Boolean(b.description && b.description.toLowerCase().includes(kw));
      const matchZone = selectedZoneFilter === 'all' || b.zoneId === Number(selectedZoneFilter);
      return matchKw && matchZone;
    });
  }, [visibleBlocks, blockKeyword, selectedZoneFilter]);

  const totalZoneAreaM2 = zones.reduce(
    (acc, z) => acc + (z.areaUnit === 'ha' ? z.areaValue * 10000 : z.areaValue || 0),
    0
  );
  const activeZonesCount = zones.filter((z) => (z.status || 'active').toLowerCase() === 'active').length;
  const statsReady = !loading && !error;

  const handleResetZoneFilters = () => {
    setZoneKeyword('');
    setAssignedStaffFilter('all');
  };

  const handleResetBlockFilters = () => {
    setBlockKeyword('');
    setSelectedZoneFilter('all');
  };

  const handleCreateZoneClick = () => {
    setZoneToEdit(null);
    setIsZoneModalOpen(true);
  };

  const handleEditZoneClick = (z: Zone) => {
    setZoneToEdit(z);
    setIsZoneModalOpen(true);
  };

  const handleAttemptDeleteZone = (z: Zone) => {
    const count = blockCountByZoneMap.get(z.zoneId) ?? z.totalBlocks ?? 0;
    if (count > 0) {
      showToast(
        `Không thể xóa "${z.zoneName}" vì đang chứa ${count} Block. Hệ thống không xóa dây chuyền Block, mùa vụ hoặc nhật ký khi xóa Zone.`,
        'error'
      );
      return;
    }
    setZoneToDelete(z);
  };

  const handleConfirmDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      await deleteZone(zoneToDelete.zoneId);
      setZones((prev) => prev.filter((item) => item.zoneId !== zoneToDelete.zoneId));
      showToast(`Đã xóa Zone "${zoneToDelete.zoneName}" thành công!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa Zone khi đang có dữ liệu liên kết.', 'error');
    } finally {
      setZoneToDelete(null);
    }
  };

  const handleCreateBlockClick = (zone?: Zone) => {
    const targetZone = zone || visibleZones[0];
    if (!targetZone) {
      showToast('Vui lòng tạo ít nhất 1 Zone trước khi tạo Block!', 'error');
      return;
    }
    setBlockToEdit(null);
    setTargetZoneForNewBlock({ id: targetZone.zoneId, name: targetZone.zoneName });
    setIsBlockModalOpen(true);
  };

  const handleEditBlockClick = (b: Block) => {
    setBlockToEdit(b);
    const parentZone = zones.find((z) => z.zoneId === b.zoneId);
    setTargetZoneForNewBlock({
      id: b.zoneId,
      name: b.zoneName || parentZone?.zoneName || `Zone #${b.zoneId}`,
    });
    setIsBlockModalOpen(true);
  };

  const handleConfirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    try {
      await deleteBlock(blockToDelete.blockId);
      setBlocks((prev) => prev.filter((item) => item.blockId !== blockToDelete.blockId));
      showToast(`Đã xóa Block "${blockToDelete.blockName}" thành công!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa Block khi đang có hồ sơ mùa vụ/điều kiện liên kết.', 'error');
    } finally {
      setBlockToDelete(null);
    }
  };

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
      {/* Page Heading matching FarmRegistrationPage & FarmInfoPage */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">Quản lý khu vực &amp; lô sản xuất</span>
          <h1>{activeTab === 'zones' ? 'Khu vực sản xuất' : 'Lô sản xuất'}</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14.5px' }}>
            Quản lý các phân khu canh tác và lô sản xuất trực thuộc theo tiêu chuẩn VietGAP.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={() => void loadData()}
          >
            Làm mới dữ liệu
          </button>
          {activeTab === 'zones' && isOwner && (
            <>
              <button
                type="button"
                className="action-button outlined"
                onClick={() => {
                  if (visibleZones.length === 0) {
                    showToast('Vui lòng tạo khu vực trước khi phân công nhân sự.', 'error');
                    return;
                  }
                  setZoneForAssignment(visibleZones[0]);
                }}
              >
                <Icon name="user" /> Phân công nhân sự
              </button>
              <button type="button" className="primary-button" onClick={handleCreateZoneClick}>
                <Icon name="plus" /> Thêm khu vực
              </button>
            </>
          )}
          {activeTab === 'blocks' && isOwner && (
            <button type="button" className="primary-button" onClick={() => handleCreateBlockClick()}>
              <Icon name="plus" /> Thêm lô đất
            </button>
          )}
        </div>
      </div>

      {/* Status / Action Banner matching FarmRegistrationPage */}
      {notification && (
        <div
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginTop: 0, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <strong>{notification.type === 'success' ? '✓ Thành công: ' : '⚠️ Thông báo: '}</strong>
            {notification.text}
          </span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Workspace Farm Banner & 4 Stat Cards (preserves .stat-number for tests) */}
      <div className="zone-header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '22px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
              }}
            >
              🌱
            </div>
            <div>
              <span className="eyebrow" style={{ color: '#047857' }}>Trang trại đang làm việc</span>
              <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{farmName}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="profile-role-pill">
              {isOwner ? 'Chủ trang trại' : 'Nhân sự phụ trách'}
            </span>
            <Link to="/farm" className="action-button" style={{ minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}>
              Hồ sơ trang trại →
            </Link>
          </div>
        </div>

        <div className="zone-stats-grid" style={{ marginBottom: 0 }}>
          <div className="zone-stat-card">
            <div className="zone-stat-icon">
              <Icon name="plots" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Tổng số khu vực</h4>
              <strong className="stat-number">{statsReady ? `${zones.length} khu` : '—'}</strong>
            </div>
          </div>
          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--blue">
              <Icon name="leaf" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Tổng số lô đất</h4>
              <strong className="stat-number">{statsReady ? `${blocks.length} lô` : '—'}</strong>
            </div>
          </div>
          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--amber">
              <Icon name="home" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Tổng diện tích</h4>
              <strong className="stat-number">
                {statsReady ? `${totalZoneAreaM2.toLocaleString('vi-VN')} m²` : '—'}
              </strong>
            </div>
          </div>
          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--purple">
              <Icon name="check" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Đang quản lý</h4>
              <strong className="stat-number">{statsReady ? `${activeZonesCount} khu` : '—'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Zones vs Blocks */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={activeTab === 'zones' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('zones')}
        >
          <Icon name="plots" size={16} /> Khu vực ({visibleZones.length})
        </button>
        <button
          type="button"
          className={activeTab === 'blocks' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('blocks')}
        >
          <Icon name="leaf" size={16} /> Lô đất ({visibleBlocks.length})
        </button>
      </div>

      {/* Loading & Error Panels matching FarmRegistrationPage */}
      {loading && (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải dữ liệu phân khu &amp; lô sản xuất...</h2>
          <p>Hệ thống đang đồng bộ danh sách khu vực và lô sản xuất từ máy chủ trang trại.</p>
        </div>
      )}

      {!loading && error && (
        <div className="panel empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <h2>Không thể tải danh sách phân khu</h2>
          <p>{error}</p>
          <button type="button" className="primary-button" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================
          SCREEN 1: ZONES (Danh sách Zone)
         ========================================================= */}
      {!loading && !error && activeTab === 'zones' && (
        <>
          {/* Filter Panel: Search Zones, Assigned Staff (Owner), Reset Filters */}
          <div className="production-filter-panel">
            <label className="form-field" style={{ flex: '1.5 1 280px' }}>
              <span>
                Tìm kiếm khu vực
                <small style={{ color: '#059669', fontWeight: 700 }}>Tên / Mã</small>
              </span>
              <input
                id="search-zones-input"
                type="search"
                placeholder="VD: Khu A, Khu trồng rau ăn lá, ZN-001..."
                value={zoneKeyword}
                onChange={(e) => setZoneKeyword(e.target.value)}
              />
            </label>

            {isOwner && (
              <label className="form-field" style={{ flex: '1 1 240px' }}>
                <span>
                  Nhân sự phụ trách
                  <small style={{ color: '#059669', fontWeight: 700 }}>Lọc theo nhân sự</small>
                </span>
                <select
                  id="assigned-staff-filter"
                  value={assignedStaffFilter}
                  onChange={(e) => setAssignedStaffFilter(e.target.value)}
                >
                  <option value="all">-- Tất cả nhân sự --</option>
                  {staffFilterOptions.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className="action-button"
              onClick={handleResetZoneFilters}
              style={{ height: '46px' }}
            >
              Đặt lại bộ lọc
            </button>
          </div>

          {filteredZones.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🗺️</div>
              <h2>Chưa tìm thấy phân khu nào</h2>
              <p>
                {isOwner
                  ? 'Hãy nhấn "Thêm khu vực" để thiết lập khu vực quản lý đầu tiên cho trang trại.'
                  : 'Bạn hiện chưa được phân công phụ trách khu vực nào trong trang trại này.'}
              </p>
              {isOwner && (
                <button type="button" className="primary-button" onClick={handleCreateZoneClick}>
                  <Icon name="plus" /> Thêm khu vực
                </button>
              )}
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Danh sách khu vực quản lý</span>
                  <h2 style={{ margin: '4px 0 0' }}>Khu vực ({filteredZones.length})</h2>
                </div>
                {isOwner && (
                  <button type="button" className="primary-button" onClick={handleCreateZoneClick}>
                    <Icon name="plus" /> Thêm khu vực
                  </button>
                )}
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên khu vực</th>
                      <th>Mô tả</th>
                      <th>Diện tích</th>
                      <th style={{ textAlign: 'center' }}>Số lượng lô đất</th>
                      <th>Nhân sự phụ trách</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZones.map((zone) => {
                      const blockCount = blockCountByZoneMap.get(zone.zoneId) ?? zone.totalBlocks ?? 0;
                      const zoneStaff = staffByZoneMap.get(zone.zoneId) || [];
                      const canDelete = isOwner && blockCount === 0;

                      return (
                        <tr key={zone.zoneId}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className="module-code" style={{ alignSelf: 'flex-start' }}>
                                {zone.areaCode || `ZN-${String(zone.zoneId).padStart(3, '0')}`}
                              </span>
                              <Link
                                to={`/zones/${zone.zoneId}`}
                                style={{ fontWeight: 750, fontSize: '15.5px', color: '#0f172a' }}
                              >
                                {zone.zoneName}
                              </Link>
                            </div>
                          </td>

                          <td style={{ maxWidth: '300px', color: '#475569', lineHeight: 1.5 }}>
                            {zone.description || 'Khu vực quản lý canh tác chuẩn VietGAP.'}
                          </td>

                          <td>
                            <strong style={{ color: '#059669', fontSize: '14.5px' }}>
                              {zone.areaValue.toLocaleString('vi-VN')} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
                            </strong>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className="knowledge-tag" style={{ fontSize: '13.5px', padding: '5px 14px' }}>
                              {blockCount} lô
                            </span>
                          </td>

                          <td>
                            {zoneStaff.length === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                                Chưa phân công
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {zoneStaff.map((st) => (
                                  <span key={st.assignmentId} className="knowledge-tag">
                                    👤 {st.staffName || `Staff #${st.farmMemberId}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className="zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                              <Link
                                to={`/zones/${zone.zoneId}`}
                                className="primary-button"
                                style={{ padding: '8px 14px', fontSize: '13px' }}
                              >
                                Xem chi tiết
                              </Link>
                              {isOwner && (
                                <>
                                  <button
                                    type="button"
                                    className="action-button"
                                    style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => handleEditZoneClick(zone)}
                                  >
                                    Chỉnh sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="action-button outlined"
                                    style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setZoneForAssignment(zone)}
                                  >
                                    Phân công
                                  </button>
                                  <button
                                    type="button"
                                    className={canDelete ? 'action-button danger' : 'action-button'}
                                    style={{
                                      minHeight: '36px',
                                      padding: '6px 12px',
                                      fontSize: '13px',
                                      opacity: canDelete ? 1 : 0.55,
                                    }}
                                    title={
                                      canDelete
                                        ? 'Xóa khu vực'
                                        : `Không thể xóa khi khu vực còn ${blockCount} lô đất liên kết`
                                    }
                                    onClick={() => handleAttemptDeleteZone(zone)}
                                  >
                                    Xóa
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================
          SCREEN 3: BLOCKS (Danh sách Block)
         ========================================================= */}
      {!loading && !error && activeTab === 'blocks' && (
        <>
          {/* Filter Panel: Search Blocks, Zone, Reset Filters */}
          <div className="production-filter-panel">
            <label className="form-field" style={{ flex: '1.5 1 280px' }}>
              <span>
                Tìm kiếm lô đất
                <small style={{ color: '#059669', fontWeight: 700 }}>Tên / Mã</small>
              </span>
              <input
                id="search-blocks-input"
                type="search"
                placeholder="VD: Lô B01, Lô sản xuất rau cải, BLK-001..."
                value={blockKeyword}
                onChange={(e) => setBlockKeyword(e.target.value)}
              />
            </label>

            <label className="form-field" style={{ flex: '1 1 240px' }}>
              <span>
                Khu vực trực thuộc
                <small style={{ color: '#059669', fontWeight: 700 }}>Khu vực</small>
              </span>
              <select
                id="block-zone-filter"
                value={selectedZoneFilter}
                onChange={(e) =>
                  setSelectedZoneFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
              >
                <option value="all">-- Tất cả khu vực --</option>
                {visibleZones.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.zoneName}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="action-button"
              onClick={handleResetBlockFilters}
              style={{ height: '46px' }}
            >
              Đặt lại bộ lọc
            </button>
          </div>

          {filteredBlocks.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🌿</div>
              <h2>Chưa tìm thấy lô sản xuất nào</h2>
              <p>
                {isOwner
                  ? 'Nhấn "Thêm lô đất" để thêm lô sản xuất mới bên trong khu vực.'
                  : 'Không có lô đất nào khớp với điều kiện tìm kiếm trong phạm vi khu vực được giao.'}
              </p>
              {isOwner && visibleZones.length > 0 && (
                <button type="button" className="primary-button" onClick={() => handleCreateBlockClick()}>
                  <Icon name="plus" /> Thêm lô đất
                </button>
              )}
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Danh sách lô sản xuất trong phạm vi</span>
                  <h2 style={{ margin: '4px 0 0' }}>Lô đất ({filteredBlocks.length})</h2>
                </div>
                {isOwner && (
                  <button type="button" className="primary-button" onClick={() => handleCreateBlockClick()}>
                    <Icon name="plus" /> Thêm lô đất
                  </button>
                )}
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên lô đất</th>
                      <th>Khu vực</th>
                      <th>Mô tả</th>
                      <th style={{ textAlign: 'center' }}>Diện tích</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlocks.map((b) => {
                      const parentZone = zones.find((z) => z.zoneId === b.zoneId);
                      const zoneDisplay = b.zoneName || parentZone?.zoneName || `Khu #${b.zoneId}`;

                      return (
                        <tr key={b.blockId}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className="module-code" style={{ alignSelf: 'flex-start' }}>
                                BLK-{String(b.blockId).padStart(3, '0')}
                              </span>
                              <Link
                                to={`/zones/${b.zoneId}/blocks/${b.blockId}`}
                                style={{ fontWeight: 750, fontSize: '15.5px', color: '#0f172a' }}
                              >
                                {b.blockName}
                              </Link>
                            </div>
                          </td>

                          <td>
                            <Link to={`/zones/${b.zoneId}`} className="knowledge-tag">
                              🗺️ {zoneDisplay}
                            </Link>
                          </td>

                          <td style={{ maxWidth: '320px', color: '#475569', lineHeight: 1.5 }}>
                            <div>{b.description || 'Lô sản xuất nông nghiệp tiêu chuẩn VietGAP.'}</div>
                            {b.soilType && (
                              <small style={{ color: '#059669', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                                Loại đất: {b.soilType}
                              </small>
                            )}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>
                              {b.areaValue.toLocaleString('vi-VN')} {b.areaUnit === 'm2' ? 'm²' : b.areaUnit}
                            </strong>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className="zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="primary-button"
                                style={{ padding: '8px 14px', fontSize: '13px' }}
                                onClick={() => navigate(`/zones/${b.zoneId}/blocks/${b.blockId}`)}
                              >
                                Xem chi tiết
                              </button>
                              <button
                                type="button"
                                className="action-button"
                                style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => handleEditBlockClick(b)}
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                type="button"
                                className="action-button outlined"
                                style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => {
                                  setConditionBlock({ ...b, zoneName: zoneDisplay });
                                  setIsRecordConditionOpen(true);
                                }}
                              >
                                Ghi nhận điều kiện
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  className="action-button danger"
                                  style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                                  onClick={() => setBlockToDelete(b)}
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================
          MODALS
         ========================================================= */}
      <ZoneModal
        isOpen={isZoneModalOpen}
        mode={zoneToEdit ? 'edit' : 'create'}
        farmId={farmId}
        farmName={farmName}
        initialZone={zoneToEdit}
        onClose={() => setIsZoneModalOpen(false)}
        onSuccess={(saved) => {
          if (zoneToEdit) {
            setZones((prev) => prev.map((z) => (z.zoneId === saved.zoneId ? saved : z)));
            showToast(`Đã cập nhật khu vực "${saved.zoneName}" thành công!`);
          } else {
            setZones((prev) => [saved, ...prev]);
            showToast(`Đã tạo mới khu vực "${saved.zoneName}" thành công!`);
          }
        }}
      />

      <BlockModal
        isOpen={isBlockModalOpen}
        mode={blockToEdit ? 'edit' : 'create'}
        zoneId={targetZoneForNewBlock.id}
        zoneName={targetZoneForNewBlock.name}
        availableZones={visibleZones}
        lockZone={Boolean(blockToEdit)}
        initialBlock={blockToEdit}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={(saved) => {
          if (blockToEdit) {
            setBlocks((prev) => prev.map((b) => (b.blockId === saved.blockId ? saved : b)));
            showToast(`Đã cập nhật lô đất "${saved.blockName}" thành công!`);
          } else {
            setBlocks((prev) => [saved, ...prev]);
            showToast(`Đã tạo mới lô đất "${saved.blockName}" thành công!`);
          }
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={conditionBlock}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs: BlockConditionObservation) => {
          showToast(`Đã lưu hồ sơ điều kiện (${obs.conditionType}) cho "${conditionBlock?.blockName}"!`);
        }}
      />

      <AssignStaffModal
        isOpen={Boolean(zoneForAssignment)}
        farmId={farmId}
        zoneId={zoneForAssignment?.zoneId || 1}
        zoneName={zoneForAssignment?.zoneName || ''}
        availableZones={visibleZones}
        onClose={() => setZoneForAssignment(null)}
        onSuccess={(newAssign) => {
          setAssignments((prev) => [newAssign, ...prev]);
          showToast(`Đã phân công "${newAssign.staffName || 'nhân viên'}" phụ trách khu vực thành công!`);
        }}
      />

      <ConfirmDialog
        open={Boolean(zoneToDelete)}
        title="Xác nhận xóa khu vực"
        description={`Bạn có chắc chắn muốn xóa khu vực "${zoneToDelete?.zoneName}"? Khu vực này hiện không có lô đất hay mùa vụ liên kết.`}
        confirmLabel="Xóa khu vực"
        tone="danger"
        onClose={() => setZoneToDelete(null)}
        onConfirm={handleConfirmDeleteZone}
      />

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Xác nhận xóa lô đất"
        description={`Bạn có chắc chắn muốn xóa lô đất "${blockToDelete?.blockName}"? Hệ thống chỉ cho phép xóa khi lô đất chưa phát sinh mùa vụ hoặc nhật ký liên kết.`}
        confirmLabel="Xóa lô đất"
        tone="danger"
        onClose={() => setBlockToDelete(null)}
        onConfirm={handleConfirmDeleteBlock}
      />
    </section>
  );
}

export const ProductionAreaListPage = ZoneListPage;
