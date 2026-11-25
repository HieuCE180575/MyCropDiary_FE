import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { TablePagination } from '../../shared/components/TablePagination';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { CropCategoryCombobox } from './CropCategoryCombobox';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

import { formatNumber as uiFormatNumber } from '../../shared/format/formatters';


import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';

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
  const { lang, t: translate } = useLanguage();
  const navigate = useNavigate();
  const { cropSeasonId: paramSeasonId } = useParams<{ cropSeasonId?: string }>();
  const detailSeasonId = paramSeasonId ? parseInt(paramSeasonId, 10) : null;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [seasonBlocksMap, setSeasonBlocksMap] = useState<Record<number, CropSeasonBlockResp[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<CropSeasonResp | null>(null);
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [allFarmBlocks, setAllFarmBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CropCategoryResp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (notificationTimer.current !== null) clearTimeout(notificationTimer.current);
  }, []);

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
  const [seasonModalError, setSeasonModalError] = useState<TranslationMessage | null>(null);

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

  const showToast = (text: TranslationMessage, type: 'success' | 'error' = 'success') => {
    if (notificationTimer.current !== null) clearTimeout(notificationTimer.current);
    setNotification({ text, type });
    notificationTimer.current = setTimeout(() => setNotification(null), 4000);
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
        setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load crop season data." : err instanceof Error ? err.message : 'Không thể tải dữ liệu mùa vụ canh tác.'));
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
      setSeasonModalError((lang === 'en' ? "Enter a crop season name." : 'Vui lòng nhập tên mùa vụ canh tác.'));
      return;
    }

    // BR: Check duplicate season name in farm
    const duplicateSeason = seasons.find(
      (s) =>
        s.seasonName.trim().toLowerCase() === trimmedSeasonName.toLowerCase() &&
        (modalMode === 'create' || s.cropSeasonId !== selectedSeason?.cropSeasonId)
    );
    if (duplicateSeason) {
      const msg = message("Season Name \"{value1}\" already exists in this farm. Choose another name.", { value1: trimmedSeasonName });
      setSeasonModalError(msg);
      showToast(msg, 'error');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (modalMode === 'create' && formValues.startDate && formValues.startDate < todayStr) {
      const msg = lang === 'en'
        ? 'Season start date cannot be in the past.'
        : 'Ngày bắt đầu mùa vụ không được chọn trong quá khứ.';
      setSeasonModalError(msg);
      showToast(msg, 'error');
      return;
    }

    if (formValues.endDate && formValues.endDate < formValues.startDate) {
      const msg = message("Season end date ({value1}) cannot be before the start date ({value2}).", { value1: formValues.endDate, value2: formValues.startDate });
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
        const msg = message("Block \"{value1}\": planted area ({value2} {value3}) exceeds the block's actual area ({value4} {value5}).", { value1: blk.blockName, value2: plantedAreaNum, value3: cfg.areaUnit, value4: blk.areaValue, value5: (blk.areaUnit || "m²") });
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
        const msg = message("Block \"{value1}\" is already scheduled in season \"{value2}\" ({value3} → {value4}). Overlapping allocations are not allowed!", { value1: (blk?.blockName || '#' + cfg.blockId), value2: conflict.seasonName, value3: conflict.startDate, value4: (conflict.endDate || message("Current")) });
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
            assignErrors.push(err instanceof Error ? err.message : (lang === 'en' ? `Unable to assign block` : `Lỗi phân bổ lô`));
          }
        }

        setSeasons((prev) => [created, ...prev]);
        setSeasonBlocksMap((prev) => ({ ...prev, [created.cropSeasonId]: assignedResults }));
        if (assignErrors.length > 0) {
          showToast((message("Created season \"{value1}\", but some blocks could not be assigned: {value2}", { value1: created.seasonName, value2: assignErrors.join('; ') })), 'error');
        } else {
          showToast(
            assignedResults.length > 0
              ? message('Created season "{value1}" and assigned {value2} blocks!', { value1: created.seasonName, value2: assignedResults.length })
              : message('Created season "{value1}" successfully.', { value1: created.seasonName })
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
        showToast((message("Updated season \"{value1}\" ({value2} assigned blocks).", { value1: updated.seasonName, value2: refreshedBlocks.length })));
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
      showToast((message("Season status changed to: {value1}.", { value1: message(label) })));
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update season status." : err instanceof Error ? err.message : 'Không thể cập nhật trạng thái mùa vụ.'), 'error');
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
      showToast((lang === 'en' ? "Block removed from season." : 'Đã gỡ lô đất khỏi mùa vụ canh tác.'));
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to remove block from season." : err instanceof Error ? err.message : 'Không thể gỡ lô đất khỏi mùa vụ.'), 'error');
    }
  };

  const handleConfirmDeleteSeason = async () => {
    if (!seasonToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCropSeason(seasonToDelete.cropSeasonId);
      setSeasons((prev) => prev.filter((s) => s.cropSeasonId !== seasonToDelete.cropSeasonId));
      showToast((message("Deleted season \"{value1}\" successfully.", { value1: seasonToDelete.seasonName })));
      setSeasonToDelete(null);
      if (detailSeasonId) {
        navigate('/crop-seasons');
      }
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete this season." : err instanceof Error ? err.message : 'Không thể xóa mùa vụ này.'), 'error');
      setSeasonToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const seasonsPagination = usePagination(filteredSeasons, JSON.stringify([farmId, searchKeyword, categoryFilter, statusFilter]));

  const renderCreateEditModal = () => {
    if (!modalMode) return null;
    const selectedCount = Object.keys(selectedBlockConfigs).length;

  return (
      <Modal structured open customLayout className="modal-form-layout" onClose={() => { if (!saving) setModalMode(null); }} style={{ width: 'min(760px, 100%)', maxHeight: '92vh' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow">{lang === 'en' ? 'Season Profile & Block Allocation' : 'Hồ sơ mùa vụ & Phân bổ lô đất'}</span>
              <h2>{modalMode === 'create' ? (lang === 'en' ? 'Create New Crop Season' : 'Tạo mùa vụ canh tác mới') : (lang === 'en' ? 'Update Season & Blocks' : 'Cập nhật mùa vụ và lô đất áp dụng')}</h2>
            </div>
            <button type="button" className="modal-close" disabled={saving} onClick={() => setModalMode(null)} aria-label={(lang === 'en' ? "Close" : "Đóng")}>
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveSeason} noValidate>
            <div className="modal-body">
            {seasonModalError && (
              <div className="form-error-banner" role="alert" style={{ marginBottom: '12px' }}>
                {typeof seasonModalError === 'string' ? translate(seasonModalError) : translate(seasonModalError)}
              </div>
            )}
            <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-cat" className="structured-field-label">
                    {lang === 'en' ? 'Crop Category' : 'Danh mục cây trồng'} <span style={{ color: 'var(--color-danger)' }}>*</span>
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
                    {lang === 'en' ? 'Season Start Date' : 'Ngày bắt đầu mùa vụ'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <label htmlFor="modal-cs-start" className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input className="ui-input"
                    id="modal-cs-start"
                    type="date"
                    min={modalMode === 'create' ? new Date().toISOString().split('T')[0] : undefined}
                    value={formValues.startDate}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setFormValues((prev) => ({
                        ...prev,
                        startDate: nextStart,
                      }));
                      setSeasonModalError(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="modal-cs-end" className="structured-field-label">
                    {lang === 'en' ? 'Expected End Date' : 'Ngày kết thúc dự kiến'}
                  </label>
                  <label htmlFor="modal-cs-end" className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input className="ui-input"
                    id="modal-cs-end"
                    type="date"
                    min={formValues.startDate || new Date().toISOString().split('T')[0]}
                    value={formValues.endDate}
                    onChange={(e) => {
                      setFormValues({ ...formValues, endDate: e.target.value });
                      setSeasonModalError(null);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CÁCH 2: CHỌN LUÔN CÁC LÔ ĐẤT ÁP DỤNG CHO MÙA VỤ NÀY (CHECKBOX N-N) */}
            <div
              className="structured-field-card"
              style={{
                marginBottom: 0,
                background: 'var(--color-page)',
                border: '1.5px solid var(--color-input-border)',
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
                  <span className="structured-field-label" style={{ fontSize: '14.5px', color: 'var(--color-text)' }}>
                    {lang === 'en' ? 'Select target blocks for this season (Single or multiple blocks)' : 'Chọn lô đất áp dụng cho mùa vụ này (Có thể chọn 1 hoặc nhiều lô)'}
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Selected blocks will be available for farming activities, task assignment, and QR-traceable harvests in this season.' : 'Các lô được chọn sẽ được phép ghi Nhật ký canh tác, Giao việc và Thu hoạch truy xuất QR VietGAP trong vụ này.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge  className="active" tone="neutral" label={<>
                    {lang === 'en' ? `Selected ${selectedCount}/${allFarmBlocks.length} block(s)` : `Đã chọn ${selectedCount}/${allFarmBlocks.length} lô`}
                  </>} />
                  {allFarmBlocks.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"

                        onClick={handleSelectAllBlocks}
                      >
                        {lang === 'en' ? 'Select All' : 'Chọn tất cả'}
                      </Button>
                      {selectedCount > 0 && (
                        <Button
                          type="button"
                          variant="secondary"

                          onClick={handleClearAllBlocks}
                        >
                          {lang === 'en' ? 'Clear All' : 'Bỏ chọn'}
                        </Button>
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
                    background: 'var(--color-surface)',
                    border: '1px dashed var(--color-input-border)',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--color-muted)',
                  }}
                >
                  {(lang === 'en' ? "The farm has no blocks yet. Create blocks under" : "Trang trại chưa có lô đất nào. Bạn có thể tạo lô đất tại mục")}{' '}
                  <Link to="/zones" style={{ color: 'var(--color-primary-text)', fontWeight: 700 }}>
                    {(lang === 'en' ? "Zones & Blocks" : "Khu sản xuất & lô đất")}
                  </Link>{' '}
                  {(lang === 'en' ? "or create a season first and assign blocks later." : "hoặc tạo mùa vụ trước rồi gán lô sau.")}
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
                          background: isChecked ? 'var(--color-success-bg)' : 'var(--color-surface)',
                          border: isChecked ? '1.5px solid var(--color-primary-text)' : '1px solid var(--color-border)',
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
                            color: 'var(--color-text)',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBlockSelection(block)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-text)', cursor: 'pointer' }}
                            />
                            <span>
                              <strong>{block.blockName}</strong>{' '}
                              <span style={{ color: 'var(--color-muted)', fontWeight: 500, fontSize: '13px' }}>
                                ({block.zoneName || `Khu`})
                              </span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {conflict && (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: 'var(--color-danger)',
                                  background: 'var(--color-danger-bg)',
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid var(--color-border)',
                                }}
                                title={(lang === 'en' ? `Block is growing crops in season: ${conflict.seasonName} (${conflict.startDate} → ${conflict.endDate || 'Hiện tại'})` : `Lô đất đang canh tác trong mùa vụ: ${conflict.seasonName} (${conflict.startDate} → ${conflict.endDate || 'Hiện tại'})`)}
                              >
                                {(lang === 'en' ? "⚠️ Schedule conflict: " : "⚠️ Trùng lịch: ")} {conflict.seasonName}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: isChecked ? 'var(--color-primary-text)' : 'var(--color-muted)',
                                background: isChecked ? 'var(--color-success-bg)' : 'var(--color-subtle)',
                                padding: '3px 10px',
                                borderRadius: '999px',
                              }}
                            >
                              {(lang === 'en' ? "Original area: " : "Diện tích gốc: ")} {block.areaValue} {translate(block.areaUnit || 'm²')}
                            </span>
                          </div>
                        </label>

                        {isChecked && cfg && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px dashed var(--color-border)',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '12px',
                            }}
                          >
                            <div>
                              <label htmlFor="crop-seasons-page-field-1"
                                style={{
                                  display: 'block',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: 'var(--color-primary-text)',
                                  marginBottom: '4px',
                                }}
                              >
                                {(lang === 'en' ? "Planted area (" : "Diện tích trồng (")}{translate(cfg.areaUnit || 'm²')})
                              </label>
                              <input id="crop-seasons-page-field-1" className="ui-input"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={cfg.plantedArea}
                                onChange={(e) =>
                                  updateSelectedBlockConfig(block.blockId, { plantedArea: e.target.value })
                                }
                                style={{ width: '100%', padding: '7px 10px' }}
                              />
                            </div>
                            <div>
                              <label htmlFor="crop-seasons-page-field-2"
                                style={{
                                  display: 'block',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: 'var(--color-primary-text)',
                                  marginBottom: '4px',
                                }}
                              >
                                {lang === 'en' ? 'Planted Date' : 'Ngày xuống giống'} {(lang === 'en' ? " at " : " tại ")} {block.blockName}
                              </label>
                              <input id="crop-seasons-page-field-2" className="ui-input"
                                type="date"
                                value={cfg.plantedAt}
                                onChange={(e) =>
                                  updateSelectedBlockConfig(block.blockId, { plantedAt: e.target.value })
                                }
                                style={{ width: '100%', padding: '7px 10px' }}
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
                <label htmlFor="modal-cs-notes" className="structured-field-badge">{formValues.notes.length}{(lang === 'en' ? "/1000 characters" : "/1000 ký tự")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <textarea className="ui-textarea"
                  id="modal-cs-notes"
                  rows={2}
                  maxLength={1000}
                  placeholder={lang === 'en' ? 'Describe yield targets, crop varieties, or technical care guidelines...' : 'Mô tả mục tiêu sản lượng, giống cây hoặc ghi chú kỹ thuật chăm sóc...'}
                  value={formValues.notes}
                  onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                />
              </div>
            </div>

            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
              {seasonModalError && (
                <p className="form-error-banner" role="alert" style={{ margin: '0 0 12px', maxHeight: '20vh', overflowY: 'auto' }}>
                  {translate(seasonModalError)}
                </p>
              )}
            <div className="confirm-dialog-actions" style={{ margin: 0 }}>
              <Button className="ui-cancel-button" type="button" variant="secondary" onClick={() => setModalMode(null)} disabled={saving}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                {saving
                  ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                  : modalMode === 'create' ? (lang === 'en' ? `Create Season${selectedCount > 0 ? ` & Assign ${selectedCount} block(s)` : ''}` : `Tạo mùa vụ${selectedCount > 0 ? ` và gán ${selectedCount} lô đất` : ''}`) : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </Button>
            </div>
            </div>
          </form>
        </Modal>
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
            <p className="muted">{(lang === 'en' ? "Loading crop season details..." : "Đang tải chi tiết mùa vụ canh tác...")}</p>
          </div>
        </div>
      );
    }

    if (error || !selectedSeason) {
      return (
        <div className="farm-registration-page">
          <div className="alert-error" role="alert">
            <div>
              <strong>{(lang === 'en' ? "Crop season not found" : "Không tìm thấy thông tin mùa vụ")}</strong>
              <p style={{ margin: '4px 0 0' }}>{(lang === 'en' ? error || `Season does not exist.` : error || `Mùa vụ không tồn tại.`)}</p>
            </div>
            <Link to="/crop-seasons" className="ui-button ui-button--primary ui-back-action" style={{ textDecoration: 'none' }}>
              {(lang === 'en' ? "Back to crop seasons" : "Quay lại danh sách mùa vụ")}
            </Link>
          </div>
        </div>
      );
    }

    const primaryBlock = seasonBlocks[0];

    return (
      <div className="farm-registration-page">
        {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div className={notification.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
            <span>{translate(notification.text)}</span>
            <Button type="button" variant="secondary" onClick={() => setNotification(null)}>
              ✕
            </Button>
          </div>))}

        {/* Full Hierarchy Breadcrumb: Zone List → Zone Details → Block Details → Crop Season Details */}
        <nav className="production-breadcrumb" aria-label={translate("Breadcrumb")}>
          <Link to="/zones">{lang === 'en' ? 'Production Zones' : 'Khu vực sản xuất'}</Link>
          {primaryBlock?.zoneId && (
            <>
              <span className="sep">→</span>
              <Link to={`/zones/${primaryBlock.zoneId}`}>
                {primaryBlock.zoneName || `Khu`}
              </Link>
            </>
          )}
          {primaryBlock?.blockId && (
            <>
              <span className="sep">→</span>
              <Link to={`/zones/${primaryBlock.zoneId || 1}/blocks/${primaryBlock.blockId}`}>
                {(lang === 'en' ? primaryBlock.blockName || `Block` : primaryBlock.blockName || `Lô`)}
              </Link>
            </>
          )}
          <span className="sep">→</span>
          <span className="current">{selectedSeason.seasonName}</span>
        </nav>

        <PageHeading   title={<>
              {selectedSeason.seasonName}
            </>}><div className="dashboard-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/crop-seasons" className="ui-button ui-button--secondary ui-back-action" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
               {lang === 'en' ? 'Back to Seasons' : 'Danh sách mùa vụ'}
            </Link>
            <Button className={'ui-edit-action'}
              type="button"
              variant="secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => void openEditModal(selectedSeason)}
            >
              <Icon name="edit" size={15} /> {lang === 'en' ? 'Edit & Allocate Blocks' : 'Chỉnh sửa & Chọn lô đất'}
            </Button>
            {selectedSeason.seasonStatus !== 'completed' && (
              <Button
                type="button"
                variant="primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleStatusChange(selectedSeason.cropSeasonId, 'completed')}
              >
                <Icon name="check" size={15} /> {lang === 'en' ? 'Mark as Completed' : 'Đánh dấu hoàn thành'}
              </Button>
            )}
            {isOwner && (
              <Button
                type="button"
                variant="danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setSeasonToDelete(selectedSeason)}
              >
                <Icon name="trash" size={15} /> {lang === 'en' ? 'Delete Season' : 'Xóa mùa vụ'}
              </Button>
            )}
          </div></PageHeading>

        {/* Summary Stat Cards - Hidden per user request */}
        <div className="zone-stats-grid" style={{ display: 'none' }}>
          <div className="zone-stat-card">
            <div className="zone-stat-icon">
              <Icon name="sprout" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>{(lang === 'en' ? "Crop" : "Cây trồng")}</h4>
              <strong className="stat-number" style={{ fontSize: '1.05rem' }}>
                {(lang === 'en' ? selectedSeason.cropCategoryName || `Group` : selectedSeason.cropCategoryName || `Nhóm`)}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--blue">
              <Icon name="calendar" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>{(lang === 'en' ? "Time" : "Thời gian")}</h4>
              <strong className="stat-number" style={{ fontSize: '0.95rem' }}>
                {selectedSeason.startDate} → {(lang === 'en' ? selectedSeason.endDate || "Current" : selectedSeason.endDate || 'Hiện tại')}
              </strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--amber">
              <Icon name="plots" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>{(lang === 'en' ? "Assigned blocks" : "Lô phân bổ")}</h4>
              <strong className="stat-number">{seasonBlocks.length} {(lang === 'en' ? " blocks" : " lô")}</strong>
            </div>
          </div>

          <div className="zone-stat-card">
            <div className="zone-stat-icon zone-stat-icon--purple">
              <Icon name="check" size={18} />
            </div>
            <div className="zone-stat-content">
              <h4>{(lang === 'en' ? "Status" : "Trạng thái")}</h4>
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
                <p className="eyebrow">{(lang === 'en' ? "Season record" : "Hồ sơ mùa vụ")}</p>
                <h3>{(lang === 'en' ? "Season details" : "Thông tin chi tiết mùa vụ")}</h3>
              </div>
              <span className={`status-dot-badge ${selectedSeason.seasonStatus === 'active' ? 'active' : 'completed'}`}>
                <span className="dot" />
                {selectedSeason.seasonStatus === 'active' ? (lang === 'en' ? 'Active' : 'Đang canh tác') : selectedSeason.seasonStatus === 'completed' ? (lang === 'en' ? 'Completed' : 'Đã hoàn thành') : (lang === 'en' && selectedSeason.seasonStatus === 'planned' ? 'Planned' : selectedSeason.seasonStatus)}
              </span>
            </div>

            <dl className="detail-list">
              <div>
                <dt>{translate("Season Name")}</dt>
                <dd>{selectedSeason.seasonName}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Crop categories" : "Danh mục cây trồng")}</dt>
                <dd>{(lang === 'en' ? selectedSeason.cropCategoryName || `Group` : selectedSeason.cropCategoryName || `Nhóm`)}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Farm" : "Trang trại trực thuộc")}</dt>
                <dd>{selectedSeason.farmName || farmName}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Growing period" : "Thời gian canh tác")}</dt>
                <dd>{selectedSeason.startDate} → {selectedSeason.endDate || translate("Active")}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Created by" : "Người khởi tạo")}</dt>
                <dd>{(lang === 'en' ? selectedSeason.createdByFullName || "Farm management" : selectedSeason.createdByFullName || 'Ban quản lý trang trại')}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>{(lang === 'en' ? "Season notes" : "Ghi chú mùa vụ")}</dt>
                <dd>{(lang === 'en' ? selectedSeason.notes || "No additional notes." : selectedSeason.notes || 'Không có ghi chú bổ sung.')}</dd>
              </div>
            </dl>
          </article>

          {/* Cultivated Blocks in this Crop Season */}
          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">{(lang === 'en' ? "Season blocks (CropSeasonBlock)" : "Lô canh tác tham gia mùa vụ (CropSeasonBlock)")}</p>
                <h3>{(lang === 'en' ? "Season production blocks" : "Lô trồng tham gia mùa vụ")}</h3>
              </div>
              <div className="button-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/activities" className="ui-button ui-button--secondary ui-navigation-action" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="book" size={15} /> {(lang === 'en' ? " Farming diary" : " Nhật ký canh tác")}
                </Link>
                <Link to="/harvests" className="ui-button ui-button--secondary ui-navigation-action" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="qr" size={15} /> {(lang === 'en' ? " Harvest & QR" : " Thu hoạch & QR")}
                </Link>
                <Button
                  type="button"
                  variant="primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => void openEditModal(selectedSeason)}
                >
                  <Icon name="plus" size={15} />{' '}
                  {seasonBlocks.length === 0
                    ? (lang === 'en' ? 'Select blocks' : 'Chọn lô trồng')
                    : (lang === 'en' ? 'Add blocks' : 'Thêm lô trồng')}
                </Button>
              </div>
            </div>

            {seasonBlocks.length === 0 ? (
              <div className="zone-empty-hero" style={{ padding: '32px 20px' }}>
                <p className="muted">{(lang === 'en' ? "No blocks assigned to this season." : "Chưa có lô đất nào được gán vào mùa vụ này.")}</p>

              </div>
            ) : (
              <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
                <table className="ui-data-table">
                  <thead>
                    <tr>
                      <th scope="col">{lang === 'en' ? 'Block Name' : 'Tên lô đất'}</th>
                      <th scope="col">{lang === 'en' ? 'Zone' : 'Khu vực'}</th>
                      <th scope="col">{lang === 'en' ? 'Planted Area' : 'Diện tích gieo trồng'}</th>
                      <th scope="col">{lang === 'en' ? 'Planting Date → Expected Harvest' : 'Ngày xuống giống → Dự kiến thu hoạch'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
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
                                background: 'var(--color-success-bg)',
                                color: 'var(--color-primary-text)',
                                display: 'inline-grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon name="plots" size={14} />
                            </span>
                            <Link
                              to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                              style={{ color: 'var(--color-text)', fontWeight: 700, textDecoration: 'none' }}
                            >
                              {(lang === 'en' ? sb.blockName || `Block` : sb.blockName || `Lô`)}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/zones/${sb.zoneId || 1}`}
                            style={{ color: 'var(--color-primary-text)', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {sb.zoneName || `Khu`}
                          </Link>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-body)' }}>
                            {sb.plantedArea ?? sb.blockArea} {translate(sb.areaUnit || sb.blockAreaUnit || 'm²')}
                          </strong>
                        </td>
                        <td className="muted" style={{ fontSize: '13.5px' }}>
                          {sb.plantedAt || selectedSeason.startDate} → {sb.expectedHarvestAt || selectedSeason.endDate || translate("Active")}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/zones/${sb.zoneId || 1}/blocks/${sb.blockId}`}
                              className="table-icon-btn primary"
                              title={(lang === 'en' ? "View block details" : "Xem chi tiết lô đất")}
                              aria-label={(lang === 'en' ? `View details ${sb.blockName}` : `Xem chi tiết ${sb.blockName}`)}
                            >
                              <Icon name="eye" size={15} />
                              <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                            </Link>
                            {isOwner && (
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={(lang === 'en' ? "Remove block from season" : "Gỡ lô đất khỏi mùa vụ")}
                                aria-label={(lang === 'en' ? `Remove block ${sb.blockName}` : `Gỡ lô đất ${sb.blockName}`)}
                                onClick={() => handleRemoveBlockFromSeason(sb.blockId)}
                              >
                                <Icon name="trash" size={15} />
                                <span className="sr-only">{(lang === 'en' ? "Remove block" : "Gỡ lô đất")}</span>
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

        {renderCreateEditModal()}

        <ConfirmDialog
          open={Boolean(seasonToDelete)}
          title={(lang === 'en' ? "Confirm season deletion" : "Xác nhận xóa mùa vụ")}
          description={(lang === 'en' ? <>{"Are you sure you want to delete season \""}<strong>{seasonToDelete?.seasonName}</strong>{"\"? This removes the season record if it has no linked diary entries."}</> : <>{"Bạn có chắc chắn muốn xóa mùa vụ \""}<strong>{seasonToDelete?.seasonName}</strong>{"\"? Hành động này sẽ loại bỏ hồ sơ mùa vụ nếu chưa có phát sinh nhật ký liên quan."}</>)}
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
      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div className={notification.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
          <span>{translate(notification.text)}</span>
          <Button type="button" variant="secondary" onClick={() => setNotification(null)}>
            ✕
          </Button>
        </div>))}

      {/* Breadcrumb matching exact mockup */}
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
        {lang === 'en' ? 'FARM ' : 'TRANG TRẠI '}{farmName || '—'} <span style={{ margin: '0 6px', color: 'var(--color-input-border)' }}>/</span> {lang === 'en' ? 'CROP SEASONS' : 'MÙA VỤ'}
      </div>

      {/* Main Page Heading */}
      <PageHeading   title={<>{translate("Crop Seasons")}</>}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            type="button"
            variant="primary"
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
          </Button>
        </div></PageHeading>

      {/* Clean Horizontal Filter Bar (Input Search + Category Dropdown + Status Dropdown) */}
      <div className="crops-clean-filter-bar">
        <div className="crops-clean-search-wrap">
          <span className="search-icon" aria-hidden="true">
            <Icon name="search" size={17} />
          </span>
          <input aria-label={lang === 'en' ? 'Search seasons or blocks...' : 'Tìm mùa vụ hoặc lô đất'} id="crop-seasons-page-control-8" className="ui-input"
            type="search"
            placeholder={lang === 'en' ? 'Search seasons or blocks...' : 'Tìm mùa vụ hoặc lô đất'}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <div className="crops-clean-select-wrap">
          <span className="select-lead-icon" aria-hidden="true"><Icon name="leaf" size={16} /></span>
          <select id="crop-seasons-page-control-9" className="ui-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={(lang === 'en' ? "Filter by crop" : "Lọc theo cây trồng")}
          >
            <option value="all">{lang === 'en' ? 'All Crop Categories' : 'Tất cả cây trồng'}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {translate(c.categoryName)}
              </option>
            ))}
          </select>
          <span className="select-chevron">
            <Icon name="chevron" size={16} />
          </span>
        </div>

        <div className="crops-clean-select-wrap">
          <span className="select-lead-icon" style={{ color: 'var(--color-body)' }} aria-hidden="true"><Icon name="check" size={16} /></span>
          <select id="crop-seasons-page-control-10" className="ui-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={(lang === 'en' ? "Filter by status" : "Lọc theo trạng thái")}
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

          <button
            type="button"
            className="zone-clean-reload-btn"
            title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
            aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
            onClick={() => {
              setSearchKeyword('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            style={{ height: '44px' }}
          >
            <Icon name="refresh" size={16} />
          </button>
      </div>

      {/* Card Content & Table */}
      <div className="zone-clean-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 750, color: 'var(--color-text)', margin: 0 }}>
            {lang === 'en' ? 'Crop Seasons List' : 'Danh sách mùa vụ'}</h2>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)' }}>
            {filteredSeasons.length} {lang === 'en' ? 'seasons' : 'mùa vụ'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p className="muted">{lang === 'en' ? 'Loading crop seasons...' : 'Đang tải danh sách mùa vụ...'}</p>
          </div>
        ) : filteredSeasons.length === 0 ? (
          <EmptyState  className="panel" title={<>{lang === 'en' ? 'No crop seasons found or connected yet' : 'Danh sách mùa vụ chưa được kết nối hoặc chưa có dữ liệu'}</>} description={<>
              {lang === 'en' ? 'Click "Add Season" to initialize a new crop season and allocate blocks.' : 'Nhấn "Thêm mùa vụ" để khởi tạo mùa vụ mới và gán lô đất cho vụ.'}
            </>} icon={<>📅</>} action={<><div className="button-row" style={{ justifyContent: 'center' }}>
              <Link to="/harvests" className="ui-button ui-button--secondary" style={{ textDecoration: 'none' }}>
                {lang === 'en' ? 'Open Harvest & Traceability' : 'Mở Thu hoạch & truy xuất'}
              </Link>
              {isOwner && (
                <Button type="button" variant="primary" onClick={openCreateModal}>
                  <Icon name="plus" size={16} /> {(lang === 'en' ? " Add season" : " Thêm mùa vụ")}
                </Button>
              )}
            </div></>} />
        ) : (
          <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
            <table className="ui-data-table crop-seasons-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <colgroup>
                <col style={{ width: 250 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 235 }} />
                <col style={{ width: 155 }} />
                <col style={{ width: 140 }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--color-page)' }}>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'SEASON NAME ↕' : 'TÊN MÙA VỤ ↕'}
                  </th>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'CROP CATEGORY' : 'CÂY TRỒNG'}
                  </th>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'BLOCKS' : 'LÔ ĐẤT'}
                  </th>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'TIMELINE ↕' : 'THỜI GIAN ↕'}
                  </th>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'STATUS ↕' : 'TRẠNG THÁI ↕'}
                  </th>
                  <th scope="col" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    {lang === 'en' ? 'ACTIONS' : 'THAO TÁC'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasonsPagination.items.map((s) => {
                  const assignedBlocks = seasonBlocksMap[s.cropSeasonId] || [];
                  const statusKey = (s.seasonStatus || 'planned').toLowerCase();
                  const isCompleted = statusKey === 'completed';
                  const isActive = statusKey === 'active';
                  const isCancelled = statusKey === 'cancelled';

                  // Format Block info string: e.g. "Lô A01 • 500 m²"
                  const blockText = assignedBlocks.length === 0
                    ? (lang === 'en' ? "No blocks assigned" : 'Chưa gán lô')
                    : assignedBlocks.length === 1
                      ? `${assignedBlocks[0].blockName} • ${uiFormatNumber((assignedBlocks[0].plantedArea ?? assignedBlocks[0].blockArea ?? 0), lang)} ${assignedBlocks[0].areaUnit || 'm²'}`
                      : `${assignedBlocks.map(b => b.blockName).join(', ')} • ${uiFormatNumber(assignedBlocks.reduce((sum, b) => sum + (Number(b.plantedArea ?? b.blockArea) || 0), 0), lang)} m²`;

                  return (
                    <tr key={s.cropSeasonId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          
                          <div>
                            <Link
                              to={`/crop-seasons/${s.cropSeasonId}`}
                              style={{
                                fontWeight: 750,
                                color: 'var(--color-text)',
                                textDecoration: 'none',
                                fontSize: '14.5px',
                                display: 'block',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                            >
                              {s.seasonName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="crop-cat-pill green">
                          {(lang === 'en' ? s.cropCategoryName || "General crop" : s.cropCategoryName || 'Cây trồng chung')}
                        </span>
                      </td>

                      <td className="crop-season-blocks" style={{ color: 'var(--color-body)', fontSize: '13.5px', fontWeight: 600 }}>
                        {assignedBlocks.length === 0 ? (
                          <StatusBadge tone="neutral" label={lang === 'en' ? 'No blocks assigned' : 'Chưa gán lô'} />
                        ) : (
                          <div title={blockText}>
                            <span className="crop-season-block-names">{assignedBlocks.map(b => b.blockName).join(', ')}</span>
                            <small className="crop-season-block-area">{blockText.slice(blockText.lastIndexOf('•') + 1).trim()}</small>
                          </div>
                        )}
                      </td>

                      <td style={{ color: 'var(--color-body)', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {formatVietnameseDate(s.startDate)} – {(lang === 'en' ? formatVietnameseDate(s.endDate) || "Current" : formatVietnameseDate(s.endDate) || 'Hiện tại')}
                      </td>

                      <td style={{ textAlign: 'center' }}>
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

                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-btns">
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={(lang === 'en' ? "View season details" : "Xem chi tiết mùa vụ")}
                            aria-label={(lang === 'en' ? `View details ${s.seasonName}` : `Xem chi tiết ${s.seasonName}`)}
                            onClick={() => navigate(`/crop-seasons/${s.cropSeasonId}`)}
                          >
                            <Icon name="eye" size={16} />
                          </button>

                          {isOwner && (
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={lang === 'en' ? 'Edit season and growing blocks' : 'Chỉnh sửa mùa vụ và lô trồng'}
                              aria-label={lang === 'en' ? `Edit season and growing blocks: ${s.seasonName}` : `Chỉnh sửa mùa vụ và lô trồng: ${s.seasonName}`}
                              onClick={() => void openEditModal(s)}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                          )}

                          {isOwner && (
                            <button
                              type="button"
                              className="table-icon-btn danger"
                              title={(lang === 'en' ? "Delete season" : "Xóa mùa vụ")}
                              aria-label={(lang === 'en' ? `Delete ${s.seasonName}` : `Xóa ${s.seasonName}`)}
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
        <TablePagination {...seasonsPagination} disabled={loading} />
      </div>

      {renderCreateEditModal()}

      <ConfirmDialog
        open={Boolean(seasonToDelete)}
        title={(lang === 'en' ? "Confirm season deletion" : "Xác nhận xóa mùa vụ")}
        description={(lang === 'en' ? <>{"Are you sure you want to delete season \""}<strong>{seasonToDelete?.seasonName}</strong>{"\"? This removes the season record if it has no linked diary entries."}</> : <>{"Bạn có chắc chắn muốn xóa mùa vụ \""}<strong>{seasonToDelete?.seasonName}</strong>{"\"? Hành động này sẽ loại bỏ hồ sơ mùa vụ nếu chưa có phát sinh nhật ký liên quan."}</>)}
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
