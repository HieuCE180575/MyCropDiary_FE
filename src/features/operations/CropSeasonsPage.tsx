import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import {
  fetchCropCategories,
  fetchCropSeasonsByFarm,
  fetchCropSeasonDetail,
  createCropSeason,
  updateCropSeason,
  updateCropSeasonStatus,
  deleteCropSeason,
  fetchBlocksInSeason,
  assignBlockToSeason,
  removeBlockFromSeason,
  type CropCategoryResp,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';
import { fetchBlocks } from '../production/zoneBlockService';
import type { Block } from '../production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

export function CropSeasonsPage() {
  const navigate = useNavigate();
  const { cropSeasonId: paramSeasonId } = useParams<{ cropSeasonId?: string }>();
  const detailSeasonId = paramSeasonId ? parseInt(paramSeasonId, 10) : null;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm #${farmId}`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<CropSeasonResp | null>(null);
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [allFarmBlocks, setAllFarmBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CropCategoryResp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters: Search Crop Seasons, Season Category, Status
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create / Edit Crop Season Modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [formValues, setFormValues] = useState({
    seasonName: '',
    cropCategoryId: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    seasonStatus: 'active',
    blockId: 0,
    plantedArea: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Assign Block to Season Modal
  const [isAssignBlockOpen, setIsAssignBlockOpen] = useState(false);
  const [assignBlockForm, setAssignBlockForm] = useState({
    blockId: 0,
    plantedArea: '',
    areaUnit: 'm2',
    plantedAt: new Date().toISOString().split('T')[0],
    expectedHarvestAt: '',
  });

  // Delete Season Dialog
  const [seasonToDelete, setSeasonToDelete] = useState<CropSeasonResp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, detailSeasonId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadData(true);
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadData(silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [catList, blocksList] = await Promise.all([
        fetchCropCategories(),
        fetchBlocks(farmId).catch(() => []),
      ]);
      setCategories(catList);
      setAllFarmBlocks(blocksList);

      if (detailSeasonId) {
        const [detail, assignedBlocks] = await Promise.all([
          fetchCropSeasonDetail(detailSeasonId),
          fetchBlocksInSeason(detailSeasonId).catch(() => []),
        ]);
        setSelectedSeason(detail);
        setSeasonBlocks(assignedBlocks);
      } else {
        const list = await fetchCropSeasonsByFarm(farmId);
        setSeasons(list);
        setSelectedSeason(null);
      }
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu mùa vụ canh tác.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const filteredSeasons = useMemo(() => {
    return seasons.filter((s) => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        s.seasonName.toLowerCase().includes(kw) ||
        Boolean(s.cropCategoryName && s.cropCategoryName.toLowerCase().includes(kw)) ||
        Boolean(s.notes && s.notes.toLowerCase().includes(kw));
      const matchCat = categoryFilter === 'all' || String(s.cropCategoryId) === categoryFilter;
      const matchStatus =
        statusFilter === 'all' || (s.seasonStatus || '').toLowerCase() === statusFilter.toLowerCase();
      return matchKw && matchCat && matchStatus;
    });
  }, [seasons, searchKeyword, categoryFilter, statusFilter]);

  const openCreateModal = () => {
    setFormValues({
      seasonName: '',
      cropCategoryId: categories[0]?.id || 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      seasonStatus: 'active',
      blockId: allFarmBlocks[0]?.blockId || 0,
      plantedArea: String(allFarmBlocks[0]?.areaValue || ''),
      notes: '',
    });
    setModalMode('create');
  };

  const openEditModal = (season: CropSeasonResp) => {
    setSelectedSeason(season);
    setFormValues({
      seasonName: season.seasonName,
      cropCategoryId: season.cropCategoryId || categories[0]?.id || 1,
      startDate: season.startDate || new Date().toISOString().split('T')[0],
      endDate: season.endDate || '',
      seasonStatus: season.seasonStatus || 'active',
      blockId: 0,
      plantedArea: '',
      notes: season.notes || '',
    });
    setModalMode('edit');
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const created = await createCropSeason(farmId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId),
          startDate: formValues.startDate,
          endDate: formValues.endDate || null,
          seasonStatus: formValues.seasonStatus,
          notes: formValues.notes || null,
        });
        if (formValues.blockId) {
          await assignBlockToSeason(created.cropSeasonId, {
            blockId: Number(formValues.blockId),
            plantedArea: parseFloat(formValues.plantedArea) || 100,
            areaUnit: 'm2',
            plantedAt: formValues.startDate,
            expectedHarvestAt: formValues.endDate || null,
          }).catch(() => null);
        }
        setSeasons((prev) => [created, ...prev]);
        showToast(`Khởi tạo mùa vụ "${created.seasonName}" thành công.`);
      } else if (modalMode === 'edit' && selectedSeason) {
        const updated = await updateCropSeason(selectedSeason.cropSeasonId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId),
          startDate: formValues.startDate,
          endDate: formValues.endDate || null,
          notes: formValues.notes || null,
        });
        if (detailSeasonId) {
          setSelectedSeason(updated);
        } else {
          setSeasons((prev) => prev.map((s) => (s.cropSeasonId === updated.cropSeasonId ? updated : s)));
        }
        showToast(`Cập nhật mùa vụ "${updated.seasonName}" thành công.`);
      }
      setModalMode(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu thông tin mùa vụ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (seasonId: number, nextStatus: string) => {
    try {
      const updated = await updateCropSeasonStatus(seasonId, nextStatus);
      if (detailSeasonId) {
        setSelectedSeason(updated);
      } else {
        setSeasons((prev) => prev.map((s) => (s.cropSeasonId === seasonId ? updated : s)));
      }
      const label =
        nextStatus === 'completed'
          ? 'Đã hoàn thành'
          : nextStatus === 'active'
          ? 'Đang canh tác'
          : nextStatus === 'cancelled'
          ? 'Đã hủy'
          : 'Dự kiến';
      showToast(`Đã chuyển trạng thái mùa vụ sang: ${label}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái mùa vụ.', 'error');
    }
  };

  const handleAssignBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeason || !assignBlockForm.blockId) return;
    try {
      const added = await assignBlockToSeason(selectedSeason.cropSeasonId, {
        blockId: Number(assignBlockForm.blockId),
        plantedArea: parseFloat(assignBlockForm.plantedArea) || 100,
        areaUnit: assignBlockForm.areaUnit || 'm2',
        plantedAt: assignBlockForm.plantedAt || selectedSeason.startDate,
        expectedHarvestAt: assignBlockForm.expectedHarvestAt || selectedSeason.endDate || null,
      });
      setSeasonBlocks((prev) => [...prev, added]);
      setIsAssignBlockOpen(false);
      showToast(`Đã gán lô đất "${added.blockName || 'Lô #' + added.blockId}" vào mùa vụ ${selectedSeason.seasonName}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể gán lô đất vào mùa vụ.', 'error');
    }
  };

  const handleRemoveBlockFromSeason = async (blockId: number) => {
    if (!selectedSeason) return;
    try {
      await removeBlockFromSeason(selectedSeason.cropSeasonId, blockId);
      setSeasonBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
      showToast('Đã gỡ lô đất khỏi mùa vụ canh tác.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể gỡ lô đất khỏi mùa vụ.', 'error');
    }
  };

  const handleConfirmDeleteSeason = async () => {
    if (!seasonToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCropSeason(seasonToDelete.cropSeasonId);
      setSeasons((prev) => prev.filter((s) => s.cropSeasonId !== seasonToDelete.cropSeasonId));
      showToast(`Đã xóa mùa vụ "${seasonToDelete.seasonName}" thành công.`);
      setSeasonToDelete(null);
      if (detailSeasonId) {
        navigate('/crop-seasons');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa mùa vụ này.', 'error');
      setSeasonToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================
  // VIEW 1: CROP SEASON DETAILS (/crop-seasons/:cropSeasonId)
  // =========================================================
  if (detailSeasonId) {
    if (loading) {
      return (
        <div className="farm-registration-page">
          <div className="panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p className="muted">Đang tải chi tiết mùa vụ canh tác...</p>
          </div>
        </div>
      );
    }

    if (error || !selectedSeason) {
      return (
        <div className="farm-registration-page">
          <div className="alert-error" role="alert">
            <div>
              <strong>Không tìm thấy thông tin mùa vụ</strong>
              <p style={{ margin: '4px 0 0' }}>{error || `Mùa vụ #${detailSeasonId} không tồn tại.`}</p>
            </div>
            <Link to="/crop-seasons" className="primary-button" style={{ textDecoration: 'none' }}>
              Quay lại danh sách mùa vụ
            </Link>
          </div>
        </div>
      );
    }

    const primaryBlock = seasonBlocks[0];

    return (
      <div className="farm-registration-page">
        {notification && (
          <div className={notification.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
            <span>{notification.text}</span>
            <button type="button" className="ghost-button" onClick={() => setNotification(null)}>
              ✕
            </button>
          </div>
        )}

        {/* Full Hierarchy Breadcrumb: Zone List → Zone Details → Block Details → Crop Season Details */}
        <nav className="production-breadcrumb" aria-label="Breadcrumb">
          <Link to="/zones">Khu vực sản xuất</Link>
          {primaryBlock?.zoneId && (
            <>
              <span className="sep">→</span>
              <Link to={`/zones/${primaryBlock.zoneId}`}>
                {primaryBlock.zoneName || `Khu #${primaryBlock.zoneId}`}
              </Link>
            </>
          )}
          {primaryBlock?.blockId && (
            <>
              <span className="sep">→</span>
              <Link to={`/zones/${primaryBlock.zoneId || 1}/blocks/${primaryBlock.blockId}`}>
                {primaryBlock.blockName || `Lô #${primaryBlock.blockId}`}
              </Link>
            </>
          )}
          <span className="sep">→</span>
          <span className="current">{selectedSeason.seasonName}</span>
        </nav>

        <div className="page-heading">
          <div>
            <p className="eyebrow">
              Chi tiết mùa vụ · CS-{String(selectedSeason.cropSeasonId).padStart(3, '0')} · {selectedSeason.farmName || farmName}
            </p>
            <h2>{selectedSeason.seasonName}</h2>
            <p className="muted">
              {selectedSeason.notes || 'Hồ sơ chi tiết mùa vụ canh tác và các lô sản xuất trực thuộc.'}
            </p>
          </div>

          <div className="dashboard-actions">
            {primaryBlock ? (
              <Link
                to={`/zones/${primaryBlock.zoneId || 1}/blocks/${primaryBlock.blockId}`}
                className="action-button"
                style={{ textDecoration: 'none' }}
              >
                <Icon name="arrow-left" size={16} /> Quay lại chi tiết lô đất
              </Link>
            ) : (
              <Link to="/crop-seasons" className="action-button" style={{ textDecoration: 'none' }}>
                <Icon name="arrow-left" size={16} /> Quay lại danh sách mùa vụ
              </Link>
            )}
            <button type="button" className="action-button" onClick={() => openEditModal(selectedSeason)}>
              <Icon name="edit" size={16} /> Chỉnh sửa mùa vụ
            </button>
            {selectedSeason.seasonStatus !== 'completed' && (
              <button
                type="button"
                className="primary-button"
                onClick={() => handleStatusChange(selectedSeason.cropSeasonId, 'completed')}
              >
                <Icon name="check" size={16} /> Đánh dấu hoàn thành
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                className="action-button danger"
                onClick={() => setSeasonToDelete(selectedSeason)}
              >
                <Icon name="trash" size={16} /> Xóa mùa vụ
              </button>
            )}
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="zone-stats-grid" style={{ marginBottom: 0 }}>
          <div className="zone-stat-card">
            <div className="zone-stat-icon">
              <Icon name="sprout" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Danh mục cây trồng</h4>
              <strong className="stat-number" style={{ fontSize: '1.1rem' }}>
                {selectedSeason.cropCategoryName || `Nhóm #${selectedSeason.cropCategoryId}`}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--blue">
              <Icon name="calendar" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Thời gian canh tác</h4>
              <strong className="stat-number" style={{ fontSize: '1rem' }}>
                {selectedSeason.startDate} → {selectedSeason.endDate || 'Đang diễn ra'}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--amber">
              <Icon name="plots" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Lô đất tham gia</h4>
              <strong className="stat-number">{seasonBlocks.length} lô</strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--purple">
              <Icon name="check" size={20} />
            </div>
            <div className="zone-stat-content">
              <h4>Trạng thái mùa vụ</h4>
              <strong className="stat-number" style={{ textTransform: 'uppercase', fontSize: '1.1rem' }}>
                {selectedSeason.seasonStatus}
              </strong>
            </div>
          </div>
        </div>

        <div className="content-grid">
          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Hồ sơ mùa vụ</p>
                <h3>Thông tin chi tiết mùa vụ</h3>
              </div>
              <span className="status-badge active" style={{ textTransform: 'uppercase' }}>
                {selectedSeason.seasonStatus}
              </span>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Mã định danh mùa vụ</dt>
                <dd>#{selectedSeason.cropSeasonId} (CS-{String(selectedSeason.cropSeasonId).padStart(3, '0')})</dd>
              </div>
              <div>
                <dt>Tên mùa vụ</dt>
                <dd>{selectedSeason.seasonName}</dd>
              </div>
              <div>
                <dt>Danh mục cây trồng</dt>
                <dd>{selectedSeason.cropCategoryName || `Nhóm #${selectedSeason.cropCategoryId}`}</dd>
              </div>
              <div>
                <dt>Trang trại trực thuộc</dt>
                <dd>{selectedSeason.farmName || farmName}</dd>
              </div>
              <div>
                <dt>Thời gian canh tác</dt>
                <dd>{selectedSeason.startDate} → {selectedSeason.endDate || 'Đang diễn ra'}</dd>
              </div>
              <div>
                <dt>Người khởi tạo</dt>
                <dd>{selectedSeason.createdByFullName || 'Ban quản lý trang trại'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>Ghi chú mùa vụ</dt>
                <dd>{selectedSeason.notes || 'Không có ghi chú bổ sung.'}</dd>
              </div>
            </dl>
          </article>

          {/* Cultivated Blocks in this Crop Season */}
          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Lô canh tác tham gia mùa vụ</p>
                <h3>Lô sản xuất tham gia mùa vụ ({seasonBlocks.length})</h3>
              </div>
              <div className="button-row">
                <Link to="/activities" className="action-button" style={{ textDecoration: 'none' }}>
                  Nhật ký canh tác
                </Link>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const firstBlk = allFarmBlocks[0];
                    setAssignBlockForm({
                      blockId: firstBlk?.blockId || 0,
                      plantedArea: String(firstBlk?.areaValue || 500),
                      areaUnit: firstBlk?.areaUnit || 'm2',
                      plantedAt: selectedSeason.startDate,
                      expectedHarvestAt: selectedSeason.endDate || '',
                    });
                    setIsAssignBlockOpen(true);
                  }}
                >
                  <Icon name="plus" size={16} /> Gán lô đất
                </button>
              </div>
            </div>

            {seasonBlocks.length === 0 ? (
              <div className="zone-empty-hero" style={{ padding: '32px 20px' }}>
                <p className="muted">Chưa có lô đất nào được gán vào mùa vụ này.</p>
              </div>
            ) : (
              <div className="zone-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên lô đất</th>
                      <th>Khu vực</th>
                      <th>Diện tích gieo trồng</th>
                      <th>Ngày gieo → Dự kiến thu hoạch</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonBlocks.map((sb) => (
                      <tr key={sb.blockId}>
                        <td>
                          <Link
                            to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                            style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {sb.blockName || `Lô #${sb.blockId}`}
                          </Link>
                        </td>
                        <td>
                          <Link
                            to={`/zones/${sb.zoneId || 1}`}
                            style={{ color: 'var(--brand-dark)', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {sb.zoneName || `Khu #${sb.zoneId}`}
                          </Link>
                        </td>
                        <td>
                          <strong>
                            {sb.plantedArea ?? sb.blockArea} {sb.areaUnit || sb.blockAreaUnit || 'm²'}
                          </strong>
                        </td>
                        <td className="muted">
                          {sb.plantedAt || selectedSeason.startDate} → {sb.expectedHarvestAt || selectedSeason.endDate || 'Đang diễn ra'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                              className="primary-button"
                              style={{ padding: '7px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
                            >
                              Xem chi tiết lô đất
                            </Link>
                            {isOwner && (
                              <button
                                type="button"
                                className="danger-button"
                                style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                                onClick={() => handleRemoveBlockFromSeason(sb.blockId)}
                              >
                                Gỡ bỏ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        {/* Assign Block Modal */}
        {isAssignBlockOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsAssignBlockOpen(false)}>
            <div className="modal-card" style={{ width: 'min(580px, 100%)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow">Phân công lô đất canh tác</span>
                  <h2>Gán lô đất vào: {selectedSeason.seasonName}</h2>
                </div>
                <button type="button" className="modal-close" onClick={() => setIsAssignBlockOpen(false)} aria-label="Đóng">
                  ✕
                </button>
              </div>

              <form className="modal-body" onSubmit={handleAssignBlock} noValidate>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="assign-block-select" className="structured-field-label">
                      Lô sản xuất mục tiêu <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">Trang trại {farmName}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select
                      id="assign-block-select"
                      value={assignBlockForm.blockId}
                      onChange={(e) => setAssignBlockForm({ ...assignBlockForm, blockId: Number(e.target.value) })}
                    >
                      {allFarmBlocks.map((b) => (
                        <option key={b.blockId} value={b.blockId}>
                          {b.blockName} ({b.zoneName || `Khu #${b.zoneId}`} - {b.areaValue} {b.areaUnit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="assign-block-area" className="structured-field-label">
                      Diện tích gieo trồng (m²) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">Số dương</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="assign-block-area"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="VD: 500"
                      value={assignBlockForm.plantedArea}
                      onChange={(e) => setAssignBlockForm({ ...assignBlockForm, plantedArea: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="assign-block-planted-at" className="structured-field-label">
                        Ngày xuống giống
                      </label>
                      <span className="structured-field-badge">Ngày</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        id="assign-block-planted-at"
                        type="date"
                        value={assignBlockForm.plantedAt}
                        onChange={(e) => setAssignBlockForm({ ...assignBlockForm, plantedAt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="assign-block-harvest-at" className="structured-field-label">
                        Dự kiến thu hoạch
                      </label>
                      <span className="structured-field-badge">Tùy chọn</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        id="assign-block-harvest-at"
                        type="date"
                        value={assignBlockForm.expectedHarvestAt}
                        onChange={(e) => setAssignBlockForm({ ...assignBlockForm, expectedHarvestAt: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                  <button type="button" className="ghost-button" onClick={() => setIsAssignBlockOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="primary-button">
                    Gán lô đất
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={Boolean(seasonToDelete)}
          title="Xác nhận xóa mùa vụ"
          description={`Bạn có chắc chắn muốn xóa mùa vụ "${seasonToDelete?.seasonName}"? Hành động này sẽ loại bỏ hồ sơ mùa vụ nếu chưa có phát sinh nhật ký liên quan.`}
          confirmLabel="Xóa mùa vụ"
          cancelLabel="Hủy"
          tone="danger"
          loading={isDeleting}
          onConfirm={handleConfirmDeleteSeason}
          onClose={() => setSeasonToDelete(null)}
        />
      </div>
    );
  }

  // =========================================================
  // VIEW 2: CROP SEASONS LIST (/crop-seasons)
  // =========================================================
  return (
    <div className="farm-registration-page">
      {notification && (
        <div className={notification.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
          <span>{notification.text}</span>
          <button type="button" className="ghost-button" onClick={() => setNotification(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="page-heading">
        <div>
          <p className="eyebrow">Mùa vụ canh tác · {farmName}</p>
          <h2>Mùa vụ canh tác</h2>
          <p className="muted">
            Quản lý các chu kỳ mùa vụ theo danh mục cây trồng và theo dõi tiến độ sản xuất trên từng lô đất.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/harvests" className="action-button" style={{ textDecoration: 'none' }}>
            <Icon name="package" size={16} /> Mở Thu hoạch &amp; truy xuất
          </Link>
          <button type="button" className="primary-button" onClick={openCreateModal}>
            <Icon name="plus" size={16} /> Thêm mùa vụ
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="zone-stats-grid">
        <div className="zone-stat-card">
          <div className="zone-stat-icon">
            <Icon name="calendar" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Tổng số mùa vụ</h4>
            <strong className="stat-number">
              {seasons.length} <span className="stat-unit">vụ</span>
            </strong>
          </div>
        </div>
        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--blue">
            <Icon name="sprout" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Đang canh tác</h4>
            <strong className="stat-number">
              {seasons.filter((s) => (s.seasonStatus || '').toLowerCase() === 'active').length}{' '}
              <span className="stat-unit">vụ</span>
            </strong>
          </div>
        </div>
        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--amber">
            <Icon name="plots" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Danh mục cây trồng</h4>
            <strong className="stat-number">
              {categories.length} <span className="stat-unit">nhóm</span>
            </strong>
          </div>
        </div>
        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--purple">
            <Icon name="check" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Đã hoàn thành</h4>
            <strong className="stat-number">
              {seasons.filter((s) => (s.seasonStatus || '').toLowerCase() === 'completed').length}{' '}
              <span className="stat-unit">vụ</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Filters: Search Crop Seasons, Season Category, Status, Reset Filters */}
      <div className="production-filter-panel">
        <div className="filter-group" style={{ flex: '1.5 1 280px' }}>
          <label htmlFor="cs-list-search" className="filter-label">
            Tìm kiếm mùa vụ
          </label>
          <div className="filter-input-wrap">
            <span className="filter-icon">🔍</span>
            <input
              id="cs-list-search"
              type="search"
              placeholder="Tìm theo tên mùa vụ hoặc cây trồng..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group" style={{ flex: '1 1 240px' }}>
          <label htmlFor="cs-list-cat" className="filter-label">
            Danh mục cây trồng
          </label>
          <select
            id="cs-list-cat"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục cây trồng</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ flex: '1 1 200px' }}>
          <label htmlFor="cs-list-status" className="filter-label">
            Trạng thái canh tác
          </label>
          <select
            id="cs-list-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="planned">Dự kiến</option>
            <option value="active">Đang canh tác</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {(searchKeyword || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() => {
              setSearchKeyword('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          >
            ✕ Đặt lại bộ lọc
          </button>
        )}
      </div>

      {loading ? (
        <div className="panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="muted">Đang tải danh sách mùa vụ...</p>
        </div>
      ) : filteredSeasons.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📅</div>
          <h2>Danh sách mùa vụ chưa được kết nối hoặc chưa có dữ liệu</h2>
          <p>
            Nhấn &quot;Thêm mùa vụ&quot; để khởi tạo mùa vụ canh tác mới, hoặc tra cứu theo mã mùa vụ tại mục Thu hoạch &amp; truy xuất.
          </p>
          <div className="button-row" style={{ justifyContent: 'center' }}>
            <Link to="/harvests" className="action-button" style={{ textDecoration: 'none' }}>
              Mở Thu hoạch &amp; truy xuất
            </Link>
            {isOwner && (
              <button type="button" className="primary-button" onClick={openCreateModal}>
                <Icon name="plus" size={16} /> Thêm mùa vụ
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: '24px' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <div>
              <span className="eyebrow">Danh sách mùa vụ canh tác</span>
              <h2 style={{ margin: '4px 0 0' }}>Mùa vụ ({filteredSeasons.length})</h2>
            </div>
            {isOwner && (
              <button type="button" className="primary-button" onClick={openCreateModal}>
                <Icon name="plus" size={16} /> Thêm mùa vụ
              </button>
            )}
          </div>

          <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã &amp; Tên mùa vụ</th>
                  <th>Danh mục cây trồng</th>
                  <th>Thời gian canh tác</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeasons.map((s) => (
                  <tr key={s.cropSeasonId}>
                    <td>
                      <Link
                        to={`/crop-seasons/${s.cropSeasonId}`}
                        style={{
                          fontWeight: 700,
                          color: '#047857',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14.5px',
                        }}
                      >
                        🌾 {s.seasonName}
                      </Link>
                      <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                        CS-{String(s.cropSeasonId).padStart(3, '0')}
                      </small>
                    </td>
                    <td>
                      <span className="knowledge-tag">
                        {s.cropCategoryName || 'Cây trồng chung'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong>{s.startDate}</strong>
                      <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>
                      <span>{s.endDate || 'Đang diễn ra'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`status-badge ${
                          s.seasonStatus === 'active'
                            ? 'active'
                            : s.seasonStatus === 'completed'
                            ? 'active'
                            : s.seasonStatus === 'cancelled'
                            ? 'inactive'
                            : 'pending'
                        }`}
                      >
                        {s.seasonStatus === 'active'
                          ? 'Đang canh tác'
                          : s.seasonStatus === 'completed'
                          ? 'Đã hoàn thành'
                          : s.seasonStatus === 'cancelled'
                          ? 'Đã hủy'
                          : 'Dự kiến'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <Link
                          to={`/harvests?seasonId=${s.cropSeasonId}`}
                          className="action-button"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px', textDecoration: 'none' }}
                        >
                          📦 Thu hoạch
                        </Link>
                        <button
                          type="button"
                          className="action-button"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => navigate(`/crop-seasons/${s.cropSeasonId}`)}
                        >
                          Xem chi tiết
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            className="action-button"
                            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => openEditModal(s)}
                          >
                            Chỉnh sửa
                          </button>
                        )}
                        {isOwner && (
                          <button
                            type="button"
                            className="action-button danger"
                            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => setSeasonToDelete(s)}
                          >
                            Xóa
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

      {/* Create / Edit Crop Season Modal */}
      {modalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setModalMode(null)}>
          <div className="modal-card" style={{ width: 'min(680px, 100%)', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Hồ sơ mùa vụ</span>
                <h2>{modalMode === 'create' ? 'Tạo mùa vụ mới' : 'Cập nhật mùa vụ'}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setModalMode(null)} aria-label="Đóng">
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveSeason} noValidate>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-name" className="structured-field-label">
                    Tên mùa vụ <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">
                    {formValues.seasonName.length}/120 ký tự
                  </span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    id="modal-cs-name"
                    type="text"
                    maxLength={120}
                    placeholder="VD: Vụ Dưa lưới Mùa Xuân 2026, Vụ Cải Xanh VietGAP..."
                    value={formValues.seasonName}
                    onChange={(e) => setFormValues({ ...formValues, seasonName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-cat" className="structured-field-label">
                    Danh mục cây trồng <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">Tiêu chuẩn VietGAP</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <select
                    id="modal-cs-cat"
                    value={formValues.cropCategoryId}
                    onChange={(e) => setFormValues({ ...formValues, cropCategoryId: Number(e.target.value) })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalMode === 'create' && allFarmBlocks.length > 0 && (
                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="modal-cs-block" className="structured-field-label">
                        Lô sản xuất ban đầu
                      </label>
                      <span className="structured-field-badge">Tùy chọn</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <select
                        id="modal-cs-block"
                        value={formValues.blockId}
                        onChange={(e) => setFormValues({ ...formValues, blockId: Number(e.target.value) })}
                      >
                        {allFarmBlocks.map((b) => (
                          <option key={b.blockId} value={b.blockId}>
                            {b.blockName} ({b.zoneName || `Khu #${b.zoneId}`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="modal-cs-area" className="structured-field-label">
                        Diện tích gieo trồng (m²)
                      </label>
                      <span className="structured-field-badge">Số dương</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        id="modal-cs-area"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="VD: 500"
                        value={formValues.plantedArea}
                        onChange={(e) => setFormValues({ ...formValues, plantedArea: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="modal-cs-start" className="structured-field-label">
                      Ngày bắt đầu <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">Bắt buộc</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="modal-cs-start"
                      type="date"
                      value={formValues.startDate}
                      onChange={(e) => setFormValues({ ...formValues, startDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="modal-cs-end" className="structured-field-label">
                      Ngày kết thúc dự kiến
                    </label>
                    <span className="structured-field-badge">Tùy chọn</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="modal-cs-end"
                      type="date"
                      value={formValues.endDate}
                      onChange={(e) => setFormValues({ ...formValues, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-notes" className="structured-field-label">
                    Ghi chú mùa vụ
                  </label>
                  <span className="structured-field-badge">{formValues.notes.length}/1000 ký tự</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    id="modal-cs-notes"
                    rows={3}
                    maxLength={1000}
                    placeholder="Mô tả mục tiêu sản lượng, giống cây hoặc ghi chú kỹ thuật chăm sóc..."
                    value={formValues.notes}
                    onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setModalMode(null)} disabled={saving}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo mùa vụ' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(seasonToDelete)}
        title="Xác nhận xóa mùa vụ"
        description={`Bạn có chắc chắn muốn xóa mùa vụ "${seasonToDelete?.seasonName}"? Hành động này sẽ loại bỏ hồ sơ mùa vụ nếu chưa có phát sinh nhật ký liên quan.`}
        confirmLabel="Xóa mùa vụ"
        cancelLabel="Hủy"
        tone="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteSeason}
        onClose={() => setSeasonToDelete(null)}
      />
    </div>
  );
}
