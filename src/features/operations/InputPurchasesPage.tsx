import { useEffect, useState, useMemo } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import {
  fetchInputPurchases,
  fetchInputPurchaseDetails,
  searchInputPurchases,
  recordInputPurchase,
  deleteInputPurchase,
  linkWarehouseReceipt,
  fetchSuppliers,
  type InputPurchaseItem,
  type SupplierItem,
  type CreateInputPurchasePayload,
  type PurchaseItemPayload,
} from './procurementService';

export function InputPurchasesPage() {
  const { lang } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [purchases, setPurchases] = useState<InputPurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // View Details Modal
  const [selectedPurchase, setSelectedPurchase] = useState<InputPurchaseItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Link Warehouse Receipt Modal
  const [linkingPurchase, setLinkingPurchase] = useState<InputPurchaseItem | null>(null);
  const [receiptNoInput, setReceiptNoInput] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);

  // Create Purchase Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState<number | ''>('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newReferenceNo, setNewReferenceNo] = useState('');
  const [newWarehouseReceiptNo, setNewWarehouseReceiptNo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<PurchaseItemPayload[]>([
    { materialId: 1, quantity: 10, unitCost: 50000 },
  ]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const loadData = async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [purchasesData, suppliersData] = await Promise.all([
        fetchInputPurchases(farmId).catch(() => [] as InputPurchaseItem[]),
        fetchSuppliers(farmId).catch(() => [] as SupplierItem[]),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể tải danh sách mua vật tư.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [farmId]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!farmId) return;
    setLoading(true);
    try {
      const suppId = supplierFilter !== 'ALL' ? Number(supplierFilter) : undefined;
      const filtered = await searchInputPurchases(farmId, {
        keyword: keyword.trim() || undefined,
        supplierId: suppId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setPurchases(filtered);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Lỗi khi tìm kiếm phiếu mua vật tư.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSupplierFilter('ALL');
    setWarehouseFilter('ALL');
    setFromDate('');
    setToDate('');
    void loadData();
  };

  const handleOpenDetails = async (purchaseId: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchInputPurchaseDetails(purchaseId);
      setSelectedPurchase(detail);
    } catch {
      // Fallback to item in local list
      const fallback = purchases.find((p) => p.purchaseId === purchaseId) || null;
      setSelectedPurchase(fallback);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenLinkModal = (purchase: InputPurchaseItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLinkingPurchase(purchase);
    setReceiptNoInput(purchase.warehouseReceiptNo || `PNK-${new Date().getFullYear()}-${String(purchase.purchaseId).padStart(4, '0')}`);
  };

  const handleSubmitLinkWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingPurchase) return;
    setSubmittingLink(true);
    try {
      const updated = await linkWarehouseReceipt(linkingPurchase.purchaseId, {
        warehouseReceiptNo: receiptNoInput.trim(),
      });
      setPurchases((prev) =>
        prev.map((p) => (p.purchaseId === updated.purchaseId ? { ...p, warehouseReceiptNo: updated.warehouseReceiptNo } : p))
      );
      if (selectedPurchase?.purchaseId === updated.purchaseId) {
        setSelectedPurchase((prev) => (prev ? { ...prev, warehouseReceiptNo: updated.warehouseReceiptNo } : null));
      }
      setNotification({
        text: `Đã liên kết phiếu nhập kho "${updated.warehouseReceiptNo}" thành công!`,
        type: 'success',
      });
      setLinkingPurchase(null);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể liên kết phiếu nhập kho.',
        type: 'error',
      });
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleDelete = async (purchaseId: number, refNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Xác nhận xóa phiếu mua vật tư ${refNo || '#' + purchaseId}? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteInputPurchase(purchaseId);
      setPurchases((prev) => prev.filter((p) => p.purchaseId !== purchaseId));
      if (selectedPurchase?.purchaseId === purchaseId) {
        setSelectedPurchase(null);
      }
      setNotification({
        text: `Đã xóa phiếu mua vật tư #${purchaseId} thành công.`,
        type: 'success',
      });
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể xóa phiếu mua vật tư (có thể vật tư đã được xuất sử dụng).',
        type: 'error',
      });
    }
  };

  const handleAddItemRow = () => {
    setNewItems((prev) => [...prev, { materialId: 1, quantity: 1, unitCost: 10000 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (newItems.length <= 1) return;
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemPayload, value: number) => {
    setNewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    if (newItems.length === 0) {
      alert('Vui lòng thêm ít nhất một mặt hàng vật tư.');
      return;
    }
    setSubmittingCreate(true);
    try {
      const payload: CreateInputPurchasePayload = {
        supplierId: newSupplierId ? Number(newSupplierId) : undefined,
        purchaseDate: newPurchaseDate,
        referenceNo: newReferenceNo.trim() || undefined,
        warehouseReceiptNo: newWarehouseReceiptNo.trim() || undefined,
        notes: newNotes.trim() || undefined,
        items: newItems,
      };
      const created = await recordInputPurchase(farmId, payload);
      setPurchases((prev) => [created, ...prev]);
      setNotification({
        text: `Đã ghi nhận phiếu mua vật tư "${created.referenceNo || '#' + created.purchaseId}" thành công!`,
        type: 'success',
      });
      setIsCreateOpen(false);
      // Reset form
      setNewSupplierId('');
      setNewReferenceNo('');
      setNewWarehouseReceiptNo('');
      setNewNotes('');
      setNewItems([{ materialId: 1, quantity: 10, unitCost: 50000 }]);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể ghi nhận phiếu mua vật tư.',
        type: 'error',
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Filtered purchases by warehouse link
  const displayedPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (warehouseFilter === 'LINKED') return Boolean(p.warehouseReceiptNo);
      if (warehouseFilter === 'UNLINKED') return !p.warehouseReceiptNo;
      return true;
    });
  }, [purchases, warehouseFilter]);

  const totalSpent = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [purchases]);

  const linkedWarehouseCount = useMemo(() => {
    return purchases.filter((p) => Boolean(p.warehouseReceiptNo)).length;
  }, [purchases]);

  return (
    <div className="input-purchases-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Heading */}
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', color: '#0f172a' }}>
            {lang === 'en' ? 'Agricultural Input Purchases' : 'Quản lý mua vật tư & Hóa đơn đầu vào'}
          </h1>
          <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {lang === 'en'
              ? 'View input purchase list, inspect detailed line items, and link to warehouse receipts (UC-36).'
              : 'Theo dõi danh sách mua sắm phân bón, thuốc BVTV, vật tư và liên kết phiếu nhập kho VietGAP (UC-36).'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="action-button solid"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="plus" size={16} />
            <span>{lang === 'en' ? 'Record Input Purchase' : 'Ghi nhận phiếu mua mới'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
          }}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG PHIẾU MUA VẬT TƯ</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0f172a', fontWeight: 800 }}>{purchases.length}</h2>
          <small style={{ color: '#64748b' }}>Hóa đơn / phiếu thu mua</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG CHI PHÍ ĐẦU VÀO</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '26px', color: '#059669', fontWeight: 800 }}>
            {totalSpent.toLocaleString('vi-VN')} đ
          </h2>
          <small style={{ color: '#10b981' }}>Đã đối soát hạch toán</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ĐÃ LIÊN KẾT PHIẾU KHO</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0284c7', fontWeight: 800 }}>
            {linkedWarehouseCount} / {purchases.length}
          </h2>
          <small style={{ color: '#0284c7' }}>Chứng từ kho lưu trữ</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>NHÀ CUNG CẤP GIAO DỊCH</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#8b5cf6', fontWeight: 800 }}>
            {new Set(purchases.map((p) => p.supplierId).filter(Boolean)).size}
          </h2>
          <small style={{ color: '#8b5cf6' }}>Đơn vị cung ứng vật tư</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Tìm kiếm từ khóa
            </label>
            <input
              type="text"
              placeholder="Mã hóa đơn, ghi chú, nhà cung cấp..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Nhà cung cấp
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            >
              <option value="ALL">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Liên kết phiếu kho
            </label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value as any)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="LINKED">Đã liên kết kho</option>
              <option value="UNLINKED">Chưa liên kết kho</option>
            </select>
          </div>

          <div style={{ flex: '1 1 130px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ flex: '1 1 130px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="action-button solid" style={{ padding: '8px 16px', fontSize: '13.5px' }}>
              <Icon name="search" size={14} /> Tìm kiếm
            </button>
            <button type="button" className="action-button" onClick={handleResetFilters} style={{ padding: '8px 14px', fontSize: '13.5px' }}>
              Làm mới
            </button>
          </div>
        </form>
      </div>

      {/* View Input Purchase List Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Danh sách phiếu mua vật tư nông nghiệp ({displayedPurchases.length})
          </h3>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Nhấp vào dòng để xem chi tiết đầy đủ</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách phiếu mua vật tư...</div>
        ) : displayedPurchases.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Không tìm thấy phiếu mua vật tư nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '12px 18px' }}>Mã phiếu / Số HĐ</th>
                  <th style={{ padding: '12px 18px' }}>Nhà cung cấp</th>
                  <th style={{ padding: '12px 18px' }}>Ngày mua</th>
                  <th style={{ padding: '12px 18px' }}>Người thu mua</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Số mặt hàng</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Tổng thanh toán</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Phiếu nhập kho</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {displayedPurchases.map((purchase) => {
                  const hasWarehouse = Boolean(purchase.warehouseReceiptNo);
                  return (
                    <tr
                      key={purchase.purchaseId}
                      onClick={() => handleOpenDetails(purchase.purchaseId)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 18px', fontWeight: 650, color: '#0284c7' }}>
                        {purchase.referenceNo || `#PUR-${purchase.purchaseId}`}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#0f172a', fontWeight: 550 }}>
                        {purchase.supplierName || 'Nhà cung cấp chưa đặt tên'}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>
                        {new Date(purchase.purchaseDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>
                        {purchase.purchasedByName || '—'}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span className="profile-tag-pill" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {purchase.items?.length || 0} mặt hàng
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                        {(Number(purchase.totalAmount) || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        {hasWarehouse ? (
                          <span className="status-badge status-badge--success" title="Đã đối soát kho">
                            {purchase.warehouseReceiptNo}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenLinkModal(purchase, e)}
                            style={{
                              padding: '3px 8px',
                              fontSize: '11.5px',
                              borderRadius: '6px',
                              border: '1px dashed #cbd5e1',
                              background: '#fff',
                              color: '#0284c7',
                              cursor: 'pointer',
                            }}
                          >
                            + Liên kết kho
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="table-icon-btn"
                            title="Xem chi tiết phiếu mua"
                            onClick={() => handleOpenDetails(purchase.purchaseId)}
                          >
                            <Icon name="search" size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn"
                            title="Liên kết phiếu nhập kho"
                            onClick={(e) => handleOpenLinkModal(purchase, e)}
                          >
                            <Icon name="plots" size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title="Xóa phiếu mua (nếu đủ điều kiện)"
                            onClick={(e) => handleDelete(purchase.purchaseId, purchase.referenceNo || '', e)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
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

      {/* View Input Purchase Details Modal (UC-36 Details) */}
      {selectedPurchase && (
        <Modal open={true}
          onClose={() => setSelectedPurchase(null)}
          title={`Chi tiết phiếu mua vật tư ${selectedPurchase.referenceNo || '#' + selectedPurchase.purchaseId}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '550px', maxWidth: '780px' }}>
            {/* Header Status & Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Ngày giao dịch:</span>{' '}
                <strong>{new Date(selectedPurchase.purchaseDate).toLocaleDateString('vi-VN')}</strong>
                {selectedPurchase.purchasedByName && (
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                    Người mua: <strong>{selectedPurchase.purchasedByName}</strong>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Tổng thanh toán:</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                  {(Number(selectedPurchase.totalAmount) || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            {/* Supplier and Warehouse Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Nhà cung cấp
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0284c7' }}>
                  {selectedPurchase.supplierName || 'Không có tên nhà cung cấp'}
                </div>
                {selectedPurchase.notes && (
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                    Ghi chú: {selectedPurchase.notes}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Phiếu nhập kho (Warehouse Receipt)</div>
                  <button
                    type="button"
                    onClick={() => handleOpenLinkModal(selectedPurchase)}
                    style={{ fontSize: '12px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Thay đổi
                  </button>
                </div>
                {selectedPurchase.warehouseReceiptNo ? (
                  <div>
                    <span className="status-badge status-badge--success">{selectedPurchase.warehouseReceiptNo}</span>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#059669' }}>
                      ✓ Đã liên kết chứng từ kho VietGAP
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="status-badge status-badge--warning">Chưa liên kết</span>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#b45309' }}>
                      Chưa gắn số phiếu nhập kho lưu trữ.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#0f172a' }}>Danh mục mặt hàng vật tư nhập kho</h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tên mặt hàng vật tư</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Phân loại</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Số lượng</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Đơn giá (VND)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.length > 0 ? (
                      selectedPurchase.items.map((item, idx) => (
                        <tr key={item.purchaseItemId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.materialName || `Vật tư #${item.materialId}`}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {item.materialType || 'Vật tư canh tác'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            {(Number(item.unitCost) || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            {(Number(item.lineTotal) || 0).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          Không có mặt hàng chi tiết.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: '10px 14px', textAlign: 'right' }}>
                        Tổng cộng:
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontSize: '15px' }}>
                        {(Number(selectedPurchase.totalAmount) || 0).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="action-button"
                onClick={() => handleOpenLinkModal(selectedPurchase)}
              >
                <Icon name="plots" size={14} /> Liên kết phiếu kho
              </button>
              <button
                type="button"
                className="action-button danger"
                onClick={() => handleDelete(selectedPurchase.purchaseId, selectedPurchase.referenceNo || '')}
              >
                <Icon name="trash" size={14} /> Xóa phiếu mua
              </button>
              <button type="button" className="action-button solid" onClick={() => setSelectedPurchase(null)}>
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Link Warehouse Receipt Modal (UC-36.4) */}
      {linkingPurchase && (
        <Modal open={true}
          onClose={() => setLinkingPurchase(null)}
          title="Liên kết phiếu mua hàng với Phiếu nhập kho (Warehouse Receipt)"
        >
          <form onSubmit={handleSubmitLinkWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '400px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569' }}>
              Nhập mã số phiếu nhập kho thực tế tương ứng với lô vật tư mua hàng{' '}
              <strong>{linkingPurchase.referenceNo || '#' + linkingPurchase.purchaseId}</strong>:
            </p>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Số phiếu nhập kho (Warehouse Receipt No) *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: PNK-2026-0042..."
                value={receiptNoInput}
                onChange={(e) => setReceiptNoInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setLinkingPurchase(null)} disabled={submittingLink}>
                Hủy bỏ
              </button>
              <button type="submit" className="action-button solid" disabled={submittingLink || !receiptNoInput.trim()}>
                {submittingLink ? 'Đang lưu...' : 'Xác nhận liên kết'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Purchase Modal (UC-36.1) */}
      {isCreateOpen && (
        <Modal open={true}
          onClose={() => setIsCreateOpen(false)}
          title="Ghi nhận phiếu mua vật tư nông nghiệp mới"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '580px', maxWidth: '750px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Nhà cung cấp
                </label>
                <select
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName} ({s.phone || 'SĐT'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Ngày mua hàng *
                </label>
                <input
                  type="date"
                  required
                  value={newPurchaseDate}
                  onChange={(e) => setNewPurchaseDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Số hóa đơn / Số tham chiếu
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: HD-2026-081..."
                  value={newReferenceNo}
                  onChange={(e) => setNewReferenceNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Số phiếu nhập kho (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: PNK-2026-001..."
                  value={newWarehouseReceiptNo}
                  onChange={(e) => setNewWarehouseReceiptNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                Ghi chú mua hàng
              </label>
              <textarea
                rows={2}
                placeholder="Ghi chú điều kiện bảo quản, lô hàng VietGAP..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            {/* Dynamic Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Danh mục mặt hàng vật tư</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{ fontSize: '12.5px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Thêm mặt hàng
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 100px 150px 40px', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Mã VT"
                      value={item.materialId}
                      onChange={(e) => handleItemChange(idx, 'materialId', Number(e.target.value))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      placeholder="Số lượng"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Đơn giá (VND)"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={newItems.length <= 1}
                      style={{
                        padding: '6px',
                        background: 'none',
                        border: 'none',
                        cursor: newItems.length <= 1 ? 'not-allowed' : 'pointer',
                        color: newItems.length <= 1 ? '#cbd5e1' : '#ef4444',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                Hủy bỏ
              </button>
              <button type="submit" className="action-button solid" disabled={submittingCreate}>
                {submittingCreate ? 'Đang lưu...' : 'Lưu phiếu mua hàng'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
