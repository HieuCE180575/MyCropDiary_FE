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
  const { lang, t: translate } = useLanguage();
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
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load material purchases." : err instanceof Error ? err.message : 'Không thể tải danh sách mua vật tư.'),
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
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to search material purchase records." : err instanceof Error ? err.message : 'Lỗi khi tìm kiếm phiếu mua vật tư.'),
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
        text: (lang === 'en' ? `Linked goods receipt "${updated.warehouseReceiptNo}" successfully!` : `Đã liên kết phiếu nhập kho "${updated.warehouseReceiptNo}" thành công!`),
        type: 'success',
      });
      setLinkingPurchase(null);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to link goods receipt." : err instanceof Error ? err.message : 'Không thể liên kết phiếu nhập kho.'),
        type: 'error',
      });
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleDelete = async (purchaseId: number, refNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm((lang === 'en' ? `Confirm deletion of material purchase ${refNo || '#' + purchaseId}? This cannot be undone.` : `Xác nhận xóa phiếu mua vật tư ${refNo || '#' + purchaseId}? Thao tác này không thể hoàn tác.`))) return;
    try {
      await deleteInputPurchase(purchaseId);
      setPurchases((prev) => prev.filter((p) => p.purchaseId !== purchaseId));
      if (selectedPurchase?.purchaseId === purchaseId) {
        setSelectedPurchase(null);
      }
      setNotification({
        text: (lang === 'en' ? `Deleted material purchase #${purchaseId} successfully.` : `Đã xóa phiếu mua vật tư #${purchaseId} thành công.`),
        type: 'success',
      });
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete this purchase (materials may already have been used)." : err instanceof Error ? err.message : 'Không thể xóa phiếu mua vật tư (có thể vật tư đã được xuất sử dụng).'),
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
      alert((lang === 'en' ? "Add at least one material item." : 'Vui lòng thêm ít nhất một mặt hàng vật tư.'));
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
        text: (lang === 'en' ? `Recorded material purchase "${created.referenceNo || '#' + created.purchaseId}" successfully!` : `Đã ghi nhận phiếu mua vật tư "${created.referenceNo || '#' + created.purchaseId}" thành công!`),
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
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to record material purchase." : err instanceof Error ? err.message : 'Không thể ghi nhận phiếu mua vật tư.'),
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
            {lang === 'en' ? 'Input Purchases' : 'Mua sắm vật tư'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {lang === 'en'
              ? `${purchases.length} purchases · Total: ${(Number(totalSpent) || 0).toLocaleString('en-US')} ₫ at ${selectedFarm?.farmName || 'Farm'}`
              : `${purchases.length} phiếu mua · Tổng chi phí: ${totalSpent.toLocaleString('vi-VN')} đ tại ${selectedFarm?.farmName || 'trang trại'}`}
          </p>
        </div>

        <div>
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsCreateOpen(true)}
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
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Record Purchase' : 'Ghi nhận phiếu mua'}
          </button>
        </div>
      </div>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <form onSubmit={handleSearch} className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 240px' }}>
            <span className="search-icon">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              placeholder={lang === 'en' ? 'Invoice no, notes, supplier...' : 'Mã hóa đơn, ghi chú, nhà cung cấp...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="zone-clean-select-wrap">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label={lang === 'en' ? 'Filter by supplier' : 'Lọc theo nhà cung cấp'}
            >
              <option value="ALL">{lang === 'en' ? 'All Suppliers' : 'Tất cả nhà cung cấp'}</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
            <span className="select-arrow"><Icon name="chevron" size={16} /></span>
          </div>

          <button
            type="submit"
            className="action-button solid"
            style={{ height: '42px', padding: '0 16px', borderRadius: '10px' }}
          >
            {lang === 'en' ? 'Filter' : 'Lọc'}
          </button>

          {(keyword || supplierFilter !== 'ALL') && (
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              onClick={handleResetFilters}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
        </form>

        {/* Table Wrap */}
        <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                  <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'PURCHASE / INVOICE NO.' : 'MÃ PHIẾU / SỐ HĐ'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'SUPPLIER' : 'NHÀ CUNG CẤP'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'PURCHASE DATE' : 'NGÀY MUA'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'PURCHASED BY' : 'NGƯỜI THU MUA'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                  {lang === 'en' ? 'ITEMS' : 'SỐ MẶT HÀNG'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                  {lang === 'en' ? 'TOTAL AMOUNT' : 'TỔNG THANH TOÁN'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                  {lang === 'en' ? 'WAREHOUSE RECEIPT' : 'PHIẾU NHẬP KHO'}
                </th>
                <th style={{ width: '140px', padding: '14px 16px', textAlign: 'right' }}>
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    {lang === 'en' ? 'Loading input purchases data...' : 'Đang tải danh sách phiếu mua vật tư...'}
                  </td>
                </tr>
              ) : displayedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    {lang === 'en' ? 'No input purchases found.' : 'Không tìm thấy phiếu mua vật tư nào phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                displayedPurchases.map((purchase) => {
                  const hasWarehouse = Boolean(purchase.warehouseReceiptNo);
                  return (
                    <tr key={purchase.purchaseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={`Select #${purchase.purchaseId}`} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          onClick={() => handleOpenDetails(purchase.purchaseId)}
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
                          {purchase.referenceNo || `#PUR-${purchase.purchaseId}`}
                        </span>
                        <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                          {purchase.supplierName || (lang === 'en' ? 'Unnamed supplier' : 'Nhà cung cấp chưa đặt tên')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 500 }}>
                        {purchase.supplierName || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {new Date(purchase.purchaseDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13.5px' }}>
                        {purchase.purchasedByName || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className="profile-tag-pill" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {purchase.items?.length || 0} {lang === 'en' ? 'items' : 'mặt hàng'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                        {lang === 'en'
                          ? `${(Number(purchase.totalAmount) || 0).toLocaleString('en-US')} ₫`
                          : `${(Number(purchase.totalAmount) || 0).toLocaleString('vi-VN')} đ`}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {hasWarehouse ? (
                          <span className="status-badge status-badge--success" title={lang === 'en' ? 'Warehouse verified' : 'Đã đối soát kho'}>
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
                            + {lang === 'en' ? 'Link Warehouse' : 'Liên kết kho'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div className="table-action-btns zone-card-actions">
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={lang === 'en' ? 'View Purchase Details' : 'Xem chi tiết phiếu mua'}
                            aria-label={`View #${purchase.purchaseId}`}
                            onClick={() => handleOpenDetails(purchase.purchaseId)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn assign"
                            title={lang === 'en' ? 'Link Warehouse Receipt' : 'Liên kết phiếu nhập kho'}
                            aria-label={`Link receipt for #${purchase.purchaseId}`}
                            onClick={(e) => handleOpenLinkModal(purchase, e)}
                          >
                            <Icon name="layers" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title={lang === 'en' ? 'Delete Purchase' : 'Xóa phiếu mua'}
                            aria-label={`Delete #${purchase.purchaseId}`}
                            onClick={(e) => handleDelete(purchase.purchaseId, purchase.referenceNo || '', e)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="zone-table-footer">
          <span>
            {lang === 'en'
              ? `Showing 1–${displayedPurchases.length} of ${purchases.length} input purchases`
              : `Hiển thị 1–${displayedPurchases.length} trong ${purchases.length} phiếu mua vật tư`}
          </span>
          <div className="zone-pagination-wrap">
            <button type="button" className="zone-page-btn" disabled>&lt;</button>
            <button type="button" className="zone-page-btn active">1</button>
            <button type="button" className="zone-page-btn" disabled>&gt;</button>
          </div>
        </div>
      </div>

      {/* View Input Purchase Details Modal */}
      {selectedPurchase && (
        <Modal open={true}
          onClose={() => setSelectedPurchase(null)}
          title={lang === 'en'
            ? `Input Purchase Details ${selectedPurchase.referenceNo || '#' + selectedPurchase.purchaseId}`
            : `Chi tiết phiếu mua vật tư ${selectedPurchase.referenceNo || '#' + selectedPurchase.purchaseId}`}
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
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>{lang === 'en' ? 'Purchase Date:' : 'Ngày giao dịch:'}</span>{' '}
                <strong>{new Date(selectedPurchase.purchaseDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}</strong>
                {selectedPurchase.purchasedByName && (
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                    {lang === 'en' ? 'Purchased by:' : 'Người mua:'} <strong>{selectedPurchase.purchasedByName}</strong>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>{lang === 'en' ? 'Total Amount:' : 'Tổng thanh toán:'}</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                  {lang === 'en'
                          ? `${(Number(selectedPurchase.totalAmount) || 0).toLocaleString('en-US')} ₫`
                          : `${(Number(selectedPurchase.totalAmount) || 0).toLocaleString('vi-VN')} đ`}
                </div>
              </div>
            </div>

            {/* Supplier and Warehouse Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {lang === 'en' ? 'Supplier' : 'Nhà cung cấp'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0284c7' }}>
                  {selectedPurchase.supplierName || (lang === 'en' ? 'Unnamed supplier' : 'Không có tên nhà cung cấp')}
                </div>
                {selectedPurchase.notes && (
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                    {lang === 'en' ? 'Notes:' : 'Ghi chú:'} {selectedPurchase.notes}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {lang === 'en' ? 'Warehouse Receipt' : 'Phiếu nhập kho (Warehouse Receipt)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenLinkModal(selectedPurchase)}
                    style={{ fontSize: '12px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {lang === 'en' ? 'Change' : 'Thay đổi'}
                  </button>
                </div>
                {selectedPurchase.warehouseReceiptNo ? (
                  <div>
                    <span className="status-badge status-badge--success">{selectedPurchase.warehouseReceiptNo}</span>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#059669' }}>
                      {lang === 'en' ? '✓ Linked to VietGAP warehouse receipt' : '✓ Đã liên kết chứng từ kho VietGAP'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="status-badge status-badge--warning">{lang === 'en' ? 'Unlinked' : 'Chưa liên kết'}</span>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#b45309' }}>
                      {lang === 'en' ? 'No warehouse receipt linked.' : 'Chưa gắn số phiếu nhập kho lưu trữ.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#0f172a' }}>
                {lang === 'en' ? 'Input Items in Purchase' : 'Danh mục mặt hàng vật tư nhập kho'}
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>{lang === 'en' ? 'Item Name' : 'Tên mặt hàng vật tư'}</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>{lang === 'en' ? 'Type' : 'Phân loại'}</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>{lang === 'en' ? 'Quantity' : 'Số lượng'}</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>{lang === 'en' ? 'Unit Cost (VND)' : 'Đơn giá (VND)'}</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>{lang === 'en' ? 'Subtotal' : 'Thành tiền'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.length > 0 ? (
                      selectedPurchase.items.map((item, idx) => (
                        <tr key={item.purchaseItemId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.materialName || `${lang === 'en' ? 'Material' : 'Vật tư'} #${item.materialId}`}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {item.materialType || (lang === 'en' ? 'Farm Input' : 'Vật tư canh tác')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                            {item.quantity} {translate(item.unit || '')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            {(Number(item.unitCost) || 0).toLocaleString('vi-VN')} {(lang === 'en' ? " VND" : " đ")}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            {(Number(item.lineTotal) || 0).toLocaleString('vi-VN')} {(lang === 'en' ? " VND" : " đ")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          {lang === 'en' ? 'No item details available.' : 'Không có mặt hàng chi tiết.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {lang === 'en' ? 'Total:' : 'Tổng cộng:'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontSize: '15px' }}>
                        {lang === 'en'
                          ? `${(Number(selectedPurchase.totalAmount) || 0).toLocaleString('en-US')} ₫`
                          : `${(Number(selectedPurchase.totalAmount) || 0).toLocaleString('vi-VN')} đ`}
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
                <Icon name="plots" size={14} /> {lang === 'en' ? 'Link Warehouse Receipt' : 'Liên kết phiếu kho'}
              </button>
              <button
                type="button"
                className="action-button danger"
                onClick={() => handleDelete(selectedPurchase.purchaseId, selectedPurchase.referenceNo || '')}
              >
                <Icon name="trash" size={14} /> {lang === 'en' ? 'Delete Purchase' : 'Xóa phiếu mua'}
              </button>
              <button type="button" className="action-button solid" onClick={() => setSelectedPurchase(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Link Warehouse Receipt Modal */}
      {linkingPurchase && (
        <Modal open={true}
          onClose={() => setLinkingPurchase(null)}
          title={lang === 'en'
            ? 'Link Purchase to Warehouse Receipt'
            : 'Liên kết phiếu mua hàng với Phiếu nhập kho (Warehouse Receipt)'}
        >
          <form onSubmit={handleSubmitLinkWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '400px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569' }}>
              {lang === 'en'
                ? `Enter actual warehouse receipt number corresponding to purchase batch ${linkingPurchase.referenceNo || '#' + linkingPurchase.purchaseId}:`
                : `Nhập mã số phiếu nhập kho thực tế tương ứng với lô vật tư mua hàng ${linkingPurchase.referenceNo || '#' + linkingPurchase.purchaseId}:`}
            </p>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                {lang === 'en' ? 'Warehouse Receipt No. *' : 'Số phiếu nhập kho (Warehouse Receipt No) *'}
              </label>
              <input
                type="text"
                required
                placeholder={lang === 'en' ? 'e.g. PNK-2026-0042...' : 'Ví dụ: PNK-2026-0042...'}
                value={receiptNoInput}
                onChange={(e) => setReceiptNoInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setLinkingPurchase(null)} disabled={submittingLink}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button type="submit" className="action-button solid" disabled={submittingLink || !receiptNoInput.trim()}>
                {submittingLink ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Confirm Link' : 'Xác nhận liên kết')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Purchase Modal */}
      {isCreateOpen && (
        <Modal open={true}
          onClose={() => setIsCreateOpen(false)}
          title={lang === 'en' ? 'Record New Agricultural Input Purchase' : 'Ghi nhận phiếu mua vật tư nông nghiệp mới'}
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '580px', maxWidth: '750px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Supplier' : 'Nhà cung cấp'}
                </label>
                <select
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                >
                  <option value="">{lang === 'en' ? '-- Select Supplier --' : '-- Chọn nhà cung cấp --'}</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName} ({(lang === 'en' ? s.phone || "Phone" : s.phone || 'SĐT')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Purchase Date *' : 'Ngày mua hàng *'}
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
                  {lang === 'en' ? 'Invoice No. / Reference No.' : 'Số hóa đơn / Số tham chiếu'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. INV-2026-081...' : 'Ví dụ: HD-2026-081...'}
                  value={newReferenceNo}
                  onChange={(e) => setNewReferenceNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Warehouse Receipt No. (optional)' : 'Số phiếu nhập kho (nếu có)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. PNK-2026-001...' : 'Ví dụ: PNK-2026-001...'}
                  value={newWarehouseReceiptNo}
                  onChange={(e) => setNewWarehouseReceiptNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Purchase Notes' : 'Ghi chú mua hàng'}
              </label>
              <textarea
                rows={2}
                placeholder={lang === 'en' ? 'Storage conditions, VietGAP batch...' : 'Ghi chú điều kiện bảo quản, lô hàng VietGAP...'}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            {/* Dynamic Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  {lang === 'en' ? 'Purchased Input Items' : 'Danh mục mặt hàng vật tư'}
                </span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{ fontSize: '12.5px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + {lang === 'en' ? 'Add Item' : 'Thêm mặt hàng'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 100px 150px 40px', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      placeholder={lang === 'en' ? 'Mat ID' : 'Mã VT'}
                      value={item.materialId}
                      onChange={(e) => handleItemChange(idx, 'materialId', Number(e.target.value))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      placeholder={lang === 'en' ? 'Qty' : 'Số lượng'}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder={lang === 'en' ? 'Unit Price' : 'Đơn giá (VND)'}
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
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button type="submit" className="action-button solid" disabled={submittingCreate}>
                {submittingCreate ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Purchase' : 'Lưu phiếu mua hàng')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
