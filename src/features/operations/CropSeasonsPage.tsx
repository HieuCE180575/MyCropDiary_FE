import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { CropCategoryCombobox } from './CropCategoryCombobox';
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
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface SelectedBlockConfig {
  blockId: number;
  plantedArea: string;
  areaUnit: string;
  plantedAt: string;
}

export function CropSeasonsPage() {
  const { lang } = useLanguage();
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
    cropCategoryName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    seasonStatus: 'active',
    notes: '',
  });
  const [selectedBlockConfigs, setSelectedBlockConfigs] = useState<Record<number, SelectedBlockConfig>>({});
  const [saving, setSaving] = useState(false);
  const [seasonModalError, setSeasonModalError] = useState<string | null>(null);

  // Assign Block to Season Modal (from Detail View)
  const [isAssignBlockOpen, setIsAssignBlockOpen] = useState(false);
  const [assignBlockModalError, setAssignBlockModalError] = useState<string | null>(null);
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
      cropCategoryName: categories[0]?.categoryName || '',
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
    setSeasonModalError(null);
    setModalMode('create');
  };

  const openEditModal = async (season: CropSeasonResp) => {
    setSelectedSeason(season);
    const defaultStart = season.startDate || new Date().toISOString().split('T')[0];
    setFormValues({
      seasonName: season.seasonName,
      cropCategoryId: season.cropCategoryId || categories[0]?.id || 1,
      cropCategoryName: season.cropCategoryName || '',
      startDate: defaultStart,
      endDate: season.endDate || '',
      seasonStatus: season.seasonStatus || 'active',
      notes: season.notes || '',
    });
    setSeasonModalError(null);
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

  interface BlockConflictInfo {
    seasonName: string;
    startDate: string;
    endDate?: string | null;
  }

  const findBlockScheduleConflict = (
    blockId: number,
    startStr: string,
    endStr?: string | null,
    excludeSeasonId?: number
  ): BlockConflictInfo | null => {
    if (!startStr) return null;
    const reqStart = startStr;
    const reqEnd = endStr || '9999-12-31';

    for (const s of seasons) {
      if (excludeSeasonId && s.cropSeasonId === excludeSeasonId) continue;
      if (s.seasonStatus === 'cancelled') continue;

      const blocksInS = seasonBlocksMap[s.cropSeasonId] || [];
      const assigned = blocksInS.find((b) => b.blockId === blockId);
      if (!assigned) continue;

      const sStart = assigned.plantedAt || s.startDate;
      const sEnd = assigned.expectedHarvestAt || s.endDate || '9999-12-31';

      if (reqStart <= sEnd && reqEnd >= sStart) {
        return {
          seasonName: s.seasonName,
          startDate: sStart,
          endDate: assigned.expectedHarvestAt || s.endDate,
        };
      }
    }
    return null;
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSeasonName = formValues.seasonName.trim();
    if (!trimmedSeasonName) {
      setSeasonModalError('Vui lòng nhập tên mùa vụ canh tác.');
      return;
    }

    // BR: Check duplicate season name in farm
    const duplicateSeason = seasons.find(
      (s) =>
        s.seasonName.trim().toLowerCase() === trimmedSeasonName.toLowerCase() &&
        (modalMode === 'create' || s.cropSeasonId !== selectedSeason?.cropSeasonId)
    );
    if (duplicateSeason) {
      const msg = `Season Name "${trimmedSeasonName}" đã tồn tại trong nông trại này. Vui lòng đặt tên khác.`;
      setSeasonModalError(msg);
      showToast(msg, 'error');
      return;
    }

    if (formValues.endDate && formValues.endDate < formValues.startDate) {
      const msg = `End Date mùa vụ (${formValues.endDate}) không thể trước ngày bắt đầu (${formValues.startDate}).`;
      setSeasonModalError(msg);
      showToast(msg, 'error');
      return;
    }

    const currentSeasonId = modalMode === 'edit' && selectedSeason ? selectedSeason.cropSeasonId : undefined;
    const chosenConfigs = Object.values(selectedBlockConfigs);

    for (const cfg of chosenConfigs) {
      const blk = allFarmBlocks.find((b) => b.blockId === cfg.blockId);
      const plantedAreaNum = parseFloat(cfg.plantedArea) || 0;
      if (blk && blk.areaValue && plantedAreaNum > blk.areaValue) {
        const msg = `Lô "${blk.blockName}": Diện tích trồng (${plantedAreaNum} ${cfg.areaUnit}) vượt quá diện tích thực tế của lô đất (${blk.areaValue} ${blk.areaUnit || 'm²'}).`;
        setSeasonModalError(msg);
        showToast(msg, 'error');
        return;
      }

      const conflict = findBlockScheduleConflict(
        cfg.blockId,
        cfg.plantedAt || formValues.startDate,
        formValues.endDate,
        currentSeasonId
      );
      if (conflict) {
        const msg = `Lô "${blk?.blockName || '#' + cfg.blockId}" đang có lịch canh tác trong mùa vụ "${conflict.seasonName}" (${conflict.startDate} → ${conflict.endDate || 'Hiện tại'}). Không thể phân bổ trùng thời gian!`;
        setSeasonModalError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    setSaving(true);
    setSeasonModalError(null);
    try {

      if (modalMode === 'create') {
        // Step 1: POST /farms/{farmId}/crop-seasons
        const created = await createCropSeason(farmId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId) || undefined,
          cropCategoryName: formValues.cropCategoryName?.trim() || undefined,
          startDate: formValues.startDate,
          endDate: formValues.endDate || null,
          seasonStatus: formValues.seasonStatus,
          notes: formValues.notes || null,
        });

        // Step 2: Automatically call POST /crop-seasons/{id}/blocks for all checked blocks
        const assignedResults: CropSeasonBlockResp[] = [];
        const assignErrors: string[] = [];
        for (const cfg of chosenConfigs) {
          try {
            const res = await assignBlockToSeason(created.cropSeasonId, {
              blockId: Number(cfg.blockId),
              plantedArea: parseFloat(cfg.plantedArea) || 100,
              areaUnit: cfg.areaUnit || 'm2',
              plantedAt: cfg.plantedAt || formValues.startDate,
              expectedHarvestAt: formValues.endDate || null,
            });
            if (res) assignedResults.push(res);
          } catch (err) {
            assignErrors.push(err instanceof Error ? err.message : `Lỗi phân bổ lô #${cfg.blockId}`);
          }
        }

        setSeasons((prev) => [created, ...prev]);
        setSeasonBlocksMap((prev) => ({ ...prev, [created.cropSeasonId]: assignedResults }));
        if (assignErrors.length > 0) {
          showToast(`Đã tạo mùa vụ "${created.seasonName}", nhưng một số lô đất gặp lỗi: ${assignErrors.join('; ')}`, 'error');
        } else {
          showToast(
            assignedResults.length > 0
              ? `Đã tạo mùa vụ "${created.seasonName}" và phân bổ vào ${assignedResults.length} lô đất!`
              : `Khởi tạo mùa vụ "${created.seasonName}" thành công.`
          );
        }
      } else if (modalMode === 'edit' && selectedSeason) {
        const seasonId = selectedSeason.cropSeasonId;
        const updated = await updateCropSeason(seasonId, {
          seasonName: formValues.seasonName.trim(),
          cropCategoryId: Number(formValues.cropCategoryId) || undefined,
          cropCategoryName: formValues.cropCategoryName?.trim() || undefined,
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
      const msg = err instanceof Error ? err.message : 'Không thể lưu thông tin mùa vụ.';
      setSeasonModalError(msg);
      showToast(msg, 'error');
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

    const blockIdNum = Number(assignBlockForm.blockId);
    const chosenBlock = allFarmBlocks.find((b) => b.blockId === blockIdNum);
    const plantedAreaNum = parseFloat(assignBlockForm.plantedArea) || 0;

    // BR: Check if block already in this season
    if (seasonBlocks.some((b) => b.blockId === blockIdNum)) {
      const msg = `Lô đất "${chosenBlock?.blockName || '#' + blockIdNum}" đã được phân bổ vào mùa vụ "${selectedSeason.seasonName}" rồi. Không thể gán trùng lặp!`;
      setAssignBlockModalError(msg);
      showToast(msg, 'error');
      return;
    }

    if (chosenBlock && chosenBlock.areaValue && plantedAreaNum > chosenBlock.areaValue) {
      const msg = `Diện tích phân bổ (${plantedAreaNum} ${assignBlockForm.areaUnit}) không được lớn hơn diện tích thực tế của lô đất (${chosenBlock.areaValue} ${chosenBlock.areaUnit || 'm²'}).`;
      setAssignBlockModalError(msg);
      showToast(msg, 'error');
      return;
    }

    const plantedAt = assignBlockForm.plantedAt || selectedSeason.startDate;
    const expectedHarvest = assignBlockForm.expectedHarvestAt || selectedSeason.endDate;
    if (plantedAt && expectedHarvest && expectedHarvest < plantedAt) {
      const msg = `Ngày dự kiến thu hoạch (${expectedHarvest}) không thể trước ngày xuống giống (${plantedAt}) tại lô đất.`;
      setAssignBlockModalError(msg);
      showToast(msg, 'error');
      return;
    }

    const conflict = findBlockScheduleConflict(
      blockIdNum,
      plantedAt,
      expectedHarvest,
      selectedSeason.cropSeasonId
    );
    if (conflict) {
      const msg = `Lô đất này đang được canh tác trong mùa vụ "${conflict.seasonName}" (${conflict.startDate} → ${conflict.endDate || 'Hiện tại'}). Không thể gán vào mùa vụ trùng thời gian!`;
      setAssignBlockModalError(msg);
      showToast(msg, 'error');
      return;
    }

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
      const msg = err instanceof Error ? err.message : 'Không thể gán lô đất vào mùa vụ.';
      setAssignBlockModalError(msg);
      showToast(msg, 'error');
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
              <span className="eyebrow">{lang === 'en' ? 'Season Profile & Block Allocation (N-N)' : 'Hồ sơ mùa vụ & Phân bổ lô đất (N-N)'}</span>
              <h2>{modalMode === 'create' ? (lang === 'en' ? 'Create New Crop Season' : 'Create Season canh tác mới') : (lang === 'en' ? 'Update Season & Blocks' : 'Update Season & lô đất áp dụng')}</h2>
            </div>
            <button type="button" className="modal-close" onClick={() => setModalMode(null)} aria-label="Đóng">
              ✕
            </button>
          </div>

          <form className="modal-body" onSubmit={handleSaveSeason} noValidate>
            {seasonModalError && (
              <p className="form-error-banner" role="alert" style={{ margin: '0 0 16px' }}>
                {seasonModalError}
              </p>
            )}
            <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-cat" className="structured-field-label">
                    {lang === 'en' ? 'Crop Category' : 'Danh mục cây trồng'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'VietGAP Standard' : 'Tiêu chuẩn VietGAP'}</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <CropCategoryCombobox
                    id="modal-cs-cat"
                    value={formValues.cropCategoryId}
                    categoryName={formValues.cropCategoryName}
                    categories={categories}
                    onChange={(catId, catName) =>
                      setFormValues((prev) => ({
                        ...prev,
                        cropCategoryId: catId,
                        cropCategoryName: catName,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-start" className="structured-field-label">
                    {lang === 'en' ? 'Season Start Date' : 'Start Date mùa vụ'} <span style={{ color: '#dc2626' }}>*</span>
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
                    {lang === 'en' ? 'Expected End Date' : 'End Date dự kiến'}
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
                    {lang === 'en' ? '🌱 Select target blocks for this season (Single or multiple blocks)' : '🌱 Chọn lô đất áp dụng cho mùa vụ này (Có thể chọn 1 hoặc nhiều lô)'}
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    {lang === 'en' ? 'Selected blocks will be available for farming activities, task assignment, and QR-traceable harvests in this season.' : 'Các lô được chọn sẽ được phép ghi Nhật ký canh tác, Giao việc và Thu hoạch truy xuất QR VietGAP trong vụ này.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-badge active" style={{ fontSize: '12px' }}>
                    {lang === 'en' ? `Selected ${selectedCount}/${allFarmBlocks.length} block(s)` : `Đã chọn ${selectedCount}/${allFarmBlocks.length} lô`}
                  </span>
                  {allFarmBlocks.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="action-button"
                        style={{ minHeight: '28px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={handleSelectAllBlocks}
                      >
                        {lang === 'en' ? 'Select All' : 'Chọn tất cả'}
                      </button>
                      {selectedCount > 0 && (
                        <button
                          type="button"
                          className="action-button"
                          style={{ minHeight: '28px', padding: '4px 10px', fontSize: '12px' }}
                          onClick={handleClearAllBlocks}
                        >
                          {lang === 'en' ? 'Clear All' : 'Bỏ chọn'}
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
                    const conflict = findBlockScheduleConflict(
                      block.blockId,
                      formValues.startDate,
                      formValues.endDate,
                      modalMode === 'edit' && selectedSeason ? selectedSeason.cropSeasonId : undefined
                    );

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {conflict && (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#b91c1c',
                                  background: '#fee2e2',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid #fecaca',
                                }}
                                title={`Lô đất đang canh tác trong mùa vụ: ${conflict.seasonName} (${conflict.startDate} → ${conflict.endDate || 'Hiện tại'})`}
                              >
                                ⚠️ Trùng lịch: {conflict.seasonName}
                              </span>
                            )}
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
                          </div>
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
                                {lang === 'en' ? 'Planted Date' : 'Ngày xuống giống'} tại {block.blockName}
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
                  {lang === 'en' ? 'Season Notes' : 'Ghi chú mùa vụ'}
                </label>
                <span className="structured-field-badge">{formValues.notes.length}/1000 ký tự</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <textarea
                  id="modal-cs-notes"
                  rows={2}
                  maxLength={1000}
                  placeholder={lang === 'en' ? 'Describe yield targets, crop varieties, or technical care guidelines...' : 'Mô tả mục tiêu sản lượng, giống cây hoặc ghi chú kỹ thuật chăm sóc...'}
                  value={formValues.notes}
                  onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
              <button type="button" className="ghost-button" onClick={() => setModalMode(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : modalMode === 'create' ? (lang === 'en' ? `Create Season${selectedCount > 0 ? ` & Assign ${selectedCount} block(s)` : ''}` : `Create Season${selectedCount > 0 ? ` & Gán ${selectedCount} lô đất` : ''}`) : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
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
          <Link to="/zones">{lang === 'en' ? 'Production Zones' : 'Khu vực sản xuất'}</Link>
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

        <div className="page-heading" style={{ marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">
              {lang === 'en' ? 'Season Details' : 'Chi tiết mùa vụ'} · CS-{String(selectedSeason.cropSeasonId).padStart(3, '0')} · {selectedSeason.farmName || farmName}
            </p>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
              {selectedSeason.seasonName}
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              {selectedSeason.notes || (lang === 'en' ? 'Detailed crop season profile and affiliated production blocks.' : 'Hồ sơ chi tiết mùa vụ canh tác và các lô sản xuất trực thuộc.')}
            </p>
          </div>

          <div className="dashboard-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/crop-seasons" className="action-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="arrow-left" size={15} /> {lang === 'en' ? 'Back to Seasons' : 'Danh sách mùa vụ'}
            </Link>
            <button
              type="button"
              className="action-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => void openEditModal(selectedSeason)}
            >
              <Icon name="edit" size={15} /> {lang === 'en' ? 'Edit & Allocate Blocks' : 'Chỉnh sửa & Chọn lô đất'}
            </button>
            {selectedSeason.seasonStatus !== 'completed' && (
              <button
                type="button"
                className="primary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669' }}
                onClick={() => handleStatusChange(selectedSeason.cropSeasonId, 'completed')}
              >
                <Icon name="check" size={15} /> {lang === 'en' ? 'Mark as Completed' : 'Đánh dấu hoàn thành'}
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                className="action-button danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setSeasonToDelete(selectedSeason)}
              >
                <Icon name="trash" size={15} /> {lang === 'en' ? 'Delete Season' : 'Xóa mùa vụ'}
              </button>
            )}
          </div>
        </div>

        {/* Summary Stat Cards - Hidden per user request */}
        <div className="zone-stats-grid" style={{ display: 'none' }}>
          <div className="zone-stat-card">
            <div className="zone-stat-icon">
              <Icon name="sprout" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>Cây trồng</h4>
              <strong className="stat-number" style={{ fontSize: '1.05rem' }}>
                {selectedSeason.cropCategoryName || `Nhóm #${selectedSeason.cropCategoryId}`}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--blue">
              <Icon name="calendar" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>Thời gian</h4>
              <strong className="stat-number" style={{ fontSize: '0.95rem' }}>
                {selectedSeason.startDate} → {selectedSeason.endDate || 'Hiện tại'}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--amber">
              <Icon name="plots" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>Lô phân bổ</h4>
              <strong className="stat-number">{seasonBlocks.length} lô</strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--purple">
              <Icon name="check" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>Trạng thái</h4>
              <strong className="stat-number" style={{ textTransform: 'uppercase', fontSize: '1rem' }}>
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
              <span className={`status-dot-badge ${selectedSeason.seasonStatus === 'active' ? 'active' : 'completed'}`}>
                <span className="dot" />
                {selectedSeason.seasonStatus === 'active' ? (lang === 'en' ? 'Active' : 'Đang canh tác') : selectedSeason.seasonStatus === 'completed' ? (lang === 'en' ? 'Completed' : 'Đã hoàn thành') : (lang === 'en' && selectedSeason.seasonStatus === 'planned' ? 'Planned' : selectedSeason.seasonStatus)}
              </span>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Mã định danh mùa vụ</dt>
                <dd>#{selectedSeason.cropSeasonId} (CS-{String(selectedSeason.cropSeasonId).padStart(3, '0')})</dd>
              </div>
              <div>
                <dt>Season Name</dt>
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
                <dd>{selectedSeason.startDate} → {selectedSeason.endDate || 'Active'}</dd>
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
              <div className="button-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/activities" className="action-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="book" size={15} /> Nhật ký canh tác
                </Link>
                <Link to="/harvests" className="action-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="qr" size={15} /> Thu hoạch &amp; QR
                </Link>
                <button
                  type="button"
                  className="primary-button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669' }}
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
                    setAssignBlockModalError(null);
                    setIsAssignBlockOpen(true);
                  }}
                >
                  <Icon name="plus" size={15} /> Gán thêm lô đất
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
                      <th>{lang === 'en' ? 'Block Name' : 'Tên lô đất'}</th>
                      <th>{lang === 'en' ? 'Zone' : 'Khu vực'}</th>
                      <th>{lang === 'en' ? 'Planted Area' : 'Diện tích gieo trồng'}</th>
                      <th>{lang === 'en' ? 'Planting Date → Expected Harvest' : 'Ngày xuống giống → Dự kiến thu hoạch'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonBlocks.map((sb) => (
                      <tr key={sb.blockId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: '#ecfdf5',
                                color: '#059669',
                                display: 'inline-grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon name="plots" size={14} />
                            </span>
                            <Link
                              to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                              style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}
                            >
                              {sb.blockName || `Lô #${sb.blockId}`}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/zones/${sb.zoneId || 1}`}
                            style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {sb.zoneName || `Khu #${sb.zoneId}`}
                          </Link>
                        </td>
                        <td>
                          <strong style={{ color: '#334155' }}>
                            {sb.plantedArea ?? sb.blockArea} {sb.areaUnit || sb.blockAreaUnit || 'm²'}
                          </strong>
                        </td>
                        <td className="muted" style={{ fontSize: '13.5px' }}>
                          {sb.plantedAt || selectedSeason.startDate} → {sb.expectedHarvestAt || selectedSeason.endDate || 'Active'}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                              className="table-icon-btn primary"
                              title="Xem chi tiết lô đất"
                              aria-label={`Xem chi tiết ${sb.blockName}`}
                            >
                              <Icon name="eye" size={15} />
                              <span className="sr-only">Xem chi tiết</span>
                            </Link>
                            {isOwner && (
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title="Gỡ lô đất khỏi mùa vụ"
                                aria-label={`Gỡ lô đất ${sb.blockName}`}
                                onClick={() => handleRemoveBlockFromSeason(sb.blockId)}
                              >
                                <Icon name="trash" size={15} />
                                <span className="sr-only">Gỡ lô đất</span>
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
                  <span className="eyebrow">{lang === 'en' ? 'Block Allocation' : 'Phân công lô đất canh tác'}</span>
                  <h2>{lang === 'en' ? 'Allocate Block to: ' : 'Gán lô đất vào: '}{selectedSeason.seasonName}</h2>
                </div>
                <button type="button" className="modal-close" onClick={() => setIsAssignBlockOpen(false)} aria-label="Đóng">
                  ✕
                </button>
              </div>

              <form className="modal-body" onSubmit={handleAssignBlock} noValidate>
                {assignBlockModalError && (
                  <p className="form-error-banner" role="alert" style={{ margin: '0 0 16px' }}>
                    {assignBlockModalError}
                  </p>
                )}
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="assign-block-select" className="structured-field-label">
                      {lang === 'en' ? 'Target Production Block' : 'Lô sản xuất mục tiêu'} <span style={{ color: '#dc2626' }}>*</span>
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
                      {lang === 'en' ? 'Planted Area' : 'Diện tích gieo trồng'} ({assignBlockForm.areaUnit || 'm²'}) <span style={{ color: '#dc2626' }}>*</span>
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
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">{lang === 'en' ? 'Allocate Block' : 'Gán lô đất'}</button>
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
          cancelLabel="Cancel"
          tone="danger"
          loading={isDeleting}
          onConfirm={handleConfirmDeleteSeason}
          onClose={() => setSeasonToDelete(null)}
        />
      </div>
    );
  }

  const getCropMeta = (categoryName?: string | null) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('ớt') || name.includes('tiêu') || name.includes('chilli')) {
      return { icon: '🌶️', color: 'red' };
    }
    if (name.includes('cà chua') || name.includes('tomato')) {
      return { icon: '🍅', color: 'red' };
    }
    if (name.includes('dưa leo') || name.includes('cucumber')) {
      return { icon: '🥒', color: 'green' };
    }
    if (name.includes('dưa') || name.includes('melon')) {
      return { icon: '🍈', color: 'green' };
    }
    if (name.includes('dâu') || name.includes('berry')) {
      return { icon: '🍓', color: 'red' };
    }
    return { icon: '🌱', color: 'green' };
  };

  const formatVietnameseDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // =========================================================
  // VIEW 2: CROP SEASONS LIST (/crop-seasons)
  // =========================================================
  return (
    <div className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {notification && (
        <div className={notification.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
          <span>{notification.text}</span>
          <button type="button" className="ghost-button" onClick={() => setNotification(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Breadcrumb matching exact mockup */}
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
        {lang === 'en' ? 'FARM ' : 'TRANG TRẠI '}{farmName || farmId} <span style={{ margin: '0 6px', color: '#cbd5e1' }}>/</span> {lang === 'en' ? 'CROP SEASONS' : 'MÙA VỤ'}
      </div>

      {/* Main Page Heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Crop Seasons
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {lang === 'en' ? 'Manage crop seasons and allocated production blocks.' : 'Quản lý mùa vụ và lô đất áp dụng.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="primary-button"
            onClick={openCreateModal}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '10px',
              background: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
          </button>
        </div>
      </div>

      {/* Clean Horizontal Filter Bar (Input Search + Category Dropdown + Status Dropdown) */}
      <div className="crops-clean-filter-bar">
        <div className="crops-clean-search-wrap">
          <span className="search-icon">
            <Icon name="search" size={17} />
          </span>
          <input
            type="search"
            placeholder={lang === 'en' ? 'Search seasons or blocks...' : 'Tìm mùa vụ hoặc lô đất'}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <div className="crops-clean-select-wrap">
          <span className="select-lead-icon">
            <Icon name="leaf" size={16} />
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Lọc theo cây trồng"
          >
            <option value="all">{lang === 'en' ? 'All Crop Categories' : 'Tất cả cây trồng'}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.categoryName}
              </option>
            ))}
          </select>
          <span className="select-chevron">
            <Icon name="chevron" size={16} />
          </span>
        </div>

        <div className="crops-clean-select-wrap">
          <span className="select-lead-icon" style={{ color: '#475569' }}>
            <Icon name="check" size={16} />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>
            <option value="active">{lang === 'en' ? 'Active' : 'Đang canh tác'}</option>
            <option value="completed">{lang === 'en' ? 'Completed' : 'Đã hoàn thành'}</option>
            <option value="planned">{lang === 'en' ? 'Planned' : 'Dự kiến'}</option>
            <option value="cancelled">{lang === 'en' ? 'Cancelled' : 'Đã hủy'}</option>
          </select>
          <span className="select-chevron">
            <Icon name="chevron" size={16} />
          </span>
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
            style={{ height: '44px' }}
          >
            {lang === 'en' ? '✕ Reset' : '✕ Đặt lại'}
          </button>
        )}
      </div>

      {/* Card Content & Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 750, color: '#0f172a', margin: 0 }}>
            {lang === 'en' ? 'Crop Seasons List' : 'Danh sách mùa vụ'}</h2>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
            {filteredSeasons.length} {lang === 'en' ? 'seasons' : 'mùa vụ'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p className="muted">{lang === 'en' ? 'Loading crop seasons...' : 'Đang tải danh sách mùa vụ...'}</p>
          </div>
        ) : filteredSeasons.length === 0 ? (
          <div className="panel empty-state" style={{ border: 'none', boxShadow: 'none' }}>
            <div className="empty-icon">📅</div>
            <h2>{lang === 'en' ? 'No crop seasons found or connected yet' : 'Danh sách mùa vụ chưa được kết nối hoặc chưa có dữ liệu'}</h2>
            <p>
              {lang === 'en' ? 'Click "Add Season" to initialize a new crop season and allocate blocks.' : 'Nhấn "Thêm mùa vụ" để khởi tạo mùa vụ mới và gán lô đất cho vụ.'}
            </p>
            <div className="button-row" style={{ justifyContent: 'center' }}>
              <Link to="/harvests" className="action-button" style={{ textDecoration: 'none' }}>
                {lang === 'en' ? 'Open Harvest & Traceability' : 'Mở Thu hoạch & truy xuất'}
              </Link>
              {isOwner && (
                <button type="button" className="primary-button" onClick={openCreateModal}>
                  <Icon name="plus" size={16} /> Thêm mùa vụ
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'CODE & SEASON NAME ↕' : 'MÃ & TÊN MÙA VỤ ↕'}
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'CROP CATEGORY' : 'CÂY TRỒNG'}
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'BLOCKS' : 'LÔ ĐẤT'}
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'TIMELINE ↕' : 'THỜI GIAN ↕'}
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'STATUS ↕' : 'TRẠNG THÁI ↕'}
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    {lang === 'en' ? 'ACTIONS' : 'THAO TÁC'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSeasons.map((s) => {
                  const assignedBlocks = seasonBlocksMap[s.cropSeasonId] || [];
                  const meta = getCropMeta(s.cropCategoryName);
                  const statusKey = (s.seasonStatus || 'planned').toLowerCase();
                  const isCompleted = statusKey === 'completed';
                  const isActive = statusKey === 'active';
                  const isCancelled = statusKey === 'cancelled';

                  // Format Block info string: e.g. "Lô A01 • 500 m²"
                  const blockText = assignedBlocks.length === 0
                    ? 'Chưa gán lô'
                    : assignedBlocks.length === 1
                      ? `${assignedBlocks[0].blockName} • ${(assignedBlocks[0].plantedArea ?? assignedBlocks[0].blockArea ?? 0).toLocaleString('vi-VN')} ${assignedBlocks[0].areaUnit || 'm²'}`
                      : `${assignedBlocks.map(b => b.blockName).join(', ')} • ${assignedBlocks.reduce((sum, b) => sum + (Number(b.plantedArea ?? b.blockArea) || 0), 0).toLocaleString('vi-VN')} m²`;

                  return (
                    <tr key={s.cropSeasonId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`crop-avatar-circle ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <Link
                              to={`/crop-seasons/${s.cropSeasonId}`}
                              style={{
                                fontWeight: 750,
                                color: '#0f172a',
                                textDecoration: 'none',
                                fontSize: '14.5px',
                                display: 'block',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#059669')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#0f172a')}
                            >
                              {s.seasonName}
                            </Link>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                              CS-{String(s.cropSeasonId).padStart(3, '0')}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`crop-cat-pill ${meta.color}`}>
                          {s.cropCategoryName || 'Cây trồng chung'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 600 }}>
                        {assignedBlocks.length === 0 ? (
                          <button
                            type="button"
                            className="action-button"
                            style={{ minHeight: '30px', padding: '3px 10px', fontSize: '12px', borderRadius: '8px' }}
                            onClick={() => void openEditModal(s)}
                          >
                            + Gán lô đất
                          </button>
                        ) : (
                          <span>{blockText}</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {formatVietnameseDate(s.startDate)} – {formatVietnameseDate(s.endDate) || 'Hiện tại'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className={`status-dot-badge ${isActive ? 'active' : isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'in_progress'}`}>
                          <span className="dot" />
                          {isActive
                            ? (lang === 'en' ? 'Active' : 'Đang canh tác')
                            : isCompleted
                              ? (lang === 'en' ? 'Completed' : 'Đã hoàn thành')
                              : isCancelled
                                ? (lang === 'en' ? 'Cancelled' : 'Đã hủy')
                                : (lang === 'en' ? 'Planned' : 'Dự kiến')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div className="table-action-btns">
                          <button
                            type="button"
                            className="table-icon-btn"
                            title="Xem chi tiết mùa vụ"
                            aria-label={`Xem chi tiết ${s.seasonName}`}
                            onClick={() => navigate(`/crop-seasons/${s.cropSeasonId}`)}
                          >
                            <Icon name="eye" size={16} />
                          </button>

                          {isOwner && (
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title="Chỉnh sửa mùa vụ & lô đất"
                              aria-label={`Chỉnh sửa ${s.seasonName}`}
                              onClick={() => void openEditModal(s)}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                          )}

                          {isOwner && (
                            <button
                              type="button"
                              className="table-icon-btn danger"
                              title="Xóa mùa vụ"
                              aria-label={`Xóa ${s.seasonName}`}
                              onClick={() => setSeasonToDelete(s)}
                            >
                              <Icon name="trash" size={16} />
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
        )}
      </div>

      {renderCreateEditModal()}

      <ConfirmDialog
        open={Boolean(seasonToDelete)}
        title="Xác nhận xóa mùa vụ"
        description={`Bạn có chắc chắn muốn xóa mùa vụ "${seasonToDelete?.seasonName}"? Hành động này sẽ loại bỏ hồ sơ mùa vụ nếu chưa có phát sinh nhật ký liên quan.`}
        confirmLabel="Xóa mùa vụ"
        cancelLabel="Cancel"
        tone="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteSeason}
        onClose={() => setSeasonToDelete(null)}
      />
    </div>
  );
}
