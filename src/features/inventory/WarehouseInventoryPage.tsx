import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { LoadError } from '../../shared/components/LoadError';
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { Modal } from '../../shared/components/Modal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';


import { formatNumber as uiFormatNumber, formatDate } from '../../shared/format/formatters';

import { usePagination } from '../../shared/hooks/usePagination';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { materialTypeLabel, materialUnitLabel } from '../operations/materialUsageLabels';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

import {
  WarehouseResp,
  InventoryItemResp,
  fetchWarehousesApi,
  createWarehouseApi,
  updateWarehouseApi,
  deleteWarehouseApi,
  fetchInventoriesApi,
  createInventoryApi,
  updateInventoryApi,
  deleteInventoryApi,
} from './warehouseService';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export function WarehouseInventoryPage({ embedded = false }: { embedded?: boolean }) {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const [activeSubTab, setActiveSubTab] = useState<'warehouses' | 'inventory'>('warehouses');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'warehouse' | 'inventory'; id: number; farmId: number | undefined } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [warehouseLoadError, setWarehouseLoadError] = useState<string | null>(null);
  const [inventoryLoadError, setInventoryLoadError] = useState<string | null>(null);

  // Warehouses state
  const [warehouses, setWarehouses] = useState<WarehouseResp[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseResp | null>(null);
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false);
  const [createWarehouseForm, setCreateWarehouseForm] = useState({ warehouseName: '', address: '', imageUrl: '' });
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [searchWarehouseKeyword, setSearchWarehouseKeyword] = useState('');

  // Inventory state
  const [inventories, setInventories] = useState<InventoryItemResp[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItemResp | null>(null);
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'ALL'>('ALL');
  const [searchMaterialKeyword, setSearchMaterialKeyword] = useState('');
  const [editingInventory, setEditingInventory] = useState<InventoryItemResp | null>(null);
  const [updateInventoryForm, setUpdateInventoryForm] = useState({
    quantityOnHand: '',
    reorderLevel: '',
  });
  const [updatingInventory, setUpdatingInventory] = useState(false);

  // Edit warehouse state
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseResp | null>(null);
  const [editWarehouseForm, setEditWarehouseForm] = useState({ warehouseName: '', address: '', imageUrl: '' });
  const [updatingWarehouse, setUpdatingWarehouse] = useState(false);

  // Create inventory state
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<{ id: number; materialName: string; unit: string }[]>([]);
  const [createInventoryForm, setCreateInventoryForm] = useState({
    warehouseId: 0,
    materialId: 0,
    quantityOnHand: 0,
    reorderLevel: 0,
  });
  const [creatingInventory, setCreatingInventory] = useState(false);

  // Toast / Notification banner
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  useEffect(() => { setFormError(null); }, [isCreateWarehouseOpen, editingWarehouse?.warehouseId, isCreateInventoryOpen, editingInventory?.inventoryId]);

  const showToast = (text: TranslationMessage, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadWarehouses = async () => {
    if (!selectedFarm?.id) return;
    setLoadingWarehouses(true);
    setWarehouseLoadError(null);
    try {
      const list = await fetchWarehousesApi(selectedFarm.id);
      setWarehouses(list);
    } catch (err) {
      setWarehouses([]);
      setWarehouseLoadError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load warehouses." : err instanceof Error ? err.message : 'Không thể tải danh sách kho hàng.'));
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadInventories = async () => {
    if (!selectedFarm?.id) return;
    setLoadingInventories(true);
    setInventoryLoadError(null);
    try {
      const list = await fetchInventoriesApi(selectedFarm.id, {
        warehouseId: filterWarehouseId === 'ALL' ? undefined : filterWarehouseId,
        keyword: searchMaterialKeyword.trim() || undefined,
      });
      setInventories(list);
    } catch (err) {
      setInventories([]);
      setInventoryLoadError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load inventory." : err instanceof Error ? err.message : 'Không thể tải dữ liệu tồn kho.'));
    } finally {
      setLoadingInventories(false);
    }
  };

  useEffect(() => {
    if (selectedFarm?.id) {
      if (activeSubTab === 'warehouses') {
        void loadWarehouses();
      } else {
        void loadInventories();
      }
    }
  }, [activeSubTab, selectedFarm?.id, filterWarehouseId]);

  const loadMaterials = async () => {
    if (!selectedFarm?.id) return;
    try {
      const res = await apiRequest<ApiResponse<{ id: number; materialName: string; unit: string }[]>>(
        `/material-usages/materials?farmId=${selectedFarm.id}`
      );
      setAvailableMaterials(res.data || []);
    } catch {
      setAvailableMaterials([]);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;

    setCreatingWarehouse(true);
    try {
      await createWarehouseApi(selectedFarm.id, {
        warehouseName: createWarehouseForm.warehouseName.trim(),
        address: createWarehouseForm.address.trim() || undefined,
        imageUrl: createWarehouseForm.imageUrl.trim() || undefined,
      });
      setIsCreateWarehouseOpen(false);
      setCreateWarehouseForm({ warehouseName: '', address: '', imageUrl: '' });
      showToast((message("Warehouse added: \"{value1}\" successfully!", { value1: createWarehouseForm.warehouseName.trim() })));
      void loadWarehouses();
    } catch (err) {
      setFormError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to create warehouse." : err instanceof Error ? err.message : 'Không thể tạo kho hàng mới.'));
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to create warehouse." : err instanceof Error ? err.message : 'Không thể tạo kho hàng mới.'), 'error');
    } finally {
      setCreatingWarehouse(false);
    }
  };

  const handleStartEditWarehouse = (w: WarehouseResp) => {
    setEditingWarehouse(w);
    setEditWarehouseForm({
      warehouseName: w.warehouseName,
      address: w.address || '',
      imageUrl: w.imageUrl || '',
    });
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;

    setUpdatingWarehouse(true);
    try {
      await updateWarehouseApi(editingWarehouse.warehouseId, {
        warehouseName: editWarehouseForm.warehouseName.trim(),
        address: editWarehouseForm.address.trim() || undefined,
        imageUrl: editWarehouseForm.imageUrl.trim() || undefined,
      });
      const name = editWarehouseForm.warehouseName.trim();
      setEditingWarehouse(null);
      showToast((message("Warehouse updated: \"{value1}\" successfully!", { value1: name })));
      void loadWarehouses();
    } catch (err) {
      setFormError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update warehouse." : err instanceof Error ? err.message : 'Không thể cập nhật kho hàng.'));
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update warehouse." : err instanceof Error ? err.message : 'Không thể cập nhật kho hàng.'), 'error');
    } finally {
      setUpdatingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async (warehouseId: number) => {
    try {
      await deleteWarehouseApi(warehouseId);
      if (selectedWarehouse?.warehouseId === warehouseId) setSelectedWarehouse(null);
      showToast((lang === 'en' ? "Warehouse deleted successfully!" : 'Đã xóa kho hàng thành công!'));
      void loadWarehouses();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete warehouse." : err instanceof Error ? err.message : 'Không thể xóa kho hàng.'), 'error');
    }
  };

  const handleOpenCreateInventory = async () => {
    await loadMaterials();
    if (warehouses.length > 0) {
      setCreateInventoryForm((p) => ({
        ...p,
        warehouseId: filterWarehouseId !== 'ALL' ? filterWarehouseId : warehouses[0].warehouseId,
      }));
    }
    setIsCreateInventoryOpen(true);
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !createInventoryForm.warehouseId || !createInventoryForm.materialId) return;
    setCreatingInventory(true);
    try {
      await createInventoryApi(selectedFarm.id, {
        warehouseId: Number(createInventoryForm.warehouseId),
        materialId: Number(createInventoryForm.materialId),
        quantityOnHand: Number(createInventoryForm.quantityOnHand),
        reorderLevel: Number(createInventoryForm.reorderLevel),
      });
      setIsCreateInventoryOpen(false);
      setCreateInventoryForm({ warehouseId: 0, materialId: 0, quantityOnHand: 0, reorderLevel: 0 });
      showToast((lang === 'en' ? "Material added to the warehouse successfully!" : 'Đã thêm vật tư vào kho lưu trữ thành công!'));
      void loadInventories();
    } catch (err) {
      setFormError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to add material to warehouse." : err instanceof Error ? err.message : 'Không thể thêm vật tư vào kho.'));
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to add material to warehouse." : err instanceof Error ? err.message : 'Không thể thêm vật tư vào kho.'), 'error');
    } finally {
      setCreatingInventory(false);
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventory) return;

    const payload = {
      quantityOnHand: Number(updateInventoryForm.quantityOnHand),
      reorderLevel: Number(updateInventoryForm.reorderLevel),
    };

    setUpdatingInventory(true);
    try {
      await updateInventoryApi(
        editingInventory.inventoryId,
        payload
      );

      setEditingInventory(null);
      showToast((message("Inventory adjusted: \"{value1}\" successfully!", { value1: editingInventory.materialName })));
      void loadInventories();
    } catch (err) {
      setFormError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update inventory." : err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.'));
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update inventory." : err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.'), 'error');
    } finally {
      setUpdatingInventory(false);
    }
  };

  const handleDeleteInventory = async (inventoryId: number) => {
    try {
      await deleteInventoryApi(inventoryId);
      showToast((lang === 'en' ? "Inventory record deleted successfully!" : 'Đã xóa bản ghi tồn kho thành công!'));
      void loadInventories();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete inventory record." : err instanceof Error ? err.message : 'Không thể xóa bản ghi tồn kho.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    if (deleteTarget.farmId !== selectedFarm?.id) { setDeleteTarget(null); return; }
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'warehouse') await handleDeleteWarehouse(deleteTarget.id);
      else await handleDeleteInventory(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredWarehouses = useMemo(() => {
    const kw = searchWarehouseKeyword.trim().toLowerCase();
    if (!kw) return warehouses;
    return warehouses.filter(
      (w) =>
        w.warehouseName.toLowerCase().includes(kw) ||
        (w.address && w.address.toLowerCase().includes(kw)) ||
        `WH-${String(w.warehouseId).padStart(3, '0')}`.toLowerCase().includes(kw)
    );
  }, [warehouses, searchWarehouseKeyword]);

  const filteredInventories = useMemo(() => {
    const kw = searchMaterialKeyword.trim().toLowerCase();
    return inventories.filter((it) => {
      const matchKw =
        !kw ||
        it.materialName.toLowerCase().includes(kw) ||
        (it.materialType && it.materialType.toLowerCase().includes(kw)) ||
        it.warehouseName.toLowerCase().includes(kw);
      const matchWarehouse = filterWarehouseId === 'ALL' || it.warehouseId === filterWarehouseId;
      return matchKw && matchWarehouse;
    });
  }, [inventories, searchMaterialKeyword, filterWarehouseId]);

  const warehousePagination = usePagination(filteredWarehouses, JSON.stringify([selectedFarm?.id, searchWarehouseKeyword]));
  const inventoryPagination = usePagination(filteredInventories, JSON.stringify([selectedFarm?.id, filterWarehouseId, searchMaterialKeyword]));

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Action Notification Banner */}
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginTop: 0, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <strong>{(lang === 'en' ? notification.type === 'success' ? "✓ Success: " : "⚠️ Notice: " : notification.type === 'success' ? '✓ Thành công: ' : '⚠️ Thông báo: ')}</strong>
            {translate(notification.text)}
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

      {/* Main Page Heading matching Mockup */}
      <PageHeading level={embedded ? 2 : 1}   title={<>
            {activeSubTab === 'warehouses'
              ? (lang === 'en' ? 'Warehouse Management' : 'Quản lý Kho hàng')
              : (lang === 'en' ? 'Input Inventory' : 'Tồn kho Vật tư')}
          </>} description={<>
            {activeSubTab === 'warehouses'
              ? (lang === 'en'
                ? `${warehouses.length} storage facilities at ${selectedFarm?.farmName || 'Farm'}`
                : `${warehouses.length} kho hàng lưu trữ tại ${selectedFarm?.farmName || 'trang trại'}`)
              : (lang === 'en'
                ? `${inventories.length} stock items · Threshold tracking`
                : `${inventories.length} mặt hàng tồn kho · Giám sát định mức`)}
          </>}><div>
          {activeSubTab === 'warehouses' ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsCreateWarehouseOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Warehouse' : 'Thêm kho hàng'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleOpenCreateInventory()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Icon name="plus" size={17} /> {lang === 'en' ? 'Add to Inventory' : 'Thêm vào kho'}
            </Button>
          )}
        </div></PageHeading>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Integrated Tabs */}
        <TabList idPrefix="warehouse" label={lang === 'en' ? 'Warehouse sections' : 'Các mục kho hàng'} inset
            value={activeSubTab} onChange={setActiveSubTab} items={[
              { value: 'warehouses', label: <><Icon name="box" size={17} /> {lang === 'en' ? 'Warehouses' : 'Kho hàng'} <span className="tab-count">({warehouses.length})</span></> },
              { value: 'inventory', label: <><Icon name="layers" size={17} /> {lang === 'en' ? 'Inventory' : 'Tồn kho vật tư'} <span className="tab-count">({inventories.length})</span></> },
            ]} />

        {/* =========================================================
            TAB 1: WAREHOUSES
           ========================================================= */}
        {activeSubTab === 'warehouses' && (
          <div {...tabPanelProps('warehouse', 'warehouses')}>
            {/* Filter Bar for Warehouses */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input aria-label={lang === 'en' ? 'Search by warehouse name or address...' : 'Tìm theo tên kho hàng hoặc địa chỉ...'} id="warehouse-inventory-page-control-1" className="ui-input"
                  type="search"
                  placeholder={lang === 'en' ? 'Search by warehouse name or address...' : 'Tìm theo tên kho hàng hoặc địa chỉ...'}
                  value={searchWarehouseKeyword}
                  onChange={(e) => setSearchWarehouseKeyword(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title={lang === 'en' ? 'Reload warehouses' : 'Tải lại danh sách kho hàng'}
                aria-label={lang === 'en' ? 'Reload warehouses' : 'Tải lại danh sách kho hàng'}
                onClick={() => void loadWarehouses()}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loadingWarehouses ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                <p>{lang === 'en' ? '⏳ Loading warehouses list...' : '⏳ Đang tải danh sách kho hàng...'}</p>
              </div>
            ) : warehouseLoadError ? (<LoadError message={warehouseLoadError} onRetry={() => { void loadWarehouses(); }} />) : filteredWarehouses.length === 0 ? (
              <EmptyState  className="panel" title={<>{lang === 'en' ? 'No Warehouses Found' : 'Chưa có kho hàng nào'}</>} description={<>{lang === 'en' ? 'Click "Add Warehouse" to create storage facilities for inputs and produce.' : 'Nhấn "Thêm kho hàng" để khởi tạo cơ sở lưu trữ vật tư và nông sản cho trang trại.'}</>} icon={<>🏢</>} action={<><Button type="button" variant="primary" onClick={() => setIsCreateWarehouseOpen(true)}>
                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Warehouse' : 'Thêm kho hàng'}
                </Button></>} />
            ) : (
              <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
                <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-page)' }}>
                      <th scope="col" style={{ width: '40px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'WAREHOUSE NAME' : 'TÊN KHO HÀNG'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'CODE' : 'MÃ KHO'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'STORAGE ADDRESS' : 'ĐỊA CHỈ LƯU TRỮ'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'STOCK ITEMS' : 'SỐ MẶT HÀNG TỒN'}
                      </th>
                      <th scope="col" style={{ width: '160px', textAlign: 'right' }}>
                        {lang === 'en' ? 'Actions' : 'Thao tác'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehousePagination.items.map((w) => (
                      <tr key={w.warehouseId} style={{ borderBottom: '1px solid var(--color-subtle)' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" aria-label={translate("Select") + " " + (w.warehouseName)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td>
                          <span
                            onClick={() => setSelectedWarehouse(w)}
                            style={{
                              fontWeight: 750,
                              fontSize: '15px',
                              color: 'var(--color-text)',
                              cursor: 'pointer',
                              display: 'block',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                          >
                            {w.warehouseName}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>
                            {w.address || (lang === 'en' ? 'VietGAP Farm Storage' : 'Cơ sở lưu trữ trang trại VietGAP')}
                          </span>
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-body)', fontWeight: 500 }}>
                          WH-{String(w.warehouseId).padStart(3, '0')}
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-body)' }}>
                          {w.address || '—'}
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 600 }}>
                          {w.totalItemCount} {lang === 'en' ? 'items' : 'mặt hàng'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions">
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title={lang === 'en' ? 'View Details' : 'Xem chi tiết kho hàng'}
                              aria-label={translate("View") + " " + (w.warehouseName)}
                              onClick={() => setSelectedWarehouse(w)}
                            >
                              <Icon name="eye" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={lang === 'en' ? 'Edit Warehouse' : 'Chỉnh sửa kho hàng'}
                              aria-label={translate("Edit") + " " + (w.warehouseName)}
                              onClick={() => handleStartEditWarehouse(w)}
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn assign"
                              title={lang === 'en' ? 'View Inventory' : 'Xem tồn kho vật tư'}
                              aria-label={translate("View stock of") + " " + (w.warehouseName)}
                              onClick={() => {
                                setFilterWarehouseId(w.warehouseId);
                                setActiveSubTab('inventory');
                              }}
                            >
                              <Icon name="layers" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn danger"
                              title={lang === 'en' ? 'Delete Warehouse' : 'Xóa kho hàng'}
                              aria-label={translate("Delete") + " " + (w.warehouseName)}
                              onClick={() => setDeleteTarget({ kind: 'warehouse', id: w.warehouseId, farmId: selectedFarm?.id })}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <TablePagination {...warehousePagination} disabled={loadingWarehouses} />
          </div>
        )}

        {/* =========================================================
            TAB 2: INVENTORY
           ========================================================= */}
        {activeSubTab === 'inventory' && (
          <div {...tabPanelProps('warehouse', 'inventory')}>
            {/* Filter Bar for Inventory */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input aria-label={lang === 'en' ? 'Search by material name...' : 'Tìm theo tên vật tư...'} id="warehouse-inventory-page-control-2" className="ui-input"
                  type="search"
                  placeholder={lang === 'en' ? 'Search by material name...' : 'Tìm theo tên vật tư...'}
                  value={searchMaterialKeyword}
                  onChange={(e) => setSearchMaterialKeyword(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select className="ui-select"
                  value={filterWarehouseId}
                  onChange={(e) => setFilterWarehouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  aria-label={lang === 'en' ? 'Filter by warehouse' : 'Lọc theo kho hàng'}
                >
                  <option value="ALL">{lang === 'en' ? 'All Warehouses' : 'Tất cả kho hàng'}</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
                <span className="select-arrow">
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title={lang === 'en' ? 'Reload inventory' : 'Tải lại tồn kho'}
                aria-label={lang === 'en' ? 'Reload inventory' : 'Tải lại tồn kho'}
                onClick={() => void loadInventories()}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loadingInventories ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                <p>{lang === 'en' ? '⏳ Loading inventory records...' : '⏳ Đang truy xuất danh mục tồn kho...'}</p>
              </div>
            ) : inventoryLoadError ? (<LoadError message={inventoryLoadError} onRetry={() => { void loadInventories(); }} />) : filteredInventories.length === 0 ? (
              <EmptyState  className="panel" title={<>{lang === 'en' ? 'No Materials in Stock' : 'Không có vật tư nào trong kho'}</>} description={<>{lang === 'en' ? 'Click "Add to Inventory" to store fertilizers, pesticides, or seeds in the warehouse.' : 'Nhấn "Thêm vào kho" để lưu trữ phân bón, thuốc BVTV hoặc hạt giống vào kho.'}</>} icon={<>📦</>} action={<><Button type="button" variant="primary" onClick={() => void handleOpenCreateInventory()}>
                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add to Inventory' : 'Thêm vào kho'}
                </Button></>} />
            ) : (
              <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
                <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-page)' }}>
                      <th scope="col" style={{ width: '40px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'MATERIAL NAME' : 'TÊN VẬT TƯ'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'MATERIAL TYPE' : 'LOẠI VẬT TƯ'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'WAREHOUSE' : 'KHO LƯU TRỮ'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'QUANTITY ON HAND' : 'SỐ LƯỢNG TỒN'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'REORDER THRESHOLD' : 'NGƯỠNG CẢNH BÁO'}
                      </th>
                      <th scope="col">
                        {lang === 'en' ? 'STATUS' : 'TRẠNG THÁI'}
                      </th>
                      <th scope="col" style={{ width: '100px', textAlign: 'right' }}>
                        {lang === 'en' ? 'Actions' : 'Thao tác'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryPagination.items.map((it) => (
                      <tr key={it.inventoryId} style={{ borderBottom: '1px solid var(--color-subtle)' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" aria-label={translate("Select") + " " + (it.materialName)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td>
                          <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block' }}>{it.materialName}</strong>
                          <span style={{ fontSize: '12.5px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Unit:' : 'Đơn vị tính:'} {materialUnitLabel(it.unit, lang)}</span>
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-body)' }}>
                          {it.materialType ? materialTypeLabel(it.materialType, lang) : (lang === 'en' ? 'Farm Input' : 'Vật tư nông nghiệp')}
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-body)' }}>
                          {it.warehouseName}
                        </td>
                        <td>
                          <strong style={{ fontSize: '15px', color: it.isLowStock ? 'var(--color-danger)' : 'var(--color-primary-text)' }}>
                            {uiFormatNumber(Number(it.quantityOnHand), lang)} {materialUnitLabel(it.unit, lang)}
                          </strong>
                        </td>
                        <td style={{ fontSize: '13.5px', color: 'var(--color-muted)' }}>
                          {uiFormatNumber(Number(it.reorderLevel), lang)} {translate(it.unit)}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: it.isLowStock ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                              color: it.isLowStock ? 'var(--color-danger)' : 'var(--color-success)',
                            }}
                          >
                            {it.isLowStock ? (lang === 'en' ? '⚠️ Low Stock' : '⚠️ Sắp hết hàng') : (lang === 'en' ? '✓ In Stock' : '✓ Đủ tồn kho')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions">
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title={lang === 'en' ? 'View Inventory Details' : 'Xem chi tiết tồn kho'}
                              aria-label={translate("View") + " " + (it.materialName)}
                              onClick={() => setSelectedInventoryItem(it)}
                            >
                              <Icon name="eye" size={15} />
                              <span className="sr-only">{lang === 'en' ? "View details" : "Xem chi tiết"}</span>
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={lang === 'en' ? 'Edit Inventory' : 'Chỉnh sửa tồn kho'}
                              aria-label={translate("Edit") + " " + (it.materialName)}
                              onClick={() => {
                                setEditingInventory(it);
                                setUpdateInventoryForm({
                                  quantityOnHand: String(it.quantityOnHand ?? ''),
                                  reorderLevel: String(it.reorderLevel ?? ''),
                                });
                              }}
                            >
                              <Icon name="edit" size={15} />
                              <span className="sr-only">{lang === 'en' ? "Edit" : "Chỉnh sửa"}</span>
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn danger"
                              title={lang === 'en' ? 'Delete Inventory' : 'Xóa bản ghi tồn kho'}
                              aria-label={translate("Delete") + " " + (it.materialName)}
                              onClick={() => setDeleteTarget({ kind: 'inventory', id: it.inventoryId, farmId: selectedFarm?.id })}
                            >
                              <Icon name="trash" size={15} />
                              <span className="sr-only">{lang === 'en' ? "Delete" : "Xóa"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <TablePagination {...inventoryPagination} disabled={loadingInventories} />
          </div>
        )}
      </div>

      {/* MODAL: Warehouse Details */}
      {selectedWarehouse && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setSelectedWarehouse(null)} style={{ width: 'min(540px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'Facility Information' : 'Thông tin cơ sở lưu trữ'}</span>
              <h2 style={{ margin: '4px 0 0' }}>
                {selectedWarehouse.warehouseName}
              </h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setSelectedWarehouse(null)}><Icon name="close" /></button>
          </div>
          <div className="modal-body" style={{ padding: '20px 24px' }}>
            <div className="ui-form-grid" style={{ marginBottom: '16px', background: 'var(--color-page)', padding: '14px', borderRadius: '8px'  }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Owning Farm' : 'Trang trại sở hữu'}</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--color-text)' }}>{selectedWarehouse.farmName}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Stored Items Count' : 'Số mặt hàng lưu trữ'}</span>
                <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--color-primary-text)' }}>{selectedWarehouse.totalItemCount} {lang === 'en' ? 'items' : 'sản phẩm'}</p>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)' }}>{lang === 'en' ? 'Facility Address:' : 'Địa chỉ kho bãi:'}</span>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)' }}>
                {selectedWarehouse.address || (lang === 'en' ? 'No address provided.' : 'Chưa cập nhật chi tiết địa chỉ.')}
              </p>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setSelectedWarehouse(null)}>
              {lang === 'en' ? 'Close' : 'Đóng'}
            </Button>
          </div>
        </Modal>
      )}

      {/* MODAL: Inventory Item Details */}
      {selectedInventoryItem && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setSelectedInventoryItem(null)} style={{ width: 'min(540px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'Material Stock Information' : 'Thông tin tồn kho vật tư'}</span>
              <h2 style={{ margin: '4px 0 0' }}>
                {selectedInventoryItem.materialName}
              </h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setSelectedInventoryItem(null)}><Icon name="close" /></button>
          </div>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="ui-form-grid" style={{ background: 'var(--color-page)', padding: '16px', borderRadius: '8px', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>{lang === 'en' ? 'Warehouse Location' : 'Kho lưu trữ'}</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>{selectedInventoryItem.warehouseName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>{lang === 'en' ? 'Stock Status' : 'Tình trạng tồn kho'}</span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'inline-block',
                    marginTop: '2px',
                    background: selectedInventoryItem.isLowStock ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                    color: selectedInventoryItem.isLowStock ? 'var(--color-danger)' : 'var(--color-success)',
                  }}
                >
                  {selectedInventoryItem.isLowStock ? (lang === 'en' ? '⚠️ Low Stock' : '⚠️ Sắp hết hàng') : (lang === 'en' ? '✓ In Stock' : '✓ Đủ tồn kho')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>{lang === 'en' ? 'Quantity on Hand' : 'Số lượng thực tế'}</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-primary-text)' }}>
                  {uiFormatNumber(Number(selectedInventoryItem.quantityOnHand), lang)} {materialUnitLabel(selectedInventoryItem.unit, lang)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>{lang === 'en' ? 'Reorder Level' : 'Mức đặt lại hàng'}</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                  {uiFormatNumber(Number(selectedInventoryItem.reorderLevel), lang)} {translate(selectedInventoryItem.unit)}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--color-muted)' }}>
              {lang === 'en' ? 'Last inventory update: ' : 'Cập nhật lần cuối: '}
              <strong>{selectedInventoryItem.updatedAt ? formatDate(selectedInventoryItem.updatedAt, lang) : '—'}</strong>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setSelectedInventoryItem(null)}>
              {lang === 'en' ? 'Close' : 'Đóng'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const it = selectedInventoryItem;
                setSelectedInventoryItem(null);
                setEditingInventory(it);
              }}
            >
              <Icon name="edit" size={15} /> {lang === 'en' ? 'Edit Inventory' : 'Chỉnh sửa'}
            </Button>
          </div>
        </Modal>
      )}

      {/* MODAL: Create Warehouse */}
      {isCreateWarehouseOpen && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setIsCreateWarehouseOpen(false)} style={{ width: 'min(500px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'New Storage Facility' : 'Tạo kho hàng mới'}</span>
              <h2 style={{ margin: '4px 0 0' }}>{lang === 'en' ? 'Add Input Warehouse' : 'Thêm kho lưu trữ vật tư'}</h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setIsCreateWarehouseOpen(false)}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleCreateWarehouse}>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && <p role="alert" className="form-error-banner">{translate(formError)}</p>}
              <div className="structured-field-card">
                <label htmlFor="inventory-field-1">
                  {lang === 'en' ? 'Warehouse Name *' : 'Tên kho hàng *'}
                </label>
                <input id="inventory-field-1" className="ui-input"
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. Technical Inputs Warehouse #2, Cold Storage...' : 'VD: Kho vật tư kỹ thuật số 2, Kho lạnh bảo quản...'}
                  value={createWarehouseForm.warehouseName}
                  onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, warehouseName: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
              <div className="structured-field-card">
                <label htmlFor="inventory-field-2">
                  {lang === 'en' ? 'Address / Location in Farm' : 'Địa chỉ / Vị trí trong trang trại'}
                </label>
                <input id="inventory-field-2" className="ui-input"
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. High-tech Greenhouse Area #1' : 'VD: Khu nhà kính công nghệ cao số 1, Đà Lạt'}
                  value={createWarehouseForm.address}
                  onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCreateWarehouseOpen(false)} disabled={creatingWarehouse}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={creatingWarehouse}>
                {creatingWarehouse ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Warehouse' : 'Tạo kho hàng')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Update Inventory */}
      {editingInventory && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setEditingInventory(null)} style={{ width: 'min(480px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'Update Inventory' : 'Cập nhật tồn kho'}</span>
              <h2 style={{ margin: '4px 0 0' }}>
                {editingInventory.materialName} ({editingInventory.warehouseName})
              </h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setEditingInventory(null)}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleUpdateInventory}>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && <p role="alert" className="form-error-banner">{translate(formError)}</p>}
              <div className="structured-field-card">
                <label htmlFor="inventory-field-3">
                  {lang === 'en' ? `Actual Stock on Hand (${editingInventory.unit}) *` : `Số lượng tồn kho thực tế (${editingInventory.unit}) *`}
                </label>
                <input id="inventory-field-3" className="ui-input"
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={updateInventoryForm.quantityOnHand}
                  onChange={(e) => setUpdateInventoryForm((p) => ({ ...p, quantityOnHand: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
              <div className="structured-field-card">
                <label htmlFor="inventory-field-4">
                  {lang === 'en' ? `Reorder Alert Threshold (${editingInventory.unit}) *` : `Mức cảnh báo đặt hàng lại (${editingInventory.unit}) *`}
                </label>
                <input id="inventory-field-4" className="ui-input"
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={updateInventoryForm.reorderLevel}
                  onChange={(e) => setUpdateInventoryForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
                <small style={{ color: 'var(--color-muted)', marginTop: '4px', display: 'block' }}>
                  {lang === 'en'
                    ? 'When inventory falls below this threshold, the system displays a low stock warning.'
                    : 'Khi số lượng tồn kho giảm xuống dưới ngưỡng này, hệ thống sẽ gắn nhãn cảnh báo.'}
                </small>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} disabled={updatingInventory}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={updatingInventory}>
                {updatingInventory ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Adjustments' : 'Lưu điều chỉnh')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Edit Warehouse */}
      {editingWarehouse && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setEditingWarehouse(null)} style={{ width: 'min(500px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'Update Storage Facility' : 'Cập nhật cơ sở lưu trữ'}</span>
              <h2 style={{ margin: '4px 0 0' }}>{lang === 'en' ? 'Edit Warehouse Information' : 'Chỉnh sửa thông tin kho hàng'}</h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setEditingWarehouse(null)}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleUpdateWarehouse}>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && <p role="alert" className="form-error-banner">{translate(formError)}</p>}
              <div className="structured-field-card">
                <label htmlFor="inventory-field-5">
                  {lang === 'en' ? 'Warehouse Name *' : 'Tên kho hàng *'}
                </label>
                <input id="inventory-field-5" className="ui-input"
                  type="text"
                  required
                  value={editWarehouseForm.warehouseName}
                  onChange={(e) => setEditWarehouseForm((p) => ({ ...p, warehouseName: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
              <div className="structured-field-card">
                <label htmlFor="inventory-field-6">
                  {lang === 'en' ? 'Address / Location in Farm' : 'Địa chỉ / Vị trí trong trang trại'}
                </label>
                <input id="inventory-field-6" className="ui-input"
                  type="text"
                  value={editWarehouseForm.address}
                  onChange={(e) => setEditWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingWarehouse(null)} disabled={updatingWarehouse}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={updatingWarehouse}>
                {updatingWarehouse ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Create Inventory */}
      {isCreateInventoryOpen && (
        <Modal open customLayout className="modal-form-layout" onClose={() => setIsCreateInventoryOpen(false)} style={{ width: 'min(520px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{lang === 'en' ? 'Inventory Management' : 'Quản lý tồn kho'}</span>
              <h2 style={{ margin: '4px 0 0' }}>{lang === 'en' ? 'Add Material to Warehouse' : 'Thêm vật tư vào kho lưu trữ'}</h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setIsCreateInventoryOpen(false)}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleCreateInventory}>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && <p role="alert" className="form-error-banner">{translate(formError)}</p>}
              <div className="structured-field-card">
                <label htmlFor="inventory-field-7">
                  {lang === 'en' ? 'Select Storage Warehouse *' : 'Chọn kho lưu trữ *'}
                </label>
                <select id="inventory-field-7" className="ui-select"
                  required
                  value={createInventoryForm.warehouseId}
                  onChange={(e) => setCreateInventoryForm((p) => ({ ...p, warehouseId: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  <option value={0}>{lang === 'en' ? '-- Select Warehouse --' : '-- Chọn kho hàng --'}</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="structured-field-card">
                <label htmlFor="inventory-field-8">
                  {lang === 'en' ? 'Select Agricultural Material *' : 'Chọn vật tư nông nghiệp *'}
                </label>
                <select id="inventory-field-8" className="ui-select"
                  required
                  value={createInventoryForm.materialId}
                  onChange={(e) => setCreateInventoryForm((p) => ({ ...p, materialId: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  <option value={0}>{lang === 'en' ? '-- Select Input Material --' : '-- Chọn vật tư canh tác --'}</option>
                  {availableMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialName} ({translate(m.unit)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ui-form-grid" >
                <div className="structured-field-card">
                  <label htmlFor="inventory-field-9">
                    {lang === 'en' ? 'Initial Quantity *' : 'Số lượng ban đầu *'}
                  </label>
                  <input id="inventory-field-9" className="ui-input"
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={createInventoryForm.quantityOnHand}
                    onChange={(e) => setCreateInventoryForm((p) => ({ ...p, quantityOnHand: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div className="structured-field-card">
                  <label htmlFor="inventory-field-10">
                    {lang === 'en' ? 'Reorder Threshold *' : 'Ngưỡng cảnh báo *'}
                  </label>
                  <input id="inventory-field-10" className="ui-input"
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={createInventoryForm.reorderLevel}
                    onChange={(e) => setCreateInventoryForm((p) => ({ ...p, reorderLevel: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCreateInventoryOpen(false)} disabled={creatingInventory}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={creatingInventory}>
                {creatingInventory ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Add to Warehouse' : 'Thêm vào kho')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'warehouse' ? (lang === 'en' ? 'Delete warehouse' : 'Xóa kho hàng') : (lang === 'en' ? 'Delete inventory record' : 'Xóa bản ghi tồn kho')}
        description={deleteTarget?.kind === 'warehouse'
          ? (lang === 'en' ? 'Are you sure you want to delete this warehouse and its inventory records?' : 'Bạn có chắc chắn muốn xóa kho hàng này và các bản ghi tồn kho liên quan?')
          : (lang === 'en' ? 'Are you sure you want to delete this inventory record?' : 'Bạn có chắc chắn muốn xóa bản ghi tồn kho vật tư này?')}
        tone="danger" loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </section>
  );
}