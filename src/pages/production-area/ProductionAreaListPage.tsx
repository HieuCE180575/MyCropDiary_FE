import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { ZoneModal } from '../../features/production/components/ZoneModal';
import { BlockModal } from '../../features/production/components/BlockModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';
import { BlockConditionHistoryModal } from '../../features/production/components/BlockConditionHistoryModal';
import {
  fetchZonesByFarm,
  fetchAssignedZones,
  fetchBlocks,
  deleteZone,
  deleteBlock,
} from '../../features/production/zoneBlockService';
import type { Zone, Block, AssignedZoneResp, BlockConditionObservation } from '../../features/production/types';

export function ProductionAreaListPage() {
  const navigate = useNavigate();
  const { selectedFarm, farms, selectFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'zones' | 'assigned' | 'blocks'>('zones');

  // Data states
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignedZones, setAssignedZones] = useState<AssignedZoneResp[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filters
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<number | 'all'>('all');

  // Modals state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);

  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [targetZoneForNewBlock, setTargetZoneForNewBlock] = useState<{ id: number; name: string }>({ id: 1, name: '' });

  // Condition Modals
  const [conditionBlock, setConditionBlock] = useState<Block | null>(null);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);
  const [isConditionHistoryOpen, setIsConditionHistoryOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [zonesData, assignedData, blocksData] = await Promise.all([
        fetchZonesByFarm(farmId),
        fetchAssignedZones(farmId),
        fetchBlocks(farmId),
      ]);
      setZones(zonesData);
      setAssignedZones(assignedData);
      setBlocks(blocksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu vùng sản xuất.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Zone Handlers
  const handleZoneSuccess = (savedZone: Zone) => {
    setZones((prev) => {
      const idx = prev.findIndex((z) => z.zoneId === savedZone.zoneId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedZone;
        return copy;
      }
      return [savedZone, ...prev];
    });
    showNotification(zoneToEdit ? 'Cập nhật phân khu thành công!' : 'Tạo phân khu mới thành công!');
    setZoneToEdit(null);
  };

  const handleConfirmDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      await deleteZone(zoneToDelete.zoneId);
      setZones((prev) => prev.filter((z) => z.zoneId !== zoneToDelete.zoneId));
      showNotification('Đã xóa phân khu thành công!');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Xóa phân khu thất bại', 'error');
    } finally {
      setZoneToDelete(null);
    }
  };

  // Block Handlers
  const handleBlockSuccess = (savedBlock: Block) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.blockId === savedBlock.blockId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedBlock;
        return copy;
      }
      return [savedBlock, ...prev];
    });
    showNotification(blockToEdit ? 'Cập nhật lô đất thành công!' : 'Tạo lô đất mới thành công!');
    setBlockToEdit(null);
  };

  const handleConfirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    try {
      await deleteBlock(blockToDelete.blockId);
      setBlocks((prev) => prev.filter((b) => b.blockId !== blockToDelete.blockId));
      showNotification('Đã xóa lô đất thành công!');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Xóa lô đất thất bại', 'error');
    } finally {
      setBlockToDelete(null);
    }
  };

  const handleConditionSuccess = (_obs: BlockConditionObservation) => {
    showNotification('Đã ghi nhận tình trạng lô đất thành công!');
  };

  // Filters
  const filteredZones = zones.filter((z) => {
    const matchesKeyword = !keyword.trim() || z.zoneName.toLowerCase().includes(keyword.toLowerCase().trim());
    const matchesStatus = statusFilter === 'all' || z.status === statusFilter;
    return matchesKeyword && matchesStatus;
  });

  const filteredBlocks = blocks.filter((b) => {
    const matchesKeyword = !keyword.trim() || b.blockName.toLowerCase().includes(keyword.toLowerCase().trim());
    const matchesZone = selectedZoneFilter === 'all' || b.zoneId === selectedZoneFilter;
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesKeyword && matchesZone && matchesStatus;
  });

  // Calculate Stats
  const totalAreaM2 = zones.reduce((acc, z) => {
    const val = z.areaUnit === 'ha' ? z.areaValue * 10000 : z.areaValue;
    return acc + (val || 0);
  }, 0);

  return (
    <section className="production-page-section">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`alert ${notification.type === 'error' ? 'alert--error' : 'alert--success'}`}
          style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Icon name={notification.type === 'error' ? 'warning' : 'check-circle'} />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Banner & Stats */}
      <div className="zone-header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="leaf" size={13} /> VietGAP 2026
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Trang trại: <strong>{selectedFarm?.farmName || 'Trang trại Nông nghiệp số'}</strong>
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
              Quản lý Phân khu & Lô đất (Zone & Block)
            </h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', maxWidth: '640px' }}>
              Mô hình chuẩn hóa cấp bậc: <strong>Phân khu (Zone)</strong> quản lý tập trung các <strong>Lô/Thửa đất canh tác (Block)</strong>, theo dõi hiện trạng và phân công nhân sự phụ trách (UC-16, UC-17 & UC-35).
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {isOwner && (
              <button
                type="button"
                className="btn btn-primary-emerald"
                onClick={() => {
                  setZoneToEdit(null);
                  setIsZoneModalOpen(true);
                }}
              >
                <Icon name="plus" /> Tạo Phân khu mới (Zone)
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={loadData} title="Tải lại dữ liệu">
              <Icon name="refresh" /> Làm mới
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="zone-stats-grid">
          <div className="zone-stat-card">
            <div className="zone-stat-icon">
              <Icon name="plots" />
            </div>
            <div className="zone-stat-content">
              <h4>Tổng số Phân khu</h4>
              <div className="stat-number">{zones.length} khu</div>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--blue">
              <Icon name="leaf" />
            </div>
            <div className="zone-stat-content">
              <h4>Lô / Thửa canh tác</h4>
              <div className="stat-number">{blocks.length} lô</div>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--amber">
              <Icon name="sprout" />
            </div>
            <div className="zone-stat-content">
              <h4>Tổng quy mô diện tích</h4>
              <div className="stat-number">
                {totalAreaM2 >= 10000 ? `${(totalAreaM2 / 10000).toFixed(2)} ha` : `${totalAreaM2.toLocaleString()} m²`}
              </div>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--purple">
              <Icon name="shield" />
            </div>
            <div className="zone-stat-content">
              <h4>Khu vực tôi phụ trách</h4>
              <div className="stat-number">{assignedZones.length} khu</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          <Icon name="plots" size={16} /> Tất cả Phân khu ({zones.length})
        </button>
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned')}
        >
          <Icon name="user" size={16} /> Phân khu tôi phụ trách ({assignedZones.length})
        </button>
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          <Icon name="leaf" size={16} /> Quản lý Lô đất / Thửa ({blocks.length})
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="panel" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Icon
            name="search"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder={activeTab === 'blocks' ? 'Tìm theo tên lô đất, mã lô...' : 'Tìm theo tên phân khu...'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {activeTab === 'blocks' && (
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px' }}
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Tất cả phân khu</option>
            {zones.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.zoneName}
              </option>
            ))}
          </select>
        )}

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="AVAILABLE">Sẵn sàng canh tác</option>
          <option value="IN_USE">Đang trồng trọt</option>
          <option value="RESTING">Đang nghỉ / cải tạo</option>
        </select>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <Icon name="loader" className="animate-spin" size={32} />
          <p style={{ marginTop: '12px' }}>Đang tải thông tin phân khu & lô đất...</p>
        </div>
      ) : error ? (
        <div className="alert alert--error">{error}</div>
      ) : activeTab === 'zones' ? (
        /* ALL ZONES TAB (UC-16) */
        filteredZones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '44px' }}>🏞️</span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#1e293b' }}>Chưa tìm thấy phân khu nào</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
              Trang trại chưa có phân khu nào khớp với điều kiện tìm kiếm. Hãy thêm phân khu đầu tiên!
            </p>
            {isOwner && (
              <button
                type="button"
                className="btn btn-primary-emerald"
                onClick={() => {
                  setZoneToEdit(null);
                  setIsZoneModalOpen(true);
                }}
              >
                <Icon name="plus" /> Tạo Phân khu đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="zone-grid">
            {filteredZones.map((zone) => {
              const zoneBlocks = blocks.filter((b) => b.zoneId === zone.zoneId);
              return (
                <div key={zone.zoneId} className="zone-card">
                  <div className="zone-card-image-wrap">
                    <img
                      src={
                        zone.imageUrl ||
                        'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={zone.zoneName}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <span className="zone-card-badge">Mã: ZN-{String(zone.zoneId).padStart(3, '0')}</span>
                  </div>

                  <div className="zone-card-body">
                    <h3 className="zone-card-title">{zone.zoneName}</h3>
                    <p className="zone-card-desc">
                      {zone.description || 'Chưa có mô tả đặc điểm phân khu và hệ thống nhà màng/thủy canh.'}
                    </p>

                    <div className="zone-card-meta-row">
                      <div className="zone-meta-item">
                        <span className="zone-meta-label">Quy mô</span>
                        <span className="zone-meta-val highlight">
                          {zone.areaValue?.toLocaleString()} {zone.areaUnit || 'm²'}
                        </span>
                      </div>
                      <div className="zone-meta-item">
                        <span className="zone-meta-label">Số lô con</span>
                        <span className="zone-meta-val">{zoneBlocks.length} lô</span>
                      </div>
                      <div className="zone-meta-item">
                        <span className="zone-meta-label">Trạng thái</span>
                        <span className="badge badge--success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {zone.status || 'Hoạt động'}
                        </span>
                      </div>
                    </div>

                    <div className="zone-card-actions">
                      <Link
                        to={`/production-areas/${zone.zoneId}`}
                        className="btn btn-primary-emerald btn-sm-action"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Icon name="eye" /> Quản lý lô con ({zoneBlocks.length})
                      </Link>

                      {isOwner && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm-action"
                            onClick={() => {
                              setZoneToEdit(zone);
                              setIsZoneModalOpen(true);
                            }}
                            title="Sửa thông tin phân khu"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm-action"
                            style={{ color: '#ef4444' }}
                            onClick={() => setZoneToDelete(zone)}
                            title="Xóa phân khu"
                          >
                            <Icon name="close" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'assigned' ? (
        /* MY ASSIGNED ZONES TAB (UC-16.1) */
        assignedZones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '44px' }}>🛡️</span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#1e293b' }}>Bạn chưa được phân công phụ trách phân khu nào</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Khi Chủ trang trại phân công bạn quản lý phân khu, thông tin và các lô đất trực thuộc sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="zone-grid">
            {assignedZones.map((az) => (
              <div key={az.zoneId} className="zone-card" style={{ borderColor: '#10b981' }}>
                <div className="zone-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge--success">Được phân công</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Bắt đầu: {az.assignedStartDate ? new Date(az.assignedStartDate).toLocaleDateString('vi-VN') : 'Hiện tại'}
                    </span>
                  </div>
                  <h3 className="zone-card-title">{az.zoneName}</h3>
                  <p className="zone-card-desc">{az.description || 'Phân khu sản xuất được giao phụ trách kỹ thuật.'}</p>

                  <div className="zone-card-meta-row">
                    <div className="zone-meta-item">
                      <span className="zone-meta-label">Diện tích</span>
                      <span className="zone-meta-val highlight">
                        {az.areaValue?.toLocaleString()} {az.areaUnit || 'm²'}
                      </span>
                    </div>
                    <div className="zone-meta-item">
                      <span className="zone-meta-label">Lô đất phụ trách</span>
                      <span className="zone-meta-val">{az.activeBlockCount} lô</span>
                    </div>
                  </div>

                  <Link
                    to={`/production-areas/${az.zoneId}`}
                    className="btn btn-primary-emerald btn-sm-action"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Icon name="eye" /> Xem chi tiết phân khu & Lô đất (UC-16.2)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ALL BLOCKS TAB (UC-17) */
        filteredBlocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '44px' }}>🌾</span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#1e293b' }}>Không tìm thấy lô đất nào</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Chưa có lô đất nào trong phân khu đã chọn. Vui lòng chọn phân khu và tạo lô đất mới.
            </p>
          </div>
        ) : (
          <div className="block-grid">
            {filteredBlocks.map((block) => (
              <div key={block.blockId} className="block-card">
                <div className="block-card-header">
                  <div>
                    <h4 className="block-name">{block.blockName}</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{block.zoneName}</span>
                  </div>
                  <span className="block-tag">{block.status || 'Sẵn sàng'}</span>
                </div>

                <div className="block-details-list">
                  <div className="block-detail-row">
                    <span className="block-detail-label">Diện tích:</span>
                    <span className="block-detail-value">
                      {block.areaValue?.toLocaleString()} {block.areaUnit || 'm²'}
                    </span>
                  </div>
                  <div className="block-detail-row">
                    <span className="block-detail-label">Loại đất/giá thể:</span>
                    <span className="block-detail-value">{block.soilType || 'Chưa cập nhật'}</span>
                  </div>
                  {block.latitude && block.longitude && (
                    <div className="block-detail-row">
                      <span className="block-detail-label">Tọa độ:</span>
                      <span className="block-detail-value" style={{ fontSize: '12px', color: '#0369a1' }}>
                        {block.latitude.toFixed(4)}, {block.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="block-action-bar">
                  <button
                    type="button"
                    className="btn btn-primary-emerald btn-sm-action"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setConditionBlock(block);
                      setIsRecordConditionOpen(true);
                    }}
                    title="Ghi nhận tình trạng lô đất (UC-17.4)"
                  >
                    <Icon name="check-circle" size={14} /> Ghi nhận tình trạng
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm-action"
                    onClick={() => {
                      setConditionBlock(block);
                      setIsConditionHistoryOpen(true);
                    }}
                    title="Xem lịch sử theo dõi (UC-17.4)"
                  >
                    <Icon name="history" size={14} /> Lịch sử
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm-action"
                        onClick={() => {
                          setBlockToEdit(block);
                          setTargetZoneForNewBlock({ id: block.zoneId, name: block.zoneName || '' });
                          setIsBlockModalOpen(true);
                        }}
                        title="Sửa lô đất"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm-action"
                        style={{ color: '#ef4444' }}
                        onClick={() => setBlockToDelete(block)}
                        title="Xóa lô đất"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ZONE MODAL (Create / Edit) */}
      <ZoneModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        farmId={farmId}
        zoneToEdit={zoneToEdit}
        onSuccess={handleZoneSuccess}
      />

      {/* BLOCK MODAL (Create / Edit) */}
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        zoneId={targetZoneForNewBlock.id}
        zoneName={targetZoneForNewBlock.name}
        blockToEdit={blockToEdit}
        onSuccess={handleBlockSuccess}
      />

      {/* RECORD CONDITION MODAL (UC-17.4) */}
      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        onClose={() => setIsRecordConditionOpen(false)}
        block={conditionBlock}
        onSuccess={handleConditionSuccess}
      />

      {/* CONDITION HISTORY MODAL (UC-17.4) */}
      <BlockConditionHistoryModal
        isOpen={isConditionHistoryOpen}
        onClose={() => setIsConditionHistoryOpen(false)}
        block={conditionBlock}
        onOpenRecord={() => setIsRecordConditionOpen(true)}
      />

      {/* DELETE ZONE CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(zoneToDelete)}
        title="Xác nhận xóa phân khu (Zone)"
        description={`Bạn có chắc chắn muốn xóa phân khu "${zoneToDelete?.zoneName}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa phân khu"
        cancelLabel="Hủy"
        tone="danger"
        onConfirm={handleConfirmDeleteZone}
        onClose={() => setZoneToDelete(null)}
      />

      {/* DELETE BLOCK CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Xác nhận xóa Lô đất (Block)"
        description={`Bạn có chắc chắn muốn xóa lô đất "${blockToDelete?.blockName}"?`}
        confirmLabel="Xóa lô đất"
        cancelLabel="Hủy"
        tone="danger"
        onConfirm={handleConfirmDeleteBlock}
        onClose={() => setBlockToDelete(null)}
      />
    </section>
  );
}
