import { message, type TranslationMessage } from "../shared/i18n/translate";
import { EmptyState } from '../shared/components/EmptyState';
import { Modal } from '../shared/components/Modal';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { StatusBadge } from '../shared/components/StatusBadge';
import { PageHeading } from '../shared/components/PageHeading';
import { Button } from '../shared/components/Button';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import { FarmGoongMap } from '../features/farm-management/components/FarmGoongMap';

import { formatDate as displayDate, formatNumber as displayNumber } from '../shared/format/formatters';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { farmRole } from '../features/auth/accessPolicy';

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

import { useRealtimeSync } from '../shared/realtime/realtimeSync';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { FileUpload } from '../shared/components/FileUpload';

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
  const [editCoverImage, setEditCoverImage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  // Add Member Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'STAFF' | 'OWNER'>('STAFF');
  const [addingMember, setAddingMember] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: number; name: string; farmId: number } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Create Farm Modal state
  const [isCreateFarmOpen, setIsCreateFarmOpen] = useState(false);
  const [createFarmName, setCreateFarmName] = useState('');
  const [createFarmAddress, setCreateFarmAddress] = useState('');
  const [createFarmDesc, setCreateFarmDesc] = useState('');
  const [createLat, setCreateLat] = useState<number | null>(null);
  const [createLng, setCreateLng] = useState<number | null>(null);
  const [createBoundary, setCreateBoundary] = useState<LatLngPoint[]>([]);
  const [creatingFarm, setCreatingFarm] = useState(false);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => { if (isEditOpen || isAddMemberOpen || isCreateFarmOpen) setActionMsg(null); }, [isEditOpen, isAddMemberOpen, isCreateFarmOpen]);

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
          setEditCoverImage(detail.coverImageUrl || '');
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
      .catch(() => {});
  });

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;
    setUpdating(true);
    setActionMsg(null);
    try {
      const updated = await updateFarm(selectedFarm.id, {
        farmName: editName.trim(),
        address: editAddress.trim(),
        description: editDesc.trim(),
        latitude: editLat,
        longitude: editLng,
        boundaryCoordinates: stringifyBoundaryCoordinates(editBoundary) || null,
        coverImageUrl: editCoverImage.trim() || undefined,
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
      setActionMsg({ text: (message("Member added {value1}", { value1: (newMember.fullName || newMember.email) })), type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : (lang === 'en' ? 'Failed to add member' : 'Thêm thành viên thất bại'), type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (removingMember) return;
    if (!selectedFarm?.id || removeMemberTarget?.farmId !== selectedFarm.id) { setRemoveMemberTarget(null); return; }
    setRemovingMember(true);
    try {
      await removeFarmMember(selectedFarm.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionMsg({ text: (message("Removed member \"{value1}\"", { value1: memberName })), type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Xóa thành viên thất bại', type: 'error' });
    } finally {
      setRemovingMember(false);
      setRemoveMemberTarget(null);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFarmName.trim()) return;
    setCreatingFarm(true);
    setActionMsg(null);
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
      setActionMsg({ text: (message("Created farm \"{value1}\" successfully!", { value1: newFarm.farmName })), type: 'success' });
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
      <PageHeading   title={<>{lang === 'en' ? 'Farm Profile' : 'Hồ sơ trang trại'}</>} description={<>{lang === 'en' ? 'Detailed information on cultivation scale, map boundaries, personnel, and VietGAP compliance' : 'Thông tin chi tiết quy mô canh tác, bản đồ, nhân sự và tiêu chuẩn VietGAP'}</>}><div style={{ display: 'flex', gap: '10px' }}>
          {selectedFarm && isOwner && (
            <Button type="button" variant="primary" onClick={() => setIsEditOpen(true)}>
              <Icon name="check" /> {lang === 'en' ? 'Edit Farm & Map' : 'Chỉnh sửa trang trại & Bản đồ'}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => setIsCreateFarmOpen(true)}>
            <Icon name="plus" /> {lang === 'en' ? 'Add New Farm' : 'Thêm trang trại mới'}
          </Button>
        </div></PageHeading>

      {actionMsg && (
        <div role={actionMsg.type === 'error' ? 'alert' : 'status'} className={`notification-popover ${actionMsg.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{(lang === 'en' ? actionMsg.type === 'success' ? "✓ Success" : "⚠️ Notice" : actionMsg.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo')}:</strong> {translate(actionMsg.text)}
        </div>
      )}

      {!selectedFarm ? (
        <EmptyState  className="panel" title={<>{lang === 'en' ? 'Select or Create Farm Workspace' : 'Chọn hoặc tạo không gian trang trại'}</>} description={<>{lang === 'en' ? 'You are currently in your personal workspace. Select a farm below to manage details.' : 'Bạn hiện đang ở không gian cá nhân. Hãy chọn một trang trại bên dưới để quản lý chi tiết.'}</>} icon={<>🚜</>} action={<>{farms.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%', maxWidth: '900px', marginTop: '20px' }}>
              {farms.map((f) => (
                <div key={f.id} className="farm-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => selectFarm(f.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="profile-tag-pill" style={{ background: 'var(--color-success-bg)', color: 'var(--color-primary-text)' }}>
                      <Icon name="leaf" /> {(lang === 'en' ? farmRole(f) === 'OWNER' ? "Farm owner" : "Staff" : farmRole(f) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên')}
                    </span>
                    <StatusBadge   tone="success" label={<>{f.status ? (lang === 'en' && f.status === 'ACTIVE' ? 'Active' : f.status) : (lang === 'en' ? 'Active' : 'Hoạt động')}</>} />
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--color-text)' }}>{f.farmName}</h3>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '13.5px' }}>
                    📍 {(lang === 'en' ? [f.district, f.province].filter(Boolean).join(', ') || "No address provided" : [f.district, f.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ')}
                  </p>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ color: 'var(--color-primary-text)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lang === 'en' ? 'Open Management' : 'Mở quản lý'} <Icon name="arrow" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <Button type="button" variant="primary" onClick={() => setIsCreateFarmOpen(true)}>
                {lang === 'en' ? '+ Create Farm Now' : '+ Tạo trang trại ngay'}
              </Button>
              <Link to="/farm-registration" className="ui-button ui-button--secondary">
                {lang === 'en' ? 'Submit VietGAP Registration' : 'Gửi đơn đăng ký VietGAP'}
              </Link>
            </div>
          )}</>} />
      ) : loading ? (
        <EmptyState  className="panel" title={<>{lang === 'en' ? 'Loading farm profile...' : 'Đang tải hồ sơ trang trại...'}</>} icon={<>⏳</>} />
      ) : error ? (
        <EmptyState  className="panel" title={<>{lang === 'en' ? 'Failed to load farm information' : 'Không thể tải thông tin'}</>} description={<>{translate(error)}</>} icon={<>⚠️</>} />
      ) : farmDetail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Main Info Card */}
            <div className="panel" style={{ padding: '28px' }}>
              {farmDetail.coverImageUrl && (
                <div style={{ width: '100%', maxHeight: '240px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <img src={farmDetail.coverImageUrl} alt={farmDetail.farmName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-primary)', fontSize: '24px' }}>
                    🌱
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>{farmDetail.farmName}</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '14px' }}>{lang === 'en' ? 'Farm ID: #' : 'Mã trang trại: #'}{farmDetail.id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <StatusBadge   tone="success" label={<>{lang === 'en' ? 'VietGAP Standard' : 'Chuẩn VietGAP'}</>} />
                  <span className="profile-role-pill">{(lang === 'en' ? isOwner ? "Owner" : "Operations staff" : isOwner ? 'Chủ sở hữu' : 'Nhân sự vận hành')}</span>
                </div>
              </div>

              <p style={{ margin: '20px 0', color: 'var(--color-body)', fontSize: '15px', lineHeight: 1.6, background: 'var(--color-page)', padding: '16px', borderRadius: '10px' }}>
                {(lang === 'en' ? farmDetail.description || "The farm follows VietGAP Good Agricultural Practices for safe produce, transparency, and digital traceability." : farmDetail.description || 'Trang trại áp dụng quy chuẩn Thực hành nông nghiệp tốt (VietGAP) hướng đến nông sản an toàn, minh bạch và truy xuất nguồn gốc số.')}
              </p>

              <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: '20px 0 0', fontSize: '14px' }}>
                <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Address:' : 'Địa chỉ:'}</dt>
                <dd style={{ margin: 0, color: 'var(--color-text)', fontWeight: 500 }}>{(lang === 'en' ? farmDetail.address || "Not updated" : farmDetail.address || 'Chưa cập nhật')}</dd>

                {farmDetail.latitude != null && farmDetail.longitude != null && (
                  <>
                    <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Coordinates:' : 'Tọa độ:'}</dt>
                    <dd style={{ margin: 0, color: 'var(--color-primary-text)', fontWeight: 600 }}>
                      {farmDetail.latitude.toFixed(6)}, {farmDetail.longitude.toFixed(6)}
                    </dd>
                  </>
                )}

                <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Total Area:' : 'Diện tích:'}</dt>
                <dd style={{ margin: 0, color: 'var(--color-text)', fontWeight: 500 }}>
                  {(lang === 'en' ? selectedFarm.totalAreaM2 ? `${displayNumber(selectedFarm.totalAreaM2, lang)} m²` : polygonAreaM2 > 0 ? `${displayNumber(polygonAreaM2, lang)} m² (~${displayNumber(polygonAreaM2 / 10000, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha based on the map boundary)` : "Compliant scale" : selectedFarm.totalAreaM2
                    ? `${displayNumber(selectedFarm.totalAreaM2, lang)} m²`
                    : polygonAreaM2 > 0
                      ? `${displayNumber(polygonAreaM2, lang)} m² (~${displayNumber(polygonAreaM2 / 10000, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha theo sơ đồ bản đồ)`
                      : 'Quy mô đạt chuẩn')}
                </dd>

                <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Status:' : 'Trạng thái:'}</dt>
                <dd style={{ margin: 0 }}>
                  <StatusBadge   tone="success" label={<>{farmDetail.status ? (lang === 'en' && farmDetail.status === 'ACTIVE' ? 'Active' : farmDetail.status) : (lang === 'en' ? 'Active' : 'Đang hoạt động')}</>} />
                </dd>

                <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Created At:' : 'Tạo lúc:'}</dt>
                <dd style={{ margin: 0, color: 'var(--color-muted)' }}>
                  {displayDate(farmDetail.createdAt, lang)}
                </dd>
              </dl>

              {/* Quick Links inside Farm */}
              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Link to="/production-areas" className="ui-button ui-button--secondary" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '🗺️ Zones & Blocks' : '🗺️ Vùng & Lô đất'}
                </Link>
                <Link to="/crop-seasons" className="ui-button ui-button--secondary" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '🌾 Crop Seasons' : '🌾 Mùa vụ'}
                </Link>
                <Link to="/activities" className="ui-button ui-button--secondary" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '📖 Farming Activities' : '📖 Nhật ký canh tác'}
                </Link>
                <Link to="/harvests" className="ui-button ui-button--secondary" style={{ fontSize: '13px' }}>
                  {lang === 'en' ? '📦 Harvest & Batches' : '📦 Thu hoạch & Truy xuất'}
                </Link>
              </div>
            </div>

            {/* Members Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{lang === 'en' ? 'Members & Personnel' : 'Thành viên & Nhân sự'}</h2>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>{members.length} {lang === 'en' ? 'active members participating' : 'thành viên tham gia canh tác'}</p>
                </div>
                {isOwner && (
                  <Button type="button" variant="secondary"  onClick={() => setIsAddMemberOpen(true)}>
                    <Icon name="plus" /> {lang === 'en' ? 'Add Member' : 'Thêm thành viên'}
                  </Button>
                )}
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-muted)' }}>
                  <Icon name="user" />
                  <p style={{ marginTop: '8px' }}>{lang === 'en' ? 'No other members in this farm yet.' : 'Chưa có thành viên nào khác trong trang trại.'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: 'var(--color-page)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="profile-hero-avatar" style={{ width: '38px', height: '38px', fontSize: '15px' }}>
                          <Icon name="user" />
                        </span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px', color: 'var(--color-text)' }}>{m.fullName || m.email}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{m.email}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="profile-tag-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                          {(lang === 'en' ? m.role === 'OWNER' ? "Farm owner" : "Staff" : m.role === 'OWNER' ? 'Chủ trại' : 'Nhân viên')}
                        </span>
                        {isOwner && m.role !== 'OWNER' && (
                          <button type="button" className="icon-button" title={(lang === 'en' ? "Remove member" : "Xóa thành viên")} style={{ color: 'var(--color-danger)' }} onClick={() => { if (selectedFarm) setRemoveMemberTarget({ id: m.id, name: m.fullName || m.email, farmId: selectedFarm.id }); }}>
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
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)}
        title={lang === 'en' ? 'Edit Farm Information & Map' : 'Chỉnh sửa thông tin & Bản đồ trang trại'}
        style={{ width: 'min(720px, 100%)' }}>
        <form onSubmit={handleUpdateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionMsg?.type === 'error' && <p role="alert" className="form-error-banner">{translate(actionMsg.text)}</p>}
          <div className="structured-field-card">
            <label htmlFor="farm-field-1">{lang === 'en' ? 'Farm Name' : 'Tên trang trại'}</label>
            <input id="farm-field-1" className="ui-input" type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-2">{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
            <input id="farm-field-2" className="ui-input" type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--color-body)' }}>{lang === 'en' ? 'Location Map & Boundary Layout' : 'Bản đồ tọa độ & Vẽ ranh giới trang trại'}</label>
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
            <FileUpload
              value={editCoverImage}
              onChange={setEditCoverImage}
              label={lang === 'en' ? 'Farm Cover / Photos (Cloudinary)' : 'Ảnh bìa / Ảnh thực tế nông trại (Cloudinary)'}
              hint={lang === 'en' ? 'Upload farm photos to Cloudinary to display on the profile.' : 'Tải ảnh chụp thực tế trang trại lên Cloudinary để hiển thị trên hồ sơ.'}
              folder="mycropdiary/farms"
              accept="image/*"
              disabled={updating}
            />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-3">{lang === 'en' ? 'Scale Description / Overview' : 'Mô tả quy mô / Giới thiệu'}</label>
            <textarea id="farm-field-3" className="ui-textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
            <Button type="submit" variant="primary" loading={updating}>
              {updating ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)}
        title={lang === 'en' ? 'Add Member new' : 'Thêm thành viên mới'}
        style={{ width: 'min(460px, 100%)' }}>
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionMsg?.type === 'error' && <p role="alert" className="form-error-banner">{translate(actionMsg.text)}</p>}
          <div className="structured-field-card">
            <label htmlFor="farm-field-4">{lang === 'en' ? 'Account Email' : 'Email tài khoản'}</label>
            <input id="farm-field-4" className="ui-input" type="email" required placeholder="nhanvien@example.com" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-5">{lang === 'en' ? 'Farm Role' : 'Vai trò trong trang trại'}</label>
            <select id="farm-field-5" className="ui-select" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as 'STAFF' | 'OWNER')} style={{ width: '100%', padding: '10px 14px' }}>
              <option value="STAFF">{lang === 'en' ? 'Operations Staff' : 'Nhân viên canh tác (Staff)'}</option>
              <option value="OWNER">{lang === 'en' ? 'Co-Owner' : 'Đồng sở hữu (Owner)'}</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddMemberOpen(false)}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
            <Button type="submit" variant="primary" disabled={addingMember}>
              {addingMember ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Confirm Add' : 'Xác nhận thêm')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Farm Modal */}
      <Modal open={isCreateFarmOpen} onClose={() => setIsCreateFarmOpen(false)}
        title={lang === 'en' ? 'Create New Farm Workspace' : 'Tạo không gian trang trại mới'}
        style={{ width: 'min(720px, 100%)' }}>
        <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionMsg?.type === 'error' && <p role="alert" className="form-error-banner">{translate(actionMsg.text)}</p>}
          <div className="structured-field-card">
            <label htmlFor="farm-field-6">{lang === 'en' ? 'Farm Name *' : 'Tên trang trại *'}</label>
            <input id="farm-field-6" className="ui-input" type="text" required placeholder={(lang === 'en' ? "Example: An Nhien Organic Farm" : "Ví dụ: Nông trại Hữu cơ An Nhiên")} value={createFarmName} onChange={(e) => setCreateFarmName(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-7">{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
            <input id="farm-field-7" className="ui-input" type="text" placeholder={(lang === 'en' ? "Commune / District / Province..." : "Xã/Huyện/Tỉnh...")} value={createFarmAddress} onChange={(e) => setCreateFarmAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--color-body)' }}>{lang === 'en' ? 'Location & Farm Boundary Plan' : 'Vẽ vị trí & Sơ đồ ranh giới trang trại'}</label>
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
          <div className="structured-field-card">
            <label htmlFor="farm-field-8">{lang === 'en' ? 'Scale & Description' : 'Mô tả quy mô'}</label>
            <textarea id="farm-field-8" className="ui-textarea" rows={3} placeholder={(lang === 'en' ? "Describe crop types and planned area..." : "Mô tả các loại cây trồng và diện tích dự kiến...")} value={createFarmDesc} onChange={(e) => setCreateFarmDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsCreateFarmOpen(false)}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button>
            <Button type="submit" variant="primary" loading={creatingFarm}>
              {creatingFarm ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Farm' : 'Tạo trang trại')}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(removeMemberTarget)}
        title={lang === 'en' ? 'Remove member' : 'Xóa thành viên'}
        description={lang === 'en' ? `Are you sure you want to remove member "${removeMemberTarget?.name}" from the farm?` : `Bạn có chắc muốn xóa thành viên "${removeMemberTarget?.name}" khỏi trang trại?`}
        confirmLabel={lang === 'en' ? 'Remove member' : 'Xóa thành viên'} tone="danger" loading={removingMember}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={() => { if (removeMemberTarget) void handleRemoveMember(removeMemberTarget.id, removeMemberTarget.name); }} />
    </section>
  );
}
