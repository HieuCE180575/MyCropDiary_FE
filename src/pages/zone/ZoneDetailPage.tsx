import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { ZoneModal } from '../../features/production/components/ZoneModal';
import { BlockModal } from '../../features/production/components/BlockModal';
import { BlockDetailModal } from '../../features/production/components/BlockDetailModal';
import { AssignStaffModal } from '../../features/production/components/AssignStaffModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';
import { BlockConditionHistoryModal } from '../../features/production/components/BlockConditionHistoryModal';
import {
  fetchZoneById,
  fetchBlocks,
  fetchZoneAssignments,
  unassignStaffFromZone,
  deleteBlock,
} from '../../features/production/zoneBlockService';
import type { Zone, Block, StaffZoneAssignment, BlockConditionObservation } from '../../features/production/types';

export function ZoneDetailPage() {
  const navigate = useNavigate();
  const { zoneId: paramZoneId, productionAreaId, plotId } = useParams<{ zoneId?: string; productionAreaId?: string; plotId?: string }>();
  const rawId = paramZoneId || productionAreaId || plotId || '1';
  const zoneId = parseInt(rawId.replace(/^(pa|zn)-/, ''), 10) || 1;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  // Tabs
  const [activeTab, setActiveTab] = useState<'blocks' | 'assignments' | 'info'>('blocks');

  // Data states
  const [zone, setZone] = useState<Zone | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [blockToView, setBlockToView] = useState<number | null>(null);

  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<StaffZoneAssignment | null>(null);

  // Condition Modals (UC-17.4)
  const [conditionBlock, setConditionBlock] = useState<Block | null>(null);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);
  const [isConditionHistoryOpen, setIsConditionHistoryOpen] = useState(false);

  useEffect(() => {
    setBlockToView(null);
    loadZoneData();
  }, [zoneId, farmId]);

  const loadZoneData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [zoneData, blocksData, assignmentsData] = await Promise.all([
        fetchZoneById(zoneId),
        fetchBlocks(farmId, zoneId),
        fetchZoneAssignments(farmId, zoneId),
      ]);
      setZone(zoneData);
      setBlocks(blocksData);
      setAssignments(assignmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết phân khu.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
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

  // Staff Assignment Handlers (UC-35)
  const handleAssignSuccess = (newAssignment: StaffZoneAssignment) => {
    setAssignments((prev) => [newAssignment, ...prev]);
    showNotification('Phân công nhân sự phụ trách phân khu thành công!');
  };

  const handleConfirmUnassign = async () => {
    if (!assignmentToCancel) return;
    try {
      await unassignStaffFromZone(farmId, assignmentToCancel.assignmentId);
      setAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentToCancel.assignmentId));
      showNotification('Đã hủy phân công nhân sự khỏi phân khu.');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Hủy phân công thất bại', 'error');
    } finally {
      setAssignmentToCancel(null);
    }
  };

  const handleConditionSuccess = (_obs: BlockConditionObservation) => {
    showNotification('Đã ghi nhận tình trạng lô đất thành công!');
  };

  // Calculated Block Area
  const allocatedBlocksAreaM2 = blocks.reduce((acc, b) => {
    const val = b.areaUnit === 'ha' ? b.areaValue * 10000 : b.areaValue;
    return acc + (val || 0);
  }, 0);

  const zoneTotalAreaM2 = zone?.areaUnit === 'ha' ? (zone.areaValue || 0) * 10000 : zone?.areaValue || 0;
  const areaUsagePercent = zoneTotalAreaM2 > 0 ? Math.min(100, Math.round((allocatedBlocksAreaM2 / zoneTotalAreaM2) * 100)) : 0;

  if (loading) {
    return (
      <section style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <Icon name="loader" className="animate-spin" size={36} />
        <p style={{ marginTop: '16px', fontSize: '16px' }}>Đang tải chi tiết phân khu & các lô đất...</p>
      </section>
    );
  }

  if (error || !zone) {
    return (
      <section style={{ padding: '24px' }}>
        <div className="alert alert--error" role="alert">{error || 'Không tìm thấy phân khu.'}</div>
        <button type="button" className="action-button" onClick={loadZoneData}>Thử lại</button>
        <Link to="/zones" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          <Icon name="arrow-left" /> Quay lại danh sách phân khu
        </Link>
      </section>
    );
  }

  return (
    <section className="production-detail-section">
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

      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
        <Link to="/zones" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>
          Quản lý Phân khu & Lô đất
        </Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>{zone.zoneName}</span>
      </div>

      {/* Hero Zone Details Card */}
      <div className="panel" style={{ padding: '24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: '220px', height: '150px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
            <img
              src={
                zone.imageUrl ||
                'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80'
              }
              alt={zone.zoneName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge--success" style={{ marginBottom: '6px' }}>
                  Phân khu: ZN-{String(zone.zoneId).padStart(3, '0')}
                </span>
                <h1 style={{ margin: '4px 0 8px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  {zone.zoneName}
                </h1>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                  {zone.description || 'Chưa cập nhật mô tả chi tiết hạ tầng nhà màng và tiêu chuẩn canh tác.'}
                </p>
              </div>

              {isOwner && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm-action"
                    onClick={() => setIsEditZoneOpen(true)}
                  >
                    <Icon name="edit" /> Sửa phân khu
                  </button>
                </div>
              )}
            </div>

            {/* Area Capacity Progress Bar */}
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                <span>
                  Đã quy hoạch: <strong>{allocatedBlocksAreaM2.toLocaleString()} m²</strong> / {zoneTotalAreaM2.toLocaleString()} m² ({zone.areaValue} {zone.areaUnit})
                </span>
                <span style={{ color: areaUsagePercent >= 90 ? '#e11d48' : '#059669' }}>
                  {areaUsagePercent}% diện tích
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${areaUsagePercent}%`,
                    height: '100%',
                    background: areaUsagePercent >= 90 ? '#e11d48' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          <Icon name="leaf" size={16} /> Lô / Thửa canh tác trực thuộc ({blocks.length})
        </button>
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <Icon name="user" size={16} /> Nhân sự phụ trách phân khu ({assignments.length})
        </button>
        <button
          type="button"
          className={`zone-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <Icon name="book" size={16} /> Thông tin hạ tầng kỹ thuật
        </button>
      </div>

      {/* TAB 1: BLOCKS IN ZONE (UC-17) */}
      {activeTab === 'blocks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Danh sách Lô / Thửa đất trong {zone.zoneName}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                Mỗi lô đất được theo dõi độc lập về thổ nhưỡng, mùa vụ và ghi nhận tình trạng định kỳ (UC-17 & UC-17.4).
              </p>
            </div>

            {isOwner && (
              <button
                type="button"
                className="btn btn-primary-emerald"
                onClick={() => {
                  setBlockToEdit(null);
                  setIsBlockModalOpen(true);
                }}
              >
                <Icon name="plus" /> Thêm Lô đất mới vào Phân khu
              </button>
            )}
          </div>

          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '40px' }}>🌱</span>
              <h4 style={{ margin: '8px 0 4px 0', color: '#1e293b' }}>Phân khu chưa có lô đất nào</h4>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                Hãy chia nhỏ phân khu thành các lô / thửa canh tác để quản lý mùa vụ và nhật ký.
              </p>
              {isOwner && (
                <button
                  type="button"
                  className="btn btn-primary-emerald"
                  onClick={() => {
                    setBlockToEdit(null);
                    setIsBlockModalOpen(true);
                  }}
                >
                  <Icon name="plus" /> Thêm Lô đất đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="block-grid">
              {blocks.map((block) => (
                <div key={block.blockId} className="block-card">
                  <div className="block-card-header">
                    <div>
                      <h4 className="block-name">{block.blockName}</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        ID #{block.blockId} • Tạo ngày {new Date(block.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <span className="block-tag">{block.status || 'AVAILABLE'}</span>
                  </div>

                  <div className="block-details-list">
                    <div className="block-detail-row">
                      <span className="block-detail-label">Diện tích thửa:</span>
                      <span className="block-detail-value highlight" style={{ color: '#059669' }}>
                        {block.areaValue?.toLocaleString()} {block.areaUnit || 'm²'}
                      </span>
                    </div>
                    <div className="block-detail-row">
                      <span className="block-detail-label">Loại đất:</span>
                      <span className="block-detail-value">{block.soilType || 'Chưa xác định'}</span>
                    </div>
                    {block.description && (
                      <div className="block-detail-row" style={{ flexDirection: 'column', gap: '2px' }}>
                        <span className="block-detail-label">Ghi chú:</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{block.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="block-action-bar">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm-action"
                      onClick={() => setBlockToView(block.blockId)}
                      aria-label={`Xem chi tiết ${block.blockName}`}
                    >
                      <Icon name="eye" size={14} /> Chi tiết
                    </button>
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
          )}
        </div>
      )}

      {/* TAB 2: STAFF ASSIGNMENTS (UC-35) */}
      {activeTab === 'assignments' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Danh sách nhân sự được phân công (UC-35 & UC-35.1)
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                Nhân sự được phân công sẽ có toàn quyền ghi nhận nhật ký canh tác và tình trạng các lô đất trong phân khu này.
              </p>
            </div>

            {isOwner && (
              <button
                type="button"
                className="btn btn-primary-emerald"
                onClick={() => setIsAssignStaffOpen(true)}
              >
                <Icon name="user-plus" /> Phân công nhân viên mới
              </button>
            )}
          </div>

          {assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', background: '#f8fafc', borderRadius: '12px' }}>
              <span style={{ fontSize: '36px' }}>👥</span>
              <h4 style={{ margin: '8px 0 4px 0', color: '#1e293b' }}>Chưa có nhân sự nào được phân công</h4>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>
                Phân công kỹ thuật viên phụ trách để họ bắt đầu ghi chép tình trạng và hoạt động canh tác.
              </p>
              {isOwner && (
                <button
                  type="button"
                  className="btn btn-primary-emerald btn-sm-action"
                  onClick={() => setIsAssignStaffOpen(true)}
                >
                  <Icon name="user-plus" /> Phân công ngay
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Họ và tên nhân sự</th>
                    <th>Email liên hệ</th>
                    <th>Chức danh / Trách nhiệm</th>
                    <th>Ngày bắt đầu</th>
                    <th>Trạng thái</th>
                    {isOwner && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.assignmentId}>
                      <td style={{ fontWeight: 600 }}>{a.staffName || `Nhân sự #${a.farmMemberId}`}</td>
                      <td>{a.staffEmail || '—'}</td>
                      <td>{a.jobTitle || 'Kỹ thuật viên phụ trách'}</td>
                      <td>{new Date(a.assignedAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className="badge badge--success">Đang phụ trách</span>
                      </td>
                      {isOwner && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm-action"
                            style={{ color: '#ef4444' }}
                            onClick={() => setAssignmentToCancel(a)}
                          >
                            <Icon name="close" /> Hủy phân công
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INFRASTRUCTURE INFO */}
      {activeTab === 'info' && (
        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Thông số kỹ thuật & Tiêu chuẩn VietGAP
          </h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
              <dt style={{ fontSize: '12px', color: '#64748b' }}>Mã định danh phân khu</dt>
              <dd style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>ZN-{String(zone.zoneId).padStart(3, '0')}</dd>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
              <dt style={{ fontSize: '12px', color: '#64748b' }}>Hệ thống canh tác</dt>
              <dd style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>Nhà màng / Thủy canh công nghệ cao</dd>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
              <dt style={{ fontSize: '12px', color: '#64748b' }}>Nguồn nước tưới</dt>
              <dd style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>Nước giếng khoan lọc thạch anh đạt QCVN 39</dd>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
              <dt style={{ fontSize: '12px', color: '#64748b' }}>Ngày khởi tạo</dt>
              <dd style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{new Date(zone.createdAt).toLocaleDateString('vi-VN')}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* EDIT ZONE MODAL */}
      <ZoneModal
        isOpen={isEditZoneOpen}
        onClose={() => setIsEditZoneOpen(false)}
        farmId={farmId}
        zoneToEdit={zone}
        onSuccess={(updated) => {
          setZone(updated);
          showNotification('Cập nhật phân khu thành công!');
        }}
      />

      {/* BLOCK MODAL */}
      {blockToView !== null && (
        <BlockDetailModal key={blockToView} blockId={blockToView} onClose={() => setBlockToView(null)} />
      )}
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        blockToEdit={blockToEdit}
        onSuccess={handleBlockSuccess}
      />

      {/* ASSIGN STAFF MODAL (UC-35) */}
      <AssignStaffModal
        isOpen={isAssignStaffOpen}
        onClose={() => setIsAssignStaffOpen(false)}
        farmId={farmId}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        onSuccess={handleAssignSuccess}
      />

      {/* RECORD CONDITION MODAL (UC-17.4) */}
      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        onClose={() => setIsRecordConditionOpen(false)}
        block={conditionBlock}
        onSuccess={handleConditionSuccess}
      />

      {/* BLOCK CONDITION HISTORY MODAL (UC-17.4) */}
      <BlockConditionHistoryModal
        isOpen={isConditionHistoryOpen}
        onClose={() => setIsConditionHistoryOpen(false)}
        block={conditionBlock}
        onOpenRecord={() => setIsRecordConditionOpen(true)}
      />

      {/* DELETE BLOCK CONFIRM */}
      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Xác nhận xóa lô đất"
        description={`Bạn có chắc chắn muốn xóa lô đất "${blockToDelete?.blockName}"?`}
        confirmLabel="Xóa lô đất"
        cancelLabel="Hủy"
        tone="danger"
        onConfirm={handleConfirmDeleteBlock}
        onClose={() => setBlockToDelete(null)}
      />

      {/* UNASSIGN STAFF CONFIRM */}
      <ConfirmDialog
        open={Boolean(assignmentToCancel)}
        title="Xác nhận hủy phân công nhân sự"
        description={`Bạn có chắc chắn muốn kết thúc quyền phụ trách phân khu của nhân viên "${assignmentToCancel?.staffName || `ID #${assignmentToCancel?.farmMemberId}`}"?`}
        confirmLabel="Hủy phân công"
        cancelLabel="Đóng"
        tone="danger"
        onConfirm={handleConfirmUnassign}
        onClose={() => setAssignmentToCancel(null)}
      />
    </section>
  );
}

export const ProudctionAreaDetailPage = ZoneDetailPage;
export const ProductionAreaDetailPage = ZoneDetailPage;
