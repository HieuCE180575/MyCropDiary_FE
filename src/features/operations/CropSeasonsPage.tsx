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
  updateSeasonBlock,
  removeBlockFromSeason,
  type CropCategoryResp,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';
import { fetchBlocks } from '../production/zoneBlockService';
import type { Block } from '../production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

interface SelectedBlockConfig {
  blockId: number;
  plantedArea: string;
  areaUnit: string;
  plantedAt: string;
}

export function CropSeasonsPage() {
  const navigate = useNavigate();
  const { cropSeasonId: paramSeasonId } = useParams<{ cropSeasonId?: string }>();
  const detailSeasonId = paramSeasonId ? parseInt(paramSeasonId, 10) : null;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm #${farmId}`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [seasonBlocksMap, setSeasonBlocksMap] = useState<Record<number, CropSeasonBlockResp[]>>({});
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

  // Create / Edit Crop Season Modal (with Multi-Block Checkbox Selection - Cách 2)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [formValues, setFormValues] = useState({
    seasonName: '',
    cropCategoryId: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    seasonStatus: 'active',
    notes: '',
  });
  const [selectedBlockConfigs, setSelectedBlockConfigs] = useState<Record<number, SelectedBlockConfig>>({});
  const [saving, setSaving] = useState(false);

  // Assign Block to Season Modal (from Detail View)
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
        setSeasonBlocksMap((prev) => ({ ...prev, [detailSeasonId]: assignedBlocks }));
      } else {
        const list = await fetchCropSeasonsByFarm(farmId);
        setSeasons(list);
        setSelectedSeason(null);
        // Load assigned blocks for each season in parallel so the table shows N-N blocks
        const entries = await Promise.all(
          list.map(async (s) => {
            const blks = await fetchBlocksInSeason(s.cropSeasonId).catch(() => []);
            return [s.cropSeasonId, blks] as const;
          })
        );
        const nextMap: Record<number, CropSeasonBlockResp[]> = {};
        for (const [id, blks] of entries) {
          nextMap[id] = blks;
        }
        setSeasonBlocksMap(nextMap);
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
      const assigned = seasonBlocksMap[s.cropSeasonId] || [];
      const matchBlockName = assigned.some((b) => (b.blockName || '').toLowerCase().includes(kw));
      const matchKw =
        !kw ||
        s.seasonName.toLowerCase().includes(kw) ||
        Boolean(s.cropCategoryName && s.cropCategoryName.toLowerCase().includes(kw)) ||
        Boolean(s.notes && s.notes.toLowerCase().includes(kw)) ||
        matchBlockName;
      const matchCat = categoryFilter === 'all' || String(s.cropCategoryId) === categoryFilter;
      const matchStatus =
        statusFilter === 'all' || (s.seasonStatus || '').toLowerCase() === statusFilter.toLowerCase();
      return matchKw && matchCat && matchStatus;
    });
  }, [seasons, seasonBlocksMap, searchKeyword, categoryFilter, statusFilter]);

  const openCreateModal = () => {
    const defaultStart = new Date().toISOString().split('T')[0];
    setFormValues({
      seasonName: '',
      cropCategoryId: categories[0]?.id || 1,
      startDate: defaultStart,
      endDate: '',
      seasonStatus: 'active',
      notes: '',
    });
    // Pre-select the first block by default if available for user convenience
    const initialConfigs: Record<number, SelectedBlockConfig> = {};
    if (allFarmBlocks.length > 0) {
      const first = allFarmBlocks[0];
      initialConfigs[first.blockId] = {
        blockId: first.blockId,
        plantedArea: String(first.areaValue || 100),
        areaUnit: first.areaUnit || 'm2',
        plantedAt: defaultStart,
      };
    }
    setSelectedBlockConfigs(initialConfigs);
    setModalMode('create');
  };

  const openEditModal = async (season: CropSeasonResp) => {
    setSelectedSeason(season);
    const defaultStart = season.startDate || new Date().toISOString().split('T')[0];
    setFormValues({
      seasonName: season.seasonName,
      cropCategoryId: season.cropCategoryId || categories[0]?.id || 1,
      startDate: defaultStart,
      endDate: season.endDate || '',
      seasonStatus: season.seasonStatus || 'active',
      notes: season.notes || '',
    });
    const existingBlocks =
      detailSeasonId === season.cropSeasonId
        ? seasonBlocks
        : seasonBlocksMap[season.cropSeasonId] ||
          (await fetchBlocksInSeason(season.cropSeasonId).catch(() => []));
    const configs: Record<number, SelectedBlockConfig> = {};
    for (const sb of existingBlocks) {
      configs[sb.blockId] = {
        blockId: sb.blockId,
        plantedArea: String(sb.plantedArea ?? sb.blockArea ?? 100),
        areaUnit: sb.areaUnit || sb.blockAreaUnit || 'm2',
        plantedAt: sb.plantedAt || defaultStart,
      };
    }
    setSelectedBlockConfigs(configs);
    setModalMode('edit');
  };

  const toggleBlockSelection = (block: Block) => {
    setSelectedBlockConfigs((prev) => {
      const next = { ...prev };
      if (next[block.blockId]) {
        delete next[block.blockId];
      } else {
        next[block.blockId] = {
          blockId: block.blockId,
          plantedArea: String(block.areaValue || 100),
          areaUnit: block.areaUnit || 'm2',
          plantedAt: formValues.startDate || new Date().toISOString().split('T')[0],
        };
      }
      return next;
    });
  };

  const updateSelectedBlockConfig = (blockId: number, patch: Partial<SelectedBlockConfig>) => {
    setSelectedBlockConfigs((prev) => {
      if (!prev[blockId]) return prev;
      return {
        ...prev,
        [blockId]: { ...prev[blockId], ...patch },
      };
    });
  };

  const handleSelectAllBlocks = () => {
    const next: Record<number, SelectedBlockConfig> = {};
    for (const b of allFarmBlocks) {
      next[b.blockId] = selectedBlockConfigs[b.blockId] || {
        blockId: b.blockId,
        plantedArea: String(b.areaValue || 100),
        areaUnit: b.areaUnit || 'm2',
        plantedAt: formValues.startDate || new Date().toISOString().split('T')[0],
      };
    }
    setSelectedBlockConfigs(next);
  };

  const handleClearAllBlocks = () => {
    setSelectedBlockConfigs({});
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.seasonName.trim()) {
      showToast('Vui lòng nhập tên mùa vụ canh tác.', 'error');
      return;
    }
    setSaving(true);
    try {
      const chosenConfigs = Object.values(selectedBlockConfigs);

      if (modalMode === 'create') {
        // Step 1: POST /farms/{farmId}/crop-seasons
        const created = await createCropSeason(farmId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId),
          startDate: formValues.startDate,
          endDate: formValues.endDate || null,
          seasonStatus: formValues.seasonStatus,
          notes: formValues.notes || null,
        });

        // Step 2: Automatically call POST /crop-seasons/{id}/blocks for all checked blocks
        const assignedResults: CropSeasonBlockResp[] = [];
        for (const cfg of chosenConfigs) {
          const res = await assignBlockToSeason(created.cropSeasonId, {
            blockId: Number(cfg.blockId),
            plantedArea: parseFloat(cfg.plantedArea) || 100,
            areaUnit: cfg.areaUnit || 'm2',
            plantedAt: cfg.plantedAt || formValues.startDate,
            expectedHarvestAt: formValues.endDate || null,
          }).catch(() => null);
          if (res) assignedResults.push(res);
        }

        setSeasons((prev) => [created, ...prev]);
        setSeasonBlocksMap((prev) => ({ ...prev, [created.cropSeasonId]: assignedResults }));
        showToast(
          assignedResults.length > 0
            ? `Đã tạo mùa vụ "${created.seasonName}" và phân bổ vào ${assignedResults.length} lô đất!`
            : `Khởi tạo mùa vụ "${created.seasonName}" thành công.`
        );
      } else if (modalMode === 'edit' && selectedSeason) {
        const seasonId = selectedSeason.cropSeasonId;
        const updated = await updateCropSeason(seasonId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId),
          startDate: formValues.startDate,
          endDate: formValues.endDate || null,
          notes: formValues.notes || null,
        });

        // Sync N-N CropSeasonBlock assignments
        const previousBlocks =
          detailSeasonId === seasonId ? seasonBlocks : seasonBlocksMap[seasonId] || [];
        const prevMap = new Map(previousBlocks.map((b) => [b.blockId, b]));
        const nextIds = new Set(chosenConfigs.map((c) => c.blockId));

        // Remove unchecked blocks
        for (const oldBlk of previousBlocks) {
          if (!nextIds.has(oldBlk.blockId)) {
            await removeBlockFromSeason(seasonId, oldBlk.blockId).catch(() => null);
          }
        }

        // Add or update checked blocks
        for (const cfg of chosenConfigs) {
          const payload = {
            blockId: Number(cfg.blockId),
            plantedArea: parseFloat(cfg.plantedArea) || 100,
            areaUnit: cfg.areaUnit || 'm2',
            plantedAt: cfg.plantedAt || formValues.startDate,
            expectedHarvestAt: formValues.endDate || null,
          };
          if (prevMap.has(cfg.blockId)) {
            await updateSeasonBlock(seasonId, cfg.blockId, payload).catch(() => null);
          } else {
            await assignBlockToSeason(seasonId, payload).catch(() => null);
          }
        }

        const refreshedBlocks = await fetchBlocksInSeason(seasonId).catch(() => []);
        setSeasonBlocksMap((prev) => ({ ...prev, [seasonId]: refreshedBlocks }));
        if (detailSeasonId) {
          setSelectedSeason(updated);
          setSeasonBlocks(refreshedBlocks);
        } else {
          setSeasons((prev) => prev.map((s) => (s.cropSeasonId === updated.cropSeasonId ? updated : s)));
        }
        showToast(`Đã cập nhật mùa vụ "${updated.seasonName}" (${refreshedBlocks.length} lô đất áp dụng).`);
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
      setSeasonBlocks((prev) => {
        const next = [...prev.filter((b) => b.blockId !== added.blockId), added];
        setSeasonBlocksMap((m) => ({ ...m, [selectedSeason.cropSeasonId]: next }));
        return next;
      });
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
      setSeasonBlocks((prev) => {
        const next = prev.filter((b) => b.blockId !== blockId);
        setSeasonBlocksMap((m) => ({ ...m, [selectedSeason.cropSeasonId]: next }));
        return next;
      });
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

  const renderCreateEditModal = () => {
    if (!modalMode) return null;
    const selectedCount = Object.keys(selectedBlockConfigs).length;

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setModalMode(null)}>
        <div
          className="modal-card"
          style={{ width: 'min(760px, 100%)', maxHeight: '92vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <span className="eyebrow">Hồ sơ mùa vụ &amp; Phân bổ lô đất (N-N)</span>
              <h2>{modalMode === 'create' ? 'Tạo mùa vụ canh tác mới' : 'Cập nhật mùa vụ & lô đất áp dụng'}</h2>
            </div>
            <button type="button" className="modal-close" onClick={() => setModalMode(null)} aria-label="Đóng">
              ✕
            </button>
          </div>

          <form className="modal-body" onSubmit={handleSaveSeason} noValidate>
            <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-name" className="structured-field-label">
                    Tên mùa vụ <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">{formValues.seasonName.length}/120 ký tự</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    id="modal-cs-name"
                    type="text"
                    maxLength={120}
                    placeholder="VD: Vụ Dưa lưới Hè Thu 2026, Vụ Cà chua Đông Xuân..."
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
            </div>

            <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-start" className="structured-field-label">
                    Ngày bắt đầu mùa vụ <span style={{ color: '#dc2626' }}>*</span>
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

            {/* CÁCH 2: CHỌN LUÔN CÁC LÔ ĐẤT ÁP DỤNG CHO MÙA VỤ NÀY (CHECKBOX N-N) */}
            <div
              className="structured-field-card"
              style={{
                marginBottom: 0,
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
              }}
            >
              <div
                className="structured-field-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <span className="structured-field-label" style={{ fontSize: '14.5px', color: '#0f172a' }}>
                    🌱 Chọn lô đất áp dụng cho mùa vụ này (Có thể chọn 1 hoặc nhiều lô)
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Các lô được chọn sẽ được phép ghi Nhật ký canh tác, Giao việc và Thu hoạch truy xuất QR VietGAP trong vụ này.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-badge active" style={{ fontSize: '12px' }}>
                    Đã chọn {selectedCount}/{allFarmBlocks.length} lô
                  </span>
                  {allFarmBlocks.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="action-button"
                        style={{ minHeight: '28px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={handleSelectAllBlocks}
                      >
                        Chọn tất cả
                      </button>
                      {selectedCount > 0 && (
                        <button
                          type="button"
                          className="action-button"
                          style={{ minHeight: '28px', padding: '4px 10px', fontSize: '12px' }}
                          onClick={handleClearAllBlocks}
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {allFarmBlocks.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#64748b',
                  }}
                >
                  Trang trại chưa có lô đất nào. Bạn có thể tạo lô đất tại mục{' '}
                  <Link to="/zones" style={{ color: '#059669', fontWeight: 700 }}>
                    Khu sản xuất &amp; lô đất
                  </Link>{' '}
                  hoặc tạo mùa vụ trước rồi gán lô sau.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {allFarmBlocks.map((block) => {
                    const cfg = selectedBlockConfigs[block.blockId];
                    const isChecked = Boolean(cfg);

                    return (
                      <div
                        key={block.blockId}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: isChecked ? '#ecfdf5' : '#ffffff',
                          border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#0f172a',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBlockSelection(block)}
                              style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
                            />
                            <span>
                              <strong>{block.blockName}</strong>{' '}
                              <span style={{ color: '#64748b', fontWeight: 500, fontSize: '13px' }}>
                                ({block.zoneName || `Khu #${block.zoneId}`})
                              </span>
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: isChecked ? '#047857' : '#64748b',
                              background: isChecked ? '#d1fae5' : '#f1f5f9',
                              padding: '3px 10px',
                              borderRadius: '999px',
                            }}
                          >
                            Diện tích gốc: {block.areaValue} {block.areaUnit || 'm²'}
                          </span>
                        </label>

                        {isChecked && cfg && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px dashed #a7f3d0',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '12px',
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#065f46',
                                  marginBottom: '4px',
                                }}
                              >
                                Diện tích trồng ({cfg.areaUnit || 'm²'})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={cfg.plantedArea}
                                onChange={(e) =>
                                  updateSelectedBlockConfig(block.blockId, { plantedArea: e.target.value })
                                }
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #6ee7b7',
                                  background: '#ffffff',
                                  fontSize: '13px',
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#065f46',
                                  marginBottom: '4px',
                                }}
                              >
                                Ngày xuống giống tại {block.blockName}
                              </label>
                              <input
                                type="date"
                                value={cfg.plantedAt}
                                onChange={(e) =>
                                  updateSelectedBlockConfig(block.blockId, { plantedAt: e.target.value })
                                }
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #6ee7b7',
                                  background: '#ffffff',
                                  fontSize: '13px',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                  rows={2}
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
                {saving
                  ? 'Đang lưu...'
                  : modalMode === 'create'
                  ? `Tạo mùa vụ${selectedCount > 0 ? ` & Gán ${selectedCount} lô đất` : ''}`
                  : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
            <Link to="/crop-seasons" className="action-button" style={{ textDecoration: 'none' }}>
              <Icon name="arrow-left" size={16} /> Danh sách mùa vụ
            </Link>
            <button type="button" className="action-button" onClick={() => void openEditModal(selectedSeason)}>
              <Icon name="edit" size={16} /> Chỉnh sửa &amp; Chọn lô đất
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
              <h4>Lô đất tham gia (N-N)</h4>
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
                <p className="eyebrow">Lô canh tác tham gia mùa vụ (CropSeasonBlock)</p>
                <h3>Lô sản xuất tham gia mùa vụ ({seasonBlocks.length})</h3>
              </div>
              <div className="button-row">
                <Link to="/activities" className="action-button" style={{ textDecoration: 'none' }}>
                  📖 Nhật ký canh tác
                </Link>
                <Link to="/harvests" className="action-button" style={{ textDecoration: 'none' }}>
                  📦 Thu hoạch &amp; QR
                </Link>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const unassigned = allFarmBlocks.find(
                      (b) => !seasonBlocks.some((sb) => sb.blockId === b.blockId)
                    );
                    const firstBlk = unassigned || allFarmBlocks[0];
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
                  <Icon name="plus" size={16} /> Gán thêm lô đất
                </button>
              </div>
            </div>

            {seasonBlocks.length === 0 ? (
              <div className="zone-empty-hero" style={{ padding: '32px 20px' }}>
                <p className="muted">Chưa có lô đất nào được gán vào mùa vụ này.</p>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: '10px' }}
                  onClick={() => void openEditModal(selectedSeason)}
                >
                  + Chọn lô đất áp dụng cho mùa vụ
                </button>
              </div>
            ) : (
              <div className="zone-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên lô đất</th>
                      <th>Khu vực</th>
                      <th>Diện tích gieo trồng</th>
                      <th>Ngày xuống giống → Dự kiến thu hoạch</th>
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
                            🌱 {sb.blockName || `Lô #${sb.blockId}`}
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
                      onChange={(e) => {
                        const bid = Number(e.target.value);
                        const found = allFarmBlocks.find((b) => b.blockId === bid);
                        setAssignBlockForm({
                          ...assignBlockForm,
                          blockId: bid,
                          plantedArea: found ? String(found.areaValue) : assignBlockForm.plantedArea,
                          areaUnit: found?.areaUnit || assignBlockForm.areaUnit,
                        });
                      }}
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
                      Diện tích gieo trồng ({assignBlockForm.areaUnit || 'm²'}) <span style={{ color: '#dc2626' }}>*</span>
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

        {renderCreateEditModal()}

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
            Quản lý các chu kỳ mùa vụ theo danh mục cây trồng và phân bổ nhiều lô đất canh tác (N-N) cho từng vụ.
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
            <h4>Tổng số lô đất trang trại</h4>
            <strong className="stat-number">
              {allFarmBlocks.length} <span className="stat-unit">lô đất</span>
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
            Tìm kiếm mùa vụ hoặc lô đất
          </label>
          <div className="filter-input-wrap">
            <span className="filter-icon">🔍</span>
            <input
              id="cs-list-search"
              type="search"
              placeholder="Tìm theo tên mùa vụ, cây trồng hoặc tên lô đất (Lô A1, A2)..."
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
            Nhấn &quot;Thêm mùa vụ&quot; để khởi tạo mùa vụ canh tác mới và tick chọn các lô đất áp dụng ngay trong biểu mẫu.
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
              <span className="eyebrow">Danh sách mùa vụ canh tác &amp; Lô đất phân bổ</span>
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
                  <th>Lô đất áp dụng (N-N)</th>
                  <th>Thời gian canh tác</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeasons.map((s) => {
                  const assignedBlocks = seasonBlocksMap[s.cropSeasonId] || [];
                  return (
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
                          Mã vụ: #{s.cropSeasonId} (CS-{String(s.cropSeasonId).padStart(3, '0')})
                        </small>
                      </td>
                      <td>
                        <span className="knowledge-tag">
                          {s.cropCategoryName || 'Cây trồng chung'}
                        </span>
                      </td>
                      <td>
                        {assignedBlocks.length === 0 ? (
                          <button
                            type="button"
                            className="action-button"
                            style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => void openEditModal(s)}
                          >
                            + Chọn lô đất
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '300px' }}>
                            {assignedBlocks.map((b) => (
                              <Link
                                key={b.blockId}
                                to={`/zones/${b.zoneId || 1}/blocks/${b.blockId}`}
                                title={`Xuống giống: ${b.plantedAt || s.startDate} · Diện tích: ${b.plantedArea ?? b.blockArea} ${b.areaUnit || 'm²'}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  color: '#065f46',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                              >
                                🌱 {b.blockName || `Lô #${b.blockId}`}
                                <span style={{ fontWeight: 500, color: '#047857', fontSize: '11.5px' }}>
                                  ({b.plantedArea ?? b.blockArea} {b.areaUnit || 'm²'})
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
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
                              onClick={() => void openEditModal(s)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renderCreateEditModal()}

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
