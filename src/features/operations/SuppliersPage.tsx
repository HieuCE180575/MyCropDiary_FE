import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { LoadError } from '../../shared/components/LoadError';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';

import { formatDate as uiFormatDate } from '../../shared/format/formatters';

import { usePagination } from '../../shared/hooks/usePagination';

import { useEffect, useState, useMemo } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { useLanguage } from '../../shared/i18n/LanguageContext';
import {
  fetchSuppliers,
  fetchSupplierDetails,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierItem,
  type CreateSupplierPayload,
  type UpdateSupplierPayload,
} from './procurementService';

export function SuppliersPage({ embedded = false }: { embedded?: boolean }) {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const detailLoader = useDetailRequest(selectedFarm?.id);
  const farmId = selectedFarm?.id;

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'with-orders' | 'without-orders'>('all');
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  // View Details Modal
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);


  // Create Supplier Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSupplierPayload>({
    supplierName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Update Supplier Modal
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateSupplierPayload>({
    supplierName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Delete Supplier Modal
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const loadSuppliers = async (searchKw?: string) => {
    if (!farmId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSuppliers(farmId, searchKw);
      setSuppliers(data);
    } catch (err) {
      setLoadError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load suppliers." : err instanceof Error ? err.message : 'Không thể tải danh sách nhà cung cấp.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, [farmId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadSuppliers(keyword.trim() || undefined);
  };

  const handleResetSearch = () => {
    setKeyword('');
    setPurchaseFilter('all');
    void loadSuppliers();
  };

  // View Details
  const handleOpenDetails = async (supplierId: number) => {
    setSelectedSupplier(null);
    await detailLoader.load(() => fetchSupplierDetails(supplierId), setSelectedSupplier);
  };
  // Create
  const handleOpenCreate = () => {
    setNotification(null);
    setCreateForm({
      supplierName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    if (!createForm.supplierName.trim()) {
      setNotification({ text: lang === 'en' ? 'Enter a supplier name.' : 'Vui lòng nhập tên nhà cung cấp.', type: 'error' });
      return;
    }
    setNotification(null);
    setSubmittingCreate(true);
    try {
      const created = await createSupplier(farmId, {
        supplierName: createForm.supplierName.trim(),
        contactName: createForm.contactName?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
        email: createForm.email?.trim() || undefined,
        address: createForm.address?.trim() || undefined,
        notes: createForm.notes?.trim() || undefined,
      });
      setSuppliers((prev) => [created, ...prev]);
      setNotification({
        text: (message("Added supplier \"{value1}\" successfully!", { value1: created.supplierName })),
        type: 'success',
      });
      setIsCreateOpen(false);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to create supplier." : err instanceof Error ? err.message : 'Không thể tạo nhà cung cấp.'),
        type: 'error',
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Update
  const handleOpenEdit = (supplier: SupplierItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotification(null);
    setEditingSupplier(supplier);
    setUpdateForm({
      supplierName: supplier.supplierName,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!updateForm.supplierName.trim()) {
      setNotification({ text: lang === 'en' ? 'Supplier name is required.' : 'Tên nhà cung cấp không được để trống.', type: 'error' });
      return;
    }
    setNotification(null);
    setSubmittingUpdate(true);
    try {
      const updated = await updateSupplier(editingSupplier.supplierId, {
        supplierName: updateForm.supplierName.trim(),
        contactName: updateForm.contactName?.trim() || undefined,
        phone: updateForm.phone?.trim() || undefined,
        email: updateForm.email?.trim() || undefined,
        address: updateForm.address?.trim() || undefined,
        notes: updateForm.notes?.trim() || undefined,
      });
      setSuppliers((prev) =>
        prev.map((s) => (s.supplierId === updated.supplierId ? updated : s))
      );
      if (selectedSupplier?.supplierId === updated.supplierId) {
        setSelectedSupplier(updated);
      }
      setNotification({
        text: (message("Updated supplier \"{value1}\" successfully!", { value1: updated.supplierName })),
        type: 'success',
      });
      setEditingSupplier(null);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update supplier." : err instanceof Error ? err.message : 'Không thể cập nhật nhà cung cấp.'),
        type: 'error',
      });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Delete Eligible Supplier
  const handleOpenDelete = (supplier: SupplierItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingSupplier(supplier);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingSupplier) return;
    if ((deletingSupplier.totalPurchasesCount || 0) > 0) {
      setNotification({ type: 'error', text: lang === 'en'
        ? 'Cannot delete this supplier because it has purchase orders.'
        : 'Không thể xóa nhà cung cấp vì đã có phiếu mua vật tư.' });
      setDeletingSupplier(null);
      return;
    }
    setSubmittingDelete(true);
    try {
      await deleteSupplier(deletingSupplier.supplierId);
      setSuppliers((prev) => prev.filter((s) => s.supplierId !== deletingSupplier.supplierId));
      if (selectedSupplier?.supplierId === deletingSupplier.supplierId) {
        setSelectedSupplier(null);
      }
      setNotification({
        text: (message("Deleted supplier \"{value1}\" successfully!", { value1: deletingSupplier.supplierName })),
        type: 'success',
      });
      setDeletingSupplier(null);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete supplier with linked purchase invoices." : err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp (đã phát sinh hóa đơn mua hàng).'),
        type: 'error',
      });
      setDeletingSupplier(null);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return suppliers.filter(
      (s) => {
        const purchaseCount = s.totalPurchasesCount ?? 0;
        if (purchaseFilter === 'with-orders' && purchaseCount === 0) return false;
        if (purchaseFilter === 'without-orders' && purchaseCount > 0) return false;
        return !lower || s.supplierName.toLowerCase().includes(lower) ||
        (s.contactName && s.contactName.toLowerCase().includes(lower)) ||
        (s.phone && s.phone.includes(lower)) ||
        (s.email && s.email.toLowerCase().includes(lower)) ||
        (s.address && s.address.toLowerCase().includes(lower));
      }
    );
  }, [suppliers, keyword, purchaseFilter]);

  const suppliersPagination = usePagination(filteredSuppliers, JSON.stringify([keyword, purchaseFilter]));

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
            {lang === 'en' ? 'Suppliers' : 'Nhà cung cấp'}
          </>}><div>
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Supplier' : 'Thêm nhà cung cấp'}
          </Button>
        </div></PageHeading>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <form onSubmit={handleSearch} className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 300px' }}>
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input aria-label={lang === 'en' ? 'Search by supplier name, contact, phone, address...' : 'Tìm kiếm theo tên nhà cung cấp, người đại diện, số điện thoại, địa chỉ...'} id="suppliers-page-control-1" className="ui-input"
              type="search"
              placeholder={lang === 'en' ? 'Search by supplier name, contact, phone, address...' : 'Tìm kiếm theo tên nhà cung cấp, người đại diện, số điện thoại, địa chỉ...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="zone-clean-select-wrap">
            <select
              id="supplier-purchase-filter"
              className="ui-select"
              aria-label={lang === 'en' ? 'Purchase history' : 'Lịch sử mua'}
              value={purchaseFilter}
              onChange={(event) => setPurchaseFilter(event.target.value as typeof purchaseFilter)}
            >
              <option value="all">{lang === 'en' ? 'All' : 'Tất cả'}</option>
              <option value="with-orders">{lang === 'en' ? 'Previously purchased' : 'Đã từng mua'}</option>
              <option value="without-orders">{lang === 'en' ? 'Never purchased' : 'Chưa từng mua'}</option>
            </select>
            <span className="select-arrow" aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
          </div>

          <button
            type="button"
            className="zone-clean-reload-btn"
            title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
            aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
            onClick={handleResetSearch}
          >
            <Icon name="refresh" size={16} />
          </button>
        </form>

        {/* Table Wrap */}
        <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
          <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--color-page)' }}>

                <th scope="col">
                  {lang === 'en' ? 'SUPPLIER NAME' : 'TÊN NHÀ CUNG CẤP'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'CONTACT PERSON' : 'NGƯỜI ĐẠI DIỆN'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'PHONE NUMBER' : 'SỐ ĐIỆN THOẠI'}
                </th>
                <th scope="col" style={{ textAlign: 'center' }}>
                  {lang === 'en' ? 'PURCHASE HISTORY' : 'LỊCH SỬ MUA'}
                </th>
                <th scope="col" style={{ width: '140px', textAlign: 'right' }}>
                  {lang === 'en' ? 'Actions' : 'Thao tác'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading suppliers directory...' : 'Đang tải danh bạ nhà cung cấp...'}
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={5}><LoadError message={loadError} onRetry={() => { void loadSuppliers(keyword.trim() || undefined); }} /></td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No suppliers matching keywords.' : 'Không tìm thấy nhà cung cấp nào phù hợp với từ khóa.'}
                  </td>
                </tr>
              ) : (
                suppliersPagination.items.map((supplier) => (
                  <tr key={supplier.supplierId} style={{ borderBottom: '1px solid var(--color-border)' }}>

                    <td>
                      <span
                        onClick={() => handleOpenDetails(supplier.supplierId)}
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
                        {supplier.supplierName}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-body)', fontSize: '13.5px', fontWeight: 500 }}>
                      {supplier.contactName || '—'}
                    </td>
                    <td style={{ color: 'var(--color-info)', fontSize: '13.5px', fontWeight: 600 }}>
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {supplier.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="profile-tag-pill" style={{ background: 'var(--color-subtle)', color: 'var(--color-body)' }}>
                        {supplier.totalPurchasesCount || 0} {lang === 'en' ? 'orders' : 'đơn'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-action-btns zone-card-actions">
                        <button
                          type="button"
                          className="table-icon-btn primary"
                          title={lang === 'en' ? 'View Details' : 'Xem chi tiết nhà cung cấp'}
                          aria-label={translate("View") + " " + (supplier.supplierName)}
                          onClick={() => handleOpenDetails(supplier.supplierId)}
                        >
                          <Icon name="eye" size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          title={lang === 'en' ? 'Edit Supplier' : 'Chỉnh sửa thông tin'}
                          aria-label={translate("Edit") + " " + (supplier.supplierName)}
                          onClick={(e) => handleOpenEdit(supplier, e)}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          title={lang === 'en' ? 'Delete Supplier (if eligible)' : 'Xóa nhà cung cấp (nếu đủ điều kiện)'}
                          aria-label={translate("Delete") + " " + (supplier.supplierName)}
                          onClick={(e) => handleOpenDelete(supplier, e)}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <TablePagination {...suppliersPagination} disabled={loading} />
      </div>

      {/* View Supplier Details Modal */}
      {selectedSupplier && (
        <Modal structured
          open={true}
          onClose={() => setSelectedSupplier(null)}
          title={lang === 'en' ? 'Supplier details' : 'Chi tiết nhà cung cấp'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, maxWidth: '600px' }}>
            <div className="ui-form-grid" style={{ gap: '16px' }}>
              <div className="structured-field-card supplier-detail-field ui-detail-primary">
                <div>{lang === 'en' ? 'Supplier name' : 'Tên nhà cung cấp'}</div>
                <div style={{ overflowWrap: 'anywhere' }}>{selectedSupplier.supplierName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</div>
              </div>
              <div className="structured-field-card supplier-detail-field">
                <div>{lang === 'en' ? 'Purchase history' : 'Lịch sử thu mua'}</div>
                <div>{selectedSupplier.totalPurchasesCount == null ? (lang === 'en' ? 'Not updated' : 'Chưa cập nhật') : `${selectedSupplier.totalPurchasesCount} ${lang === 'en' ? 'orders' : 'phiếu mua'}`}</div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="ui-form-grid" style={{ gap: '16px' }}>
              <div className="structured-field-card supplier-detail-field">
                <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Contact person' : 'Người đại diện liên hệ'}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
                  {selectedSupplier.contactName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div className="structured-field-card supplier-detail-field">
                <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Phone number' : 'Số điện thoại'}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-info)', marginTop: '4px' }}>
                  {selectedSupplier.phone || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div className="structured-field-card supplier-detail-field">
                <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Email address' : 'Địa chỉ email'}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
                  {selectedSupplier.email || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div className="structured-field-card supplier-detail-field">
                <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Date created' : 'Ngày tạo hồ sơ'}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
                  {selectedSupplier.createdAt ? uiFormatDate(selectedSupplier.createdAt, lang) : '—'}
                </div>
              </div>
            </div>

            <div className="structured-field-card supplier-detail-field">
              <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Headquarters / warehouse address' : 'Địa chỉ trụ sở / kho hàng'}</div>
              <div style={{ fontSize: '14px', color: 'var(--color-body)', marginTop: '4px' }}>
                {selectedSupplier.address || (lang === 'en' ? 'No address provided' : 'Chưa cập nhật địa chỉ')}
              </div>
            </div>

            <div className="structured-field-card supplier-detail-field">
                <div style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 750 }}>{lang === 'en' ? 'Contract notes / supplied materials' : 'Ghi chú hợp đồng / vật tư cung cấp'}</div>
                <div style={{ fontSize: '14px', color: 'var(--color-body)', marginTop: '4px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selectedSupplier.notes || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button className={'ui-close-action'} type="button" variant="secondary" onClick={() => setSelectedSupplier(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Supplier Modal */}
      {isCreateOpen && (
        <Modal structured customLayout className="modal-form-layout" open={true} onClose={() => { if (!submittingCreate) setIsCreateOpen(false); }} title={lang === 'en' ? 'Add New Supplier' : 'Thêm mới nhà cung cấp vật tư'}>
          <div className="modal-header">
            <h2 style={{ margin: 0 }}>{lang === 'en' ? 'Add New Supplier' : 'Thêm mới nhà cung cấp vật tư'}</h2>
            <button type="button" className="modal-close" disabled={submittingCreate} onClick={() => setIsCreateOpen(false)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleCreateSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-1">
                {lang === 'en' ? 'Company / Supplier Name' : 'Tên công ty / Nhà cung cấp'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
                <span className="structured-field-badge">{createForm.supplierName.length}/160 · {lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
              </div>
              <input id="suppliers-page-field-1" className="ui-input"
                maxLength={160}
                type="text"
                required
                placeholder={lang === 'en' ? 'e.g. Green Agriculture JSC...' : 'Ví dụ: Công ty Cổ phần Nông nghiệp Xanh...'}
                value={createForm.supplierName}
                onChange={(e) => setCreateForm({ ...createForm, supplierName: e.target.value })}
              />
            </div>

            <div className="ui-form-grid" style={{ gap: '16px' }}>
              <div className="structured-field-card">
                <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-2">
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
                <input id="suppliers-page-field-2" className="ui-input"
                  type="text"
                  placeholder={lang === 'en' ? 'Full name...' : 'Họ và tên...'}
                  value={createForm.contactName || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                />
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-3">
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
                <input id="suppliers-page-field-3" className="ui-input"
                  type="tel"
                  placeholder="09xx..."
                  value={createForm.phone || ''}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-4">
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <input id="suppliers-page-field-4" className="ui-input"
                type="email"
                placeholder="supplier@example.com..."
                value={createForm.email || ''}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-5">
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <input id="suppliers-page-field-5" className="ui-input"
                type="text"
                placeholder={lang === 'en' ? 'Street, Ward, District, City...' : 'Số nhà, đường, quận/huyện, tỉnh thành...'}
                value={createForm.address || ''}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-6">
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <textarea id="suppliers-page-field-6" className="ui-textarea"
                rows={2}
                placeholder={lang === 'en' ? 'Supplies organic fertilizers, F1 seeds...' : 'Chuyên cung ứng phân trùn quế, hạt giống F1...'}
                value={createForm.notes || ''}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>

            </div>
            <div className="modal-footer confirm-dialog-actions" style={{ margin: 0, padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
              <Button className={'ui-cancel-button'} type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={submittingCreate}>
                {submittingCreate ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Supplier' : 'Tạo nhà cung cấp')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Supplier Modal */}
      {editingSupplier && (
        <Modal structured customLayout className="modal-form-layout" open={true} onClose={() => { if (!submittingUpdate) setEditingSupplier(null); }} title={lang === 'en' ? 'Update Supplier' : 'Cập nhật nhà cung cấp'}>
          <div className="modal-header">
            <h2 style={{ margin: 0 }}>{lang === 'en' ? 'Update Supplier' : 'Cập nhật nhà cung cấp'}</h2>
            <button type="button" className="modal-close" disabled={submittingUpdate} onClick={() => setEditingSupplier(null)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}><Icon name="close" /></button>
          </div>
          <form onSubmit={handleUpdateSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-7">
                {lang === 'en' ? 'Company / Supplier Name' : 'Tên công ty / Nhà cung cấp'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
                <span className="structured-field-badge">{updateForm.supplierName.length}/160 · {lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
              </div>
              <input id="suppliers-page-field-7" className="ui-input"
                maxLength={160}
                type="text"
                required
                value={updateForm.supplierName}
                onChange={(e) => setUpdateForm({ ...updateForm, supplierName: e.target.value })}
              />
            </div>

            <div className="ui-form-grid" style={{ gap: '16px' }}>
              <div className="structured-field-card">
                <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-8">
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
                <input id="suppliers-page-field-8" className="ui-input"
                  type="text"
                  value={updateForm.contactName || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, contactName: e.target.value })}
                />
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-9">
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
                <input id="suppliers-page-field-9" className="ui-input"
                  type="tel"
                  value={updateForm.phone || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-10">
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <input id="suppliers-page-field-10" className="ui-input"
                type="email"
                value={updateForm.email || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-11">
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <input id="suppliers-page-field-11" className="ui-input"
                type="text"
                value={updateForm.address || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, address: e.target.value })}
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
                <label className="structured-field-label" htmlFor="suppliers-page-field-12">
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
                <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
              </div>
              <textarea id="suppliers-page-field-12" className="ui-textarea"
                rows={2}
                value={updateForm.notes || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              />
            </div>

            </div>
            <div className="modal-footer confirm-dialog-actions" style={{ margin: 0, padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
              <Button className={'ui-cancel-button'} type="button" variant="secondary" onClick={() => setEditingSupplier(null)} disabled={submittingUpdate}>
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button type="submit" variant="primary" loading={submittingUpdate}>
                {submittingUpdate ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deletingSupplier && (
          <Modal structured
            open={true}
            onClose={() => setDeletingSupplier(null)}
            title={lang === 'en' ? 'Delete Supplier Confirmation' : 'Xác nhận xóa nhà cung cấp'}
          >

            <p>{lang === 'en' ? 'Are you sure you want to delete supplier ' : 'Bạn có chắc chắn muốn xóa nhà cung cấp '}
              <strong>{deletingSupplier.supplierName}</strong>?
            </p>
            <div className="confirm-dialog-actions">
              <Button className="ui-cancel-button" disabled={submittingDelete} onClick={() => setDeletingSupplier(null)}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
              <Button variant="danger" loading={submittingDelete} onClick={handleDeleteSubmit}>{lang === 'en' ? 'Delete supplier' : 'Xóa nhà cung cấp'}</Button>
            </div>
          </Modal>
      )}
    </section>
  );
}
