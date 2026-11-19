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
  const farmId = selectedFarm?.id;

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
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
    void loadSuppliers();
  };

  // View Details
  const handleOpenDetails = async (supplierId: number) => {

    try {
      const detail = await fetchSupplierDetails(supplierId);
      setSelectedSupplier(detail);
    } catch {
      const fallback = suppliers.find((s) => s.supplierId === supplierId) || null;
      setSelectedSupplier(fallback);
    } finally {

    }
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
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!keyword.trim()) return suppliers;
    const lower = keyword.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        s.supplierName.toLowerCase().includes(lower) ||
        (s.contactName && s.contactName.toLowerCase().includes(lower)) ||
        (s.phone && s.phone.includes(lower)) ||
        (s.email && s.email.toLowerCase().includes(lower)) ||
        (s.address && s.address.toLowerCase().includes(lower))
    );
  }, [suppliers, keyword]);

  const suppliersPagination = usePagination(filteredSuppliers, JSON.stringify([keyword]));

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
            {lang === 'en' ? 'Suppliers' : 'Nhà cung cấp'}
          </>} description={<>
            {lang === 'en'
              ? `${suppliers.length} input and service suppliers at ${selectedFarm?.farmName || 'Farm'}`
              : `${suppliers.length} nhà cung ứng vật tư & dịch vụ tại ${selectedFarm?.farmName || 'trang trại'}`}
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

          <Button
            type="submit"
            variant="primary"

          >
            {lang === 'en' ? 'Search' : 'Tìm kiếm'}
          </Button>

          {keyword && (
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              onClick={handleResetSearch}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
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
                <th scope="col">
                  {lang === 'en' ? 'EMAIL' : 'EMAIL'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'ADDRESS' : 'ĐỊA CHỈ'}
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
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading suppliers directory...' : 'Đang tải danh bạ nhà cung cấp...'}
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={8}><LoadError message={loadError} onRetry={() => { void loadSuppliers(keyword.trim() || undefined); }} /></td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
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
                    <td style={{ color: 'var(--color-muted)', fontSize: '13.5px' }}>
                      {supplier.email || '—'}
                    </td>
                    <td style={{ color: 'var(--color-body)', fontSize: '13.5px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {supplier.address || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="profile-tag-pill" style={{ background: 'var(--color-subtle)', color: 'var(--color-body)' }}>
                        {supplier.totalPurchasesCount || 0} {lang === 'en' ? 'order(s)' : 'đơn'}
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
        <Modal
          open={true}
          onClose={() => setSelectedSupplier(null)}
          title={lang === 'en' ? `Supplier Profile: ${selectedSupplier.supplierName}` : `Hồ sơ nhà cung cấp: ${selectedSupplier.supplierName}`}
        >
          <div className="sup-detail">
            {/* Hero */}
            <div className="sup-hero">
              <div className="sup-identity">
                <span className="sup-logo" aria-hidden="true">
                  {(selectedSupplier.supplierName || '?').charAt(0).toUpperCase()}
                </span>
                <div className="sup-identity-text">
                  <span className="sup-verified">
                    {lang === 'en' ? 'VietGAP Verified' : 'Đã kiểm định VietGAP'}
                  </span>
                  <h3>{selectedSupplier.supplierName}</h3>
                </div>
              </div>

              <div className="sup-orders">
                <strong>{selectedSupplier.totalPurchasesCount || 0}</strong>
                <span>{lang === 'en' ? 'orders' : 'hóa đơn'}</span>
              </div>
            </div>

            {/* Contact details */}
            <dl className="sup-grid">
              <div className="sup-field">
                <dt>{lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}</dt>
                <dd className={selectedSupplier.contactName ? '' : 'is-empty'}>
                  {selectedSupplier.contactName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </dd>
              </div>

              <div className="sup-field">
                <dt>{lang === 'en' ? 'Phone Number' : 'Số điện thoại'}</dt>
                <dd className={selectedSupplier.phone ? '' : 'is-empty'}>
                  {selectedSupplier.phone ? (
                    <a href={`tel:${selectedSupplier.phone}`}>{selectedSupplier.phone}</a>
                  ) : (
                    lang === 'en' ? 'Not updated' : 'Chưa cập nhật'
                  )}
                </dd>
              </div>

              <div className="sup-field">
                <dt>{lang === 'en' ? 'Email Address' : 'Địa chỉ email'}</dt>
                <dd className={selectedSupplier.email ? '' : 'is-empty'}>
                  {selectedSupplier.email ? (
                    <a href={`mailto:${selectedSupplier.email}`}>{selectedSupplier.email}</a>
                  ) : (
                    lang === 'en' ? 'Not updated' : 'Chưa cập nhật'
                  )}
                </dd>
              </div>

              <div className="sup-field">
                <dt>{lang === 'en' ? 'Date Created' : 'Ngày tạo hồ sơ'}</dt>
                <dd className={selectedSupplier.createdAt ? '' : 'is-empty'}>
                  {selectedSupplier.createdAt ? uiFormatDate(selectedSupplier.createdAt, lang) : '—'}
                </dd>
              </div>

              <div className="sup-field sup-field-wide">
                <dt>{lang === 'en' ? 'Headquarters / Warehouse Address' : 'Địa chỉ trụ sở / kho hàng'}</dt>
                <dd className={selectedSupplier.address ? '' : 'is-empty'}>
                  {selectedSupplier.address || (lang === 'en' ? 'No address provided' : 'Chưa cập nhật địa chỉ')}
                </dd>
              </div>
            </dl>

            {/* Notes */}
            {selectedSupplier.notes && (
              <section className="sup-notes">
                <h4>{lang === 'en' ? 'Contract Notes / Supplied Materials' : 'Ghi chú hợp đồng / Vật tư cung cấp'}</h4>
                <p>{selectedSupplier.notes}</p>
              </section>
            )}

            {/* Actions */}
            <div style={{
              padding: '14px 0px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px', marginTop: '10px',
              borderTop: '1px solid var(--color-border)'
            }}>
              <Button
                type="button"
                variant="secondary" className="edit"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenEdit(s);
                }}
              >
                <Icon name="edit" size={14} /> {lang === 'en' ? 'Edit' : 'Chỉnh sửa'}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenDelete(s);
                }}
              >
                <Icon name="trash" size={14} /> {lang === 'en' ? 'Delete' : 'Xóa nhà cung cấp'}
              </Button>
              <Button type="button" variant="primary" onClick={() => setSelectedSupplier(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Supplier Modal */}
      {isCreateOpen && (
        <Modal open={true} onClose={() => setIsCreateOpen(false)} title={lang === 'en' ? 'Add New Supplier' : 'Thêm mới nhà cung cấp vật tư'}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', }}>
            {notification?.type === 'error' && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-1">
                {lang === 'en' ? 'Company / Supplier Name *' : 'Tên công ty / Nhà cung cấp *'}
              </label>
              <input id="suppliers-page-field-1" className="ui-input"
                type="text"
                required
                placeholder={lang === 'en' ? 'e.g. Green Agriculture JSC...' : 'Ví dụ: Công ty Cổ phần Nông nghiệp Xanh...'}
                value={createForm.supplierName}
                onChange={(e) => setCreateForm({ ...createForm, supplierName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="ui-form-grid">
              <div className="form-group structured-field-card">
                <label htmlFor="suppliers-page-field-2">
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <input id="suppliers-page-field-2" className="ui-input"
                  type="text"
                  placeholder={lang === 'en' ? 'Full name...' : 'Họ và tên...'}
                  value={createForm.contactName || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div className="form-group structured-field-card">
                <label htmlFor="suppliers-page-field-3">
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <input id="suppliers-page-field-3" className="ui-input"
                  type="tel"
                  placeholder="09xx..."
                  value={createForm.phone || ''}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-4">
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
              <input id="suppliers-page-field-4" className="ui-input"
                type="email"
                placeholder="supplier@example.com..."
                value={createForm.email || ''}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-5">
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
              <input id="suppliers-page-field-5" className="ui-input"
                type="text"
                placeholder={lang === 'en' ? 'Street, Ward, District, City...' : 'Số nhà, đường, quận/huyện, tỉnh thành...'}
                value={createForm.address || ''}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-6">
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
              <textarea id="suppliers-page-field-6" className="ui-textarea"
                rows={2}
                placeholder={lang === 'en' ? 'Supplies organic fertilizers, F1 seeds...' : 'Chuyên cung ứng phân trùn quế, hạt giống F1...'}
                value={createForm.notes || ''}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
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
        <Modal open={true} onClose={() => setEditingSupplier(null)} title={lang === 'en' ? `Update Supplier #${editingSupplier.supplierId}` : `Cập nhật nhà cung cấp #${editingSupplier.supplierId}`}>
          <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', }}>
            {notification?.type === 'error' && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-7">
                {lang === 'en' ? 'Company / Supplier Name *' : 'Tên công ty / Nhà cung cấp *'}
              </label>
              <input id="suppliers-page-field-7" className="ui-input"
                type="text"
                required
                value={updateForm.supplierName}
                onChange={(e) => setUpdateForm({ ...updateForm, supplierName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="ui-form-grid">
              <div className="form-group structured-field-card">
                <label htmlFor="suppliers-page-field-8">
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <input id="suppliers-page-field-8" className="ui-input"
                  type="text"
                  value={updateForm.contactName || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div className="form-group structured-field-card">
                <label htmlFor="suppliers-page-field-9">
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <input id="suppliers-page-field-9" className="ui-input"
                  type="tel"
                  value={updateForm.phone || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-10">
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
              <input id="suppliers-page-field-10" className="ui-input"
                type="email"
                value={updateForm.email || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-11">
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
              <input id="suppliers-page-field-11" className="ui-input"
                type="text"
                value={updateForm.address || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, address: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="form-group structured-field-card">
              <label htmlFor="suppliers-page-field-12">
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
              <textarea id="suppliers-page-field-12" className="ui-textarea"
                rows={2}
                value={updateForm.notes || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingSupplier(null)} disabled={submittingUpdate}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </Button>
              <Button type="submit" variant="primary" loading={submittingUpdate}>
                {submittingUpdate ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Eligible Supplier Modal */}
      {deletingSupplier && (() => {
        const hasPurchases = (deletingSupplier.totalPurchasesCount || 0) > 0;
        const isEligible = !hasPurchases;

        return (
          <Modal
            open={true}
            onClose={() => setDeletingSupplier(null)}
            title={lang === 'en' ? 'Delete Supplier Confirmation' : 'Xác nhận xóa nhà cung cấp'}
          >
            <div className="sdel">
              {/* Supplier identity */}
              <div className="sdel-supplier">
                <span className="sdel-logo" aria-hidden="true">
                  {(deletingSupplier.supplierName || '?').charAt(0).toUpperCase()}
                </span>
                <div className="sdel-supplier-text">
                  <h4>{deletingSupplier.supplierName}</h4>
                  <p>
                    <span>
                      {lang === 'en' ? 'Contact:' : 'Người liên hệ:'} {deletingSupplier.contactName || '—'}
                    </span>
                  </p>
                </div>
                <div className={`sdel-orders ${isEligible ? 'ok' : 'blocked'}`} >
                  <strong>{deletingSupplier.totalPurchasesCount || 0}</strong>
                  <span style={{ color: `${isEligible ? '#047857' : '#b91c1c'}`}}>{lang === 'en' ? 'order(s)' : 'hóa đơn'}</span>
                </div>
              </div>

              {/* Eligibility result */}
              <div className={`sdel-status ${isEligible ? 'ok' : 'blocked'}`} role="status">
                <span className="sdel-status-icon">
                  <Icon name={isEligible ? 'check' : 'warning'} size={18} />
                </span>
                <div>
                  <strong>
                    {isEligible
                      ? lang === 'en' ? 'Supplier eligible for deletion' : 'Nhà cung cấp đủ điều kiện xóa'
                      : lang === 'en' ? 'Ineligible for deletion' : 'Không đủ điều kiện xóa'}
                  </strong>
                  <p>
                    {hasPurchases
                      ? (lang === 'en'
                        ? `This supplier has ${deletingSupplier.totalPurchasesCount} purchase orders recorded in the system. To ensure VietGAP traceability audit compliance, suppliers with active transaction history cannot be deleted.`
                        : `Nhà cung cấp này đã có ${deletingSupplier.totalPurchasesCount} hóa đơn mua vật tư trong hệ thống. Để bảo đảm kiểm toán truy xuất nguồn gốc theo quy chuẩn VietGAP, không thể xóa nhà cung cấp đã có giao dịch mua hàng.`)
                      : (lang === 'en'
                        ? 'This supplier has no recorded purchase orders in this farm. Deletion can be performed safely.'
                        : 'Nhà cung cấp này chưa phát sinh hóa đơn mua hàng nào trong trang trại. Thao tác xóa sẽ được thực hiện an toàn.')}
                  </p>
                </div>
              </div>

              {isEligible && (
                <p className="sdel-warning">
                  {lang === 'en' ? 'This action cannot be undone.' : 'Hành động này không thể hoàn tác.'}
                </p>
              )}

              {/* Actions */}
              <div className="sdel-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeletingSupplier(null)}
                  disabled={submittingDelete}
                >
                  {isEligible ? (lang === 'en' ? 'Cancel' : 'Hủy bỏ') : (lang === 'en' ? 'Close' : 'Đóng')}
                </Button>
                {isEligible && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={submittingDelete}
                    onClick={handleDeleteSubmit}
                  >
                    {submittingDelete
                      ? (lang === 'en' ? 'Deleting...' : 'Đang xóa...')
                      : (lang === 'en' ? 'Confirm Delete' : 'Xác nhận xóa')}
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </section>
  );
}
