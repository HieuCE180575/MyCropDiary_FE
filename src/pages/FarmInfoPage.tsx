import { message, type TranslationMessage } from "../shared/i18n/translate";
import { EmptyState } from '../shared/components/EmptyState';
import { Modal } from '../shared/components/Modal';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { StatusBadge } from '../shared/components/StatusBadge';
import { PageHeading } from '../shared/components/PageHeading';
import { Button } from '../shared/components/Button';
import { TablePagination } from '../shared/components/TablePagination';
import { TabList } from '../shared/components/TabList';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import { FarmGoongMap } from '../features/farm-management/components/FarmGoongMap';
import { FarmRegistrationForm } from '../features/farm-management/components/FarmRegistrationForm';
import { FarmRegistrationStatus } from '../features/farm-management/components/FarmRegistrationStatus';

import { formatDate as displayDate, formatNumber as displayNumber } from '../shared/format/formatters';
import { usePagination } from '../shared/hooks/usePagination';
import { useCallback, useEffect, useState, useMemo } from 'react';
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
  cancelFarmRegistration,
  fetchMyLatestRegistration,
  submitFarmRegistration,
} from '../features/farm-management/registrationService';
import type { FarmRegistration, FarmRegistrationFormValues } from '../features/farm-management/types';
import {
  calculatePolygonAreaM2,
  parseBoundaryCoordinates,
  stringifyBoundaryCoordinates,
  type LatLngPoint,
} from '../features/farm-management/goongMapService';

import { useRealtimeSync } from '../shared/realtime/realtimeSync';
import { useLanguage } from '../shared/i18n/LanguageContext';

export interface FarmInfoPageProps {
  defaultTab?: 'list' | 'detail' | 'register';
}

