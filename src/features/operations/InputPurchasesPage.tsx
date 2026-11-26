import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { LoadError } from '../../shared/components/LoadError';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

import { formatDate as displayDate, formatCurrency as displayCurrency } from '../../shared/format/formatters';
import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useState, useMemo } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { useLanguage } from '../../shared/i18n/LanguageContext';
import {
  fetchInputPurchases,
  searchInputPurchases,
  fetchInputPurchaseDetails,
  recordInputPurchase,
  deleteInputPurchase,
  linkWarehouseReceipt,
  fetchSuppliers,
  type InputPurchaseItem,
  type SupplierItem,
  type CreateInputPurchasePayload,
  type PurchaseItemPayload,
} from './procurementService';

export function InputPurchasesPage({ embedded = false }: { embedded?: boolean }) {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const detailLoader = useDetailRequest(selectedFarm?.id);
  const farmId = selectedFarm?.id;

  const [purchases, setPurchases] = useState<InputPurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; refNo: string; farmId: number | undefined } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // View Details Modal
  const [selectedPurchase, setSelectedPurchase] = useState<InputPurchaseItem | null>(null);


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
  const [materialOptions, setMaterialOptions] = useState<{ id: number; materialName: string }[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialsRetry, setMaterialsRetry] = useState(0);
  useEffect(() => {
    if (!isCreateOpen || !farmId) return;
    const controller = new AbortController();
    setMaterialOptions([]);
    setMaterialsLoading(true);
    setMaterialsError(null);
    apiRequest<ApiResponse<{ id: number; materialName: string }[]>>('/material-usages/materials?farmId=' + farmId, { signal: controller.signal })
      .then(response => {
        if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || 'Unable to load materials.');
        if (!controller.signal.aborted) setMaterialOptions(response.data);
      }).catch(err => {
        if (!controller.signal.aborted) setMaterialsError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load materials.' : 'Không tải được danh mục vật tư.'));
      }).finally(() => { if (!controller.signal.aborted) setMaterialsLoading(false); });
    return () => controller.abort();
  }, [isCreateOpen, farmId, materialsRetry]);
  const [newItems, setNewItems] = useState<PurchaseItemPayload[]>([
    { materialId: 0, quantity: 10, unitCost: 50000 },
  ]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const loadData = async () => {
    if (!farmId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [purchasesData, suppliersData] = await Promise.all([
        fetchInputPurchases(farmId),
        fetchSuppliers(farmId),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
    } catch (err) {
      setLoadError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load material purchases." : err instanceof Error ? err.message : 'Không thể tải danh sách mua vật tư.'));
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
    setLoadError(null);
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
    setSelectedPurchase(null);
    await detailLoader.load(() => fetchInputPurchaseDetails(purchaseId), setSelectedPurchase);
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
        text: (message("Linked goods receipt \"{value1}\" successfully!", { value1: updated.warehouseReceiptNo })),
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

  const requestDelete = (purchaseId: number, refNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ id: purchaseId, refNo, farmId });
  };

  const handleDelete = async (purchaseId: number) => {
    if (deleting) return;
    if (deleteTarget?.farmId !== farmId) { setDeleteTarget(null); return; }
    setDeleting(true);
    try {
      await deleteInputPurchase(purchaseId);
      setPurchases((prev) => prev.filter((p) => p.purchaseId !== purchaseId));
      if (selectedPurchase?.purchaseId === purchaseId) {
        setSelectedPurchase(null);
      }
      setNotification({
        text: lang === 'en' ? 'Material purchase deleted successfully.' : 'Đã xóa phiếu mua vật tư.',
        type: 'success',
      });
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete this purchase (materials may already have been used)." : err instanceof Error ? err.message : 'Không thể xóa phiếu mua vật tư (có thể vật tư đã được xuất sử dụng).'),
        type: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAddItemRow = () => {
    setNewItems((prev) => [...prev, { materialId: 0, quantity: 1, unitCost: 10000 }]);
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
    if (newItems.length === 0 || newItems.some(item => !materialOptions.some(material => material.id === item.materialId))) {
      setNotification({ text: lang === 'en' ? 'Select a material for every item.' : 'Vui lòng chọn vật tư cho từng mặt hàng.', type: 'error' });
      return;
    }
    setNotification(null);
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
        text: (message("Recorded material purchase \"{value1}\" successfully!", { value1: created.referenceNo || (lang === 'en' ? 'Material purchase' : 'Phiếu mua vật tư') })),
        type: 'success',
      });
      setIsCreateOpen(false);
      // Reset form
      setNewSupplierId('');
      setNewReferenceNo('');
      setNewWarehouseReceiptNo('');
      setNewNotes('');
      setNewItems([{ materialId: 0, quantity: 10, unitCost: 50000 }]);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to record material purchase." : err instanceof Error ? err.message : 'Không thể ghi nhận phiếu mua vật tư.'),
        type: 'error',
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Apply filters to the complete purchase list before pagination.
  const displayedPurchases = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase();
    return purchases.filter((p) => {
      if (supplierFilter !== 'ALL' && p.supplierId !== Number(supplierFilter)) return false;
      if (query && ![p.referenceNo, p.notes, p.supplierName].some(value => value?.toLocaleLowerCase().includes(query))) return false;
      if (fromDate && p.purchaseDate.slice(0, 10) < fromDate) return false;
      if (toDate && p.purchaseDate.slice(0, 10) > toDate) return false;
      if (warehouseFilter === 'LINKED') return Boolean(p.warehouseReceiptNo);
      if (warehouseFilter === 'UNLINKED') return !p.warehouseReceiptNo;
      return true;
    });
  }, [purchases, keyword, supplierFilter, warehouseFilter, fromDate, toDate]);

  const purchasesPagination = usePagination(displayedPurchases, JSON.stringify([farmId, keyword, warehouseFilter, supplierFilter, fromDate, toDate]));

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {detailLoader.feedback}
      {/* Status / Action Notification Banner */}
      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div
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
        </div>))}

      {/* Main Page Heading matching Mockup */}
      <PageHeading level={embedded ? 2 : 1}   title={<>
            {lang === 'en' ? 'Input Purchases' : 'Mua sắm vật tư'}
          </>}><div>
          <Button
            type="button"
            variant="primary"
            onClick={() => { setNotification(null); setIsCreateOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Record Purchase' : 'Ghi nhận phiếu mua'}
          </Button>
        </div></PageHeading>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <div className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 240px' }}>
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input aria-label={lang === 'en' ? 'Invoice no, notes, supplier...' : 'Mã hóa đơn, ghi chú, nhà cung cấp...'} id="input-purchases-page-control-3" className="ui-input"
              type="search"
              placeholder={lang === 'en' ? 'Invoice no, notes, supplier...' : 'Mã hóa đơn, ghi chú, nhà cung cấp...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleSearch(); } }}
              />
          </div>

          <div className="zone-clean-select-wrap">
            <select className="ui-select"
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
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              onClick={handleResetFilters}
            >
              <Icon name="refresh" size={16} />
            </button>
        </div>

        {/* Table Wrap */}
        <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
          <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--color-page)' }}>

                <th scope="col">
                  {lang === 'en' ? 'MATERIAL / INVOICE NO.' : 'TÊN VẬT TƯ / MÃ PHIẾU'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'SUPPLIER' : 'NHÀ CUNG CẤP'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'PURCHASE DATE' : 'NGÀY MUA'}
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  {lang === 'en' ? 'TOTAL AMOUNT' : 'TỔNG THANH TOÁN'}
                </th>
                <th scope="col" style={{ textAlign: 'center' }}>
                  {lang === 'en' ? 'WAREHOUSE RECEIPT' : 'PHIẾU NHẬP KHO'}
                </th>
                <th scope="col" style={{ width: '140px', textAlign: 'right' }}>
                  {lang === 'en' ? 'Actions' : 'Thao tác'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading input purchases data...' : 'Đang tải danh sách phiếu mua vật tư...'}
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={6}><LoadError message={loadError} onRetry={() => { void loadData(); }} /></td></tr>
              ) : displayedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No input purchases found.' : 'Không tìm thấy phiếu mua vật tư nào phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                purchasesPagination.items.map((purchase) => {
                  const hasWarehouse = Boolean(purchase.warehouseReceiptNo);
                  return (
                    <tr key={purchase.purchaseId} style={{ borderBottom: '1px solid var(--color-border)' }}>

                      <td>
                        <span
                          onClick={() => handleOpenDetails(purchase.purchaseId)}
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
                          {purchase.items && purchase.items.length > 0
                            ? purchase.items.map((i) => i.materialName).filter(Boolean).join(', ')
                            : (purchase.referenceNo || (lang === 'en' ? 'Material purchase' : 'Phiếu mua vật tư'))}
                        </span>
                        {purchase.referenceNo && purchase.items && purchase.items.length > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
                            {purchase.referenceNo}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-body)', fontSize: '13.5px', fontWeight: 500 }}>
                        {purchase.supplierName || '—'}
                      </td>
                      <td style={{ color: 'var(--color-muted)', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {displayDate(purchase.purchaseDate, lang)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-text)', fontSize: '14px' }}>
                        {displayCurrency(purchase.totalAmount ?? 0, lang)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {hasWarehouse ? (
                          <StatusBadge title={lang === 'en' ? 'Warehouse verified' : 'Đã đối soát kho'}  tone="success" label={<>
                            {purchase.warehouseReceiptNo}
                          </>} />
                        ) : (
                          <StatusBadge tone="neutral" label={lang === 'en' ? 'Unlinked' : 'Chưa liên kết'} />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-btns zone-card-actions">
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={lang === 'en' ? 'View Purchase Details' : 'Xem chi tiết phiếu mua'}
                            aria-label={translate("View") + " #" + (purchase.purchaseId)}
                            onClick={() => handleOpenDetails(purchase.purchaseId)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn assign"
                            title={lang === 'en' ? 'Link Warehouse Receipt' : 'Liên kết phiếu nhập kho'}
                            aria-label={translate("Link receipt for") + " #" + (purchase.purchaseId)}
                            onClick={(e) => handleOpenLinkModal(purchase, e)}
                          >
                            <Icon name="layers" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title={lang === 'en' ? 'Delete Purchase' : 'Xóa phiếu mua'}
                            aria-label={translate("Delete") + " #" + (purchase.purchaseId)}
                            onClick={(e) => requestDelete(purchase.purchaseId, purchase.referenceNo || '', e)}
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
        <TablePagination {...purchasesPagination} disabled={loading} />
      </div>

      {/* View Input Purchase Details Modal */}
      {selectedPurchase && (
        <Modal structured open={true}
          onClose={() => setSelectedPurchase(null)}
          title={lang === 'en'
            ? 'Input purchase details'
            : 'Chi tiết phiếu mua vật tư'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0, maxWidth: '780px' }}>
            {/* Header Status & Total */}
            <div
              className="ui-detail-primary"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ marginBottom: '6px' }}>
                  {lang === 'en' ? 'Purchase reference / Invoice number:' : 'Mã phiếu / Số hóa đơn:'}{' '}
                  <strong>{selectedPurchase.referenceNo || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</strong>
                </div>
                <span style={{ fontSize: '12.5px' }}>{lang === 'en' ? 'Purchase Date:' : 'Ngày giao dịch:'}</span>{' '}
                <strong>{displayDate(selectedPurchase.purchaseDate, lang)}</strong>
                {selectedPurchase.purchasedByName && (
                  <div style={{ fontSize: '12.5px', marginTop: '3px' }}>
                    {lang === 'en' ? 'Purchased by:' : 'Người mua:'} <strong>{selectedPurchase.purchasedByName}</strong>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px' }}>{lang === 'en' ? 'Total Amount:' : 'Tổng thanh toán:'}</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-text)' }}>
                  {displayCurrency(selectedPurchase.totalAmount ?? 0, lang)}
                </div>
              </div>
            </div>

            {/* Supplier and Warehouse Info */}
            <div className="ui-form-grid" >
              <div className="structured-field-card">
                <div className="structured-field-header">
                  {lang === 'en' ? 'Supplier' : 'Nhà cung cấp'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-info)' }}>
                  {selectedPurchase.supplierName || (lang === 'en' ? 'Unnamed supplier' : 'Không có tên nhà cung cấp')}
                </div>
                {selectedPurchase.notes && (
                  <div style={{ fontSize: '12.5px', color: 'var(--color-muted)', marginTop: '6px' }}>
                    {lang === 'en' ? 'Notes:' : 'Ghi chú:'} {selectedPurchase.notes}
                  </div>
                )}
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {lang === 'en' ? 'Warehouse Receipt' : 'Phiếu nhập kho (Warehouse Receipt)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenLinkModal(selectedPurchase)}
                    style={{ fontSize: '12px', color: 'var(--color-info)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {lang === 'en' ? 'Change' : 'Thay đổi'}
                  </button>
                </div>
                {selectedPurchase.warehouseReceiptNo ? (
                  <div>
                    <StatusBadge   tone="success" label={<>{selectedPurchase.warehouseReceiptNo}</>} />
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-primary-text)' }}>
                      {lang === 'en' ? '✓ Linked to VietGAP warehouse receipt' : '✓ Đã liên kết chứng từ kho VietGAP'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <StatusBadge   tone="warning" label={<>{lang === 'en' ? 'Unlinked' : 'Chưa liên kết'}</>} />
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-warning)' }}>
                      {lang === 'en' ? 'No warehouse receipt linked.' : 'Chưa gắn số phiếu nhập kho lưu trữ.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: 'var(--color-text)' }}>
                {lang === 'en' ? 'Input Items in Purchase' : 'Danh mục mặt hàng vật tư nhập kho'}
              </h4>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflowX: 'auto' }} className="ui-table-scroll" tabIndex={0}>
                <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-page)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-body)' }}>
                      <th scope="col" style={{ textAlign: 'left' }}>{lang === 'en' ? 'Item Name' : 'Tên mặt hàng vật tư'}</th>
                      <th scope="col" style={{ textAlign: 'left' }}>{lang === 'en' ? 'Type' : 'Phân loại'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Quantity' : 'Số lượng'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Unit Cost (VND)' : 'Đơn giá (VND)'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Subtotal' : 'Thành tiền'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.length > 0 ? (
                      selectedPurchase.items.map((item, idx) => (
                        <tr key={item.purchaseItemId || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {item.materialName || `${lang === 'en' ? 'Material' : 'Vật tư'}`}
                          </td>
                          <td style={{ color: 'var(--color-muted)' }}>
                            {item.materialType || (lang === 'en' ? 'Farm Input' : 'Vật tư canh tác')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {item.quantity} {translate(item.unit || '')}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-body)' }}>
                            {displayCurrency(item.unitCost ?? 0, lang)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-text)' }}>
                            {displayCurrency(item.lineTotal ?? 0, lang)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)' }}>
                          {lang === 'en' ? 'No item details available.' : 'Không có mặt hàng chi tiết.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="purchase-detail-total">
                <span>{lang === 'en' ? 'Total:' : 'Tổng cộng:'}</span>
                <strong>{displayCurrency(selectedPurchase.totalAmount ?? 0, lang)}</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="confirm-dialog-actions" style={{ flexWrap: 'wrap', marginTop: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                className="purchase-link-button"
                onClick={() => handleOpenLinkModal(selectedPurchase)}
              >
                <Icon name="layers" size={16} /> {lang === 'en' ? 'Link Warehouse Receipt' : 'Liên kết phiếu kho'}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="purchase-delete-button"
                onClick={() => requestDelete(selectedPurchase.purchaseId, selectedPurchase.referenceNo || '')}
              >
                <Icon name="trash" size={14} /> {lang === 'en' ? 'Delete Purchase' : 'Xóa phiếu mua'}
              </Button>
              <Button className={'ui-close-action'} type="button" variant="secondary" onClick={() => setSelectedPurchase(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Link Warehouse Receipt Modal */}
      {linkingPurchase && (
        <Modal structured open={true}
          onClose={() => setLinkingPurchase(null)}
          title={lang === 'en'
            ? 'Link Purchase to Warehouse Receipt'
            : 'Liên kết phiếu mua hàng với phiếu nhập kho'}
        >
          <form onSubmit={handleSubmitLinkWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '16px', }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-body)' }}>
              {lang === 'en'
                ? `Enter actual warehouse receipt number corresponding to purchase batch ${linkingPurchase.referenceNo || ''}:`
                : `Nhập mã số phiếu nhập kho thực tế tương ứng với lô vật tư mua hàng ${linkingPurchase.referenceNo || ''}:`}
            </p>

            <div className="form-group structured-field-card">
              <label htmlFor="input-purchases-page-field-1">
                {lang === 'en' ? 'Warehouse Receipt No.' : 'Số phiếu nhập kho'}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input id="input-purchases-page-field-1" className="ui-input"
                type="text"
                required
                placeholder={lang === 'en' ? 'e.g. PNK-2026-0042...' : 'Ví dụ: PNK-2026-0042...'}
                value={receiptNoInput}
                onChange={(e) => setReceiptNoInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button className="ui-cancel-button" type="button" variant="secondary" onClick={() => setLinkingPurchase(null)} disabled={submittingLink}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </Button>
              <Button type="submit" variant="primary" disabled={submittingLink || !receiptNoInput.trim()}>
                {submittingLink ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Confirm Link' : 'Xác nhận liên kết')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Purchase Modal */}
      {isCreateOpen && (
        <Modal structured open={true}
          onClose={() => setIsCreateOpen(false)}
          title={lang === 'en' ? 'Record New Agricultural Input Purchase' : 'Ghi nhận phiếu mua vật tư nông nghiệp mới'}
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '750px' }}>
            {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="ui-form-grid">
              <div className="structured-field-card">
                <div className="structured-field-header">
                  <label className="structured-field-label" htmlFor="input-purchases-page-field-2">
                  {lang === 'en' ? 'Supplier' : 'Nhà cung cấp'}
                </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
                </div>
                <select id="input-purchases-page-field-2" className="ui-select"
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  <option value="">{lang === 'en' ? '-- Select Supplier --' : '-- Chọn nhà cung cấp --'}</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName} ({(lang === 'en' ? s.phone || "Phone" : s.phone || 'SĐT')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                  <label className="structured-field-label" htmlFor="input-purchases-page-control-1">
                  {lang === 'en' ? 'Purchase Date' : 'Ngày mua hàng'}{' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
                </div>
                <input id="input-purchases-page-control-1" className="ui-input"
                  type="date"
                  required
                  value={newPurchaseDate}
                  onChange={(e) => setNewPurchaseDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                  <label className="structured-field-label" htmlFor="input-purchases-page-control-2">
                  {lang === 'en' ? 'Invoice No. / Reference No.' : 'Số hóa đơn / Số tham chiếu'}
                </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
                </div>
                <input id="input-purchases-page-control-2" className="ui-input"
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. INV-2026-081...' : 'Ví dụ: HD-2026-081...'}
                  value={newReferenceNo}
                  onChange={(e) => setNewReferenceNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                  <label className="structured-field-label" htmlFor="input-purchases-page-field-3">
                  {lang === 'en' ? 'Warehouse Receipt No.' : 'Số phiếu nhập kho'}
                </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
                </div>
                <input id="input-purchases-page-field-3" className="ui-input"
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. PNK-2026-001...' : 'Ví dụ: PNK-2026-001...'}
                  value={newWarehouseReceiptNo}
                  onChange={(e) => setNewWarehouseReceiptNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                  <label className="structured-field-label" htmlFor="input-purchases-page-field-4">
                {lang === 'en' ? 'Purchase Notes' : 'Ghi chú mua hàng'}
              </label>
                  <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
                </div>
              <textarea id="input-purchases-page-field-4" className="ui-textarea"
                rows={2}
                placeholder={lang === 'en' ? 'Storage conditions, VietGAP batch...' : 'Ghi chú điều kiện bảo quản, lô hàng VietGAP...'}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              />
            </div>

            {/* Dynamic Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text)' }}>
                  {lang === 'en' ? 'Purchased Input Items' : 'Danh mục mặt hàng vật tư'}
                </span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{ fontSize: '12.5px', color: 'var(--color-primary-text)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + {lang === 'en' ? 'Add Item' : 'Thêm mặt hàng'}
                </button>
              </div>

              {materialsError && <div role="alert" className="form-error-banner">{materialsError} <Button onClick={() => setMaterialsRetry(value => value + 1)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button></div>}
              {!materialsLoading && !materialsError && materialOptions.length === 0 && <p>{lang === 'en' ? 'No materials available. Add a material to the catalog first.' : 'Chưa có vật tư. Vui lòng thêm vật tư vào danh mục trước.'}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newItems.map((item, idx) => (
                  <div key={idx} className="purchase-item-row">
                    <label className="structured-field-card">
                    <span>{lang === 'en' ? 'Material' : 'Vật tư'}</span>
                    <select className="ui-select" required value={item.materialId || ''} disabled={materialsLoading || Boolean(materialsError)}
                      onChange={e => handleItemChange(idx, 'materialId', Number(e.target.value))}>
                      <option value="">{materialsLoading ? (lang === 'en' ? 'Loading materials...' : 'Đang tải vật tư...') : (lang === 'en' ? 'Select material' : 'Chọn vật tư')}</option>
                      {materialOptions.map(material => <option key={material.id} value={material.id}>{material.materialName}</option>)}
                    </select>
                    </label>
                    <label className="structured-field-card">
                    <span>{lang === 'en' ? 'Quantity' : 'Số lượng'}</span>
                    <input className="ui-input"
                      type="number"
                      min={0.01}
                      step="any"
                      placeholder={lang === 'en' ? 'Qty' : 'Số lượng'}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      style={{ padding: '6px 8px' }}
                    />
                    </label>
                    <label className="structured-field-card">
                    <span>{lang === 'en' ? 'Unit price (VND)' : 'Đơn giá (VND)'}</span>
                    <input className="ui-input"
                      type="number"
                      min={0}
                      placeholder={lang === 'en' ? 'Unit Price' : 'Đơn giá (VND)'}
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                      style={{ padding: '6px 8px' }}
                    />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={newItems.length <= 1}
                      className="table-icon-btn danger purchase-remove-item"
                      title={lang === 'en' ? 'Remove item' : 'Xóa mặt hàng'}
                      aria-label={lang === 'en' ? `Remove item ${idx + 1}` : `Xóa mặt hàng ${idx + 1}`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
              <Button className={'ui-cancel-button'} type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </Button>
              <Button type="submit" variant="primary" loading={submittingCreate}>
                {submittingCreate ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Purchase' : 'Lưu phiếu mua hàng')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog open={Boolean(deleteTarget)} title={lang === 'en' ? 'Delete material purchase' : 'Xóa phiếu mua vật tư'}
        description={lang === 'en' ? <>{"Confirm deletion of material purchase "}<strong>{deleteTarget?.refNo || '#' + deleteTarget?.id}</strong>{"? This cannot be undone."}</> : <>{"Xác nhận xóa phiếu mua vật tư "}<strong>{deleteTarget?.refNo || '#' + deleteTarget?.id}</strong>{"? Thao tác này không thể hoàn tác."}</>}
        tone="danger" loading={deleting} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget.id); }} />
    </section>
  );
}
