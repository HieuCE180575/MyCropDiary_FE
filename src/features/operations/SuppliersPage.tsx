import { useEffect, useState, useMemo } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
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

export function SuppliersPage() {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View Details Modal
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
    try {
      const data = await fetchSuppliers(farmId, searchKw);
      setSuppliers(data);
    } catch (err) {
      setNotification({
        text: (lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load suppliers." : err instanceof Error ? err.message : 'Không thể tải danh sách nhà cung cấp.'),
        type: 'error',
      });
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
    setLoadingDetail(true);
    try {
      const detail = await fetchSupplierDetails(supplierId);
      setSelectedSupplier(detail);
    } catch {
      const fallback = suppliers.find((s) => s.supplierId === supplierId) || null;
      setSelectedSupplier(fallback);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create 
  const handleOpenCreate = () => {
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
      alert((lang === 'en' ? "Enter a supplier name." : 'Vui lòng nhập tên nhà cung cấp.'));
      return;
    }
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
        text: (lang === 'en' ? `Added supplier "${created.supplierName}" successfully!` : `Đã thêm nhà cung cấp "${created.supplierName}" thành công!`),
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
      alert((lang === 'en' ? "Supplier name is required." : 'Tên nhà cung cấp không được để trống.'));
      return;
    }
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
        text: (lang === 'en' ? `Updated supplier "${updated.supplierName}" successfully!` : `Đã cập nhật nhà cung cấp "${updated.supplierName}" thành công!`),
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
        text: (lang === 'en' ? `Deleted supplier "${deletingSupplier.supplierName}" successfully!` : `Đã xóa nhà cung cấp "${deletingSupplier.supplierName}" thành công!`),
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
            {lang === 'en' ? 'Suppliers' : 'Nhà cung cấp'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {lang === 'en'
              ? `${suppliers.length} input and service suppliers at ${selectedFarm?.farmName || 'Farm'}`
              : `${suppliers.length} nhà cung ứng vật tư & dịch vụ tại ${selectedFarm?.farmName || 'trang trại'}`}
          </p>
        </div>

        <div>
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenCreate}
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
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Add Supplier' : 'Thêm nhà cung cấp'}
          </button>
        </div>
      </div>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <form onSubmit={handleSearch} className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 300px' }}>
            <span className="search-icon">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              placeholder={lang === 'en' ? 'Search by supplier name, contact, phone, address...' : 'Tìm kiếm theo tên nhà cung cấp, người đại diện, số điện thoại, địa chỉ...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="action-button solid"
            style={{ height: '42px', padding: '0 18px', borderRadius: '10px' }}
          >
            {lang === 'en' ? 'Search' : 'Tìm kiếm'}
          </button>

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
        <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                  <input type="checkbox" aria-label={lang === 'en' ? 'Select all' : 'Chọn tất cả'} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'SUPPLIER NAME' : 'TÊN NHÀ CUNG CẤP'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'CONTACT PERSON' : 'NGƯỜI ĐẠI DIỆN'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'PHONE NUMBER' : 'SỐ ĐIỆN THOẠI'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'EMAIL' : 'EMAIL'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'ADDRESS' : 'ĐỊA CHỈ'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                  {lang === 'en' ? 'PURCHASE HISTORY' : 'LỊCH SỬ MUA'}
                </th>
                <th style={{ width: '140px', padding: '14px 16px', textAlign: 'right' }}>
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {lang === 'en' ? 'Loading suppliers directory...' : 'Đang tải danh bạ nhà cung cấp...'}
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {lang === 'en' ? 'No suppliers matching keywords.' : 'Không tìm thấy nhà cung cấp nào phù hợp với từ khóa.'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.supplierId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input type="checkbox" aria-label={`Select #${supplier.supplierId}`} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        onClick={() => handleOpenDetails(supplier.supplierId)}
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
                        {supplier.supplierName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                        #SUP-{supplier.supplierId} • VietGAP
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 500 }}>
                      {supplier.contactName || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#0284c7', fontSize: '13.5px', fontWeight: 600 }}>
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {supplier.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13.5px' }}>
                      {supplier.email || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13.5px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {supplier.address || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className="profile-tag-pill" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {supplier.totalPurchasesCount || 0} {lang === 'en' ? 'orders' : 'đơn'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div className="table-action-btns zone-card-actions">
                        <button
                          type="button"
                          className="table-icon-btn primary"
                          title={lang === 'en' ? 'View Details' : 'Xem chi tiết nhà cung cấp'}
                          aria-label={`View ${supplier.supplierName}`}
                          onClick={() => handleOpenDetails(supplier.supplierId)}
                        >
                          <Icon name="eye" size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          title={lang === 'en' ? 'Edit Supplier' : 'Chỉnh sửa thông tin'}
                          aria-label={`Edit ${supplier.supplierName}`}
                          onClick={(e) => handleOpenEdit(supplier, e)}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          title={lang === 'en' ? 'Delete Supplier (if eligible)' : 'Xóa nhà cung cấp (nếu đủ điều kiện)'}
                          aria-label={`Delete ${supplier.supplierName}`}
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
        <div className="zone-table-footer">
          <span>
            {lang === 'en'
              ? `Showing 1–${filteredSuppliers.length} of ${suppliers.length} suppliers`
              : `Hiển thị 1–${filteredSuppliers.length} trong ${suppliers.length} nhà cung cấp`}
          </span>
          <div className="zone-pagination-wrap">
            <button type="button" className="zone-page-btn" disabled>&lt;</button>
            <button type="button" className="zone-page-btn active">1</button>
            <button type="button" className="zone-page-btn" disabled>&gt;</button>
          </div>
        </div>
      </div>

      {/* View Supplier Details Modal */}
      {selectedSupplier && (
        <Modal
          open={true}
          onClose={() => setSelectedSupplier(null)}
          title={lang === 'en' ? `Supplier Profile: ${selectedSupplier.supplierName}` : `Hồ sơ nhà cung cấp: ${selectedSupplier.supplierName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '450px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669', marginBottom: '4px' }}>
                  {lang === 'en' ? '✓ VietGAP Verified' : '✓ Đã kiểm định VietGAP'}
                </span>
                <h3 style={{ margin: '6px 0 2px', fontSize: '18px', color: '#0f172a' }}>{selectedSupplier.supplierName}</h3>
                <small style={{ color: '#64748b' }}>{lang === 'en' ? 'System Code:' : 'Mã hệ thống:'} #SUP-{selectedSupplier.supplierId}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>{lang === 'en' ? 'Purchase History:' : 'Lịch sử thu mua:'}</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>
                  {selectedSupplier.totalPurchasesCount || 0} {lang === 'en' ? 'orders' : 'hóa đơn'}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'CONTACT PERSON' : 'NGƯỜI ĐẠI DIỆN LIÊN HỆ'}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.contactName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'PHONE NUMBER' : 'SỐ ĐIỆN THOẠI'}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                  {selectedSupplier.phone || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'EMAIL ADDRESS' : 'ĐỊA CHỈ EMAIL'}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.email || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'DATE CREATED' : 'NGÀY TẠO HỒ SƠ'}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.createdAt ? new Date(selectedSupplier.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN') : '—'}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'HEADQUARTERS / WAREHOUSE ADDRESS' : 'ĐỊA CHỈ TRỤ SỞ / KHO HÀNG'}</div>
              <div style={{ fontSize: '14px', color: '#334155', marginTop: '4px' }}>
                {selectedSupplier.address || (lang === 'en' ? 'No address provided' : 'Chưa cập nhật địa chỉ')}
              </div>
            </div>

            {selectedSupplier.notes && (
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fefce8' }}>
                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>{lang === 'en' ? 'CONTRACT NOTES / SUPPLIED MATERIALS' : 'GHI CHÚ HỢP ĐỒNG / VẬT TƯ CUNG CẤP'}</div>
                <div style={{ fontSize: '13.5px', color: '#78350f', marginTop: '4px' }}>{selectedSupplier.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="action-button edit"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenEdit(s);
                }}
              >
                <Icon name="edit" size={14} /> {lang === 'en' ? 'Edit' : 'Chỉnh sửa'}
              </button>
              <button
                type="button"
                className="action-button danger"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenDelete(s);
                }}
              >
                <Icon name="trash" size={14} /> {lang === 'en' ? 'Delete' : 'Xóa nhà cung cấp'}
              </button>
              <button type="button" className="action-button solid" onClick={() => setSelectedSupplier(null)}>
                {lang === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Supplier Modal */}
      {isCreateOpen && (
        <Modal open={true} onClose={() => setIsCreateOpen(false)} title={lang === 'en' ? 'Add New Supplier' : 'Thêm mới nhà cung cấp vật tư'}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '450px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Company / Supplier Name *' : 'Tên công ty / Nhà cung cấp *'}
              </label>
              <input
                type="text"
                required
                placeholder={lang === 'en' ? 'e.g. Green Agriculture JSC...' : 'Ví dụ: Công ty Cổ phần Nông nghiệp Xanh...'}
                value={createForm.supplierName}
                onChange={(e) => setCreateForm({ ...createForm, supplierName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Full name...' : 'Họ và tên...'}
                  value={createForm.contactName || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <input
                  type="tel"
                  placeholder="09xx..."
                  value={createForm.phone || ''}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
              <input
                type="email"
                placeholder="supplier@example.com..."
                value={createForm.email || ''}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
              <input
                type="text"
                placeholder={lang === 'en' ? 'Street, Ward, District, City...' : 'Số nhà, đường, quận/huyện, tỉnh thành...'}
                value={createForm.address || ''}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
              <textarea
                rows={2}
                placeholder={lang === 'en' ? 'Supplies organic fertilizers, F1 seeds...' : 'Chuyên cung ứng phân trùn quế, hạt giống F1...'}
                value={createForm.notes || ''}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button type="submit" className="action-button solid" disabled={submittingCreate}>
                {submittingCreate ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Supplier' : 'Tạo nhà cung cấp')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Supplier Modal */}
      {editingSupplier && (
        <Modal open={true} onClose={() => setEditingSupplier(null)} title={lang === 'en' ? `Update Supplier #${editingSupplier.supplierId}` : `Cập nhật nhà cung cấp #${editingSupplier.supplierId}`}>
          <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '450px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Company / Supplier Name *' : 'Tên công ty / Nhà cung cấp *'}
              </label>
              <input
                type="text"
                required
                value={updateForm.supplierName}
                onChange={(e) => setUpdateForm({ ...updateForm, supplierName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Contact Person' : 'Người đại diện liên hệ'}
                </label>
                <input
                  type="text"
                  value={updateForm.contactName || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {lang === 'en' ? 'Phone Number' : 'Số điện thoại'}
                </label>
                <input
                  type="tel"
                  value={updateForm.phone || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Email' : 'Email'}
              </label>
              <input
                type="email"
                value={updateForm.email || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Address' : 'Địa chỉ trụ sở / kho hàng'}
              </label>
              <input
                type="text"
                value={updateForm.address || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, address: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {lang === 'en' ? 'Supplied Materials Notes' : 'Ghi chú vật tư cung ứng'}
              </label>
              <textarea
                rows={2}
                value={updateForm.notes || ''}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setEditingSupplier(null)} disabled={submittingUpdate}>
                {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button type="submit" className="action-button solid" disabled={submittingUpdate}>
                {submittingUpdate ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '420px', maxWidth: '520px' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>{deletingSupplier.supplierName}</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  {lang === 'en' ? 'Supplier ID:' : 'Mã đơn vị:'} #SUP-{deletingSupplier.supplierId} • {lang === 'en' ? 'Contact:' : 'Người liên hệ:'} {deletingSupplier.contactName || '—'}
                </p>
              </div>

              {/* Eligibility Check Indicator */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: isEligible ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${isEligible ? '#10b981' : '#ef4444'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: isEligible ? '#065f46' : '#991b1b', marginBottom: '4px' }}>
                  <Icon name={isEligible ? 'check' : 'warning'} size={16} />
                  <span>{isEligible ? (lang === 'en' ? 'Supplier eligible for deletion' : 'Nhà cung cấp đủ điều kiện xóa (Eligible)') : (lang === 'en' ? 'Ineligible for deletion' : 'Không đủ điều kiện xóa (Ineligible)')}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: isEligible ? '#047857' : '#b91c1c' }}>
                  {hasPurchases
                    ? (lang === 'en'
                      ? `This supplier has ${deletingSupplier.totalPurchasesCount} purchase orders recorded in the system. To ensure VietGAP traceability audit compliance, suppliers with active transaction history cannot be deleted.`
                      : `Nhà cung cấp này đã có ${deletingSupplier.totalPurchasesCount} hóa đơn mua vật tư trong hệ thống. Để bảo đảm kiểm toán truy xuất nguồn gốc theo quy chuẩn VietGAP, không thể xóa nhà cung cấp đã có giao dịch mua hàng.`)
                    : (lang === 'en'
                      ? 'This supplier has no recorded purchase orders in this farm. Deletion can be performed safely.'
                      : 'Nhà cung cấp này chưa phát sinh hóa đơn mua hàng nào trong trang trại. Thao tác xóa sẽ được thực hiện an toàn.')}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => setDeletingSupplier(null)}
                  disabled={submittingDelete}
                >
                  {isEligible ? (lang === 'en' ? 'Cancel' : 'Hủy bỏ') : (lang === 'en' ? 'Close' : 'Đóng')}
                </button>
                {isEligible && (
                  <button
                    type="button"
                    className="action-button danger"
                    disabled={submittingDelete}
                    onClick={handleDeleteSubmit}
                  >
                    {submittingDelete ? (lang === 'en' ? 'Deleting...' : 'Đang xóa...') : (lang === 'en' ? 'Confirm Delete' : 'Xác nhận xóa')}
                  </button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </section>
  );
}

