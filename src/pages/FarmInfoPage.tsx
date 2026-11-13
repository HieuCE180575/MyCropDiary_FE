import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { farmRole } from '../features/auth/accessPolicy';
import { Icon } from '../shared/components/Icon';
import {
  getFarmById,
  updateFarm,
  getFarmMembers,
  addFarmMember,
  removeFarmMember,
  createFarm,
  type FarmDetail,
  type FarmMemberItem,
} from '../features/farm-management/api';
import {
  calculatePolygonAreaM2,
  parseBoundaryCoordinates,
  stringifyBoundaryCoordinates,
  type LatLngPoint,
} from '../features/farm-management/goongMapService';
import { FarmGoongMap } from '../features/farm-management/components/FarmGoongMap';
import { useRealtimeSync } from '../shared/realtime/realtimeSync';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { AlertCircle } from 'lucide-react';

export function FarmInfoPage() {
  const { lang, t: translate } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFarm, farms, selectFarm, retry } = useFarmWorkspace();
  const [farmDetail, setFarmDetail] = useState<FarmDetail | null>(null);
  const [members, setMembers] = useState<FarmMemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Farm Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editBoundary, setEditBoundary] = useState<LatLngPoint[]>([]);
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Member Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'STAFF' | 'OWNER'>('STAFF');
  const [addingMember, setAddingMember] = useState(false);

  // Create Farm Modal state
  const [isCreateFarmOpen, setIsCreateFarmOpen] = useState(false);
  const [createFarmName, setCreateFarmName] = useState('');
  const [createFarmAddress, setCreateFarmAddress] = useState('');
  const [createFarmDesc, setCreateFarmDesc] = useState('');
  const [createLat, setCreateLat] = useState<number | null>(null);
  const [createLng, setCreateLng] = useState<number | null>(null);
  const [createBoundary, setCreateBoundary] = useState<LatLngPoint[]>([]);
  const [creatingFarm, setCreatingFarm] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    address?: string;
    description?: string;
    email?: string;
  }>({});
  const farmNameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [createFarmErrors, setCreateFarmErrors] = useState<{
    name?: string;
    address?: string;
    description?: string;
  }>({});

  const createFarmNameRef = useRef<HTMLInputElement>(null);
  const createFarmAddressRef = useRef<HTMLInputElement>(null);
  const createFarmDescriptionRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => {
    if (searchParams.get('edit') !== '1' || !isOwner || !farmDetail || farmDetail.id !== selectedFarm?.id) return;
    setIsEditOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, isOwner, farmDetail, selectedFarm?.id]);

  useEffect(() => {
    if (!selectedFarm?.id) {
      setFarmDetail(null);
      setMembers([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getFarmById(selectedFarm.id).catch(() => null),
      getFarmMembers(selectedFarm.id).catch(() => []),
    ])
      .then(([detail, memberList]) => {
        if (!active) return;
        if (detail) {
          setFarmDetail(detail);
          setEditName(detail.farmName || '');
          setEditAddress(detail.address || '');
          setEditDesc(detail.description || '');
          setEditLat(detail.latitude ?? null);
          setEditLng(detail.longitude ?? null);
          setEditBoundary(parseBoundaryCoordinates(detail.boundaryCoordinates));
        } else {
          setFarmDetail({
            id: selectedFarm.id,
            farmName: selectedFarm.farmName,
            description: 'Trang trại chuẩn VietGAP',
            address: [selectedFarm.district, selectedFarm.province].filter(Boolean).join(', ') || 'Chưa cập nhật',
            latitude: null,
            longitude: null,
            boundaryCoordinates: null,
            coverImageUrl: null,
            status: selectedFarm.status || 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentUserRole: selectedFarm.currentUserRole,
          });
        }
        setMembers(memberList);
      })
      .catch((err) => {
        if (active) setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load farm information" : err instanceof Error ? err.message : 'Lỗi tải thông tin trang trại'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFarm?.id]);

  // Silent background realtime sync for Farm Info & Members
  useRealtimeSync(() => {
    if (!selectedFarm?.id) return;
    Promise.all([
      getFarmById(selectedFarm.id).catch(() => null),
      getFarmMembers(selectedFarm.id).catch(() => []),
    ])
      .then(([detail, memberList]) => {
        if (detail) {
          setFarmDetail(detail);
        }
        setMembers(memberList);
      })
      .catch(() => { });
  });

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!editName.trim()) {
      newErrors.name = lang === 'en'
        ? 'Farm name is required.'
        : 'Vui lòng nhập tên trang trại.';
    }

    if (!editAddress.trim()) {
      newErrors.address = lang === 'en'
        ? 'Address is required.'
        : 'Vui lòng nhập địa chỉ.';
    }

    if (editDesc.length > 500) {
      newErrors.description = lang === 'en'
        ? 'Description must not exceed 500 characters.'
        : 'Mô tả không được vượt quá 500 ký tự.';
    }

    setErrors(newErrors);

    return newErrors;
  };

  const validateAddMemberForm = () => {
    const newErrors: typeof errors = {};

    if (!newMemberEmail.trim()) {
      newErrors.email = lang === 'en'
        ? 'Account email is required.'
        : 'Vui lòng nhập email tài khoản.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemberEmail.trim())) {
      newErrors.email = lang === 'en'
        ? 'Please enter a valid email address.'
        : 'Vui lòng nhập địa chỉ email hợp lệ.';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const validateCreateFarmForm = () => {
    const newErrors: typeof createFarmErrors = {};

    if (!createFarmName.trim()) {
      newErrors.name = lang === 'en'
        ? 'Farm name is required.'
        : 'Vui lòng nhập tên trang trại.';
    }

    if (!createFarmAddress.trim()) {
      newErrors.address = lang === 'en'
        ? 'Address is required.'
        : 'Vui lòng nhập địa chỉ.';
    }

    if (createFarmDesc.length > 500) {
      newErrors.description = lang === 'en'
        ? 'Description must not exceed 500 characters.'
        : 'Mô tả không được vượt quá 500 ký tự.';
    }

    setCreateFarmErrors(newErrors);
    return newErrors;
  };


  const handleOpenEditFarm = () => {
    setErrors({});
    setIsEditOpen(true);
  };

  const handleCancelEdit = () => {
    // Reset form fields to original farm information
    setEditName(farmDetail?.farmName || '');
    setEditAddress(farmDetail?.address || '');
    setEditDesc(farmDetail?.description || '');
    setEditLat(farmDetail?.latitude ?? null);
    setEditLng(farmDetail?.longitude ?? null);
    setEditBoundary(farmDetail?.boundaryCoordinates ? parseBoundaryCoordinates(farmDetail.boundaryCoordinates) : []);

    // Clear validation errors
    setErrors({});

    // Close modal
    setIsEditOpen(false);
  };

  const handleCancelAddMember = () => {
    setNewMemberEmail('');
    setNewMemberRole('STAFF');
    setErrors({});
    setIsAddMemberOpen(false);
  };

  const handleOpenCreateFarm = () => {
    setCreateFarmErrors({});
    setIsCreateFarmOpen(true);
  };

  const handleCancelCreateFarm = () => {
    setCreateFarmName('');
    setCreateFarmAddress('');
    setCreateFarmDesc('');
    setCreateLat(null);
    setCreateLng(null);
    setCreateFarmErrors({});
    setEditBoundary(farmDetail?.boundaryCoordinates ? parseBoundaryCoordinates(farmDetail.boundaryCoordinates) : []);

    setIsCreateFarmOpen(false);
  };

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;
    setActionMsg(null);

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      // Find the first invalid field in form order
      if (validationErrors.name) {
        farmNameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        farmNameRef.current?.focus();
      }
      else if (validationErrors.address) {
        addressRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        addressRef.current?.focus();
      }
      else if (validationErrors.description) {
        descriptionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        descriptionRef.current?.focus();
      }

      return;
    }

    setUpdating(true);

    try {
      const updated = await updateFarm(selectedFarm.id, {
        farmName: editName.trim(),
        address: editAddress.trim(),
        description: editDesc.trim(),
        latitude: editLat,
        longitude: editLng,
        boundaryCoordinates: stringifyBoundaryCoordinates(editBoundary) || null,
      });
      setFarmDetail(updated);
      setIsEditOpen(false);
      setActionMsg({ text: 'Cập nhật thông tin và bản đồ trang trại thành công!', type: 'success' });
      retry();
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Cập nhật thất bại', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !newMemberEmail.trim()) return;

    const validationErrors = validateAddMemberForm();

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setAddingMember(true);
    setActionMsg(null);
    try {
      const newMember = await addFarmMember(selectedFarm.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setNewMemberEmail('');
      setIsAddMemberOpen(false);
      setActionMsg({ text: (lang === 'en' ? `Member added ${(newMember.fullName || newMember.email)}` : `Đã thêm thành viên ${newMember.fullName || newMember.email}`), type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : (lang === 'en' ? 'Failed to add member' : 'Thêm thành viên thất bại'), type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm((lang === 'en' ? `Are you sure you want to remove member "${memberName}" from the farm?` : `Bạn có chắc muốn xóa thành viên "${memberName}" khỏi trang trại?`))) return;
    try {
      await removeFarmMember(selectedFarm.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionMsg({ text: (lang === 'en' ? `Removed member "${memberName}"` : `Đã xóa thành viên "${memberName}"`), type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Xóa thành viên thất bại', type: 'error' });
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;
    setActionMsg(null);

    const validationErrors = validateCreateFarmForm();

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.name) {
        createFarmNameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        createFarmNameRef.current?.focus();
      } else if (validationErrors.description) {
        createFarmDescriptionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        createFarmDescriptionRef.current?.focus();
      }

      return;
    }

    setCreatingFarm(true);

    try {
      const newFarm = await createFarm({
        farmName: createFarmName.trim(),
        address: createFarmAddress.trim(),
        description: createFarmDesc.trim(),
        latitude: createLat,
        longitude: createLng,
        boundaryCoordinates: stringifyBoundaryCoordinates(createBoundary) || null,
      });
      setIsCreateFarmOpen(false);
      setCreateFarmName('');
      setCreateFarmAddress('');
      setCreateFarmDesc('');
      setCreateLat(null);
      setCreateLng(null);
      setCreateBoundary([]);
      setActionMsg({ text: (lang === 'en' ? `Created farm "${newFarm.farmName}" successfully!` : `Tạo trang trại "${newFarm.farmName}" thành công!`), type: 'success' });
      retry();
      selectFarm(newFarm.id);
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Tạo trang trại thất bại', type: 'error' });
    } finally {
      setCreatingFarm(false);
    }
  };

  const detailBoundary = parseBoundaryCoordinates(farmDetail?.boundaryCoordinates);
  const polygonAreaM2 = calculatePolygonAreaM2(detailBoundary);

  return (
    <section className="farm-info-page">
      <div className="page-heading">
        <div>
          <h1>{lang === 'en' ? 'Farm Profile' : 'Hồ sơ trang trại'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Detailed information on cultivation scale, map boundaries, personnel, and VietGAP compliance' : 'Thông tin chi tiết quy mô canh tác, bản đồ, nhân sự và tiêu chuẩn VietGAP'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedFarm && isOwner && (
            <button type="button" className="primary-button" onClick={() => handleOpenEditFarm()}>
              <Icon name="check" /> {lang === 'en' ? 'Edit Farm & Map' : 'Chỉnh sửa trang trại & Bản đồ'}
            </button>
          )}
          <button type="button" className="action-button" onClick={() => handleOpenCreateFarm()}>
            <Icon name="plus" /> {lang === 'en' ? 'Add New Farm' : 'Thêm trang trại mới'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={actionMsg.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginBottom: '16px', position: 'static' }}
        >
          <strong>{(lang === 'en' ? actionMsg.type === 'success' ? "✓ Success" : "⚠️ Notice" : actionMsg.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo')}:</strong> {translate(actionMsg.text)}
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

      )}

      {!selectedFarm ? (
        <div className="panel empty-state">
          <div className="empty-icon">🚜</div>
          <h2>{lang === 'en' ? 'Select or Create Farm Workspace' : 'Chọn hoặc tạo không gian trang trại'}</h2>
          <p>{lang === 'en' ? 'You are currently in your personal workspace. Select a farm below to manage details.' : 'Bạn hiện đang ở không gian cá nhân. Hãy chọn một trang trại bên dưới để quản lý chi tiết.'}</p>
          {farms.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%', maxWidth: '900px', marginTop: '20px' }}>
              {farms.map((f) => (
                <div key={f.id} className="farm-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => selectFarm(f.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669' }}>
                      <Icon name="leaf" /> {(lang === 'en' ? farmRole(f) === 'OWNER' ? "Farm owner" : "Staff" : farmRole(f) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên')}
                    </span>
                    <span className="status-badge status-badge--success">{f.status ? (lang === 'en' && f.status === 'ACTIVE' ? 'Active' : f.status) : (lang === 'en' ? 'Active' : 'Hoạt động')}</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>{f.farmName}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                    📍 {(lang === 'en' ? [f.district, f.province].filter(Boolean).join(', ') || "No address provided" : [f.district, f.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ')}
                  </p>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lang === 'en' ? 'Open Management' : 'Mở quản lý'} <Icon name="arrow" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="button" className="primary-button" onClick={() => handleOpenCreateFarm()}>
                {lang === 'en' ? '+ Create Farm Now' : '+ Tạo trang trại ngay'}
              </button>
              <Link to="/farm-registration" className="action-button">
                {lang === 'en' ? 'Submit VietGAP Registration' : 'Gửi đơn đăng ký VietGAP'}
              </Link>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>{lang === 'en' ? 'Loading farm profile...' : 'Đang tải hồ sơ trang trại...'}</h2>
        </div>
      ) : error ? (
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{lang === 'en' ? 'Failed to load farm information' : 'Không thể tải thông tin'}</h2>
          <p>{translate(error)}</p>
        </div>
      ) : farmDetail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Main Info Card */}
            <div className="panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>
                    🌱
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{farmDetail.farmName}</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>{lang === 'en' ? 'Farm ID: #' : 'Mã trang trại: #'}{farmDetail.id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="status-badge status-badge--success">{lang === 'en' ? 'VietGAP Standard' : 'Chuẩn VietGAP'}</span>
                  <span className="profile-role-pill">{(lang === 'en' ? isOwner ? "Owner" : "Operations staff" : isOwner ? 'Chủ sở hữu' : 'Nhân sự vận hành')}</span>
                </div>
              </div>

              <p style={{ margin: '20px 0', color: '#334155', fontSize: '15px', lineHeight: 1.6, background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
                {(lang === 'en' ? farmDetail.description || "The farm follows VietGAP Good Agricultural Practices for safe produce, transparency, and digital traceability." : farmDetail.description || 'Trang trại áp dụng quy chuẩn Thực hành nông nghiệp tốt (VietGAP) hướng đến nông sản an toàn, minh bạch và truy xuất nguồn gốc số.')}
              </p>

              <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: '20px 0 0', fontSize: '14px' }}>
                <dt style={{ color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'Address:' : 'Địa chỉ:'}</dt>
                <dd style={{ margin: 0, color: '#0f172a', fontWeight: 500 }}>{(lang === 'en' ? farmDetail.address || "Not updated" : farmDetail.address || 'Chưa cập nhật')}</dd>

                {farmDetail.latitude != null && farmDetail.longitude != null && (
                  <>
                    <dt style={{ color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'Coordinates:' : 'Tọa độ:'}</dt>
                    <dd style={{ margin: 0, color: '#059669', fontWeight: 600 }}>
                      {farmDetail.latitude.toFixed(6)}, {farmDetail.longitude.toFixed(6)}
                    </dd>
                  </>
                )}

                <dt style={{ color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'Total Area:' : 'Diện tích:'}</dt>
                <dd style={{ margin: 0, color: '#0f172a', fontWeight: 500 }}>
                  {(lang === 'en' ? selectedFarm.totalAreaM2 ? `${selectedFarm.totalAreaM2.toLocaleString('vi-VN')} m²` : polygonAreaM2 > 0 ? `${polygonAreaM2.toLocaleString('vi-VN')} m² (~${(polygonAreaM2 / 10000).toFixed(2)} ha based on the map boundary)` : "Compliant scale" : selectedFarm.totalAreaM2
                    ? `${selectedFarm.totalAreaM2.toLocaleString('vi-VN')} m²`
                    : polygonAreaM2 > 0
                      ? `${polygonAreaM2.toLocaleString('vi-VN')} m² (~${(polygonAreaM2 / 10000).toFixed(2)} ha theo sơ đồ bản đồ)`
                      : 'Quy mô đạt chuẩn')}
                </dd>

                <dt style={{ color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'Status:' : 'Trạng thái:'}</dt>
                <dd style={{ margin: 0 }}>
                  <span className="status-badge status-badge--success">{farmDetail.status ? (lang === 'en' && farmDetail.status === 'ACTIVE' ? 'Active' : farmDetail.status) : (lang === 'en' ? 'Active' : 'Đang hoạt động')}</span>
                </dd>

                <dt style={{ color: '#64748b', fontWeight: 600 }}>{lang === 'en' ? 'Created At:' : 'Tạo lúc:'}</dt>
                <dd style={{ margin: 0, color: '#64748b' }}>
                  {new Date(farmDetail.createdAt).toLocaleDateString('vi-VN')}
                </dd>
              </dl>

              {/* Quick Links inside Farm */}
              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Link to="/production-areas" className="action-button" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '🗺️ Zones & Blocks' : '🗺️ Vùng & Lô đất'}
                </Link>
                <Link to="/crop-seasons" className="action-button" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '🌾 Crop Seasons' : '🌾 Mùa vụ'}
                </Link>
                <Link to="/activities" className="action-button" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '📖 Farming Activities' : '📖 Nhật ký canh tác'}
                </Link>
                <Link to="/harvests" className="action-button" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '📦 Harvest & Batches' : '📦 Thu hoạch & Truy xuất'}
                </Link>
              </div>
            </div>

            {/* Members Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{lang === 'en' ? 'Members & Personnel' : 'Thành viên & Nhân sự'}</h2>
                  <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>{members.length} {lang === 'en' ? 'active members participating' : 'thành viên tham gia canh tác'}</p>
                </div>
                {isOwner && (
                  <button type="button" className="action-button" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setIsAddMemberOpen(true)}>
                    <Icon name="plus" /> {lang === 'en' ? 'Add Member' : 'Thêm thành viên'}
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                  <Icon name="user" />
                  <p style={{ marginTop: '8px' }}>{lang === 'en' ? 'No other members in this farm yet.' : 'Chưa có thành viên nào khác trong trang trại.'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="profile-hero-avatar" style={{ width: '38px', height: '38px', fontSize: '15px' }}>
                          <Icon name="user" />
                        </span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{m.fullName || m.email}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{m.email}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="profile-tag-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                          {(lang === 'en' ? m.role === 'OWNER' ? "Farm owner" : "Staff" : m.role === 'OWNER' ? 'Chủ trại' : 'Nhân viên')}
                        </span>
                        {isOwner && m.role !== 'OWNER' && (
                          <button type="button" className="icon-button" title={(lang === 'en' ? "Remove member" : "Xóa thành viên")} style={{ color: '#ef4444' }} onClick={() => handleRemoveMember(m.id, m.fullName || m.email)}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bản đồ tọa độ & sơ đồ ranh giới trang trại trên Goong Map */}
          <div className="panel" style={{ padding: '24px' }}>
            <FarmGoongMap
              farmName={farmDetail.farmName}
              address={farmDetail.address || ''}
              province={selectedFarm.province || undefined}
              district={selectedFarm.district || undefined}
              latitude={farmDetail.latitude}
              longitude={farmDetail.longitude}
              boundary={detailBoundary}
              editable={false}
              height={400}
            />
          </div>
        </div>
      ) : null}


      {/* Edit Farm Modal */}
      {isEditOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div className="panel" role="dialog" aria-modal="true" aria-label={(lang === 'en' ? "Edit farm information" : "Chỉnh sửa thông tin trang trại")} style={{ width: '100%', maxWidth: '720px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>{lang === 'en' ? 'Edit Farm Information & Map' : 'Chỉnh sửa thông tin & Bản đồ trang trại'}</h2>
            {Object.keys(errors).length > 0 && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />

                {lang === 'en'
                  ? 'Please correct the errors before saving.'
                  : 'Vui lòng sửa các lỗi trước khi lưu.'}
              </div>
            )}
            <form onSubmit={handleUpdateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label>
                  {lang === 'en' ? 'Farm Name' : 'Tên trang trại'}
                </label>

                <input
                  ref={farmNameRef}
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditName(value);

                    setErrors(prev => {
                      const updated = { ...prev };

                      if (!value.trim()) {
                        updated.name = lang === 'en'
                          ? 'Farm name is required.'
                          : 'Vui lòng nhập tên trang trại.';
                      } else {
                        delete updated.name;
                      }

                      return updated;
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: errors.name
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1',
                    fontSize: '14px'
                  }}
                />

                {errors.name && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
                <input
                  ref={addressRef}
                  type="text"
                  value={editAddress}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditAddress(value);

                    setErrors(prev => {
                      const updated = { ...prev };

                      if (!value.trim()) {
                        updated.address = lang === 'en'
                          ? 'Address is required.'
                          : 'Vui lòng nhập địa chỉ.';
                      } else {
                        delete updated.address;
                      }

                      return updated;
                    });
                  }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px', border: errors.address
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1', fontSize: '14px'
                  }} />
                {errors.address && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {errors.address}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Location Map & Boundary Layout' : 'Bản đồ tọa độ & Vẽ ranh giới trang trại'}</label>
                <FarmGoongMap
                  farmName={editName}
                  address={editAddress}
                  latitude={editLat}
                  longitude={editLng}
                  boundary={editBoundary}
                  editable={true}
                  height={320}
                  onLocationChange={(lat, lng, rev) => {
                    setEditLat(lat);
                    setEditLng(lng);
                    if (!editAddress.trim() && rev?.formattedAddress) {
                      setEditAddress(rev.formattedAddress);
                    }
                  }}
                  onBoundaryChange={setEditBoundary}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Scale Description / Overview' : 'Mô tả quy mô / Giới thiệu'}</label>
                <textarea
                  ref={descriptionRef}
                  rows={3} value={editDesc}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditDesc(value);

                    setErrors(prev => {
                      const updated = { ...prev };

                      if (value.length > 500) {
                        updated.description = lang === 'en'
                          ? 'Description must not exceed 500 characters.'
                          : 'Mô tả không được vượt quá 500 ký tự.';
                      } else {
                        delete updated.description;
                      }

                      return updated;
                    });
                  }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px', border: errors.description
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1', fontSize: '14px'
                  }} />
                {errors.description && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {errors.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={handleCancelEdit}>{lang === 'en' ? 'Cancel' : 'Hủy'}</button>
                <button type="submit" className="primary-button" disabled={updating}>
                  {updating ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>{lang === 'en' ? 'Add Member' : 'Thêm thành viên'} {(lang === 'en' ? " new" : " mới")}</h2>
            {Object.keys(errors).length > 0 && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />
                {lang === 'en'
                  ? 'Please correct the errors before adding the member.'
                  : 'Vui lòng sửa các lỗi trước khi thêm thành viên.'}
              </div>
            )}
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Account Email' : 'Email tài khoản'}</label>
                <input
                  type="email"
                  placeholder="nhanvien@example.com"
                  value={newMemberEmail}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMemberEmail(value);

                    setErrors(prev => {
                      const updated = { ...prev };

                      if (!value.trim()) {
                        updated.email = lang === 'en'
                          ? 'Account email is required.'
                          : 'Vui lòng nhập email tài khoản.';
                      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                        updated.email = lang === 'en'
                          ? 'Please enter a valid email address.'
                          : 'Vui lòng nhập địa chỉ email hợp lệ.';
                      } else {
                        delete updated.email;
                      }

                      return updated;
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: errors.email
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1',
                    fontSize: '14px'
                  }}
                />

                {errors.email && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Farm Role' : 'Vai trò trong trang trại'}</label>
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as 'STAFF' | 'OWNER')} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                  <option value="STAFF">{lang === 'en' ? 'Operations Staff' : 'Nhân viên canh tác (Staff)'}</option>
                  <option value="OWNER">{lang === 'en' ? 'Co-Owner' : 'Đồng sở hữu (Owner)'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={handleCancelAddMember}>{lang === 'en' ? 'Cancel' : 'Hủy'}</button>
                <button type="submit" className="primary-button" disabled={addingMember}>
                  {addingMember ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Confirm Add' : 'Xác nhận thêm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Farm Modal */}
      {isCreateFarmOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '720px', borderRadius: '16px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>{lang === 'en' ? 'Create New Farm Workspace' : 'Tạo không gian trang trại mới'}</h2>
            {Object.keys(createFarmErrors).length > 0 && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />
                {lang === 'en'
                  ? 'Please correct the errors before creating the farm.'
                  : 'Vui lòng sửa các lỗi trước khi tạo trang trại.'}
              </div>
            )}
            <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Farm Name *' : 'Tên trang trại *'}</label>
                <input
                  ref={createFarmNameRef}
                  type="text"
                  placeholder={lang === 'en'
                    ? 'Example: An Nhien Organic Farm'
                    : 'Ví dụ: Nông trại Hữu cơ An Nhiên'}
                  value={createFarmName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCreateFarmName(value);

                    setCreateFarmErrors(prev => {
                      const created = { ...prev };

                      if (!value.trim()) {
                        created.name = lang === 'en'
                          ? 'Farm name is required.'
                          : 'Vui lòng nhập tên trang trại.';
                      } else {
                        delete created.name;
                      }

                      return created;
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: createFarmErrors.name
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1',
                    fontSize: '14px'
                  }}
                />

                {createFarmErrors.name && (
                  <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '5px', marginBottom: 0 }}>
                    {createFarmErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
                <input
                  placeholder={(lang === 'en' ? "Commune / District / Province..." : "Xã/Huyện/Tỉnh...")}
                  ref={addressRef}
                  type="text"
                  value={createFarmAddress}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCreateFarmAddress(value);

                    setCreateFarmErrors(prev => {
                      const created = { ...prev };

                      if (!value.trim()) {
                        created.address = lang === 'en'
                          ? 'Address is required.'
                          : 'Vui lòng nhập địa chỉ.';
                      } else {
                        delete created.address;
                      }

                      return created;
                    });
                  }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px', border: createFarmErrors.address
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1', fontSize: '14px'
                  }} />
                {createFarmErrors.address && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '5px',
                    marginBottom: 0
                  }}>
                    {createFarmErrors.address}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Location & Farm Boundary Plan' : 'Vẽ vị trí & Sơ đồ ranh giới trang trại'}</label>
                <FarmGoongMap
                  farmName={createFarmName || 'Trang trại mới'}
                  address={createFarmAddress}
                  latitude={createLat}
                  longitude={createLng}
                  boundary={createBoundary}
                  editable={true}
                  height={320}
                  onLocationChange={(lat, lng, rev) => {
                    setCreateLat(lat);
                    setCreateLng(lng);
                    if (!createFarmAddress.trim() && rev?.formattedAddress) {
                      setCreateFarmAddress(rev.formattedAddress);
                    }
                  }}
                  onBoundaryChange={setCreateBoundary}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{lang === 'en' ? 'Scale & Description' : 'Mô tả quy mô'}</label>
                <textarea
                  ref={createFarmDescriptionRef}
                  rows={3}
                  placeholder={lang === 'en'
                    ? 'Describe crop types and planned area...'
                    : 'Mô tả các loại cây trồng và diện tích dự kiến...'}
                  value={createFarmDesc}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCreateFarmDesc(value);

                    setCreateFarmErrors(prev => {
                      const created = { ...prev };

                      if (value.length > 500) {
                        created.description = lang === 'en'
                          ? 'Description must not exceed 500 characters.'
                          : 'Mô tả không được vượt quá 500 ký tự.';
                      } else {
                        delete created.description;
                      }

                      return created;
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: createFarmErrors.description
                      ? '1px solid #dc2626'
                      : '1px solid #cbd5e1',
                    fontSize: '14px'
                  }}
                />

                {createFarmErrors.description && (
                  <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '5px', marginBottom: 0 }}>
                    {createFarmErrors.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={handleCancelCreateFarm}>
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="primary-button" disabled={creatingFarm}>
                  {creatingFarm ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Farm' : 'Tạo trang trại')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
