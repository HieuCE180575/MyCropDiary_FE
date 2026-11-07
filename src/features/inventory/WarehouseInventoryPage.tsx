import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
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

export function WarehouseInventoryPage() {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const [activeSubTab, setActiveSubTab] = useState<'warehouses' | 'inventory'>('warehouses');

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
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'ALL'>('ALL');
  const [searchMaterialKeyword, setSearchMaterialKeyword] = useState('');
  const [editingInventory, setEditingInventory] = useState<InventoryItemResp | null>(null);
  const [updateInventoryForm, setUpdateInventoryForm] = useState({ quantityOnHand: 0, reorderLevel: 0 });
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
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadWarehouses = async () => {
    if (!selectedFarm?.id) return;
    setLoadingWarehouses(true);
    try {
      const list = await fetchWarehousesApi(selectedFarm.id);
      setWarehouses(list);
    } catch (err) {
      setWarehouses([]);
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load warehouses." : err instanceof Error ? err.message : 'Không thể tải danh sách kho hàng.'), 'error');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadInventories = async () => {
    if (!selectedFarm?.id) return;
    setLoadingInventories(true);
    try {
      const list = await fetchInventoriesApi(selectedFarm.id, {
        warehouseId: filterWarehouseId === 'ALL' ? undefined : filterWarehouseId,
        keyword: searchMaterialKeyword.trim() || undefined,
      });
      setInventories(list);
    } catch (err) {
      setInventories([]);
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load inventory." : err instanceof Error ? err.message : 'Không thể tải dữ liệu tồn kho.'), 'error');
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
    if (!selectedFarm?.id || !createWarehouseForm.warehouseName.trim()) return;
    setCreatingWarehouse(true);
    try {
      await createWarehouseApi(selectedFarm.id, {
        warehouseName: createWarehouseForm.warehouseName.trim(),
        address: createWarehouseForm.address.trim() || undefined,
        imageUrl: createWarehouseForm.imageUrl.trim() || undefined,
      });
      setIsCreateWarehouseOpen(false);
      setCreateWarehouseForm({ warehouseName: '', address: '', imageUrl: '' });
      showToast((lang === 'en' ? `Warehouse added: "${createWarehouseForm.warehouseName.trim()}" successfully!` : `Đã thêm mới kho hàng "${createWarehouseForm.warehouseName.trim()}" thành công!`));
      void loadWarehouses();
    } catch (err) {
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
    if (!editingWarehouse || !editWarehouseForm.warehouseName.trim()) return;
    setUpdatingWarehouse(true);
    try {
      await updateWarehouseApi(editingWarehouse.warehouseId, {
        warehouseName: editWarehouseForm.warehouseName.trim(),
        address: editWarehouseForm.address.trim() || undefined,
        imageUrl: editWarehouseForm.imageUrl.trim() || undefined,
      });
      const name = editWarehouseForm.warehouseName.trim();
      setEditingWarehouse(null);
      showToast((lang === 'en' ? `Warehouse updated: "${name}" successfully!` : `Đã cập nhật thông tin kho hàng "${name}" thành công!`));
      void loadWarehouses();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update warehouse." : err instanceof Error ? err.message : 'Không thể cập nhật kho hàng.'), 'error');
    } finally {
      setUpdatingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async (warehouseId: number) => {
    if (!window.confirm((lang === 'en' ? "Are you sure you want to delete this warehouse and its inventory records?" : 'Bạn có chắc chắn muốn xóa kho hàng này và các bản ghi tồn kho liên quan?'))) return;
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
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to add material to warehouse." : err instanceof Error ? err.message : 'Không thể thêm vật tư vào kho.'), 'error');
    } finally {
      setCreatingInventory(false);
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventory) return;
    setUpdatingInventory(true);
    try {
      await updateInventoryApi(editingInventory.inventoryId, {
        quantityOnHand: Number(updateInventoryForm.quantityOnHand),
        reorderLevel: Number(updateInventoryForm.reorderLevel),
      });
      setEditingInventory(null);
      showToast((lang === 'en' ? `Inventory adjusted: "${editingInventory.materialName}" successfully!` : `Đã điều chỉnh tồn kho "${editingInventory.materialName}" thành công!`));
      void loadInventories();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update inventory." : err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.'), 'error');
    } finally {
      setUpdatingInventory(false);
    }
  };

  const handleDeleteInventory = async (inventoryId: number) => {
    if (!window.confirm((lang === 'en' ? "Are you sure you want to delete this inventory record?" : 'Bạn có chắc chắn muốn xóa bản ghi tồn kho vật tư này?'))) return;
    try {
      await deleteInventoryApi(inventoryId);
      showToast((lang === 'en' ? "Inventory record deleted successfully!" : 'Đã xóa bản ghi tồn kho thành công!'));
      void loadInventories();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete inventory record." : err instanceof Error ? err.message : 'Không thể xóa bản ghi tồn kho.'), 'error');
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

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Action Notification Banner */}
      {notification && (
        <div
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {activeSubTab === 'warehouses'
              ? (lang === 'en' ? 'Warehouse Management' : 'Quản lý Kho hàng')
              : (lang === 'en' ? 'Input Inventory' : 'Tồn kho Vật tư')}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {activeSubTab === 'warehouses'
              ? (lang === 'en'
                ? `${warehouses.length} storage facilities at ${selectedFarm?.farmName || 'Farm'}`
                : `${warehouses.length} kho hàng lưu trữ tại ${selectedFarm?.farmName || 'trang trại'}`)
              : (lang === 'en'
                ? `${inventories.length} stock items · Threshold tracking`
                : `${inventories.length} mặt hàng tồn kho · Giám sát định mức`)}
          </p>
        </div>

        <div>
          {activeSubTab === 'warehouses' ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsCreateWarehouseOpen(true)}
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
              <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Warehouse' : 'Thêm kho hàng'}
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleOpenCreateInventory()}
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
              <Icon name="plus" size={17} /> {lang === 'en' ? 'Add to Inventory' : 'Thêm vào kho'}
            </button>
          )}
        </div>
      </div>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Integrated Tabs */}
        <div className="zone-integrated-tabs">
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeSubTab === 'warehouses' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('warehouses')}
          >
            <Icon name="box" size={17} /> {lang === 'en' ? 'Warehouses' : 'Kho hàng'} <span className="tab-count">({warehouses.length})</span>
          </button>
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeSubTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('inventory')}
          >
            <Icon name="layers" size={17} /> {lang === 'en' ? 'Inventory' : 'Tồn kho vật tư'} <span className="tab-count">({inventories.length})</span>
          </button>
        </div>

        {/* =========================================================
            TAB 1: WAREHOUSES
           ========================================================= */}
        {activeSubTab === 'warehouses' && (
          <>
            {/* Filter Bar for Warehouses */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
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
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p>{lang === 'en' ? '⏳ Loading warehouses list...' : '⏳ Đang tải danh sách kho hàng...'}</p>
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">🏢</div>
                <h2>{lang === 'en' ? 'No Warehouses Found' : 'Chưa có kho hàng nào'}</h2>
                <p>{lang === 'en' ? 'Click "Add Warehouse" to create storage facilities for inputs and produce.' : 'Nhấn "Thêm kho hàng" để khởi tạo cơ sở lưu trữ vật tư và nông sản cho trang trại.'}</p>
                <button type="button" className="primary-button" onClick={() => setIsCreateWarehouseOpen(true)}>
                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Warehouse' : 'Thêm kho hàng'}
                </button>
              </div>
            ) : (
              <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'WAREHOUSE NAME' : 'TÊN KHO HÀNG'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'CODE' : 'MÃ KHO'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'STORAGE ADDRESS' : 'ĐỊA CHỈ LƯU TRỮ'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'STOCK ITEMS' : 'SỐ MẶT HÀNG TỒN'}
                      </th>
                      <th style={{ width: '160px', padding: '14px 16px', textAlign: 'right' }}>
                        &nbsp;
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouses.map((w) => (
                      <tr key={w.warehouseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label={`Select ${w.warehouseName}`} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            onClick={() => setSelectedWarehouse(w)}
                            style={{
                              fontWeight: 750,
                              fontSize: '15px',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'block',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#059669')}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#0f172a')}
                          >
                            {w.warehouseName}
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                            {w.address || (lang === 'en' ? 'VietGAP Farm Storage' : 'Cơ sở lưu trữ trang trại VietGAP')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>
                          WH-{String(w.warehouseId).padStart(3, '0')}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#475569' }}>
                          {w.address || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#0f172a', fontWeight: 600 }}>
                          {w.totalItemCount} {lang === 'en' ? 'items' : 'mặt hàng'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions">
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title={lang === 'en' ? 'View Details' : 'Xem chi tiết kho hàng'}
                              aria-label={`View ${w.warehouseName}`}
                              onClick={() => setSelectedWarehouse(w)}
                            >
                              <Icon name="eye" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={lang === 'en' ? 'Edit Warehouse' : 'Chỉnh sửa kho hàng'}
                              aria-label={`Edit ${w.warehouseName}`}
                              onClick={() => handleStartEditWarehouse(w)}
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn assign"
                              title={lang === 'en' ? 'View Inventory' : 'Xem tồn kho vật tư'}
                              aria-label={`View stock of ${w.warehouseName}`}
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
                              aria-label={`Delete ${w.warehouseName}`}
                              onClick={() => void handleDeleteWarehouse(w.warehouseId)}
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
            <div className="zone-table-footer">
              <span>
                {lang === 'en'
                  ? `Showing 1–${filteredWarehouses.length} of ${warehouses.length} warehouses`
                  : `Hiển thị 1–${filteredWarehouses.length} trong ${warehouses.length} kho hàng`}
              </span>
              <div className="zone-pagination-wrap">
                <button type="button" className="zone-page-btn" disabled>&lt;</button>
                <button type="button" className="zone-page-btn active">1</button>
                <button type="button" className="zone-page-btn" disabled>&gt;</button>
              </div>
            </div>
          </>
        )}

        {/* =========================================================
            TAB 2: INVENTORY
           ========================================================= */}
        {activeSubTab === 'inventory' && (
          <>
            {/* Filter Bar for Inventory */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder={lang === 'en' ? 'Search by material name...' : 'Tìm theo tên vật tư...'}
                  value={searchMaterialKeyword}
                  onChange={(e) => setSearchMaterialKeyword(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
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
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p>{lang === 'en' ? '⏳ Loading inventory records...' : '⏳ Đang truy xuất danh mục tồn kho...'}</p>
              </div>
            ) : filteredInventories.length === 0 ? (
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">📦</div>
                <h2>{lang === 'en' ? 'No Materials in Stock' : 'Không có vật tư nào trong kho'}</h2>
                <p>{lang === 'en' ? 'Click "Add to Inventory" to store fertilizers, pesticides, or seeds in the warehouse.' : 'Nhấn "Thêm vào kho" để lưu trữ phân bón, thuốc BVTV hoặc hạt giống vào kho.'}</p>
                <button type="button" className="primary-button" onClick={() => void handleOpenCreateInventory()}>
                  <Icon name="plus" size={16} /> {lang === 'en' ? 'Add to Inventory' : 'Thêm vào kho'}
                </button>
              </div>
            ) : (
              <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'MATERIAL NAME' : 'TÊN VẬT TƯ'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'MATERIAL TYPE' : 'LOẠI VẬT TƯ'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'WAREHOUSE' : 'KHO LƯU TRỮ'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'QUANTITY ON HAND' : 'SỐ LƯỢNG TỒN'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'REORDER THRESHOLD' : 'NGƯỠNG CẢNH BÁO'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {lang === 'en' ? 'STATUS' : 'TRẠNG THÁI'}
                      </th>
                      <th style={{ width: '100px', padding: '14px 16px', textAlign: 'right' }}>
                        &nbsp;
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventories.map((it) => (
                      <tr key={it.inventoryId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label={`Select ${it.materialName}`} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{it.materialName}</strong>
                          <span style={{ fontSize: '12.5px', color: '#64748b' }}>{lang === 'en' ? 'Unit:' : 'Đơn vị tính:'} {translate(it.unit)}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#475569' }}>
                          {it.materialType || (lang === 'en' ? 'Farm Input' : 'Vật tư nông nghiệp')}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#334155' }}>
                          {it.warehouseName}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong style={{ fontSize: '15px', color: it.isLowStock ? '#dc2626' : '#059669' }}>
                            {Number(it.quantityOnHand).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')} {translate(it.unit)}
                          </strong>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#64748b' }}>
                          {Number(it.reorderLevel).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')} {translate(it.unit)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: it.isLowStock ? '#fee2e2' : '#dcfce7',
                              color: it.isLowStock ? '#b91c1c' : '#15803d',
                            }}
                          >
                            {it.isLowStock ? (lang === 'en' ? '⚠️ Low Stock' : '⚠️ Sắp hết hàng') : (lang === 'en' ? '✓ In Stock' : '✓ Đủ tồn kho')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions">
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={lang === 'en' ? 'Edit Inventory' : 'Chỉnh sửa tồn kho'}
                              aria-label={`Edit ${it.materialName}`}
                              onClick={() => {
                                setEditingInventory(it);
                                setUpdateInventoryForm({
                                  quantityOnHand: Number(it.quantityOnHand),
                                  reorderLevel: Number(it.reorderLevel),
                                });
                              }}
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn danger"
                              title={lang === 'en' ? 'Delete Inventory' : 'Xóa bản ghi tồn kho'}
                              aria-label={`Delete ${it.materialName}`}
                              onClick={() => void handleDeleteInventory(it.inventoryId)}
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
            <div className="zone-table-footer">
              <span>
                {lang === 'en'
                  ? `Showing 1–${filteredInventories.length} of ${inventories.length} stock items`
                  : `Hiển thị 1–${filteredInventories.length} trong ${inventories.length} mặt hàng`}
              </span>
              <div className="zone-pagination-wrap">
                <button type="button" className="zone-page-btn" disabled>&lt;</button>
                <button type="button" className="zone-page-btn active">1</button>
                <button type="button" className="zone-page-btn" disabled>&gt;</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: Warehouse Details */}
      {selectedWarehouse && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '540px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>{lang === 'en' ? 'Facility Information' : 'Thông tin cơ sở lưu trữ'}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>
                  {selectedWarehouse.warehouseName}
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedWarehouse(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Owning Farm' : 'Trang trại sở hữu'}</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{selectedWarehouse.farmName}</p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Stored Items Count' : 'Số mặt hàng lưu trữ'}</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#059669' }}>{selectedWarehouse.totalItemCount} {lang === 'en' ? 'items' : 'sản phẩm'}</p>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>{lang === 'en' ? 'Facility Address:' : 'Địa chỉ kho bãi:'}</span>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>
                  {selectedWarehouse.address || (lang === 'en' ? 'No address provided.' : 'Chưa cập nhật chi tiết địa chỉ.')}
                </p>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="ghost-button" onClick={() => setSelectedWarehouse(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Warehouse */}
      {isCreateWarehouseOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '500px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>{lang === 'en' ? 'New Storage Facility' : 'Tạo kho hàng mới'}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>{lang === 'en' ? 'Add Input Warehouse' : 'Thêm kho lưu trữ vật tư'}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsCreateWarehouseOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Warehouse Name *' : 'Tên kho hàng *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'en' ? 'e.g. Technical Inputs Warehouse #2, Cold Storage...' : 'VD: Kho vật tư kỹ thuật số 2, Kho lạnh bảo quản...'}
                    value={createWarehouseForm.warehouseName}
                    onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, warehouseName: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Address / Location in Farm' : 'Địa chỉ / Vị trí trong trang trại'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'e.g. High-tech Greenhouse Area #1' : 'VD: Khu nhà kính công nghệ cao số 1, Đà Lạt'}
                    value={createWarehouseForm.address}
                    onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setIsCreateWarehouseOpen(false)} disabled={creatingWarehouse}>
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="action-button solid" disabled={creatingWarehouse}>
                  {creatingWarehouse ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Warehouse' : 'Tạo kho hàng')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Inventory */}
      {editingInventory && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>{lang === 'en' ? 'Update Inventory' : 'Cập nhật tồn kho'}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>
                  {editingInventory.materialName} ({editingInventory.warehouseName})
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingInventory(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateInventory}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? `Actual Stock on Hand (${editingInventory.unit}) *` : `Số lượng tồn kho thực tế (${editingInventory.unit}) *`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={updateInventoryForm.quantityOnHand}
                    onChange={(e) => setUpdateInventoryForm((p) => ({ ...p, quantityOnHand: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? `Reorder Alert Threshold (${editingInventory.unit}) *` : `Mức cảnh báo đặt hàng lại (${editingInventory.unit}) *`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={updateInventoryForm.reorderLevel}
                    onChange={(e) => setUpdateInventoryForm((p) => ({ ...p, reorderLevel: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    {lang === 'en'
                      ? 'When inventory falls below this threshold, the system displays a low stock warning.'
                      : 'Khi số lượng tồn kho giảm xuống dưới ngưỡng này, hệ thống sẽ gắn nhãn cảnh báo.'}
                  </small>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setEditingInventory(null)} disabled={updatingInventory}>
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="action-button solid" disabled={updatingInventory}>
                  {updatingInventory ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Adjustments' : 'Lưu điều chỉnh')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Warehouse */}
      {editingWarehouse && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '500px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>{lang === 'en' ? 'Update Storage Facility' : 'Cập nhật cơ sở lưu trữ'}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>{lang === 'en' ? 'Edit Warehouse Information' : 'Chỉnh sửa thông tin kho hàng'}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingWarehouse(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Warehouse Name *' : 'Tên kho hàng *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editWarehouseForm.warehouseName}
                    onChange={(e) => setEditWarehouseForm((p) => ({ ...p, warehouseName: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Address / Location in Farm' : 'Địa chỉ / Vị trí trong trang trại'}
                  </label>
                  <input
                    type="text"
                    value={editWarehouseForm.address}
                    onChange={(e) => setEditWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setEditingWarehouse(null)} disabled={updatingWarehouse}>
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="action-button solid" disabled={updatingWarehouse}>
                  {updatingWarehouse ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Inventory */}
      {isCreateInventoryOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>{lang === 'en' ? 'Inventory Management' : 'Quản lý tồn kho'}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>{lang === 'en' ? 'Add Material to Warehouse' : 'Thêm vật tư vào kho lưu trữ'}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsCreateInventoryOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateInventory}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Select Storage Warehouse *' : 'Chọn kho lưu trữ *'}
                  </label>
                  <select
                    required
                    value={createInventoryForm.warehouseId}
                    onChange={(e) => setCreateInventoryForm((p) => ({ ...p, warehouseId: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={0}>{lang === 'en' ? '-- Select Warehouse --' : '-- Chọn kho hàng --'}</option>
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    {lang === 'en' ? 'Select Agricultural Material *' : 'Chọn vật tư nông nghiệp *'}
                  </label>
                  <select
                    required
                    value={createInventoryForm.materialId}
                    onChange={(e) => setCreateInventoryForm((p) => ({ ...p, materialId: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={0}>{lang === 'en' ? '-- Select Input Material --' : '-- Chọn vật tư canh tác --'}</option>
                    {availableMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName} ({translate(m.unit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      {lang === 'en' ? 'Initial Quantity *' : 'Số lượng ban đầu *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      required
                      value={createInventoryForm.quantityOnHand}
                      onChange={(e) => setCreateInventoryForm((p) => ({ ...p, quantityOnHand: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      {lang === 'en' ? 'Reorder Threshold *' : 'Ngưỡng cảnh báo *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      required
                      value={createInventoryForm.reorderLevel}
                      onChange={(e) => setCreateInventoryForm((p) => ({ ...p, reorderLevel: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setIsCreateInventoryOpen(false)} disabled={creatingInventory}>
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="action-button solid" disabled={creatingInventory}>
                  {creatingInventory ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Add to Warehouse' : 'Thêm vào kho')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
