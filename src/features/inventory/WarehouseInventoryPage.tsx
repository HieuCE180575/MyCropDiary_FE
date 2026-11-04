import { useState, useEffect } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import {
  WarehouseResp,
  InventoryItemResp,
  fetchWarehousesApi,
  createWarehouseApi,
  fetchInventoriesApi,
  updateInventoryApi,
} from './warehouseService';

export function WarehouseInventoryPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [activeSubTab, setActiveSubTab] = useState<'warehouses' | 'inventory'>('warehouses');

  // Warehouses state (UC-32.1, UC-32.3)
  const [warehouses, setWarehouses] = useState<WarehouseResp[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseResp | null>(null);
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false);
  const [createWarehouseForm, setCreateWarehouseForm] = useState({ warehouseName: '', address: '', imageUrl: '' });
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);

  // Inventory state (UC-33.1, UC-33.2)
  const [inventories, setInventories] = useState<InventoryItemResp[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItemResp | null>(null);
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'ALL'>('ALL');
  const [searchMaterialKeyword, setSearchMaterialKeyword] = useState('');
  const [editingInventory, setEditingInventory] = useState<InventoryItemResp | null>(null);
  const [updateInventoryForm, setUpdateInventoryForm] = useState({ quantityOnHand: 0, reorderLevel: 0 });
  const [updatingInventory, setUpdatingInventory] = useState(false);

  const loadWarehouses = async () => {
    if (!selectedFarm?.id) return;
    setLoadingWarehouses(true);
    try {
      const list = await fetchWarehousesApi(selectedFarm.id);
      setWarehouses(list);
    } catch {
      setWarehouses([]);
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
    } catch {
      setInventories([]);
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
      void loadWarehouses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo kho hàng mới.');
    } finally {
      setCreatingWarehouse(false);
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
      void loadInventories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.');
    } finally {
      setUpdatingInventory(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={activeSubTab === 'warehouses' ? 'action-button solid' : 'action-button'}
            onClick={() => setActiveSubTab('warehouses')}
          >
            🏢 Danh sách kho hàng ({warehouses.length})
          </button>
          <button
            type="button"
            className={activeSubTab === 'inventory' ? 'action-button solid' : 'action-button'}
            onClick={() => setActiveSubTab('inventory')}
          >
            📦 Tồn kho vật tư ({inventories.length})
          </button>
        </div>

        {activeSubTab === 'warehouses' ? (
          <button
            type="button"
            className="action-button solid"
            onClick={() => setIsCreateWarehouseOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Thêm kho hàng mới
          </button>
        ) : (
          <button
            type="button"
            className="action-button"
            onClick={() => void loadInventories()}
          >
            Làm mới tồn kho
          </button>
        )}
      </div>

      {/* SUBTAB 1: WAREHOUSES */}
      {activeSubTab === 'warehouses' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Hệ thống kho bãi & Bảo quản nông trại</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Quản lý các cơ sở lưu trữ phân bón, thuốc BVTV, hạt giống và kho lạnh bảo quản nông sản
              </p>
            </div>
            <button type="button" className="action-button" onClick={() => void loadWarehouses()}>
              Làm mới
            </button>
          </div>

          {loadingWarehouses ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
              <p>⏳ Đang tải danh sách kho hàng...</p>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏢</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có kho hàng nào</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                Nhấn "+ Thêm kho hàng mới" để tạo kho vật tư hoặc kho lạnh cho trang trại.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {warehouses.map((w) => (
                <div
                  key={w.warehouseId}
                  style={{
                    padding: '18px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="profile-tag-pill" style={{ fontSize: '11.5px', background: '#dcfce7', color: '#15803d' }}>
                        Kho #{w.warehouseId}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {w.totalItemCount} mặt hàng tồn
                      </span>
                    </div>
                    <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      {w.warehouseName}
                    </strong>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.4 }}>
                      📍 {w.address || 'Chưa cập nhật địa chỉ kho'}
                    </p>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => setSelectedWarehouse(w)}
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                    >
                      👁️ Chi tiết kho
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setFilterWarehouseId(w.warehouseId);
                        setActiveSubTab('inventory');
                      }}
                      style={{ fontSize: '12.5px' }}
                    >
                      Xem tồn kho →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: INVENTORY */}
      {activeSubTab === 'inventory' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Danh mục tồn kho vật tư nông nghiệp</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Theo dõi số lượng vật tư tồn trữ thực tế và cảnh báo ngưỡng đặt hàng lại ({inventories.length} mặt hàng)
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="production-filter-panel" style={{ marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1.5 1 240px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Tìm theo tên vật tư
              </label>
              <input
                type="text"
                placeholder="Nhập tên phân bón, thuốc, hạt giống..."
                value={searchMaterialKeyword}
                onChange={(e) => setSearchMaterialKeyword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Lọc theo kho hàng
              </label>
              <select
                value={filterWarehouseId}
                onChange={(e) => setFilterWarehouseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">Tất cả kho hàng</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="action-button solid"
              onClick={() => void loadInventories()}
              style={{ height: '38px', padding: '0 16px' }}
            >
              Lọc
            </button>
            {(searchMaterialKeyword || filterWarehouseId !== 'ALL') && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSearchMaterialKeyword('');
                  setFilterWarehouseId('ALL');
                  setTimeout(() => void loadInventories(), 0);
                }}
                style={{ height: '38px', padding: '0 12px' }}
              >
                ✕ Đặt lại
              </button>
            )}
          </div>

          {loadingInventories ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
              <p>⏳ Đang truy xuất danh mục tồn kho...</p>
            </div>
          ) : inventories.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Không có vật tư nào trong kho</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                Khi nhập vật tư hoặc liên kết hóa đơn mua sắm, các mặt hàng sẽ tự động xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                    <th style={{ padding: '12px 14px' }}>Tên vật tư</th>
                    <th style={{ padding: '12px 14px' }}>Loại vật tư</th>
                    <th style={{ padding: '12px 14px' }}>Vị trí kho</th>
                    <th style={{ padding: '12px 14px' }}>Số lượng tồn</th>
                    <th style={{ padding: '12px 14px' }}>Định mức cảnh báo</th>
                    <th style={{ padding: '12px 14px' }}>Trạng thái kho</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {inventories.map((it) => (
                    <tr key={it.inventoryId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 650, color: '#0f172a' }}>
                        {it.materialName}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {it.materialType || 'Vật tư canh tác'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        🏢 {it.warehouseName}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong style={{ fontSize: '15px', color: it.isLowStock ? '#dc2626' : '#059669' }}>
                          {Number(it.quantityOnHand).toLocaleString('vi-VN')} {it.unit}
                        </strong>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {Number(it.reorderLevel).toLocaleString('vi-VN')} {it.unit}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: it.isLowStock ? '#fee2e2' : '#dcfce7',
                          color: it.isLowStock ? '#b91c1c' : '#15803d',
                        }}>
                          {it.isLowStock ? '⚠️ Sắp hết hàng' : '✓ Đủ tồn kho'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => {
                            setEditingInventory(it);
                            setUpdateInventoryForm({
                              quantityOnHand: Number(it.quantityOnHand),
                              reorderLevel: Number(it.reorderLevel),
                            });
                          }}
                          style={{ fontSize: '12.5px', padding: '5px 12px' }}
                        >
                          ✏️ Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Warehouse Details */}
      {selectedWarehouse && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '540px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>Thông tin cơ sở lưu trữ</span>
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
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Trang trại sở hữu</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{selectedWarehouse.farmName}</p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Số mặt hàng lưu trữ</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#059669' }}>{selectedWarehouse.totalItemCount} sản phẩm</p>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Địa chỉ kho bãi:</span>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>
                  {selectedWarehouse.address || 'Chưa cập nhật chi tiết địa chỉ.'}
                </p>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="ghost-button" onClick={() => setSelectedWarehouse(null)}>
                Đóng
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
                <span className="eyebrow" style={{ color: '#059669' }}>Tạo kho hàng mới</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>Thêm kho lưu trữ vật tư</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsCreateWarehouseOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tên kho hàng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kho vật tư kỹ thuật số 2, Kho lạnh bảo quản..."
                    value={createWarehouseForm.warehouseName}
                    onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, warehouseName: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Địa chỉ / Vị trí trong trang trại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Khu nhà kính công nghệ cao số 1, Đà Lạt"
                    value={createWarehouseForm.address}
                    onChange={(e) => setCreateWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setIsCreateWarehouseOpen(false)} disabled={creatingWarehouse}>
                  Hủy
                </button>
                <button type="submit" className="action-button solid" disabled={creatingWarehouse}>
                  {creatingWarehouse ? 'Đang tạo...' : 'Tạo kho hàng'}
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
                <span className="eyebrow" style={{ color: '#059669' }}>Cập nhật tồn kho</span>
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
                    Số lượng tồn kho thực tế ({editingInventory.unit}) *
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
                    Mức cảnh báo đặt hàng lại ({editingInventory.unit}) *
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
                    Khi số lượng tồn kho giảm xuống dưới ngưỡng này, hệ thống sẽ gắn nhãn cảnh báo.
                  </small>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="ghost-button" onClick={() => setEditingInventory(null)} disabled={updatingInventory}>
                  Hủy
                </button>
                <button type="submit" className="action-button solid" disabled={updatingInventory}>
                  {updatingInventory ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

