import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Icon } from '../../shared/components/Icon';
import { FarmingActivityPicker } from './FarmingActivityPicker';
import { MaterialUsageFormSection } from './MaterialUsageFormSection';
import { MaterialUsageMaterialPicker } from './MaterialUsageMaterialPicker';
import { DosageInput, MethodInput } from './MaterialUsageInputGroups';
import { Pagination } from '../../shared/components/Pagination';
import { MaterialUsageHistory } from './MaterialUsageHistory';

import { formatNumber as uiFormatNumber, formatDateTime as uiFormatDateTime } from '../../shared/format/formatters';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

import { useMaterialUsageActivity } from './useMaterialUsageActivity';
import { isolationEnd } from './materialUsagePresentation';


import { materialTypeLabel, materialUnitLabel } from './materialUsageLabels';
import { MATERIAL_TYPES, MATERIAL_GROUPS, MATERIAL_FORMS, AREA_UNITS, materialGroupName, defaultMaterialForm, getMaterialUnitOptions, suggestMaterialDosage } from './MaterialUsageInputGroups';


import '../../styles/material-usage.css';

interface UsageFilters { keyword: string; materialType: string; fromDate: string; toDate: string }
const EMPTY_FILTERS: UsageFilters = { keyword: '', materialType: 'ALL', fromDate: '', toDate: '' };
const PAGE_SIZE = 50;
interface UsagePage {
  items: MaterialUsage[];
  page: number;
  totalElements: number;
  totalPages: number;
}

export interface MaterialUsage {
  materialUsageId: number;
  farmingActivityId?: number;
  activityName?: string;
  cropSeasonId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialType?: string;
  materialForm?: string | null;
  inputPurchaseDetailId?: number;
  recordedByMemberId?: number;
  recorderFullName?: string | null;
  usedAt: string;
  quantity: number;
  unit: string;
  dosage?: string | null;
  method?: string | null;
  appliedArea?: number | null;
  appliedAreaUnit?: string | null;
  appliedPlantCount?: number | null;
  safetyIntervalDays?: number | null;
  notes?: string | null;
}

export interface MaterialOption {
  id: number;
  farmId: number;
  materialName: string;
  materialType?: string;
  materialForm?: string | null;
  unit: string;
  description?: string;
  lotNumber?: string | null;
  germinationRate?: number | null;
  isActive?: boolean;
}

export function MaterialUsagePage() {
  const { selectedFarm } = useFarmWorkspace();
  return <MaterialUsageContent key={selectedFarm?.id ?? 'no-farm'} />;
}

