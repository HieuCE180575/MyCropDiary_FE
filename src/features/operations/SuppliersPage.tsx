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
  const { lang } = useLanguage();
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
        text: err instanceof Error ? err.message : 'Không thể tải danh sách nhà cung cấp.',
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

  // View Details (UC-35.2)
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

  // Create (UC-35.3)
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
      alert('Vui lòng nhập tên nhà cung cấp.');
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
        text: `Đã thêm nhà cung cấp "${created.supplierName}" thành công!`,
        type: 'success',
      });
      setIsCreateOpen(false);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể tạo nhà cung cấp.',
        type: 'error',
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Update (UC-35.4)
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
      alert('Tên nhà cung cấp không được để trống.');
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
        text: `Đã cập nhật nhà cung cấp "${updated.supplierName}" thành công!`,
        type: 'success',
      });
      setEditingSupplier(null);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể cập nhật nhà cung cấp.',
        type: 'error',
      });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Delete Eligible Supplier (UC-35.5)
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
        text: `Đã xóa nhà cung cấp "${deletingSupplier.supplierName}" thành công!`,
        type: 'success',
      });
      setDeletingSupplier(null);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp (đã phát sinh hóa đơn mua hàng).',
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
    <div className="suppliers-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Heading */}
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', color: '#0f172a' }}>
            {lang === 'en' ? 'Agricultural Suppliers Management' : 'Quản lý Nhà cung cấp vật tư nông nghiệp'}
          </h1>
          <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {lang === 'en'
              ? 'View supplier list, inspect details, add or update certified VietGAP agricultural input vendors (UC-35).'
              : 'Quản lý danh bạ đối tác cung ứng phân bón, thuốc BVTV, hạt giống và vật tư canh tác chuẩn VietGAP (UC-35).'}
          </p>
        </div>
        <div>
          <button
            type="button"
            className="action-button solid"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="plus" size={16} />
            <span>{lang === 'en' ? 'Add New Supplier' : 'Thêm nhà cung cấp mới'}</span>
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG NHÀ CUNG CẤP</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0f172a', fontWeight: 800 }}>{suppliers.length}</h2>
          <small style={{ color: '#059669' }}>Đơn vị cung ứng</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CÓ NGƯỜI ĐẠI DIỆN</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0284c7', fontWeight: 800 }}>
            {suppliers.filter((s) => Boolean(s.contactName)).length}
          </h2>
          <small style={{ color: '#0284c7' }}>Đầu mối liên hệ trực tiếp</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CÓ SỐ ĐIỆN THOẠI</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#8b5cf6', fontWeight: 800 }}>
            {suppliers.filter((s) => Boolean(s.phone)).length}
          </h2>
          <small style={{ color: '#8b5cf6' }}>Hỗ trợ liên lạc nhanh</small>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ĐÃ CÓ ĐƠN MUA HÀNG</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: '#10b981', fontWeight: 800 }}>
            {suppliers.filter((s) => (s.totalPurchasesCount || 0) > 0).length}
          </h2>
          <small style={{ color: '#10b981' }}>Đã có lịch sử giao dịch</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên nhà cung cấp, người đại diện, số điện thoại, địa chỉ..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
          </div>
          <button type="submit" className="action-button solid" style={{ padding: '9px 18px', fontSize: '13.5px' }}>
            <Icon name="search" size={14} /> Tìm kiếm
          </button>
          {keyword && (
            <button type="button" className="action-button" onClick={handleResetSearch} style={{ padding: '9px 14px', fontSize: '13.5px' }}>
              Xóa bộ lọc
            </button>
          )}
        </form>
      </div>

      {/* View Supplier List (UC-35.1) */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Danh bạ nhà cung cấp nông nghiệp ({filteredSuppliers.length})
          </h3>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Nhấp vào dòng để xem chi tiết đầy đủ</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách nhà cung cấp...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Không tìm thấy nhà cung cấp nào phù hợp. Nhấp "Thêm nhà cung cấp mới" để bắt đầu.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '12px 18px' }}>Mã / Tên nhà cung cấp</th>
                  <th style={{ padding: '12px 18px' }}>Người đại diện</th>
                  <th style={{ padding: '12px 18px' }}>Điện thoại</th>
                  <th style={{ padding: '12px 18px' }}>Email</th>
                  <th style={{ padding: '12px 18px' }}>Địa chỉ</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Đơn mua</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.supplierId}
                    onClick={() => handleOpenDetails(supplier.supplierId)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 650, color: '#0f172a', fontSize: '14px' }}>{supplier.supplierName}</div>
                      <small style={{ color: '#059669', fontSize: '12px' }}>#SUP-{supplier.supplierId} • VietGAP</small>
                    </td>
                    <td style={{ padding: '12px 18px', color: '#334155', fontWeight: 500 }}>
                      {supplier.contactName || '—'}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#0284c7', fontWeight: 600 }}>
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {supplier.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#64748b' }}>
                      {supplier.email || '—'}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#475569', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {supplier.address || '—'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <span className="profile-tag-pill" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {supplier.totalPurchasesCount || 0} đơn
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Xem chi tiết nhà cung cấp"
                          onClick={() => handleOpenDetails(supplier.supplierId)}
                        >
                          <Icon name="search" size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          title="Chỉnh sửa thông tin"
                          onClick={(e) => handleOpenEdit(supplier, e)}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          title="Xóa nhà cung cấp (nếu đủ điều kiện)"
                          onClick={(e) => handleOpenDelete(supplier, e)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Supplier Details Modal (UC-35.2) */}
      {selectedSupplier && (
        <Modal
          open={true}
          onClose={() => setSelectedSupplier(null)}
          title={`Hồ sơ nhà cung cấp: ${selectedSupplier.supplierName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '450px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669', marginBottom: '4px' }}>
                  ✓ Đã kiểm định VietGAP
                </span>
                <h3 style={{ margin: '6px 0 2px', fontSize: '18px', color: '#0f172a' }}>{selectedSupplier.supplierName}</h3>
                <small style={{ color: '#64748b' }}>Mã hệ thống: #SUP-{selectedSupplier.supplierId}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Lịch sử thu mua:</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>
                  {selectedSupplier.totalPurchasesCount || 0} hóa đơn
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>NGƯỜI ĐẠI DIỆN LIÊN HỆ</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.contactName || 'Chưa cập nhật'}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>SỐ ĐIỆN THOẠI</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                  {selectedSupplier.phone || 'Chưa cập nhật'}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ĐỊA CHỈ EMAIL</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.email || 'Chưa cập nhật'}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>NGÀY TẠO HỒ SƠ</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {selectedSupplier.createdAt ? new Date(selectedSupplier.createdAt).toLocaleDateString('vi-VN') : '—'}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ĐỊA CHỈ TRỤ SỞ / KHO HÀNG</div>
              <div style={{ fontSize: '14px', color: '#334155', marginTop: '4px' }}>
                {selectedSupplier.address || 'Chưa cập nhật địa chỉ'}
              </div>
            </div>

            {selectedSupplier.notes && (
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fefce8' }}>
                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>GHI CHÚ HỢP ĐỒNG / VẬT TƯ CUNG CẤP</div>
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
                <Icon name="edit" size={14} /> Chỉnh sửa
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
                <Icon name="trash" size={14} /> Xóa nhà cung cấp
              </button>
              <button type="button" className="action-button solid" onClick={() => setSelectedSupplier(null)}>
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Supplier Modal (UC-35.3) */}
      {isCreateOpen && (
        <Modal open={true} onClose={() => setIsCreateOpen(false)} title="Thêm mới nhà cung cấp vật tư (Create Supplier)">
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '450px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                Tên công ty / Nhà cung cấp *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Công ty Cổ phần Nông nghiệp Xanh..."
                value={createForm.supplierName}
                onChange={(e) => setCreateForm({ ...createForm, supplierName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Người đại diện liên hệ
                </label>
                <input
                  type="text"
                  placeholder="Họ và tên..."
                  value={createForm.contactName || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Số điện thoại
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
                Email
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
                Địa chỉ trụ sở / kho hàng
              </label>
              <input
                type="text"
                placeholder="Số nhà, đường, quận/huyện, tỉnh thành..."
                value={createForm.address || ''}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                Ghi chú vật tư cung ứng
              </label>
              <textarea
                rows={2}
                placeholder="Chuyên cung ứng phân trùn quế, hạt giống F1..."
                value={createForm.notes || ''}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="action-button" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
                Hủy bỏ
              </button>
              <button type="submit" className="action-button solid" disabled={submittingCreate}>
                {submittingCreate ? 'Đang tạo...' : 'Tạo nhà cung cấp'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Supplier Modal (UC-35.4) */}
      {editingSupplier && (
        <Modal open={true} onClose={() => setEditingSupplier(null)} title={`Cập nhật nhà cung cấp #${editingSupplier.supplierId}`}>
          <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '450px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                Tên công ty / Nhà cung cấp *
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
                  Người đại diện liên hệ
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
                  Số điện thoại
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
                Email
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
                Địa chỉ trụ sở / kho hàng
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
                Ghi chú vật tư cung ứng
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
                Hủy bỏ
              </button>
              <button type="submit" className="action-button solid" disabled={submittingUpdate}>
                {submittingUpdate ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Eligible Supplier Modal (UC-35.5) */}
      {deletingSupplier && (() => {
        const hasPurchases = (deletingSupplier.totalPurchasesCount || 0) > 0;
        const isEligible = !hasPurchases;

        return (
          <Modal
            open={true}
            onClose={() => setDeletingSupplier(null)}
            title="Xác nhận xóa nhà cung cấp (Delete Eligible Supplier)"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '420px', maxWidth: '520px' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>{deletingSupplier.supplierName}</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  Mã đơn vị: #SUP-{deletingSupplier.supplierId} • Người liên hệ: {deletingSupplier.contactName || '—'}
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
                  <span>{isEligible ? 'Nhà cung cấp đủ điều kiện xóa (Eligible)' : 'Không đủ điều kiện xóa (Ineligible)'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: isEligible ? '#047857' : '#b91c1c' }}>
                  {hasPurchases
                    ? `Nhà cung cấp này đã có ${deletingSupplier.totalPurchasesCount} hóa đơn mua vật tư trong hệ thống. Để bảo đảm kiểm toán truy xuất nguồn gốc theo quy chuẩn VietGAP, không thể xóa nhà cung cấp đã có giao dịch mua hàng.`
                    : 'Nhà cung cấp này chưa phát sinh hóa đơn mua hàng nào trong trang trại. Thao tác xóa sẽ được thực hiện an toàn.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => setDeletingSupplier(null)}
                  disabled={submittingDelete}
                >
                  {isEligible ? 'Hủy bỏ' : 'Đóng'}
                </button>
                {isEligible && (
                  <button
                    type="button"
                    className="action-button danger"
                    disabled={submittingDelete}
                    onClick={handleDeleteSubmit}
                  >
                    {submittingDelete ? 'Đang xóa...' : 'Xác nhận xóa'}
                  </button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
