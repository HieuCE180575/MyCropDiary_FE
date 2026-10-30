import { useEffect, useState, useMemo } from 'react';
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
import {
  fetchZoneById,
  fetchBlocks,
  fetchZoneAssignments,
  unassignStaffFromZone,
  deleteZone,
  deleteBlock,
  fetchZoneRiskRecords,
  saveRiskRecord,
} from '../../features/production/zoneBlockService';
import type {
  Zone,
  Block,
  StaffZoneAssignment,
  BlockConditionObservation,
  RiskAssessmentRecord,
} from '../../features/production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

export function ZoneDetailPage() {
  const navigate = useNavigate();
  const { zoneId: paramZoneId, productionAreaId, plotId } = useParams<{
    zoneId?: string;
    productionAreaId?: string;
    plotId?: string;
  }>();
  const rawId = paramZoneId || productionAreaId || plotId || '1';
  const zoneId = parseInt(rawId.replace(/^(pa|zn)-/, ''), 10) || 1;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm #${farmId}`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  // 3 Tabs: Overview | Blocks | Risk Records
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'risks'>('blocks');

  // Data states
  const [zone, setZone] = useState<Zone | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>([]);
  const [riskRecords, setRiskRecords] = useState<RiskAssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Blocks tab filters (Fixed to current Zone: only Search Blocks & Reset Filters)
  const [blockSearch, setBlockSearch] = useState('');

  // Modals
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [isDeleteZoneOpen, setIsDeleteZoneOpen] = useState(false);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [blockToView, setBlockToView] = useState<number | null>(null);

  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<StaffZoneAssignment | null>(null);

  // Record Block Conditions modal
  const [conditionBlock, setConditionBlock] = useState<Block | null>(null);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);

  // Zone Risk Record modal
  const [riskModalMode, setRiskModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessmentRecord | null>(null);
  const [riskForm, setRiskForm] = useState({
    assessedAt: new Date().toISOString().split('T')[0],
    riskType: 'Trôi dạt hóa chất lân cận',
    riskLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    priorFindings: '',
    description: '',
    controlMeasures: '',
    assessedByName: 'Ban Quản lý VietGAP',
    status: 'CONTROLLED' as 'MONITORING' | 'CONTROLLED' | 'ACTION_REQUIRED',
  });

  useEffect(() => {
    setBlockToView(null);
    void loadZoneData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, farmId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadZoneData(true);
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadZoneData(silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [zData, bData, aData] = await Promise.all([
        fetchZoneById(zoneId),
        fetchBlocks(farmId, zoneId),
        fetchZoneAssignments(farmId, zoneId).catch(() => []),
      ]);
      setZone(zData);
      setBlocks(bData);
      setAssignments(aData);
      setRiskRecords(fetchZoneRiskRecords(zoneId));
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết khu vực.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const activeAssignments = useMemo(() => assignments.filter((a) => a.active), [assignments]);

  const filteredBlocks = useMemo(() => {
    const kw = blockSearch.trim().toLowerCase();
    if (!kw) return blocks;
    return blocks.filter((b) => {
      const code = `BLK-${String(b.blockId).padStart(3, '0')}`.toLowerCase();
      return (
        b.blockName.toLowerCase().includes(kw) ||
        code.includes(kw) ||
        Boolean(b.description && b.description.toLowerCase().includes(kw)) ||
        Boolean(b.soilType && b.soilType.toLowerCase().includes(kw))
      );
    });
  }, [blocks, blockSearch]);

  const handleConfirmDeleteZone = async () => {
    if (!zone) return;
    try {
      await deleteZone(zone.zoneId);
      navigate('/zones');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa Zone khi còn dữ liệu liên kết.', 'error');
      setIsDeleteZoneOpen(false);
    }
  };

  const handleConfirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    try {
      await deleteBlock(blockToDelete.blockId);
      setBlocks((prev) => prev.filter((b) => b.blockId !== blockToDelete.blockId));
      showToast(`Đã xóa Block "${blockToDelete.blockName}" thành công!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa Block.', 'error');
    } finally {
      setBlockToDelete(null);
    }
  };

  const handleConfirmUnassign = async () => {
    if (!assignmentToCancel) return;
    try {
      await unassignStaffFromZone(farmId, assignmentToCancel.assignmentId);
      setAssignments((prev) =>
        prev.map((a) =>
          a.assignmentId === assignmentToCancel.assignmentId
            ? { ...a, active: false, endedAt: new Date().toISOString() }
            : a
        )
      );
      showToast(`Đã thu hồi phân công của "${assignmentToCancel.staffName || 'Staff'}"!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể thu hồi phân công.', 'error');
    } finally {
      setAssignmentToCancel(null);
    }
  };

  const openAddRiskModal = () => {
    setSelectedRisk(null);
    setRiskForm({
      assessedAt: new Date().toISOString().split('T')[0],
      riskType: 'Trôi dạt hóa chất lân cận',
      riskLevel: 'MEDIUM',
      priorFindings: '',
      description: '',
      controlMeasures: '',
      assessedByName: isOwner ? 'Chủ trang trại' : 'Nhân viên phụ trách',
      status: 'CONTROLLED',
    });
    setRiskModalMode('create');
  };

  const openEditRiskModal = (record: RiskAssessmentRecord, mode: 'edit' | 'view') => {
    setSelectedRisk(record);
    setRiskForm({
      assessedAt: record.assessedAt,
      riskType: record.riskType,
      riskLevel: record.riskLevel,
      priorFindings: record.priorFindings || '',
      description: record.description,
      controlMeasures: record.controlMeasures,
      assessedByName: record.assessedByName,
      status: record.status,
    });
    setRiskModalMode(mode);
  };

  const handleSaveRiskRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone) return;
    const saved = saveRiskRecord({
      riskId: selectedRisk?.riskId,
      targetType: 'ZONE',
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      assessedAt: riskForm.assessedAt,
      riskType: riskForm.riskType,
      riskLevel: riskForm.riskLevel,
      priorFindings: riskForm.priorFindings,
      description: riskForm.description,
      controlMeasures: riskForm.controlMeasures,
      assessedByName: riskForm.assessedByName,
      status: riskForm.status,
    });
    setRiskRecords(fetchZoneRiskRecords(zone.zoneId));
    setRiskModalMode(null);
    showToast(
      selectedRisk
        ? `Đã cập nhật biện pháp kiểm soát cho "${saved.riskType}"!`
        : `Đã thêm hồ sơ rủi ro Zone "${saved.riskType}"!`
    );
  };

  if (loading) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin chi tiết Zone #{zoneId}...</h2>
        </div>
      </section>
    );
  }

  if (error || !zone) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <h2>Không tìm thấy thông tin Zone</h2>
          <p>{error || `Zone #${zoneId} không tồn tại hoặc đã bị xóa.`}</p>
          <Link to="/zones" className="primary-button">
            Back to Zones
          </Link>
        </div>
      </section>
    );
  }

  const canDeleteZone = isOwner && blocks.length === 0;

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
      {/* Breadcrumb Bar */}
      <div className="production-breadcrumb">
        <Link to="/zones">Khu vực sản xuất</Link>
        <span>→</span>
        <strong>{zone.zoneName}</strong>
      </div>

      {/* Page Heading matching FarmRegistrationPage */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {zone.areaCode || `ZN-${String(zone.zoneId).padStart(3, '0')}`} · Trang trại: {farmName}
          </span>
          <h1>{zone.zoneName}</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14.5px' }}>
            {zone.description || 'Khu vực quản lý sản xuất nông nghiệp theo tiêu chuẩn VietGAP.'}
          </p>
        </div>

        {/* Top Buttons per spec: Back to Zones; Owner has Edit Zone, Manage Assignments, Delete Zone when eligible */}
        <div className="dashboard-actions">
          <Link to="/zones" className="action-button">
            ← Quay lại danh sách
          </Link>
          {isOwner && (
            <>
              <button type="button" className="action-button" onClick={() => setIsEditZoneOpen(true)}>
                Chỉnh sửa khu vực
              </button>
              <button type="button" className="action-button outlined" onClick={() => setIsAssignStaffOpen(true)}>
                Phân công nhân sự
              </button>
              <button
                type="button"
                className={canDeleteZone ? 'action-button danger' : 'action-button'}
                style={{ opacity: canDeleteZone ? 1 : 0.55 }}
                onClick={() => {
                  if (!canDeleteZone) {
                    showToast(
                      `Không thể xóa khu vực "${zone.zoneName}" khi đang có ${blocks.length} lô đất trực thuộc.`,
                      'error'
                    );
                    return;
                  }
                  setIsDeleteZoneOpen(true);
                }}
              >
                Xóa khu vực
              </button>
            </>
          )}
        </div>
      </div>

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

      {/* Summary Panel matching FarmRegistrationStatus */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '18px' }}>
          <div>
            <span className="eyebrow">Hồ sơ khu vực quản lý</span>
            <h2 style={{ margin: '4px 0 0' }}>{zone.zoneName}</h2>
          </div>
          <span className="profile-role-pill">
            {blocks.length} lô đất · {zone.areaValue.toLocaleString('vi-VN')} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
          </span>
        </div>

        <dl className="detail-list" style={{ marginBottom: 0 }}>
          <div>
            <dt>Tên &amp; Mã khu vực</dt>
            <dd>
              {zone.zoneName} ({zone.areaCode || `ZN-${String(zone.zoneId).padStart(3, '0')}`})
            </dd>
          </div>
          <div>
            <dt>Trang trại trực thuộc</dt>
            <dd>{farmName}</dd>
          </div>
          <div>
            <dt>Diện tích</dt>
            <dd>
              {zone.areaValue.toLocaleString('vi-VN')} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
            </dd>
          </div>
          <div>
            <dt>Số lượng lô đất</dt>
            <dd>{blocks.length} lô sản xuất</dd>
          </div>
          <div>
            <dt>Nhân sự phụ trách</dt>
            <dd>
              {activeAssignments.length > 0
                ? activeAssignments.map((a) => a.staffName || `Nhân viên #${a.farmMemberId}`).join(', ')
                : 'Chưa phân công'}
            </dd>
          </div>
          <div>
            <dt>Ngày khởi tạo</dt>
            <dd>{zone.createdAt ? new Date(zone.createdAt).toLocaleString('vi-VN') : 'Đang hoạt động'}</dd>
          </div>
        </dl>
      </div>

      {/* Tabs Navigation: Overview | Blocks | Risk Records */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={activeTab === 'overview' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('overview')}
        >
          <Icon name="home" size={16} /> Tổng quan
        </button>
        <button
          type="button"
          className={activeTab === 'blocks' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('blocks')}
        >
          <Icon name="leaf" size={16} /> Lô sản xuất ({blocks.length})
        </button>
        <button
          type="button"
          className={activeTab === 'risks' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('risks')}
        >
          <Icon name="alert" size={16} /> Đánh giá rủi ro ({riskRecords.length})
        </button>
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW
         ========================================================= */}
      {activeTab === 'overview' && (
        <div className="profile-layout">
          {/* Zone Information Panel */}
          <div className="panel" style={{ padding: '28px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">Thông tin khu vực</span>
                <h2 style={{ margin: '4px 0 0' }}>Tổng quan: {zone.zoneName}</h2>
              </div>
              {isOwner && (
                <button type="button" className="action-button" onClick={() => setIsEditZoneOpen(true)}>
                  Chỉnh sửa khu vực
                </button>
              )}
            </div>

            <dl className="detail-list" style={{ marginBottom: 0 }}>
              <div>
                <dt>Mã định danh</dt>
                <dd>#{zone.zoneId}</dd>
              </div>
              <div>
                <dt>Mã khu vực</dt>
                <dd>{zone.areaCode || `ZN-${String(zone.zoneId).padStart(3, '0')}`}</dd>
              </div>
              <div>
                <dt>Diện tích</dt>
                <dd>
                  {zone.areaValue.toLocaleString('vi-VN')} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
                </dd>
              </div>
              <div>
                <dt>Số lượng lô đất</dt>
                <dd>{blocks.length} lô</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>Mô tả khu vực</dt>
                <dd>{zone.description || 'Chưa có mô tả chi tiết cho khu vực này.'}</dd>
              </div>
            </dl>
          </div>

          {/* Assigned Staff Panel */}
          <div className="panel" style={{ padding: '28px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">Đội ngũ phụ trách</span>
                <h2 style={{ margin: '4px 0 0' }}>Nhân sự được phân công ({activeAssignments.length})</h2>
              </div>
              {isOwner && (
                <button type="button" className="primary-button" onClick={() => setIsAssignStaffOpen(true)}>
                  Phân công nhân sự
                </button>
              )}
            </div>

            {activeAssignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                <p>Chưa có nhân viên nào được phân công phụ trách khu vực này.</p>
                {isOwner && (
                  <button type="button" className="action-button" onClick={() => setIsAssignStaffOpen(true)}>
                    + Phân công nhân sự
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeAssignments.map((asgn) => (
                  <div
                    key={asgn.assignmentId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>
                        👤 {asgn.staffName || `Nhân viên #${asgn.farmMemberId}`}
                      </strong>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        {asgn.jobTitle || 'Nhân viên kỹ thuật'} · Ngày phân công:{' '}
                        {new Date(asgn.assignedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        className="action-button danger"
                        style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => setAssignmentToCancel(asgn)}
                      >
                        Hủy phân công
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: BLOCKS (Cố định Zone hiện tại)
         ========================================================= */}
      {activeTab === 'blocks' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field" style={{ flex: '1.5 1 280px' }}>
              <span>
                Tìm kiếm lô đất trong {zone.zoneName}
                <small style={{ color: '#059669', fontWeight: 700 }}>Cố định khu vực</small>
              </span>
              <input
                id="zone-blocks-search"
                type="search"
                placeholder="Tìm theo tên hoặc mã lô đất (VD: Lô B01, BLK-001)..."
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
              />
            </label>

            <button
              type="button"
              className="action-button"
              onClick={() => setBlockSearch('')}
              style={{ height: '46px' }}
            >
              Đặt lại bộ lọc
            </button>

            {isOwner && (
              <button
                type="button"
                className="primary-button"
                style={{ height: '46px' }}
                onClick={() => {
                  setBlockToEdit(null);
                  setIsBlockModalOpen(true);
                }}
              >
                <Icon name="plus" /> Thêm lô đất
              </button>
            )}
          </div>

          {filteredBlocks.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🌿</div>
              <h2>Phân khu chưa có lô đất nào</h2>
              <p>
                {isOwner
                  ? `Nhấn "Thêm lô đất" để thêm lô sản xuất vào ${zone.zoneName}.`
                  : 'Không tìm thấy lô đất nào khớp với từ khóa tìm kiếm.'}
              </p>
              {isOwner && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setBlockToEdit(null);
                    setIsBlockModalOpen(true);
                  }}
                >
                  <Icon name="plus" /> Thêm lô đất
                </button>
              )}
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Danh sách lô sản xuất thuộc {zone.zoneName}</span>
                  <h2 style={{ margin: '4px 0 0' }}>Lô đất ({filteredBlocks.length})</h2>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setBlockToEdit(null);
                      setIsBlockModalOpen(true);
                    }}
                  >
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
                      <th>Mô tả &amp; Loại đất</th>
                      <th style={{ textAlign: 'center' }}>Diện tích</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlocks.map((b) => (
                      <tr key={b.blockId}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="module-code" style={{ alignSelf: 'flex-start' }}>
                              BLK-{String(b.blockId).padStart(3, '0')}
                            </span>
                            {/* Quick-preview trigger keeping aria-label="Xem chi tiết ${b.blockName}" for tests/block-detail.test.mjs */}
                            <button
                              type="button"
                              aria-label={`Xem chi tiết ${b.blockName}`}
                              onClick={() => setBlockToView(b.blockId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                fontWeight: 750,
                                fontSize: '15.5px',
                                color: '#0f172a',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              {b.blockName}
                            </button>
                          </div>
                        </td>

                        <td>
                          <span className="knowledge-tag">🗺️ {zone.zoneName}</span>
                        </td>

                        <td style={{ maxWidth: '320px', color: '#475569', lineHeight: 1.5 }}>
                          <div>{b.description || 'Lô sản xuất nông nghiệp trong khu vực.'}</div>
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
                          <div className="table-action-btns">
                            <Link
                              to={`/zones/${zone.zoneId}/blocks/${b.blockId}`}
                              className="table-icon-btn primary"
                              title="Xem chi tiết lô đất"
                              aria-label={`Xem chi tiết ${b.blockName}`}
                            >
                              <Icon name="eye" size={16} />
                            </Link>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title="Chỉnh sửa lô đất"
                              aria-label={`Chỉnh sửa ${b.blockName}`}
                              onClick={() => {
                                setBlockToEdit(b);
                                setIsBlockModalOpen(true);
                              }}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn condition"
                              title="Ghi nhận điều kiện đất / nước"
                              aria-label={`Ghi nhận điều kiện cho ${b.blockName}`}
                              onClick={() => {
                                setConditionBlock({ ...b, zoneName: zone.zoneName });
                                setIsRecordConditionOpen(true);
                              }}
                            >
                              <Icon name="activity" size={16} />
                            </button>
                            {isOwner && (
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title="Xóa lô đất"
                                aria-label={`Xóa ${b.blockName}`}
                                onClick={() => setBlockToDelete(b)}
                              >
                                <Icon name="trash" size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: RISK RECORDS
         ========================================================= */}
      {activeTab === 'risks' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <div>
              <span className="eyebrow">Đánh giá rủi ro vùng sản xuất</span>
              <h2 style={{ margin: '4px 0 0' }}>Hồ sơ rủi ro khu vực ({riskRecords.length})</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                Rủi ro vùng sản xuất và biện pháp kiểm soát gắn trực tiếp với {zone.zoneName}
              </p>
            </div>
            <button type="button" className="primary-button" onClick={openAddRiskModal}>
              <Icon name="plus" /> Thêm ghi nhận rủi ro
            </button>
          </div>

          <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ngày đánh giá</th>
                  <th>Loại rủi ro &amp; Mô tả</th>
                  <th style={{ textAlign: 'center' }}>Mức độ rủi ro</th>
                  <th>Biện pháp kiểm soát</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {riskRecords.map((r) => (
                  <tr key={r.riskId}>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.assessedAt}</td>
                    <td style={{ maxWidth: '280px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>{r.riskType}</strong>
                      <span style={{ fontSize: '13.5px', color: '#475569' }}>{r.description}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="knowledge-tag">{r.riskLevel}</span>
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                      {r.controlMeasures}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div className="zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="action-button"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => openEditRiskModal(r, 'view')}
                        >
                          Xem chi tiết
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ padding: '8px 14px', fontSize: '13px' }}
                          onClick={() => openEditRiskModal(r, 'edit')}
                        >
                          Cập nhật biện pháp
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS
         ========================================================= */}
      {blockToView !== null && (
        <BlockDetailModal blockId={blockToView} onClose={() => setBlockToView(null)} />
      )}

      {riskModalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Đánh giá rủi ro · {zone.zoneName}</span>
                <h2>
                  {riskModalMode === 'create'
                    ? 'Thêm ghi nhận rủi ro'
                    : riskModalMode === 'edit'
                    ? 'Cập nhật biện pháp kiểm soát'
                    : 'Chi tiết hồ sơ rủi ro'}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setRiskModalMode(null)}>
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveRiskRecord}>
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    Khu vực áp dụng
                  </span>
                  <span className="structured-field-badge">Cố định</span>
                </div>
                <strong style={{ color: '#047857' }}>🗺️ {zone.zoneName} · {farmName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Ngày đánh giá</span>
                    <span className="structured-field-badge">Ngày</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      value={riskForm.assessedAt}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) => setRiskForm({ ...riskForm, assessedAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Mức độ rủi ro</span>
                    <span className="structured-field-badge">Mức độ</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select
                      value={riskForm.riskLevel}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })
                      }
                    >
                      <option value="LOW">Thấp</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HIGH">Cao</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Loại rủi ro</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    value={riskForm.riskType}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, riskType: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Phát hiện trước đây</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={riskForm.priorFindings}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, priorFindings: e.target.value })}
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Mô tả nguy cơ rủi ro</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={riskForm.description}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Biện pháp kiểm soát</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={3}
                    value={riskForm.controlMeasures}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, controlMeasures: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setRiskModalMode(null)}>
                  {riskModalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>
                {riskModalMode !== 'view' && (
                  <button type="submit" className="primary-button">
                    {riskModalMode === 'create' ? 'Lưu ghi nhận' : 'Lưu biện pháp'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ZoneModal
        isOpen={isEditZoneOpen}
        mode="edit"
        farmId={farmId}
        farmName={farmName}
        initialZone={zone}
        onClose={() => setIsEditZoneOpen(false)}
        onSuccess={(updated) => {
          setZone(updated);
          showToast(`Đã cập nhật khu vực "${updated.zoneName}" thành công!`);
        }}
      />

      <BlockModal
        isOpen={isBlockModalOpen}
        mode={blockToEdit ? 'edit' : 'create'}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        lockZone={true}
        initialBlock={blockToEdit}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={(saved) => {
          if (blockToEdit) {
            setBlocks((prev) => prev.map((b) => (b.blockId === saved.blockId ? saved : b)));
            showToast(`Đã cập nhật lô đất "${saved.blockName}" thành công!`);
          } else {
            setBlocks((prev) => [saved, ...prev]);
            showToast(`Đã tạo mới lô đất "${saved.blockName}" trong ${zone.zoneName}!`);
          }
        }}
      />

      <AssignStaffModal
        isOpen={isAssignStaffOpen}
        farmId={farmId}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        onClose={() => setIsAssignStaffOpen(false)}
        onSuccess={(newAssign) => {
          setAssignments((prev) => [newAssign, ...prev]);
          showToast(`Đã phân công "${newAssign.staffName || 'nhân viên'}" vào ${zone.zoneName}!`);
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={conditionBlock}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs: BlockConditionObservation) => {
          showToast(`Đã lưu hồ sơ điều kiện (${obs.conditionType})!`);
        }}
      />

      <ConfirmDialog
        open={isDeleteZoneOpen}
        title="Xác nhận xóa khu vực"
        description={`Bạn có chắc chắn muốn xóa khu vực "${zone.zoneName}"?`}
        confirmLabel="Xóa khu vực"
        tone="danger"
        onClose={() => setIsDeleteZoneOpen(false)}
        onConfirm={handleConfirmDeleteZone}
      />

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Xác nhận xóa lô đất"
        description={`Bạn có chắc chắn muốn xóa lô đất "${blockToDelete?.blockName}" khỏi ${zone.zoneName}?`}
        confirmLabel="Xóa lô đất"
        tone="danger"
        onClose={() => setBlockToDelete(null)}
        onConfirm={handleConfirmDeleteBlock}
      />

      <ConfirmDialog
        open={Boolean(assignmentToCancel)}
        title="Thu hồi phân công nhân sự"
        description={`Thu hồi phân công của "${assignmentToCancel?.staffName || 'nhân viên'}" tại ${zone.zoneName}?`}
        confirmLabel="Thu hồi"
        tone="danger"
        onClose={() => setAssignmentToCancel(null)}
        onConfirm={handleConfirmUnassign}
      />
    </section>
  );
}

export const ProudctionAreaDetailPage = ZoneDetailPage;
export const ProductionAreaDetailPage = ZoneDetailPage;