export function FarmInfoPage({ defaultTab }: FarmInfoPageProps = {}) {
  const { lang, t: translate } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFarm, farms, selectFarm, retry } = useFarmWorkspace();

  // Tab & View management: 'list' (Danh sách), 'detail' (Hồ sơ & Bản đồ), 'register' (Đăng ký VietGAP)
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'register'>(() => {
    if (defaultTab === 'register' || searchParams.get('tab') === 'register') return 'register';
    if (farms.length === 0) return 'register';
    if (searchParams.get('farmId') || searchParams.get('view') === 'detail') return 'detail';
    return 'list';
  });

  const [activeFarmId, setActiveFarmId] = useState<number | null>(() => {
    const urlFarmId = searchParams.get('farmId');
    if (urlFarmId && !isNaN(Number(urlFarmId))) return Number(urlFarmId);
    return selectedFarm?.id ?? (farms.length > 0 ? farms[0].id : null);
  });

  // Filters for Farm List
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'STAFF'>('ALL');

  // Notification Toast
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  const showToast = (text: TranslationMessage, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Farm detail state
  const [farmDetail, setFarmDetail] = useState<FarmDetail | null>(null);
  const [members, setMembers] = useState<FarmMemberItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Edit Farm Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editBoundary, setEditBoundary] = useState<LatLngPoint[]>([]);
  const [updating, setUpdating] = useState(false);

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

  // VietGAP Registration State
  const [registration, setRegistration] = useState<FarmRegistration | null>(null);
  const [loadingReg, setLoadingReg] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [submitRegError, setSubmitRegError] = useState<string | null>(null);
  const [cancellingReg, setCancellingReg] = useState(false);
  const [cancelRegError, setCancelRegError] = useState<string | null>(null);

  const activeFarmSummary = farms.find((f) => f.id === activeFarmId) || selectedFarm || (farms.length > 0 ? farms[0] : null);
  const isOwner = activeFarmSummary ? farmRole(activeFarmSummary) === 'OWNER' : false;

  // Filtered farms list matching layout of ZoneListPage / StaffManagementPage
  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const q = searchQuery.trim().toLowerCase();
      const code = `FARM-${String(f.id).padStart(3, '0')}`.toLowerCase();
      const matchesSearch =
        !q ||
        f.farmName.toLowerCase().includes(q) ||
        code.includes(q) ||
        (f.province && f.province.toLowerCase().includes(q)) ||
        (f.district && f.district.toLowerCase().includes(q));

      const role = farmRole(f);
      const matchesRole = roleFilter === 'ALL' || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [farms, searchQuery, roleFilter]);

  const pagination = usePagination(filteredFarms, JSON.stringify([searchQuery, roleFilter, farms.length]));

  // Auto sync viewMode if user has 0 farms
  useEffect(() => {
    if (farms.length === 0 && viewMode !== 'register') {
      setViewMode('register');
    }
  }, [farms.length, viewMode]);

  // Keep activeFarmId in sync with selectedFarm if not set
  useEffect(() => {
    if (activeFarmId === null && selectedFarm?.id) {
      setActiveFarmId(selectedFarm.id);
    }
  }, [selectedFarm?.id, activeFarmId]);

  useEffect(() => {
    if (searchParams.get('edit') !== '1' || !isOwner || !farmDetail || farmDetail.id !== activeFarmId) return;
    setIsEditOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, isOwner, farmDetail, activeFarmId]);

  // Load detail for activeFarmId
  useEffect(() => {
    if (!activeFarmId || viewMode !== 'detail') {
      return;
    }

    let active = true;
    setLoadingDetail(true);
    setDetailError(null);

    Promise.all([
      getFarmById(activeFarmId).catch(() => null),
      getFarmMembers(activeFarmId).catch(() => []),
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
        } else if (activeFarmSummary) {
          setFarmDetail({
            id: activeFarmSummary.id,
            farmName: activeFarmSummary.farmName,
            description: 'Trang trại chuẩn VietGAP',
            address: [activeFarmSummary.district, activeFarmSummary.province].filter(Boolean).join(', ') || 'Chưa cập nhật',
            latitude: null,
            longitude: null,
            boundaryCoordinates: null,
            coverImageUrl: null,
            status: activeFarmSummary.status || 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentUserRole: activeFarmSummary.currentUserRole,
          });
        }
        setMembers(memberList);
      })
      .catch((err) => {
        if (active) setDetailError(lang === 'en' ? (err instanceof Error ? translate(err.message) : "Unable to load farm information") : (err instanceof Error ? err.message : 'Lỗi tải thông tin trang trại'));
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [activeFarmId, viewMode, activeFarmSummary, lang, translate]);

  // Load latest registration
  const loadRegistration = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) {
      setLoadingReg(true);
      setRegError(null);
    }
    try {
      const data = await fetchMyLatestRegistration(signal);
      if (!signal?.aborted) {
        setRegistration(data);
        if (silent) setRegError(null);
      }
    } catch (error) {
      if (!signal?.aborted && !silent) {
        setRegError(error instanceof Error ? error.message : 'Không tải được hồ sơ đăng ký.');
      }
    } finally {
      if (!signal?.aborted && !silent) setLoadingReg(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'register' || farms.length === 0) {
      const controller = new AbortController();
      void loadRegistration(controller.signal, false);
      return () => controller.abort();
    }
  }, [viewMode, farms.length, loadRegistration]);

  // Silent background realtime sync
  useRealtimeSync(() => {
    if (viewMode === 'detail' && activeFarmId) {
      Promise.all([
        getFarmById(activeFarmId).catch(() => null),
        getFarmMembers(activeFarmId).catch(() => []),
      ])
        .then(([detail, memberList]) => {
          if (detail) setFarmDetail(detail);
          setMembers(memberList);
        })
        .catch(() => {});
    }
    if (viewMode === 'register' || farms.length === 0) {
      void loadRegistration(undefined, true);
    }
  });

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmId) return;
    setUpdating(true);
    try {
      const updated = await updateFarm(activeFarmId, {
        farmName: editName.trim(),
        address: editAddress.trim(),
        description: editDesc.trim(),
        latitude: editLat,
        longitude: editLng,
        boundaryCoordinates: stringifyBoundaryCoordinates(editBoundary) || null,
      });
      setFarmDetail(updated);
      setIsEditOpen(false);
      showToast('Cập nhật thông tin và bản đồ trang trại thành công!');
      retry();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmId || !newMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const newMember = await addFarmMember(activeFarmId, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setNewMemberEmail('');
      setIsAddMemberOpen(false);
      showToast(message("Member added {value1}", { value1: (newMember.fullName || newMember.email) }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : (lang === 'en' ? 'Failed to add member' : 'Thêm thành viên thất bại'), 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (removingMember || !activeFarmId) return;
    setRemovingMember(true);
    try {
      await removeFarmMember(activeFarmId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast(message("Removed member \"{value1}\"", { value1: memberName }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xóa thành viên thất bại', 'error');
    } finally {
      setRemovingMember(false);
      setRemoveMemberTarget(null);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFarmName.trim()) return;
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
      showToast(message("Created farm \"{value1}\" successfully!", { value1: newFarm.farmName }));
      retry();
      selectFarm(newFarm.id);
      setActiveFarmId(newFarm.id);
      setViewMode('detail');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tạo trang trại thất bại', 'error');
    } finally {
      setCreatingFarm(false);
    }
  };

  const handleRegistrationSubmit = async (values: FarmRegistrationFormValues) => {
    if (submittingReg) return;
    setSubmittingReg(true);
    setSubmitRegError(null);
    try {
      const created = await submitFarmRegistration(values);
      setRegistration(created);
      setShowRegForm(false);
      showToast('Gửi yêu cầu đăng ký trang trại VietGAP thành công! Ban quản trị sẽ xét duyệt sớm.');
    } catch (error) {
      setSubmitRegError(
        error instanceof Error
          ? error.message
          : lang === 'en'
            ? 'Failed to submit registration. Please try again.'
            : 'Gửi đăng ký thất bại. Vui lòng thử lại.'
      );
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleRegistrationCancel = async () => {
    if (!registration || cancellingReg) return;
    setCancellingReg(true);
    setCancelRegError(null);
    try {
      const updated = await cancelFarmRegistration(registration.farmRegistrationId);
      setRegistration(updated);
      showToast('Đã hủy yêu cầu đăng ký trang trại.');
    } catch (error) {
      setCancelRegError(
        error instanceof Error
          ? error.message
          : lang === 'en'
            ? 'Failed to cancel registration. Please try again.'
            : 'Hủy đăng ký thất bại. Vui lòng thử lại.'
      );
    } finally {
      setCancellingReg(false);
    }
  };

  const detailBoundary = parseBoundaryCoordinates(farmDetail?.boundaryCoordinates);
  const polygonAreaM2 = calculatePolygonAreaM2(detailBoundary);

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Notification Toast matching ZoneListPage / StaffManagementPage */}
      {notification && (
        <div
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <strong>{lang === 'en' ? (notification.type === 'success' ? '✓ Success: ' : '⚠️ Notice: ') : (notification.type === 'success' ? '✓ Thành công: ' : '⚠️ Thông báo: ')}</strong>
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

      {/* Main Page Heading */}
      <PageHeading
        title={<>{lang === 'en' ? 'Farm Management' : 'Quản lý trang trại'}</>}
        description={<>
          {lang === 'en'
            ? `${farms.length} farms registered · Active Workspace: ${selectedFarm ? selectedFarm.farmName : 'Personal'}`
            : `${farms.length} trang trại · Không gian làm việc đang chọn: ${selectedFarm ? selectedFarm.farmName : 'Cá nhân'}`}
        </>}
        leading={<p className="welcome-kicker">{lang === 'en' ? 'Farm Setup' : 'Không gian trang trại'}</p>}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'detail' && (
            <Button type="button" variant="secondary" onClick={() => setViewMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="arrow-left" size={16} /> {lang === 'en' ? 'Back to Farm List' : 'Danh sách trang trại'}
            </Button>
          )}

          {viewMode === 'register' && farms.length > 0 && (
            <Button type="button" variant="secondary" onClick={() => setViewMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="arrow-left" size={16} /> {lang === 'en' ? 'Back to Farm List' : 'Danh sách trang trại'}
            </Button>
          )}

          {viewMode === 'detail' && activeFarmId && isOwner && (
            <Button type="button" variant="primary" onClick={() => setIsEditOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="check" size={16} /> {lang === 'en' ? 'Edit Farm & Map' : 'Chỉnh sửa trang trại'}
            </Button>
          )}

          <Button type="button" variant="primary" onClick={() => setIsCreateFarmOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Farm' : 'Thêm trang trại'}
          </Button>
        </div>
      </PageHeading>

      {/* ========================================================================= */}
      {/* CASE 1: USER HAS NO FARMS -> SHOW REGISTRATION OR DIRECT CREATION         */}
      {/* ========================================================================= */}
      {farms.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚜</span> {lang === 'en' ? 'You do not have any farms yet' : 'Bạn chưa có trang trại nào trong hệ thống'}
                </h3>
                <p style={{ margin: 0, color: 'var(--color-body)', fontSize: '14px', lineHeight: 1.5 }}>
                  {lang === 'en'
                    ? 'Submit a VietGAP farm registration request for official review, or create a farm directly to start testing.'
                    : 'Hãy điền đơn đăng ký trang trại VietGAP để ban quản trị thẩm định, hoặc bạn có thể tạo nhanh trang trại trực tiếp để trải nghiệm ngay.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button type="button" variant="primary" onClick={() => setIsCreateFarmOpen(true)}>
                  <Icon name="plus" /> {lang === 'en' ? 'Create Farm Instantly' : 'Tạo trang trại trực tiếp'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void loadRegistration();
                    retry();
                  }}
                >
                  {lang === 'en' ? 'Refresh Status' : 'Kiểm tra trạng thái'}
                </Button>
              </div>
            </div>
          </div>

          {loadingReg ? (
            <EmptyState className="panel" title={<>{lang === 'en' ? 'Loading registration status...' : 'Đang kiểm tra hồ sơ đăng ký...'}</>} icon={<>⏳</>} />
          ) : regError ? (
            <div className="panel" style={{ padding: '24px' }}>
              <p role="alert" style={{ color: 'var(--color-danger)' }}>{translate(regError)}</p>
              <Button variant="primary" onClick={() => void loadRegistration()}>
                {lang === 'en' ? 'Retry' : 'Thử lại'}
              </Button>
            </div>
          ) : registration && !showRegForm ? (
            <FarmRegistrationStatus
              registration={registration}
              cancelling={cancellingReg}
              cancelError={cancelRegError}
              onCancel={handleRegistrationCancel}
              onStartNew={() => setShowRegForm(true)}
            />
          ) : (
            <FarmRegistrationForm
              submitting={submittingReg}
              submitError={submitRegError}
              onSubmit={handleRegistrationSubmit}
            />
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE 2: MAIN UNIFIED CLEAN CARD CONTAINER (MATCHING ZONE & STAFF PAGES)   */
        /* ========================================================================= */
        <div className="zone-clean-card">
          {/* Integrated Tabs */}
          <TabList
            idPrefix="farm-mgmt"
            label={lang === 'en' ? 'Farm management sections' : 'Các mục quản lý trang trại'}
            inset
            value={viewMode}
            onChange={(val) => setViewMode(val as 'list' | 'detail' | 'register')}
            items={[
              {
                value: 'list',
                label: (
                  <>
                    <Icon name="home" size={17} /> {lang === 'en' ? 'Farm List' : 'Danh sách trang trại'}{' '}
                    <span className="tab-count">({farms.length})</span>
                  </>
                ),
              },
              ...(activeFarmId && viewMode === 'detail'
                ? [
                    {
                      value: 'detail',
                      label: (
                        <>
                          <Icon name="leaf" size={17} /> {lang === 'en' ? 'Farm Profile' : 'Hồ sơ'}:{' '}
                          {activeFarmSummary?.farmName || `#${activeFarmId}`}
                        </>
                      ),
                    },
                  ]
                : []),
              {
                value: 'register',
                label: (
                  <>
                    <Icon name="book" size={17} /> {lang === 'en' ? 'VietGAP Registration' : 'Hồ sơ đăng ký VietGAP'}
                  </>
                ),
              },
            ]}
          />

          {/* =========================================================
              VIEW 1: LIST / TABLE VIEW (DANH SÁCH BẢNG ĐỒNG BỘ)
             ========================================================= */}
          {viewMode === 'list' && (
            <div>
              {/* Filter Bar */}
              <div className="zone-clean-filter-bar">
                <div className="zone-clean-search">
                  <span className="search-icon" aria-hidden="true">
                    <Icon name="search" size={17} />
                  </span>
                  <input
                    aria-label={lang === 'en' ? 'Search farms by name, code, province...' : 'Tìm kiếm trang trại theo tên, mã hoặc tỉnh thành...'}
                    className="ui-input"
                    type="search"
                    placeholder={lang === 'en' ? 'Search farms by name, code, province...' : 'Tìm kiếm trang trại theo tên, mã hoặc tỉnh thành...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="zone-clean-select-wrap">
                  <select
                    className="ui-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'OWNER' | 'STAFF')}
                    aria-label={lang === 'en' ? 'Filter by role' : 'Lọc theo vai trò'}
                  >
                    <option value="ALL">{lang === 'en' ? 'All Roles' : 'Tất cả vai trò'}</option>
                    <option value="OWNER">{lang === 'en' ? 'Farm Owner' : 'Chủ trang trại'}</option>
                    <option value="STAFF">{lang === 'en' ? 'Staff' : 'Nhân sự vận hành'}</option>
                  </select>
                  <span className="select-arrow">
                    <Icon name="chevron" size={16} />
                  </span>
                </div>

                <button
                  type="button"
                  className="zone-clean-reload-btn"
                  title={lang === 'en' ? 'Reset filters' : 'Làm mới bộ lọc'}
                  aria-label={lang === 'en' ? 'Reset filters' : 'Làm mới bộ lọc'}
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('ALL');
                    retry();
                  }}
                >
                  <Icon name="refresh" size={16} />
                </button>
              </div>

              {filteredFarms.length === 0 ? (
                <EmptyState
                  className="panel"
                  style={{ border: 'none', margin: '20px 0' }}
                  title={<>{lang === 'en' ? 'No matching farms found' : 'Chưa có trang trại phù hợp'}</>}
                  description={<>{lang === 'en' ? 'Try adjusting your search query or add a new farm workspace.' : 'Thử đổi từ khóa tìm kiếm hoặc bấm Thêm trang trại mới.'}</>}
                  icon={<>🔍</>}
                  action={
                    <Button type="button" variant="primary" onClick={() => setIsCreateFarmOpen(true)}>
                      <Icon name="plus" size={16} /> {lang === 'en' ? 'Add Farm' : 'Thêm trang trại'}
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }} tabIndex={0}>
                    <table className="ui-data-table ui-data-table--wide" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-page)' }}>
                          <th scope="col" style={{ width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" aria-label={lang === 'en' ? 'Select all farms' : 'Chọn tất cả trang trại'} style={{ cursor: 'pointer' }} />
                          </th>
                          <th scope="col" style={{ width: '28%', textAlign: 'left' }}>
                            {lang === 'en' ? 'Farm Name' : 'Trang trại'}
                          </th>
                          <th scope="col" style={{ width: '22%', textAlign: 'left' }}>
                            {lang === 'en' ? 'Address' : 'Địa chỉ'}
                          </th>
                          <th scope="col" style={{ width: '14%', textAlign: 'left' }}>
                            {lang === 'en' ? 'Scale / Area' : 'Quy mô / Diện tích'}
                          </th>
                          <th scope="col" style={{ width: '12%', textAlign: 'left' }}>
                            {lang === 'en' ? 'Role' : 'Vai trò'}
                          </th>
                          <th scope="col" style={{ width: '11%', textAlign: 'center' }}>
                            {lang === 'en' ? 'Status' : 'Trạng thái'}
                          </th>
                          <th scope="col" style={{ width: '13%', textAlign: 'right' }}>
                            {lang === 'en' ? 'Actions' : 'Thao tác'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagination.items.map((f) => {
                          const isCurrentActive = f.id === selectedFarm?.id;
                          const role = farmRole(f);
                          const codeDisplay = `FARM-${String(f.id).padStart(3, '0')}`;

                          return (
                            <tr
                              key={f.id}
                              style={{
                                borderBottom: '1px solid var(--color-border)',
                                background: isCurrentActive ? 'rgba(34, 197, 94, 0.04)' : undefined,
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" aria-label={`Select ${f.farmName}`} style={{ cursor: 'pointer' }} />
                              </td>

                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '10px',
                                      background: isCurrentActive
                                        ? 'linear-gradient(135deg, var(--color-primary) 0%, #15803d 100%)'
                                        : 'var(--color-page)',
                                      color: isCurrentActive ? '#ffffff' : 'var(--color-primary-text)',
                                      display: 'grid',
                                      placeItems: 'center',
                                      fontSize: '18px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    🌱
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveFarmId(f.id);
                                        setViewMode('detail');
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        fontWeight: 750,
                                        fontSize: '14.5px',
                                        color: 'var(--color-text)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'block',
                                        transition: 'color 0.15s ease',
                                      }}
                                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                                    >
                                      {f.farmName}
                                    </button>
                                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
                                      {codeDisplay} · ID #{f.id}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>
                                  📍 {[f.district, f.province].filter(Boolean).join(', ') || (lang === 'en' ? 'No address specified' : 'Chưa cập nhật địa chỉ')}
                                </span>
                              </td>

                              <td>
                                <span style={{ fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 600 }}>
                                  {f.totalAreaM2 ? `${displayNumber(f.totalAreaM2, lang)} m²` : (lang === 'en' ? 'Standard VietGAP' : 'Chuẩn VietGAP')}
                                </span>
                              </td>

                              <td>
                                <span className="profile-tag-pill" style={{ fontSize: '12px', padding: '3px 10px' }}>
                                  {role === 'OWNER' ? (lang === 'en' ? 'Farm Owner' : 'Chủ trang trại') : (lang === 'en' ? 'Staff' : 'Nhân sự vận hành')}
                                </span>
                              </td>

                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  {isCurrentActive && (
                                    <span className="profile-tag-pill" style={{ background: 'var(--color-success-bg)', color: 'var(--color-primary-text)', fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                                      🌿 {lang === 'en' ? 'Active' : 'Đang làm việc'}
                                    </span>
                                  )}
                                  <StatusBadge tone="success" label={f.status ? (lang === 'en' && f.status === 'ACTIVE' ? 'Active' : f.status) : (lang === 'en' ? 'Active' : 'Hoạt động')} />
                                </div>
                              </td>

                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => {
                                      setActiveFarmId(f.id);
                                      setViewMode('detail');
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <Icon name="search" size={14} /> {lang === 'en' ? 'View Profile' : 'Xem hồ sơ'}
                                  </Button>

                                  {!isCurrentActive ? (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => {
                                        selectFarm(f.id);
                                        showToast(`Đã chọn "${f.farmName}" làm không gian làm việc hiện tại.`);
                                      }}
                                      style={{ padding: '6px 12px', fontSize: '13px' }}
                                    >
                                      {lang === 'en' ? 'Switch' : 'Chọn làm việc'}
                                    </Button>
                                  ) : (
                                    <Button type="button" variant="secondary" disabled style={{ opacity: 0.7, padding: '6px 12px', fontSize: '13px' }}>
                                      ✓ {lang === 'en' ? 'Selected' : 'Đang chọn'}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination {...pagination} disabled={false} />
                </>
              )}
            </div>
          )}

          {/* =========================================================
              VIEW 2: DETAIL VIEW (HỒ SƠ TRANG TRẠI & BẢN ĐỒ SỐ)
             ========================================================= */}
          {viewMode === 'detail' && (
            <div style={{ padding: '24px' }}>
              {/* Detail Header / Farm Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button type="button" variant="secondary" onClick={() => setViewMode('list')} style={{ padding: '8px 14px' }}>
                    <Icon name="arrow-left" size={16} /> {lang === 'en' ? 'Back to List' : 'Quay lại danh sách'}
                  </Button>
                  {farms.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label htmlFor="farm-detail-switcher" style={{ fontSize: '13.5px', color: 'var(--color-muted)' }}>
                        {lang === 'en' ? 'Switch Farm:' : 'Xem trang trại khác:'}
                      </label>
                      <select
                        id="farm-detail-switcher"
                        className="ui-select"
                        value={activeFarmId ?? ''}
                        onChange={(e) => setActiveFarmId(Number(e.target.value))}
                        style={{ padding: '6px 12px', fontSize: '13.5px' }}
                      >
                        {farms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.farmName} #{f.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeFarmId !== selectedFarm?.id ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (activeFarmId) {
                          selectFarm(activeFarmId);
                          showToast(`Đã chọn trang trại này làm không gian làm việc hiện tại.`);
                        }
                      }}
                    >
                      🌿 {lang === 'en' ? 'Set as Active Workspace' : 'Đặt làm trang trại làm việc'}
                    </Button>
                  ) : (
                    <span className="profile-tag-pill" style={{ background: 'var(--color-success-bg)', color: 'var(--color-primary-text)', fontWeight: 700 }}>
                      🌿 {lang === 'en' ? 'Active Workspace' : 'Đang làm việc tại đây'}
                    </span>
                  )}
                </div>
              </div>

              {loadingDetail ? (
                <EmptyState className="panel" title={<>{lang === 'en' ? 'Loading farm profile...' : 'Đang tải hồ sơ trang trại...'}</>} icon={<>⏳</>} />
              ) : detailError ? (
                <EmptyState className="panel" title={<>{lang === 'en' ? 'Failed to load farm information' : 'Không thể tải thông tin'}</>} description={<>{translate(detailError)}</>} icon={<>⚠️</>} />
              ) : farmDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {/* Main Info Card */}
                    <div className="panel" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-on-primary)',
                              fontSize: '22px',
                            }}
                          >
                            🌱
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>{farmDetail.farmName}</h2>
                            <p style={{ margin: '3px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>
                              {lang === 'en' ? 'Farm ID: #' : 'Mã trang trại: #'}{farmDetail.id}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <StatusBadge tone="success" label={<>{lang === 'en' ? 'VietGAP Standard' : 'Chuẩn VietGAP'}</>} />
                          <span className="profile-role-pill">
                            {lang === 'en' ? (isOwner ? 'Owner' : 'Operations staff') : (isOwner ? 'Chủ sở hữu' : 'Nhân sự vận hành')}
                          </span>
                        </div>
                      </div>

                      <p
                        style={{
                          margin: '18px 0',
                          color: 'var(--color-body)',
                          fontSize: '14px',
                          lineHeight: 1.6,
                          background: 'var(--color-page)',
                          padding: '14px',
                          borderRadius: '10px',
                        }}
                      >
                        {lang === 'en'
                          ? (farmDetail.description || 'The farm follows VietGAP Good Agricultural Practices for safe produce, transparency, and digital traceability.')
                          : (farmDetail.description || 'Trang trại áp dụng quy chuẩn Thực hành nông nghiệp tốt (VietGAP) hướng đến nông sản an toàn, minh bạch và truy xuất nguồn gốc số.')}
                      </p>

                      <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 16px', margin: '16px 0 0', fontSize: '13.5px' }}>
                        <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Address:' : 'Địa chỉ:'}</dt>
                        <dd style={{ margin: 0, color: 'var(--color-text)', fontWeight: 500 }}>
                          {lang === 'en' ? (farmDetail.address || 'Not updated') : (farmDetail.address || 'Chưa cập nhật')}
                        </dd>

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
                          {lang === 'en'
                            ? (activeFarmSummary?.totalAreaM2
                              ? `${displayNumber(activeFarmSummary.totalAreaM2, lang)} m²`
                              : polygonAreaM2 > 0
                                ? `${displayNumber(polygonAreaM2, lang)} m² (~${displayNumber(polygonAreaM2 / 10000, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha based on map boundary)`
                                : 'Compliant scale')
                            : (activeFarmSummary?.totalAreaM2
                              ? `${displayNumber(activeFarmSummary.totalAreaM2, lang)} m²`
                              : polygonAreaM2 > 0
                                ? `${displayNumber(polygonAreaM2, lang)} m² (~${displayNumber(polygonAreaM2 / 10000, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha theo sơ đồ bản đồ)`
                                : 'Quy mô đạt chuẩn')}
                        </dd>

                        <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Status:' : 'Trạng thái:'}</dt>
                        <dd style={{ margin: 0 }}>
                          <StatusBadge tone="success" label={<>{farmDetail.status ? (lang === 'en' && farmDetail.status === 'ACTIVE' ? 'Active' : farmDetail.status) : (lang === 'en' ? 'Active' : 'Đang hoạt động')}</>} />
                        </dd>

                        <dt style={{ color: 'var(--color-muted)', fontWeight: 600 }}>{lang === 'en' ? 'Created At:' : 'Tạo lúc:'}</dt>
                        <dd style={{ margin: 0, color: 'var(--color-muted)' }}>
                          {displayDate(farmDetail.createdAt, lang)}
                        </dd>
                      </dl>

                      {/* Quick Links inside Farm */}
                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <Link to="/production-areas" className="ui-button ui-button--secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                          {lang === 'en' ? '🗺️ Zones & Blocks' : '🗺️ Vùng & Lô đất'}
                        </Link>
                        <Link to="/crop-seasons" className="ui-button ui-button--secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                          {lang === 'en' ? '🌾 Crop Seasons' : '🌾 Mùa vụ'}
                        </Link>
                        <Link to="/activities" className="ui-button ui-button--secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                          {lang === 'en' ? '📖 Farming Activities' : '📖 Nhật ký canh tác'}
                        </Link>
                        <Link to="/harvests" className="ui-button ui-button--secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                          {lang === 'en' ? '📦 Harvest & Batches' : '📦 Thu hoạch & Truy xuất'}
                        </Link>
                      </div>
                    </div>

                    {/* Members Panel */}
                    <div className="panel" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text)' }}>{lang === 'en' ? 'Members & Personnel' : 'Thành viên & Nhân sự'}</h2>
                          <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: '12.5px' }}>
                            {members.length} {lang === 'en' ? 'active members participating' : 'thành viên tham gia canh tác'}
                          </p>
                        </div>
                        {isOwner && (
                          <Button type="button" variant="secondary" onClick={() => setIsAddMemberOpen(true)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                            <Icon name="plus" size={15} /> {lang === 'en' ? 'Add Member' : 'Thêm thành viên'}
                          </Button>
                        )}
                      </div>

                      {members.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-muted)' }}>
                          <Icon name="user" size={24} />
                          <p style={{ marginTop: '8px', fontSize: '13.5px' }}>{lang === 'en' ? 'No other members in this farm yet.' : 'Chưa có thành viên nào khác trong trang trại.'}</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {members.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: 'var(--color-page)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="profile-hero-avatar" style={{ width: '34px', height: '34px', fontSize: '14px' }}>
                                  <Icon name="user" size={16} />
                                </span>
                                <div>
                                  <strong style={{ display: 'block', fontSize: '13.5px', color: 'var(--color-text)' }}>{m.fullName || m.email}</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>{m.email}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="profile-tag-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                  {lang === 'en' ? (m.role === 'OWNER' ? 'Farm owner' : 'Staff') : (m.role === 'OWNER' ? 'Chủ trại' : 'Nhân viên')}
                                </span>
                                {isOwner && m.role !== 'OWNER' && (
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title={lang === 'en' ? 'Remove member' : 'Xóa thành viên'}
                                    style={{ color: 'var(--color-danger)' }}
                                    onClick={() => {
                                      if (activeFarmId) setRemoveMemberTarget({ id: m.id, name: m.fullName || m.email, farmId: activeFarmId });
                                    }}
                                  >
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
                  <div className="panel" style={{ padding: '20px' }}>
                    <FarmGoongMap
                      farmName={farmDetail.farmName}
                      address={farmDetail.address || ''}
                      province={activeFarmSummary?.province || undefined}
                      district={activeFarmSummary?.district || undefined}
                      latitude={farmDetail.latitude}
                      longitude={farmDetail.longitude}
                      boundary={detailBoundary}
                      editable={false}
                      height={380}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* =========================================================
              VIEW 3: VIETGAP REGISTRATION VIEW
             ========================================================= */}
          {viewMode === 'register' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: 'var(--color-text)' }}>
                    {lang === 'en' ? 'VietGAP Farm Registration & Approval' : 'Hồ sơ đăng ký & Thẩm định trang trại VietGAP'}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '13px' }}>
                    {lang === 'en'
                      ? 'Submit formal application for VietGAP standard certification and track administrator review status.'
                      : 'Gửi yêu cầu đăng ký trang trại chuẩn TCVN 11892-1:2017 để quản trị viên thẩm định và kích hoạt.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button
                    variant="secondary"
                    disabled={loadingReg || submittingReg || cancellingReg}
                    onClick={() => {
                      void loadRegistration();
                      retry();
                    }}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    <Icon name="refresh" size={15} /> {lang === 'en' ? 'Refresh Status' : 'Cập nhật trạng thái'}
                  </Button>
                </div>
              </div>

              {loadingReg ? (
                <EmptyState className="panel" title={<>{lang === 'en' ? 'Loading registration details...' : 'Đang tải thông tin đăng ký...'}</>} icon={<>⏳</>} />
              ) : regError ? (
                <div className="panel" style={{ padding: '20px' }}>
                  <p role="alert" style={{ color: 'var(--color-danger)' }}>{translate(regError)}</p>
                  <Button variant="primary" onClick={() => void loadRegistration()}>
                    {lang === 'en' ? 'Retry' : 'Thử lại'}
                  </Button>
                </div>
              ) : registration && !showRegForm ? (
                <FarmRegistrationStatus
                  registration={registration}
                  cancelling={cancellingReg}
                  cancelError={cancelRegError}
                  onCancel={handleRegistrationCancel}
                  onStartNew={() => setShowRegForm(true)}
                />
              ) : (
                <FarmRegistrationForm
                  submitting={submittingReg}
                  submitError={submitRegError}
                  onSubmit={handleRegistrationSubmit}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Farm Modal */}
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={lang === 'en' ? 'Edit Farm Information & Map' : 'Chỉnh sửa thông tin & Bản đồ trang trại'}
        style={{ width: 'min(720px, 100%)' }}
      >
        <form onSubmit={handleUpdateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card">
            <label htmlFor="farm-field-1">{lang === 'en' ? 'Farm Name' : 'Tên trang trại'}</label>
            <input
              id="farm-field-1"
              className="ui-input"
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-2">{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
            <input
              id="farm-field-2"
              className="ui-input"
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--color-body)' }}>
              {lang === 'en' ? 'Location Map & Boundary Layout' : 'Bản đồ tọa độ & Vẽ ranh giới trang trại'}
            </label>
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
          <div className="structured-field-card">
            <label htmlFor="farm-field-3">{lang === 'en' ? 'Scale Description / Overview' : 'Mô tả quy mô / Giới thiệu'}</label>
            <textarea
              id="farm-field-3"
              className="ui-textarea"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button type="submit" variant="primary" loading={updating}>
              {updating ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title={lang === 'en' ? 'Add Member' : 'Thêm thành viên mới'}
        style={{ width: 'min(460px, 100%)' }}
      >
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card">
            <label htmlFor="farm-field-4">{lang === 'en' ? 'Account Email' : 'Email tài khoản'}</label>
            <input
              id="farm-field-4"
              className="ui-input"
              type="email"
              required
              placeholder="nhanvien@example.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-5">{lang === 'en' ? 'Farm Role' : 'Vai trò trong trang trại'}</label>
            <select
              id="farm-field-5"
              className="ui-select"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as 'STAFF' | 'OWNER')}
              style={{ width: '100%', padding: '10px 14px' }}
            >
              <option value="STAFF">{lang === 'en' ? 'Operations Staff' : 'Nhân viên canh tác (Staff)'}</option>
              <option value="OWNER">{lang === 'en' ? 'Co-Owner' : 'Đồng sở hữu (Owner)'}</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddMemberOpen(false)}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button type="submit" variant="primary" disabled={addingMember}>
              {addingMember ? (lang === 'en' ? 'Adding...' : 'Đang thêm...') : (lang === 'en' ? 'Confirm Add' : 'Xác nhận thêm')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Farm Modal */}
      <Modal
        open={isCreateFarmOpen}
        onClose={() => setIsCreateFarmOpen(false)}
        title={lang === 'en' ? 'Create New Farm Workspace' : 'Tạo không gian trang trại mới'}
        style={{ width: 'min(720px, 100%)' }}
      >
        <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card">
            <label htmlFor="farm-field-6">{lang === 'en' ? 'Farm Name *' : 'Tên trang trại *'}</label>
            <input
              id="farm-field-6"
              className="ui-input"
              type="text"
              required
              placeholder={lang === 'en' ? 'Example: An Nhien Organic Farm' : 'Ví dụ: Nông trại Hữu cơ An Nhiên'}
              value={createFarmName}
              onChange={(e) => setCreateFarmName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div className="structured-field-card">
            <label htmlFor="farm-field-7">{lang === 'en' ? 'Address' : 'Địa chỉ'}</label>
            <input
              id="farm-field-7"
              className="ui-input"
              type="text"
              placeholder={lang === 'en' ? 'Commune / District / Province...' : 'Xã/Huyện/Tỉnh...'}
              value={createFarmAddress}
              onChange={(e) => setCreateFarmAddress(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--color-body)' }}>
              {lang === 'en' ? 'Location & Farm Boundary Plan' : 'Vẽ vị trí & Sơ đồ ranh giới trang trại'}
            </label>
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
            <textarea
              id="farm-field-8"
              className="ui-textarea"
              rows={3}
              placeholder={lang === 'en' ? 'Describe crop types and planned area...' : 'Mô tả các loại cây trồng và diện tích dự kiến...'}
              value={createFarmDesc}
              onChange={(e) => setCreateFarmDesc(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsCreateFarmOpen(false)}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button type="submit" variant="primary" loading={creatingFarm}>
              {creatingFarm ? (lang === 'en' ? 'Creating...' : 'Đang tạo...') : (lang === 'en' ? 'Create Farm' : 'Tạo trang trại')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm remove member modal */}
      <ConfirmDialog
        open={Boolean(removeMemberTarget)}
        title={lang === 'en' ? 'Remove member' : 'Xóa thành viên'}
        description={
          lang === 'en'
            ? `Are you sure you want to remove member "${removeMemberTarget?.name}" from the farm?`
            : `Bạn có chắc muốn xóa thành viên "${removeMemberTarget?.name}" khỏi trang trại?`
        }
        confirmLabel={lang === 'en' ? 'Remove member' : 'Xóa thành viên'}
        tone="danger"
        loading={removingMember}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={() => {
          if (removeMemberTarget) void handleRemoveMember(removeMemberTarget.id, removeMemberTarget.name);
        }}
      />
    </section>
  );
}