function MaterialUsageContent() {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [editingUsage, setEditingUsage] = useState<MaterialUsage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const requests = useRef<{ list?: AbortController; materials?: AbortController; detail?: AbortController; save?: AbortController; delete?: AbortController }>({});

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<UsageFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showRemainingSections, setShowRemainingSections] = useState(false);
  const usageFormRef = useRef<HTMLFormElement>(null);
  const [selectedDetail, setSelectedDetail] = useState<MaterialUsage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Form states
  const [useExistingMaterial, setUseExistingMaterial] = useState(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | ''>('');
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customMaterialType, setCustomMaterialType] = useState('Phân bón hữu cơ');
  const [customLotNumber, setCustomLotNumber] = useState('');
  const [customGerminationRate, setCustomGerminationRate] = useState<number | ''>('');
  const [materialForm, setMaterialForm] = useState('Dạng hữu cơ vi sinh');
  const [quantity, setQuantity] = useState<number | ''>(5);
  const [unit, setUnit] = useState('bao');
  const [dosage, setDosage] = useState('');
  const [dosageManuallyEdited, setDosageManuallyEdited] = useState(false);
  const dosageMaterialContext = useRef('');
  const [method, setMethod] = useState('');
  const [appliedArea, setAppliedArea] = useState<number | ''>('');
  const [appliedAreaUnit, setAppliedAreaUnit] = useState('m²');
  const [appliedPlantCount, setAppliedPlantCount] = useState<number | ''>('');
  const [safetyDays, setSafetyDays] = useState<number | ''>('');
  const [usedAtTime, setUsedAtTime] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [farmingActivityId, setFarmingActivityId] = useState<number | ''>('');
  const { activity: usageActivity, failed: activityContextFailed, retry: retryActivityContext } = useMaterialUsageActivity(isCreateModalOpen, farmingActivityId);
  const effectiveSafetyDays = safetyDays === '' && editingUsage ? editingUsage.safetyIntervalDays : safetyDays;
  const isolationEndsAt = isolationEnd(usedAtTime, effectiveSafetyDays, lang);

  useEffect(() => {
    if (!isCreateModalOpen || showRemainingSections || editingUsage) return;
    if (!Number.isInteger(farmingActivityId) || Number(farmingActivityId) <= 0
      || (useExistingMaterial ? !selectedMaterialId : !customMaterialName.trim())
      || !unit.trim() || !usedAtTime || !dosage.trim() || dosage.trim().length > 100
      || quantity === '' || !Number.isFinite(quantity) || quantity <= 0
      || appliedArea === '' || !Number.isFinite(appliedArea) || appliedArea <= 0) return;
    const sections = usageFormRef.current?.querySelectorAll('.mu-entry-section-1, .mu-entry-section-2, .mu-entry-section-3');
    const valid = sections?.length === 3 && Array.from(sections).every(section =>
      Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')).every(input => input.checkValidity()));
    if (valid) {
      setNotification(null);
      setShowRemainingSections(true);
    }
  }, [isCreateModalOpen, showRemainingSections, editingUsage, farmingActivityId, useExistingMaterial, selectedMaterialId,
    customMaterialName, customMaterialType, unit, usedAtTime, dosage, quantity, appliedArea, appliedAreaUnit]);

  useEffect(() => {
    if (!isCreateModalOpen || editingUsage) return;
    const context = JSON.stringify([useExistingMaterial, selectedMaterialId, customMaterialType, unit]);
    const changedMaterial = dosageMaterialContext.current !== context;
    dosageMaterialContext.current = context;
    if (changedMaterial) setDosageManuallyEdited(false);
    if (changedMaterial || !dosageManuallyEdited) {
      setDosage(useExistingMaterial && !selectedMaterialId ? '' : suggestMaterialDosage(customMaterialType, unit));
    }
  }, [isCreateModalOpen, editingUsage, dosageManuallyEdited, useExistingMaterial, selectedMaterialId, customMaterialType, unit]);

  useEffect(() => {
    if (farmId) { loadUsages(); loadMaterials(); }
    return () => Object.values(requests.current).forEach(request => request?.abort());
  }, [farmId]);

  useRealtimeSync(() => {
    if (loading || saving || isCreateModalOpen || selectedDetail || detailLoading || deletingId !== null) return;
    void loadUsages(page, appliedFilters, true);
    void loadMaterials();
  });

  const loadMaterials = async () => {
    if (!farmId) return;
    requests.current.materials?.abort();
    const controller = new AbortController();
    requests.current.materials = controller;
    setMaterialsError(null);
    try {
      const res = await apiRequest<ApiResponse<MaterialOption[]>>('/material-usages/materials?farmId=' + farmId, { signal: controller.signal });
      if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Không tải được danh mục vật tư.');
      if (!controller.signal.aborted) setMaterials(res.data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setMaterials([]);
        setMaterialsError((lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to load material catalog." : error instanceof Error ? error.message : 'Không tải được danh mục vật tư.'));
      }
    }
  };

  const loadUsages = async (requestedPage = page, filters = appliedFilters, silent = false) => {
    if (!farmId) return;
    requests.current.list?.abort();
    const controller = new AbortController();
    requests.current.list = controller;
    if (!silent) {
      setLoading(true);
      setPage(requestedPage);
      setLoadError(null);
    }
    try {
      const params = new URLSearchParams({ farmId: String(farmId), size: String(PAGE_SIZE), page: String(requestedPage) });
      if (filters.keyword) params.set('keyword', filters.keyword);
      if (filters.materialType !== 'ALL') params.set('materialType', filters.materialType);
      if (filters.fromDate) params.set('fromDate', filters.fromDate + 'T00:00:00');
      if (filters.toDate) params.set('toDate', filters.toDate + 'T23:59:59');
      const fetchPage = async () => {
        const result = await apiRequest<ApiResponse<UsagePage>>('/material-usages?' + params, { signal: controller.signal });
        if (!result.success || !Array.isArray(result.data?.items)
          || !Number.isInteger(result.data.page) || !Number.isInteger(result.data.totalPages)
          || !Number.isInteger(result.data.totalElements) || result.data.totalElements < 0
          || result.data.page < 0 || result.data.totalPages < 0) {
          throw new Error(result.message || 'Không tải được lịch sử sử dụng vật tư.');
        }
        return result.data;
      };
      let result = await fetchPage();
      if (!controller.signal.aborted && requestedPage > Math.max(0, result.totalPages - 1)) {
        params.set('page', String(Math.max(0, result.totalPages - 1)));
        result = await fetchPage();
      }
      if (!controller.signal.aborted) {
        setLoadError(null);
        setUsages(result.items);
        setPage(result.page);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      if (!controller.signal.aborted && !silent) {
        setUsages([]);
        setLoadError((lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to load material usage history." : error instanceof Error ? error.message : 'Không tải được lịch sử sử dụng vật tư.'));
      }
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false);
    }
  };

  const applyFilters = (filters: UsageFilters) => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setFilterError((lang === 'en' ? "The start date must be on or before the end date." : 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'));
      return;
    }
    setFilterError(null);
    setAppliedFilters(filters);
    void loadUsages(0, filters);
  };
  const filterUsages = () => applyFilters({ keyword: searchKeyword.trim(), materialType: filterType, fromDate, toDate });
  useEffect(() => {
    const filters = { keyword: searchKeyword.trim(), materialType: filterType, fromDate, toDate };
    if (!farmId || JSON.stringify(filters) === JSON.stringify(appliedFilters)) return;
    const timer = window.setTimeout(() => applyFilters(filters), filters.keyword !== appliedFilters.keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [farmId, searchKeyword, filterType, fromDate, toDate, appliedFilters]);


  const handleSelectMaterial = (id: number | '') => {
    setSelectedMaterialId(id);
    setFieldErrors(errors => ({ ...errors, 'usage-material': '' }));
    const material = materials.find(item => item.id === id);
    if (material) {
      setUnit(material.unit);
      setCustomMaterialType(material.materialType ?? '');
      setMaterialForm(material.materialForm || defaultMaterialForm(material.materialType, material.unit));
    }
  };

  const openUsage = async (id: number, edit = false) => {
    requests.current.detail?.abort();
    const controller = new AbortController();
    requests.current.detail = controller;
    setDetailLoading(true);
    setNotification(null);
    setSelectedDetail(null);
    try {
      const res = await apiRequest<ApiResponse<MaterialUsage>>('/material-usages/' + id, { signal: controller.signal });
      if (!res.success || !res.data) throw new Error(res.message || 'Không tải được chi tiết sử dụng vật tư.');
      if (controller.signal.aborted) return;
      if (edit) {
        if (!res.data.farmingActivityId) throw new Error('Bản ghi chưa liên kết hoạt động canh tác, chưa thể chỉnh sửa.');
        setEditingUsage(res.data);
        setShowRemainingSections(true);
        setFieldErrors({});
        setUseExistingMaterial(true);
        setSelectedMaterialId(res.data.materialId);
        setCustomMaterialType(res.data.materialType ?? '');
        setMaterialForm(res.data.materialForm || defaultMaterialForm(res.data.materialType, res.data.unit));
        setQuantity(res.data.quantity);
        setUnit(res.data.unit);
        setUsedAtTime(res.data.usedAt);
        setNotes(res.data.notes ?? '');
        setFarmingActivityId(res.data.farmingActivityId);
        setDosage(res.data.dosage ?? '');
        setMethod(res.data.method ?? '');
        setAppliedArea(res.data.appliedArea ?? '');
        setAppliedAreaUnit(res.data.appliedAreaUnit || 'm²');
        setAppliedPlantCount(res.data.appliedPlantCount ?? '');
        setSafetyDays(res.data.safetyIntervalDays ?? '');
        setIsCreateModalOpen(true);
      } else setSelectedDetail(res.data);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: (lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to load material usage details." : error instanceof Error ? error.message : 'Không tải được chi tiết sử dụng vật tư.'), type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  const fieldError = (id: string) => fieldErrors[id] ? <p id={id + '-error'} role="alert" className="mu-field-error">{translate(fieldErrors[id])}</p> : null;
  const fieldProps = (id: string) => ({
    'aria-invalid': Boolean(fieldErrors[id]),
    'aria-describedby': fieldErrors[id] ? id + '-error' : undefined,
  });
  const getFormErrors = () => {
    const errors: Record<string, string> = {};
    const message = (vi: string, en: string) => lang === 'en' ? en : vi;
    usageFormRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach(input => {
      if (input.id && input.willValidate && !input.validity.valid) errors[input.id] = message('Vui lòng nhập giá trị hợp lệ.', 'Enter a valid value.');
    });
    if (!Number.isInteger(farmingActivityId) || Number(farmingActivityId) <= 0) errors['usage-activity'] = message('Vui lòng chọn hoạt động canh tác.', 'Select a farming activity.');
    if (!editingUsage && !usageFormRef.current?.querySelector<HTMLSelectElement>('#usage-season')?.value) errors['usage-season'] = message('Vui lòng chọn mùa vụ.', 'Select a season.');
    if (!usedAtTime || errors['usage-time']) errors['usage-time'] = message('Vui lòng nhập ngày giờ sử dụng hợp lệ.', 'Enter a valid application date and time.');
    if (useExistingMaterial && !selectedMaterialId) errors['usage-material'] = message('Vui lòng chọn vật tư.', 'Select a material.');
    if (!useExistingMaterial && (!customMaterialName.trim() || customMaterialName.trim().length > 160)) errors['usage-material-name'] = message('Nhập tên vật tư, tối đa 160 ký tự.', 'Enter a material name, up to 160 characters.');
    if (!unit.trim()) errors['usage-unit'] = message('Vui lòng chọn đơn vị.', 'Select a unit.');
    if (quantity === '' || !Number.isFinite(quantity) || quantity < 0.0001) errors['usage-quantity'] = message('Số lượng sử dụng phải lớn hơn 0.', 'Usage quantity must be greater than 0.');
    if (!dosage.trim()) errors['usage-dosage'] = message('Vui lòng nhập liều lượng / nồng độ.', 'Enter the dosage / concentration.');
    else if (dosage.trim().length > 100) errors['usage-dosage'] = message('Liều lượng tối đa 100 ký tự.', 'Dosage is limited to 100 characters.');
    if (appliedArea === '' || !Number.isFinite(appliedArea) || appliedArea < 0.01) errors['usage-applied-area'] = message('Diện tích áp dụng phải lớn hơn 0 (tối thiểu 0,01).', 'Applied area must be greater than 0 (minimum 0.01).');
    if (method.trim().length > 200) errors['usage-method'] = message('Phương pháp tối đa 200 ký tự.', 'Method is limited to 200 characters.');
    if (appliedPlantCount !== '' && (!Number.isInteger(appliedPlantCount) || appliedPlantCount <= 0)) errors['usage-plant-count'] = message('Số cây áp dụng phải là số nguyên dương.', 'Plant count must be a positive integer.');
    if (safetyDays !== '' && (!Number.isInteger(safetyDays) || safetyDays < 0 || safetyDays > 2147483647)) errors['usage-phi'] = message('Số ngày cách ly phải là số nguyên không âm hợp lệ.', 'The pre-harvest interval must be a valid non-negative integer.');
    return errors;
  };

  const handleSaveUsage = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !farmId) return;
    const errors = getFormErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      usageFormRef.current?.querySelector<HTMLElement>('#' + Object.keys(errors)[0])?.focus();
      return;
    }
    if (!showRemainingSections) return;
    setSaving(true);
    setNotification(null);
    const controller = new AbortController();
    requests.current.save = controller;
    try {
      let materialId = Number(selectedMaterialId);
      if (!useExistingMaterial && !editingUsage) {
        if (!customMaterialName.trim()) throw new Error('Vui lòng nhập tên vật tư mới.');
        const created = await apiRequest<ApiResponse<MaterialOption>>('/material-usages/materials', {
          method: 'POST', signal: controller.signal,
          data: {
            farmId,
            materialName: customMaterialName.trim(),
            materialType: customMaterialType,
            materialForm: materialForm || defaultMaterialForm(customMaterialType, unit),
            unit: unit.trim(),
            lotNumber: customLotNumber.trim() || undefined,
            germinationRate: customGerminationRate !== '' ? Number(customGerminationRate) : undefined,
          },
        });
        if (!created.success || !created.data?.id) throw new Error(created.message || 'Không tạo được vật tư.');
        if (controller.signal.aborted) return;
        materialId = created.data.id;
        setMaterials(prev => [created.data, ...prev]);
        setSelectedMaterialId(materialId);
        setUseExistingMaterial(true);
      }
      const res = await apiRequest<ApiResponse<MaterialUsage>>(editingUsage ? '/material-usages/' + editingUsage.materialUsageId : '/material-usages', {
        method: editingUsage ? 'PUT' : 'POST', signal: controller.signal,
        data: {
          ...(!editingUsage && { farmingActivityId }), materialId, usedAt: usedAtTime,
          quantity: Number(quantity), unit: unit.trim(), notes: notes.trim(),
          dosage: dosage.trim(), method: method.trim(),
          ...(materialForm.trim() && { materialForm: materialForm.trim() }),
          appliedArea: Number(appliedArea), appliedAreaUnit,
          ...(appliedPlantCount !== '' && { appliedPlantCount: Number(appliedPlantCount) }),
          safetyIntervalDays: safetyDays === '' ? null : safetyDays,
        },
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được sử dụng vật tư.');
      if (controller.signal.aborted) return;
      setNotification({ text: (lang === 'en' ? editingUsage ? "Material usage updated." : "Material usage recorded." : editingUsage ? 'Đã cập nhật sử dụng vật tư.' : 'Đã ghi nhận sử dụng vật tư.'), type: 'success' });
      setIsCreateModalOpen(false);
      loadUsages(0);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: (lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to save material usage." : error instanceof Error ? error.message : 'Không lưu được sử dụng vật tư.'), type: 'error' });
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId !== null) return;
    const controller = new AbortController();
    requests.current.delete = controller;
    setDeletingId(id);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<void>>('/material-usages/' + id, { method: 'DELETE', signal: controller.signal });
      if (!res.success) throw new Error(res.message || 'Không xóa được bản ghi.');
      if (controller.signal.aborted) return;
      setUsages(prev => prev.filter(item => item.materialUsageId !== id));
      setSelectedDetail(null);
      setNotification({ text: (lang === 'en' ? "Material usage record deleted." : 'Đã xóa bản ghi sử dụng vật tư.'), type: 'success' });
      await loadUsages();
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: (lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to delete record." : error instanceof Error ? error.message : 'Không xóa được bản ghi.'), type: 'error' });
    } finally {
      if (!controller.signal.aborted) { setDeletingId(null); setDeleteTarget(null); }
    }
  };

  const hasAppliedFilters = Boolean(appliedFilters.keyword || appliedFilters.materialType !== 'ALL' || appliedFilters.fromDate || appliedFilters.toDate);
  const busy = saving || detailLoading || deletingId !== null;
  const resetFilters = () => {
    setSearchKeyword(''); setFilterType('ALL'); setFromDate(''); setToDate('');
    applyFilters(EMPTY_FILTERS);
  };
  const openCreate = () => {
    setShowRemainingSections(false);
    setEditingUsage(null); setNotification(null); setUseExistingMaterial(true); setFieldErrors({});
    setSelectedMaterialId(''); setCustomMaterialName(''); setCustomMaterialType('Phân bón hữu cơ');
    setCustomLotNumber(''); setCustomGerminationRate('');
    setMaterialForm('Dạng hữu cơ vi sinh');
    setFarmingActivityId(''); setQuantity(5); setUnit('bao'); setDosage(''); setMethod('');
    setDosageManuallyEdited(false);
    setAppliedArea(''); setAppliedAreaUnit('m²'); setAppliedPlantCount('');
    setSafetyDays(''); setNotes('');
    setUsedAtTime(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setIsCreateModalOpen(true);
  };


  return (
    <section className="material-usage-page">
      <PageHeading className="material-usage-heading" title={<>{lang === 'en' ? 'Agricultural Input & Material Usage History' : 'Quản lý & Lịch sử sử dụng vật tư nông nghiệp'}</>}><div className="mu-heading-actions">
          <Button type="button" variant="secondary" onClick={() => { void loadUsages(); void loadMaterials(); }} disabled={!farmId || loading || busy} aria-busy={loading}>
            <Icon name={loading ? 'loader' : 'refresh'} className={loading ? 'mu-spin' : undefined} />{(lang === 'en' ? loading ? "Loading..." : "Reload" : loading ? 'Đang tải...' : 'Tải lại')}</Button>
          <Button type="button" variant="primary" disabled={!farmId || busy} onClick={openCreate}>
            <Icon name={saving ? 'loader' : 'plus'} className={saving ? 'mu-spin' : undefined} />{saving ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Record Material Usage' : 'Ghi nhận sử dụng vật tư')}</Button>
        </div></PageHeading>
      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div role={notification.type === 'error' && !isCreateModalOpen ? 'alert' : 'status'} className={'mu-notice mu-notice-' + notification.type}>
        <Icon name={notification.type === 'error' ? 'warning' : 'check-circle'} /><span>{translate(notification.text)}</span></div>))}
      {detailLoading && <p className="mu-loading-detail" role="status"><Icon name="loader" className="mu-spin" />{(lang === 'en' ? "Loading material usage details..." : "Đang tải chi tiết sử dụng vật tư...")}</p>}
      {/* Metrics hidden to streamline management page per user request */}


      <section className="panel mu-history" aria-label={lang === 'en' ? 'Usage history' : 'Lịch sử sử dụng'} aria-busy={loading}>
      <form className="mu-filters mu-history-filters" onSubmit={event => { event.preventDefault(); filterUsages(); }} aria-label={(lang === 'en' ? "Search and filter materials" : "Tìm kiếm và lọc vật tư")}>
        <div className="mu-filter-grid">
          <div className="mu-field mu-search-field"><label htmlFor="mu-search">{(lang === 'en' ? "Keyword search" : "Tìm kiếm từ khóa")}</label>
            <div className="mu-search-input"><Icon name="search" /><input className="ui-input" id="mu-search" type="search" placeholder={(lang === 'en' ? "Material name, notes..." : "Tên vật tư, ghi chú...")} value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} /></div></div>
          <div className="mu-field"><label htmlFor="mu-type">{(lang === 'en' ? "Material type" : "Chủng loại vật tư")}</label><select className="ui-select" id="mu-type" value={filterType} onChange={event => setFilterType(event.target.value)}>
            <option value="ALL">{(lang === 'en' ? "All material types" : "Tất cả loại vật tư")}</option>{['Phân bón hữu cơ', 'Phân bón hòa tan', 'Dinh dưỡng lỏng', 'Chế phẩm sinh học', 'Thuốc BVTV sinh học', 'Hạt giống'].map(type => <option key={type} value={type}>{materialTypeLabel(type, lang)}</option>)}
          </select></div>
          <div className="mu-field"><label htmlFor="mu-from">{(lang === 'en' ? "From date" : "Từ ngày")}</label><input className="ui-input" id="mu-from" type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setFilterError(null); }} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'mu-date-error' : undefined} /></div>
          <div className="mu-field"><label htmlFor="mu-to">{(lang === 'en' ? "To date" : "Đến ngày")}</label><input className="ui-input" id="mu-to" type="date" value={toDate} onChange={event => { setToDate(event.target.value); setFilterError(null); }} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'mu-date-error' : undefined} /></div>
          <div className="mu-filter-actions"><button type="button" className="zone-clean-reload-btn" disabled={busy}
            title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
            aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} onClick={resetFilters}><Icon name="refresh" size={16} /></button></div>
        </div>
        {filterError && <p id="mu-date-error" className="mu-field-error" role="alert">{translate(filterError)}</p>}
        {hasAppliedFilters && <div className="mu-applied-filters" aria-label={(lang === 'en' ? "Applied filters" : "Bộ lọc đang áp dụng")}><span>{(lang === 'en' ? "Filtering:" : "Đang lọc:")}</span>
          {appliedFilters.keyword && <span className="mu-filter-chip">{(lang === 'en' ? "Keyword: " : "Từ khóa: ")} {appliedFilters.keyword}</span>}
          {appliedFilters.materialType !== 'ALL' && <span className="mu-filter-chip">{translate(appliedFilters.materialType)}</span>}
          {appliedFilters.fromDate && <span className="mu-filter-chip">{(lang === 'en' ? "From: " : "Từ: ")} {appliedFilters.fromDate.split('-').reverse().join('/')}</span>}
          {appliedFilters.toDate && <span className="mu-filter-chip">{(lang === 'en' ? "To: " : "Đến: ")} {appliedFilters.toDate.split('-').reverse().join('/')}</span>}
        </div>}
      </form>
        {loading ? <div className="mu-table-loading" role="status"><span className="mu-sr-only">{(lang === 'en' ? "Loading material usage history..." : "Đang tải nhật ký sử dụng vật tư...")}</span>{[0, 1, 2, 3].map(row => <div key={row} className="mu-skeleton mu-row-skeleton" aria-hidden="true" />)}</div> :
          loadError ? <div className="mu-empty" role="alert"><span className="mu-empty-icon"><Icon name="warning" size={28} /></span><h3>{(lang === 'en' ? "Unable to load usage history" : "Chưa tải được lịch sử sử dụng")}</h3><p>{translate(loadError)}</p><Button type="button" variant="secondary" onClick={() => void loadUsages()}><Icon name="refresh" />{(lang === 'en' ? "Retry" : "Thử lại")}</Button></div> :
          !farmId ? <div className="mu-empty"><Icon name="plots" size={28} /><h3>{(lang === 'en' ? "Select a farm first" : "Hãy chọn trang trại trước")}</h3><p>{(lang === 'en' ? "Select a farm workspace to view history and record material usage." : "Chọn không gian trang trại để xem lịch sử và ghi nhận vật tư.")}</p></div> :
          usages.length === 0 ? <div className="mu-empty"><span className="mu-empty-icon"><Icon name={hasAppliedFilters ? 'search' : 'box'} size={28} /></span>
            <h3>{(lang === 'en' ? hasAppliedFilters ? "No matching records found" : "No material usage records yet" : hasAppliedFilters ? 'Không tìm thấy bản ghi phù hợp' : 'Chưa có bản ghi sử dụng vật tư')}</h3>
            <p>{(lang === 'en' ? hasAppliedFilters ? "Try changing the keyword or clearing filters to view the list." : "Record your first material usage to track inputs and pre-harvest intervals." : hasAppliedFilters ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc để xem lại danh sách.' : 'Ghi nhận lần sử dụng đầu tiên để theo dõi vật tư và thời gian cách ly.')}</p>
            {hasAppliedFilters ? <Button type="button" variant="secondary" onClick={resetFilters}>{(lang === 'en' ? "Clear filters" : "Xóa bộ lọc")}</Button> : <Button type="button" variant="primary" disabled={busy} onClick={openCreate}><Icon name="plus" />{(lang === 'en' ? "Record material usage" : "Ghi nhận sử dụng vật tư")}</Button>}
          </div> : <MaterialUsageHistory usages={usages} busy={busy} deletingId={deletingId} onOpen={openUsage} onDelete={(id, name) => setDeleteTarget({ id, name })} />}
        {farmId && !loadError && <div className="mu-pagination"><span>{(lang === 'en' ? loading ? "Loading..." : totalElements === 0 ? "0 records" : (((((page * PAGE_SIZE + 1) + '–' + (page * PAGE_SIZE + usages.length)) + " of ") + totalElements) + " records") : loading ? 'Đang tải...' : totalElements === 0 ? '0 bản ghi' : (page * PAGE_SIZE + 1) + '–' + (page * PAGE_SIZE + usages.length) + ' trên ' + totalElements + ' bản ghi')}</span>
          <Pagination page={page + 1} totalPages={totalPages} disabled={loading || busy} onChange={number => { void loadUsages(number - 1); }} /></div>}
      </section>

      <Modal structured customLayout open={isCreateModalOpen} onClose={() => { if (!saving) setIsCreateModalOpen(false); }}
        className="mu-entry-dialog modal-form-layout"
        title={editingUsage ? (lang === 'en' ? 'Edit Material Usage' : 'Chỉnh sửa sử dụng vật tư') : (lang === 'en' ? 'Record Material Usage' : 'Ghi nhận sử dụng vật tư')}>
        <div className="modal-header">
          <h2>{editingUsage ? (lang === 'en' ? 'Edit Material Usage' : 'Chỉnh sửa sử dụng vật tư') : (lang === 'en' ? 'Record Material Usage' : 'Ghi nhận sử dụng vật tư')}</h2>
          <button type="button" className="modal-close" disabled={saving} aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => setIsCreateModalOpen(false)}><Icon name="close" size={18} /></button>
        </div>
        <form ref={usageFormRef} noValidate onSubmit={handleSaveUsage} className="mu-entry-form"
          onChangeCapture={event => { const id = (event.target as unknown as HTMLElement).id; if (fieldErrors[id]) setFieldErrors(errors => ({ ...errors, [id]: '' })); }}
          onBlurCapture={event => { const input = event.target as unknown as HTMLElement; if (input.id && input.id !== 'usage-material-search' && input.tagName !== 'BUTTON') { const error = getFormErrors()[input.id] ?? ''; setFieldErrors(errors => ({ ...errors, [input.id]: error })); } }}>
          <div className="modal-body mu-entry-body">
          <fieldset disabled={saving} className="mu-form-fieldset">
            <MaterialUsageFormSection number={1} title={lang === 'en' ? 'Usage information' : 'Thông tin sử dụng'}>
              <div className="mu-entry-grid">
                {editingUsage ? <>
                  <div className="mu-field structured-field-card ui-form-context">
                    <div className="structured-field-header"><span className="structured-field-label" id="usage-season-label">{lang === 'en' ? 'Linked season' : 'Mùa vụ liên kết'}</span><span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span></div>
                    <div id="usage-season-readonly" aria-labelledby="usage-season-label">{usageActivity?.seasonName || (lang === 'en' ? 'Based on linked activity' : 'Theo hoạt động liên kết')}</div>
                  </div>
                  <div className="mu-field structured-field-card ui-form-context">
                    <div className="structured-field-header"><span className="structured-field-label" id="usage-activity-label">{lang === 'en' ? 'Farming activity' : 'Hoạt động canh tác'}</span><span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span></div>
                    <div id="usage-activity" tabIndex={-1} aria-labelledby="usage-activity-label">{editingUsage.activityName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</div>
                  </div>
                </> : farmId ? <FarmingActivityPicker farmId={farmId} value={farmingActivityId} onChange={setFarmingActivityId} disabled={saving} errors={fieldErrors} /> : null}
              <div className="mu-field structured-field-card"><label htmlFor="usage-time">{lang === 'en' ? 'Application date and time' : 'Ngày giờ sử dụng'} <span className="mu-required">*</span></label><input className="ui-input" id="usage-time" {...fieldProps('usage-time')} aria-label={(lang === 'en' ? "Application date and time" : "Ngày giờ sử dụng")} type="datetime-local" min={!editingUsage ? `${new Date().toISOString().split('T')[0]}T00:00` : undefined} step="any" required value={usedAtTime} onChange={event => setUsedAtTime(event.target.value)} />{fieldError('usage-time')}</div>
              <div className="mu-field structured-field-card ui-form-context">
                <div className="structured-field-header"><span className="structured-field-label">{lang === 'en' ? 'Cultivation block' : 'Lô canh tác'}</span><span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span></div>
                <div className="mu-linked-block" role="status">
                  {!farmingActivityId ? (lang === 'en' ? 'Select an activity to view its cultivation block' : 'Chọn hoạt động để xem lô canh tác')
                    : activityContextFailed ? <><span>{lang === 'en' ? 'Unable to load cultivation block' : 'Không tải được lô canh tác'}</span><button type="button" disabled={saving} onClick={retryActivityContext}>{lang === 'en' ? 'Retry' : 'Thử lại'}</button></>
                    : !usageActivity ? (lang === 'en' ? 'Loading cultivation block...' : 'Đang tải lô canh tác...')
                    : usageActivity.blockName || (lang === 'en' ? 'Not linked' : 'Chưa liên kết lô')}
                </div>
              </div>
              </div>
            </MaterialUsageFormSection>
            <MaterialUsageFormSection number={2} title={lang === 'en' ? 'Material used' : 'Vật tư sử dụng'}>
              <div className="mu-material-toggle" aria-label={(lang === 'en' ? "Material source" : "Nguồn vật tư")}>
                <button type="button" aria-pressed={useExistingMaterial} onClick={() => setUseExistingMaterial(true)}><Icon name="box" size={16} />{(lang === 'en' ? "Select existing material" : "Chọn vật tư có sẵn")}</button>
                <button type="button" disabled={Boolean(editingUsage)} aria-pressed={!useExistingMaterial} onClick={() => setUseExistingMaterial(false)}><Icon name="plus" size={16} />{(lang === 'en' ? "Enter new material" : "Nhập vật tư mới")}</button>
              </div>
              {useExistingMaterial ? <>
                {materialsError && <div role="alert" className="mu-entry-help"><p>{translate(materialsError)}</p><Button type="button" variant="secondary" onClick={loadMaterials}>{(lang === 'en' ? "Reload material catalog" : "Tải lại danh mục vật tư")}</Button></div>}
                <div className="mu-field structured-field-card"><label htmlFor="usage-material">{lang === 'en' ? 'Material name' : 'Tên vật tư'} <span className="mu-required">*</span></label>
                  <MaterialUsageMaterialPicker materials={materials} value={selectedMaterialId} onChange={handleSelectMaterial}
                    fallbackName={editingUsage?.materialName} error={fieldErrors['usage-material']} />
                </div>
                <div className="mu-material-metadata" role="status">
                  {selectedMaterialId ? <>
                    <span>{lang === 'en' ? 'Type' : 'Loại'}: <strong>{customMaterialType ? materialTypeLabel(customMaterialType, lang) : (lang === 'en' ? 'Unclassified' : 'Chưa phân loại')}</strong></span>
                    <span>{lang === 'en' ? 'Unit' : 'Đơn vị'}: <strong aria-label={lang === 'en' ? 'Unit' : 'Đơn vị'}>{materialUnitLabel(unit, lang)}</strong></span>
                  </> : (lang === 'en' ? 'Select a material to view its details.' : 'Chọn vật tư để xem thông tin.')}
                </div>

              </> : <div className="mu-field structured-field-card"><label htmlFor="usage-material-name">{(lang === 'en' ? "Material name " : "Tên vật tư ")} <span className="mu-required">*</span></label><input className="ui-input" id="usage-material-name" {...fieldProps('usage-material-name')} required maxLength={160} placeholder={(lang === 'en' ? "Example: Vermicompost" : "Ví dụ: Phân trùn quế Vermicompost")} value={customMaterialName} onChange={event => setCustomMaterialName(event.target.value)} />{fieldError('usage-material-name')}</div>}

              {!useExistingMaterial && <div className="mu-entry-grid mu-entry-three-columns mu-new-material-info"><div className="mu-field structured-field-card"><label htmlFor="usage-material-group">{(lang === 'en' ? "Material group " : "Nhóm vật tư ")} <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="leaf" /><select className="ui-select" id="usage-material-group" value={materialGroupName(customMaterialType)} disabled={useExistingMaterial} onChange={event => {
                    const nextType = MATERIAL_GROUPS.find(group => group.name === event.target.value)?.types[0] ?? '';
                    setCustomMaterialType(nextType);
                    setMaterialForm(defaultMaterialForm(nextType, unit));
                  }}>
                    {materialGroupName(customMaterialType) === 'Khác' && <option value="Khác">{(lang === 'en' ? "Other" : "Khác")}</option>}{MATERIAL_GROUPS.map(group => <option key={group.name} value={group.name}>{translate(group.name)}</option>)}
                  </select></div>
                </div>
                <div className="mu-field structured-field-card"><label htmlFor="usage-material-type">{(lang === 'en' ? "Material type " : "Phân loại vật tư ")} <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="sprout" /><select className="ui-select" id="usage-material-type" disabled={useExistingMaterial} value={customMaterialType} onChange={event => {
                    setCustomMaterialType(event.target.value);
                    setMaterialForm(defaultMaterialForm(event.target.value, unit));
                  }}>
                    {!MATERIAL_TYPES.includes(customMaterialType) && <option value={customMaterialType}>{materialTypeLabel(customMaterialType, lang) || (lang === 'en' ? 'Unclassified' : 'Chưa phân loại')}</option>}
                    {MATERIAL_TYPES.map(type => <option key={type} value={type}>{materialTypeLabel(type, lang)}</option>)}
                  </select></div>
                </div>
                <div className="mu-field structured-field-card"><label htmlFor="usage-unit">{(lang === 'en' ? "Inventory unit " : "Đơn vị quản lý ")} <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="weight" /><select className="ui-select" id="usage-unit" {...fieldProps('usage-unit')} aria-label={(lang === 'en' ? "Unit" : "Đơn vị")} disabled={useExistingMaterial} value={unit} onChange={event => setUnit(event.target.value)}>
                    {getMaterialUnitOptions(unit, lang).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select></div>{fieldError('usage-unit')}
                </div></div>}

              {!useExistingMaterial && (
                <div className="mu-entry-grid mu-entry-two-columns" style={{ marginTop: '10px' }}>
                  <div className="mu-field structured-field-card">
                    <label htmlFor="usage-material-lot">
                      {lang === 'en' ? 'Seed / Material Lot Number' : 'Số lô kiểm định hạt giống / vật tư'}
                      <span className="structured-field-badge" style={{ marginLeft: '6px', color: '#059669', background: '#ecfdf5' }}>
                        VietGAP VG-NL-03
                      </span>
                    </label>
                    <input
                      className="ui-input"
                      id="usage-material-lot"
                      maxLength={60}
                      placeholder={lang === 'en' ? 'e.g. LOT-F1-2026-09' : 'Ví dụ: LOT-MELON-2026-F1'}
                      value={customLotNumber}
                      onChange={(event) => setCustomLotNumber(event.target.value)}
                    />
                  </div>
                  <div className="mu-field structured-field-card">
                    <label htmlFor="usage-material-germination">
                      {lang === 'en' ? 'Germination Rate (%)' : 'Tỷ lệ nảy mầm (%)'}
                      <span className="structured-field-badge" style={{ marginLeft: '6px', color: '#059669', background: '#ecfdf5' }}>
                        ≥ 85%
                      </span>
                    </label>
                    <input
                      className="ui-input"
                      id="usage-material-germination"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder={lang === 'en' ? 'e.g. 95' : 'Ví dụ: 95 (%)'}
                      value={customGerminationRate}
                      onChange={(event) => setCustomGerminationRate(event.target.value ? Number(event.target.value) : '')}
                    />
                  </div>
                </div>
              )}
            </MaterialUsageFormSection>
            <MaterialUsageFormSection number={3} title={lang === 'en' ? 'Usage amount' : 'Lượng sử dụng'}>
              <div className="mu-entry-grid mu-entry-three-columns"><div className="mu-field structured-field-card"><label htmlFor="usage-quantity">{lang === 'en' ? 'Usage Quantity' : 'Số lượng sử dụng'} <span className="mu-required">*</span></label>
                  <div className="mu-compound-input"><input className="ui-input" id="usage-quantity" {...fieldProps('usage-quantity')} type="number" aria-label={(lang === 'en' ? "Quantity" : "Số lượng")} step="any" min="0.0001" required value={quantity} onChange={event => setQuantity(event.target.value ? Number(event.target.value) : '')} />
                    <span className="mu-compound-unit" aria-label={lang === 'en' ? 'Usage unit' : 'Đơn vị sử dụng'}>{materialUnitLabel(unit, lang)}</span>
                  </div>{fieldError('usage-quantity')}</div>
                <div className="mu-field structured-field-card"><label htmlFor="usage-dosage">{lang === 'en' ? 'Dosage / Concentration' : 'Liều lượng / nồng độ'} <span className="mu-required">*</span> <Icon name="help" size={15} aria-label={lang === 'en' ? 'Enter per product label recommendations' : 'Nhập theo khuyến cáo trên nhãn sản phẩm'} /></label>
                  <DosageInput required value={dosage} onChange={value => { setDosageManuallyEdited(true); setDosage(value); }} materialType={customMaterialType} materialUnit={unit} error={fieldErrors['usage-dosage']} />{fieldError('usage-dosage')}

                </div>
                <div className="mu-field structured-field-card"><label htmlFor="usage-applied-area">{lang === 'en' ? 'Applied Area' : 'Diện tích áp dụng'} <span className="mu-required">*</span></label>
                  <div className="mu-compound-input"><span className="mu-input-icon" aria-hidden="true"><Icon name="plots" /></span><input className="ui-input" id="usage-applied-area" {...fieldProps('usage-applied-area')} required aria-label={(lang === 'en' ? "Applied area" : "Diện tích áp dụng")} type="number" step="any" min="0.01" placeholder={lang === 'en' ? 'e.g. 500' : 'Ví dụ: 500'} value={appliedArea} onChange={event => setAppliedArea(event.target.value === '' ? '' : Number(event.target.value))} /><select className="ui-select" aria-label={(lang === 'en' ? "Area unit" : "Đơn vị diện tích")} value={appliedAreaUnit} onChange={event => setAppliedAreaUnit(event.target.value)}>{AREA_UNITS.map(areaUnit => <option key={areaUnit} value={areaUnit}>{translate(areaUnit)}</option>)}</select></div>
                  {fieldError('usage-applied-area')}</div></div>
            </MaterialUsageFormSection>
            {showRemainingSections && <>
            <MaterialUsageFormSection number={4} title={lang === 'en' ? 'Application method' : 'Cách sử dụng'}>
              <div className="mu-field structured-field-card"><label htmlFor="usage-method">{lang === 'en' ? 'Application Method' : 'Phương pháp sử dụng'}</label><MethodInput value={method} onChange={setMethod} error={fieldErrors['usage-method']} />{fieldError('usage-method')}</div>
              <div className="mu-entry-grid mu-method-details"><div className="mu-field structured-field-card"><label htmlFor="usage-material-form">{(lang === 'en' ? "Material form" : "Dạng vật tư")}</label>
                  <div className="mu-icon-field"><Icon name="granules" /><select className="ui-select" id="usage-material-form" aria-label={(lang === 'en' ? "Material form" : "Dạng vật tư")} value={materialForm} onChange={event => setMaterialForm(event.target.value)}>
                    {materialForm && !MATERIAL_FORMS.includes(materialForm) && <option value={materialForm}>{translate(materialForm)}</option>}
                    {MATERIAL_FORMS.map(form => <option key={form} value={form}>{translate(form)}</option>)}
                  </select></div>

                </div>
                <div className="mu-field structured-field-card"><label htmlFor="usage-plant-count">{lang === 'en' ? 'Target Plant Count' : 'Số cây áp dụng'}</label>
                  <div className="mu-compound-input"><span className="mu-input-icon" aria-hidden="true"><Icon name="sprout" /></span><input className="ui-input" id="usage-plant-count" {...fieldProps('usage-plant-count')} aria-label={(lang === 'en' ? "Number of plants treated" : "Số cây áp dụng")} type="number" step="1" min="1" placeholder={lang === 'en' ? 'Enter if needed' : 'Ví dụ: 120'} value={appliedPlantCount} onChange={event => setAppliedPlantCount(event.target.value === '' ? '' : Number(event.target.value))} /><span className="mu-compound-unit" aria-label={lang === 'en' ? 'Plant count unit' : 'Đơn vị số cây'}>{lang === 'en' ? 'plants' : 'cây'}</span></div>
                  {fieldError('usage-plant-count')}
                </div></div>
            </MaterialUsageFormSection>
            <MaterialUsageFormSection number={5} title={lang === 'en' ? 'Safety and notes' : 'An toàn và ghi chú'}>
              <div className="mu-entry-grid"><div className="mu-field structured-field-card"><label htmlFor="usage-phi">{lang === 'en' ? 'Pre-harvest interval (days)' : 'Thời gian cách ly trước thu hoạch (ngày)'}</label><div className="mu-input-with-unit"><input className="ui-input" id="usage-phi" {...fieldProps('usage-phi')} type="number" aria-label={(lang === 'en' ? "Pre-harvest interval days" : "Số ngày cách ly")} min="0" max="2147483647" step="1" placeholder={(lang === 'en' ? "Example: 7" : "Ví dụ: 7")} value={safetyDays} onChange={event => setSafetyDays(event.target.value === '' ? '' : Number(event.target.value))} /><span>{lang === 'en' ? 'days' : 'ngày'}</span></div>
                  {fieldError('usage-phi')}
                </div>
                <div className="mu-field structured-field-card ui-form-context"><label htmlFor="usage-isolation-end">{lang === 'en' ? 'Expected harvest date' : 'Dự kiến được thu hoạch từ'}</label>
                  <div className="mu-calculated-date"><input className="ui-input" id="usage-isolation-end" readOnly value={isolationEndsAt} placeholder={lang === 'en' ? 'Not determined' : 'Chưa xác định'} /><Icon name="calendar" /></div>

                </div>
              </div>
              <div className="mu-field mu-notes-field structured-field-card"><label htmlFor="usage-notes">{lang === 'en' ? 'Notes' : 'Ghi chú'}</label><textarea className="ui-textarea" id="usage-notes" {...fieldProps('usage-notes')} aria-label={lang === 'en' ? 'Notes' : 'Ghi chú'} maxLength={1000} rows={2} placeholder={(lang === 'en' ? "Enter usage notes, material origin, or certification..." : "Nhập ghi chú về lần sử dụng, nguồn gốc hoặc chứng nhận vật tư...")} value={notes} onChange={event => setNotes(event.target.value)} />{fieldError('usage-notes')}<span className="mu-entry-character-count">{notes.length}{(lang === 'en' ? "/1000 characters" : "/1000 ký tự")}</span></div>
            </MaterialUsageFormSection>
            </>}
          </fieldset>
          </div>
          <div className="modal-footer mu-entry-footer">
          {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner mu-entry-error">{translate(notification.text)}</p>}
          <span>{!showRemainingSections ? (lang === 'en' ? 'Complete the fields above to add application and safety details.' : 'Nhập đủ thông tin bên trên để bổ sung cách sử dụng và thông tin an toàn.') : <><span className="mu-required">*</span> {(lang === 'en' ? " Required information" : " Thông tin bắt buộc")}</>}</span><div>
            <Button className="ui-cancel-button" type="button" variant="secondary" disabled={saving} onClick={() => setIsCreateModalOpen(false)}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
            {showRemainingSections && <Button type="submit" variant="primary" loading={saving}>{saving ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : editingUsage ? (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi') : (lang === 'en' ? 'Save Record' : 'Lưu ghi nhận')}</Button>}
          </div></div>
        </form>
      </Modal>

      {/* Modal 2: Xem chi tiết lịch sử sử dụng vật tư */}
      {selectedDetail && (
        <Modal structured open className="material-usage-detail-modal" onClose={() => { if (deletingId === null) setSelectedDetail(null); }} title={lang === 'en' ? 'Material usage details' : 'Chi tiết sử dụng vật tư'}>
          <div className="ui-detail-field ui-detail-primary" style={{ marginBottom: '16px' }}><span>{lang === 'en' ? 'Material name' : 'Tên vật tư'}</span><div>{selectedDetail.materialName}</div></div>
            <div className="mu-form-grid">
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Type" : "Chủng loại")}</span>
                <strong>{selectedDetail.materialType ? materialTypeLabel(selectedDetail.materialType, lang) : (lang === 'en' ? 'Agricultural inputs' : 'Vật tư đầu vào')}</strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Material form" : "Dạng vật tư")}</span>
                <strong>{translate(selectedDetail.materialForm || defaultMaterialForm(selectedDetail.materialType, selectedDetail.unit))}</strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Weight / Volume" : "Khối lượng / Thể tích")}</span>
                <strong>{uiFormatNumber(selectedDetail.quantity, lang)} {materialUnitLabel(selectedDetail.unit, lang)}</strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Applied dosage" : "Liều lượng áp dụng")}</span>
                <strong>{(lang === 'en' ? selectedDetail.dosage || "No data yet" : selectedDetail.dosage || 'Chưa có dữ liệu')}</strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Application method" : "Cách thức xử lý")}</span>
                <strong>{(lang === 'en' ? selectedDetail.method || "No data yet" : selectedDetail.method || 'Chưa có dữ liệu')}</strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Applied area / Plant count" : "Diện tích / Số cây áp dụng")}</span>
                <strong>
                  {selectedDetail.appliedArea != null ? `${selectedDetail.appliedArea} ${selectedDetail.appliedAreaUnit || 'm²'}` : '—'}
                  {(lang === 'en' ? selectedDetail.appliedPlantCount != null ? ` · ${selectedDetail.appliedPlantCount} plants` : "" : selectedDetail.appliedPlantCount != null ? ` · ${selectedDetail.appliedPlantCount} cây` : '')}
                </strong>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Safe pre-harvest interval" : "Thời gian cách ly an toàn")}</span>
                <div>
                  {selectedDetail.safetyIntervalDays == null ? (lang === 'en' ? "No data yet" : 'Chưa có dữ liệu') : selectedDetail.safetyIntervalDays > 0 ? (
                    <span className="mu-badge mu-badge-amber">
                      {(lang === 'en' ? "⏳ Withholding period " : "⏳ Cách ly ")} {selectedDetail.safetyIntervalDays} {(lang === 'en' ? " days" : " ngày")}
                    </span>
                  ) : (
                    <span className="mu-badge mu-badge-green">
                      {(lang === 'en' ? "✓ Biologically safe (0 days)" : "✓ An toàn sinh học (0 ngày)")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="mu-detail-label">{(lang === 'en' ? "Recorded at" : "Thời điểm ghi chép")}</span>
                <strong>
                  {uiFormatDateTime(selectedDetail.usedAt, lang)}
                </strong>
              </div>
              <div className="mu-form-wide">
                <span className="mu-detail-label">{(lang === 'en' ? "Linked farming activity" : "Hoạt động canh tác liên kết")}</span>
                <strong>
                  {(lang === 'en' ? selectedDetail.activityName || `Activity` : selectedDetail.activityName || `Hoạt động`)}
                </strong>
              </div>
              <div className="mu-form-wide mu-detail-note">
                <span className="mu-detail-label">
                  {(lang === 'en' ? "Traceability Notes & VietGAP Compliance" : "Ghi chú truy xuất & Tuân thủ VietGAP")}
                </span>
                <p>
                  {(lang === 'en' ? selectedDetail.notes || "No additional notes." : selectedDetail.notes || 'Không có ghi chú thêm.')}
                </p>
              </div>
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '24px' }}>
              <Button
                type="button"
                variant="danger"
                className="material-usage-delete-button"
                disabled={deletingId !== null} onClick={() => setDeleteTarget({ id: selectedDetail.materialUsageId, name: selectedDetail.materialName })}
              >
                <Icon name="trash" /> {(lang === 'en' ? " Delete record" : " Xóa bản ghi")}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={detailLoading || deletingId !== null}
                onClick={() => {
                  const id = selectedDetail.materialUsageId;
                  setSelectedDetail(null);
                  void openUsage(id, true);
                }}
              >
                <Icon name="edit" size={15} /> {(lang === 'en' ? "Edit" : "Chỉnh sửa")}
              </Button>
              <Button className={'ui-close-action'} type="button" variant="secondary" onClick={() => setSelectedDetail(null)}>
                {(lang === 'en' ? "Close" : "Đóng")}
              </Button>
            </div>
        </Modal>
      )}
      <ConfirmDialog open={Boolean(deleteTarget)} title={lang === 'en' ? 'Delete material usage' : 'Xóa sử dụng vật tư'}
        description={lang === 'en' ? <>{"Delete material usage record \""}<strong>{deleteTarget?.name}</strong>{"\"?"}</> : <>{"Xóa bản ghi sử dụng vật tư \""}<strong>{deleteTarget?.name}</strong>{"\"?"}</>}
        tone="danger" loading={deletingId !== null} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget.id); }} />
    </section>
  );
}
