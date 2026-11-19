import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { ZoneModal } from '../../features/production/components/ZoneModal';
import { BlockModal } from '../../features/production/components/BlockModal';
import { BlockDetailModal } from '../../features/production/components/BlockDetailModal';
import { AssignStaffModal } from '../../features/production/components/AssignStaffModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';

import { formatDate as displayDate, formatDateTime as displayDateTime, formatNumber as displayNumber } from '../../shared/format/formatters';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';

import {
  fetchZoneById,
  fetchBlocks,
  fetchZoneAssignments,
  unassignStaffFromZone,
  deleteZone,
  deleteBlock,
  fetchZoneRiskRecords,
  saveRiskRecord,
  fetchZoneRiskHistoryApi,
  fetchZoneRiskDetailsApi,
  recordZoneRiskApi,
  updateRiskControlMeasuresApi,
  deleteZoneRiskApi,
} from '../../features/production/zoneBlockService';
import type {
  Zone,
  Block,
  StaffZoneAssignment,
  BlockConditionObservation,
  RiskAssessmentRecord,
} from '../../features/production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

export function ZoneDetailPage() {
  const { lang, t: translate } = useLanguage();
  const navigate = useNavigate();
  const { zoneId: paramZoneId, productionAreaId, plotId } = useParams<{
    zoneId?: string;
    productionAreaId?: string;
    plotId?: string;
  }>();
  const rawId = paramZoneId || productionAreaId || plotId || '1';
  const zoneId = parseInt(rawId.replace(/^(pa|zn)-/, ''), 10) || 1;

  const { selectedFarm } = useFarmWorkspace();
  const detailLoader = useDetailRequest(selectedFarm?.id);
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  // 3 Tabs: Overview | Blocks | Risk Records
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'risks'>('overview');
  useEffect(() => { setActiveTab('overview'); }, [zoneId, farmId]);

  // Data states
  const [zone, setZone] = useState<Zone | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>([]);
  const [riskRecords, setRiskRecords] = useState<RiskAssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

  // Blocks tab filters (Fixed to current Zone: only Search Blocks & Reset Filters)
  const [blockSearch, setBlockSearch] = useState('');

  // Modals
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [isDeleteZoneOpen, setIsDeleteZoneOpen] = useState(false);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [blockToView, setBlockToView] = useState<number | null>(null);

  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<StaffZoneAssignment | null>(null);

  // Record Block Conditions modal
  const [conditionBlock, setConditionBlock] = useState<Block | null>(null);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);

  // Zone Risk Record modal
  const [riskModalMode, setRiskModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessmentRecord | null>(null);
  const [riskToDelete, setRiskToDelete] = useState<RiskAssessmentRecord | null>(null);
  const [riskForm, setRiskForm] = useState({
    assessedAt: new Date().toISOString().split('T')[0],
    riskType: 'Trôi dạt hóa chất lân cận',
    riskLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    priorFindings: '',
    description: '',
    controlMeasures: '',
    assessedByName: 'Ban Quản lý VietGAP',
    status: 'CONTROLLED' as 'MONITORING' | 'CONTROLLED' | 'ACTION_REQUIRED',
  });

  useEffect(() => {
    setBlockToView(null);
    void loadZoneData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, farmId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadZoneData(true);
  });

  const showToast = (text: TranslationMessage, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadZoneData(silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [zData, bData, aData] = await Promise.all([
        fetchZoneById(zoneId),
        fetchBlocks(farmId, zoneId),
        fetchZoneAssignments(farmId, zoneId).catch(() => []),
      ]);
      setZone(zData);
      setBlocks(bData);
      setAssignments(aData);
      try {
        const beRisks = await fetchZoneRiskHistoryApi(zoneId);
        if (beRisks && beRisks.length > 0) {
          setRiskRecords(beRisks.map((r) => ({
            riskId: r.riskId,
            targetType: 'ZONE',
            zoneId: r.zoneId,
            zoneName: r.zoneName || zData.zoneName,
            assessedAt: r.assessedAt ? r.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            riskType: r.riskType,
            riskLevel: (r.riskLevel ? r.riskLevel.toUpperCase() : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
            priorFindings: '',
            description: r.description || '',
            controlMeasures: r.mitigationPlan || '',
            assessedByName: r.assessedByName || 'Cán bộ kỹ thuật',
            status: 'CONTROLLED',
          })));
        } else {
          setRiskRecords(fetchZoneRiskRecords(zoneId));
        }
      } catch {
        setRiskRecords(fetchZoneRiskRecords(zoneId));
      }
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load zone details." : err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết khu vực.'));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const activeAssignments = useMemo(() => assignments.filter((a) => a.active), [assignments]);

  const filteredBlocks = useMemo(() => {
    const kw = blockSearch.trim().toLowerCase();
    if (!kw) return blocks;
    return blocks.filter((b) => {
      const code = `BLK-${String(b.blockId).padStart(3, '0')}`.toLowerCase();
      return (
        b.blockName.toLowerCase().includes(kw) ||
        code.includes(kw) ||
        Boolean(b.description && b.description.toLowerCase().includes(kw)) ||
        Boolean(b.soilType && b.soilType.toLowerCase().includes(kw))
      );
    });
  }, [blocks, blockSearch]);

  const handleConfirmDeleteZone = async () => {
    if (!zone) return;

    if (blocks.length > 0) {
      showToast(lang === 'en'
        ? `Cannot delete this zone because it still has ${blocks.length} blocks. Delete the blocks first.`
        : `Không thể xóa khu vực vì còn ${blocks.length} lô trồng. Vui lòng xóa các lô trồng trước.`, 'error');
      setIsDeleteZoneOpen(false);
      return;
    }
    try {
      await deleteZone(zone.zoneId);
      navigate('/zones');
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Cannot delete Zone with linked data." : err instanceof Error ? err.message : 'Không thể xóa khu vực khi còn dữ liệu liên kết.'), 'error');
      setIsDeleteZoneOpen(false);
    }
  };

  const handleConfirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    try {
      await deleteBlock(blockToDelete.blockId);
      setBlocks((prev) => prev.filter((b) => b.blockId !== blockToDelete.blockId));
      showToast((message("Deleted Block \"{value1}\" successfully!", { value1: blockToDelete.blockName })));
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete Block." : err instanceof Error ? err.message : 'Không thể xóa lô trồng.'), 'error');
    } finally {
      setBlockToDelete(null);
    }
  };

  const handleConfirmUnassign = async () => {
    if (!assignmentToCancel) return;
    try {
      await unassignStaffFromZone(farmId, assignmentToCancel.assignmentId);
      setAssignments((prev) =>
        prev.map((a) =>
          a.assignmentId === assignmentToCancel.assignmentId
            ? { ...a, active: false, endedAt: new Date().toISOString() }
            : a
        )
      );
      showToast((message("Revoked assignment for \"{value1}\"!", { value1: assignmentToCancel.staffName || 'Staff' })));
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to revoke assignment." : err instanceof Error ? err.message : 'Không thể thu hồi phân công.'), 'error');
    } finally {
      setAssignmentToCancel(null);
    }
  };

  const openAddRiskModal = () => {
    setSelectedRisk(null);
    setRiskForm({
      assessedAt: new Date().toISOString().split('T')[0],
      riskType: 'Trôi dạt hóa chất lân cận',
      riskLevel: 'MEDIUM',
      priorFindings: '',
      description: '',
      controlMeasures: '',
      assessedByName: isOwner ? 'Chủ trang trại' : 'Nhân viên phụ trách',
      status: 'CONTROLLED',
    });
    setRiskModalMode('create');
  };

  const openEditRiskModal = async (record: RiskAssessmentRecord, mode: 'edit' | 'view') => {
    setSelectedRisk(record);
    if (mode === 'view') {
      await detailLoader.load(() => fetchZoneRiskDetailsApi(record.riskId), (details) => {
        setRiskForm({
          assessedAt: details.assessedAt ? details.assessedAt.split('T')[0] : record.assessedAt,
          riskType: details.riskType || record.riskType,
          riskLevel: (details.riskLevel ? details.riskLevel.toUpperCase() : record.riskLevel) as 'LOW' | 'MEDIUM' | 'HIGH',
          priorFindings: record.priorFindings || '',
          description: details.description || record.description,
          controlMeasures: details.mitigationPlan || record.controlMeasures,
          assessedByName: details.assessedByName || record.assessedByName,
          status: record.status,
        });
        setRiskModalMode('view');
      });
      return;
    }
    setRiskForm({
      assessedAt: record.assessedAt,
      riskType: record.riskType,
      riskLevel: record.riskLevel,
      priorFindings: record.priorFindings || '',
      description: record.description,
      controlMeasures: record.controlMeasures,
      assessedByName: record.assessedByName,
      status: record.status,
    });
    setRiskModalMode(mode);
  };

  const handleSaveRiskRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone) return;
    try {
      if (selectedRisk && riskModalMode === 'edit') {
        await updateRiskControlMeasuresApi(selectedRisk.riskId, {
          mitigationPlan: riskForm.controlMeasures,
          riskLevel: riskForm.riskLevel.toLowerCase(),
          description: riskForm.description,
          riskType: riskForm.riskType,
        });
        showToast((message("Updated control measures for \"{value1}\"!", { value1: riskForm.riskType })));
      } else {
        await recordZoneRiskApi(zone.zoneId, {
          riskType: riskForm.riskType,
          riskLevel: riskForm.riskLevel.toLowerCase(),
          description: riskForm.description,
          mitigationPlan: riskForm.controlMeasures,
          assessedAt: riskForm.assessedAt ? new Date(riskForm.assessedAt).toISOString() : new Date().toISOString(),
        });
        showToast((message("Recorded production area risk \"{value1}\" successfully!", { value1: riskForm.riskType })));
      }
      const beRisks = await fetchZoneRiskHistoryApi(zone.zoneId);
      if (beRisks && beRisks.length > 0) {
        setRiskRecords(beRisks.map((r) => ({
          riskId: r.riskId,
          targetType: 'ZONE',
          zoneId: r.zoneId,
          zoneName: r.zoneName || zone.zoneName,
          assessedAt: r.assessedAt ? r.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          riskType: r.riskType,
          riskLevel: (r.riskLevel ? r.riskLevel.toUpperCase() : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
          priorFindings: '',
          description: r.description || '',
          controlMeasures: r.mitigationPlan || '',
          assessedByName: r.assessedByName || 'Cán bộ kỹ thuật',
          status: 'CONTROLLED',
        })));
      }
    } catch {
      const saved = saveRiskRecord({
        riskId: selectedRisk?.riskId,
        targetType: 'ZONE',
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        assessedAt: riskForm.assessedAt,
        riskType: riskForm.riskType,
        riskLevel: riskForm.riskLevel,
        priorFindings: riskForm.priorFindings,
        description: riskForm.description,
        controlMeasures: riskForm.controlMeasures,
        assessedByName: riskForm.assessedByName,
        status: riskForm.status,
      });
      setRiskRecords(fetchZoneRiskRecords(zone.zoneId));
      showToast(
        (lang === 'en' ? selectedRisk ? `Updated control measures for "${saved.riskType}"!` : `Added risk record for Zone "${saved.riskType}"!` : selectedRisk
          ? `Đã cập nhật biện pháp kiểm soát cho "${saved.riskType}"!`
          : `Đã thêm hồ sơ rủi ro Zone "${saved.riskType}"!`)
      );
    }
    setRiskModalMode(null);
  };

  const handleConfirmDeleteRisk = async () => {
    if (!riskToDelete || !zone) return;
    try {
      await deleteZoneRiskApi(riskToDelete.riskId);
      showToast((message("Deleted risk \"{value1}\" successfully!", { value1: riskToDelete.riskType })));
      const beRisks = await fetchZoneRiskHistoryApi(zone.zoneId);
      setRiskRecords(beRisks.map((r) => ({
        riskId: r.riskId,
        targetType: 'ZONE',
        zoneId: r.zoneId,
        zoneName: r.zoneName || zone.zoneName,
        assessedAt: r.assessedAt ? r.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        riskType: r.riskType,
        riskLevel: (r.riskLevel ? r.riskLevel.toUpperCase() : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
        priorFindings: '',
        description: r.description || '',
        controlMeasures: r.mitigationPlan || '',
        assessedByName: r.assessedByName || 'Cán bộ kỹ thuật',
        status: 'CONTROLLED',
      })));
    } catch {
      setRiskRecords((prev) => prev.filter((r) => r.riskId !== riskToDelete.riskId));
      showToast(("Risk record deleted!"));
    } finally {
      setRiskToDelete(null);
    }
  };

  if (loading) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading details for Zone #" : "Đang tải thông tin chi tiết khu vực #")}{zoneId}...</>} icon={<>⏳</>} />
      </section>
    );
  }

  if (error || !zone) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <EmptyState role="alert" className="panel" title={<>{(lang === 'en' ? "Zone not found" : "Không tìm thấy thông tin khu vực")}</>} description={<>{(lang === 'en' ? error || `Zone does not exist or has been deleted.` : error || `Zone không tồn tại hoặc đã bị xóa.`)}</>} icon={<>⚠️</>} action={<><Link to="/zones" className="ui-button ui-button--primary ui-back-action">{translate("Back to Zones")}</Link></>} />
      </section>
    );
  }


  return (
    <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
      {detailLoader.feedback}
      {/* Breadcrumb Bar */}
      <div className="production-breadcrumb">
        <Link to="/zones">{lang === 'en' ? 'Production Zones' : 'Khu vực sản xuất'}</Link>
        <span>→</span>
        <strong>{zone.zoneName}</strong>
      </div>

      {/* Page Heading matching FarmRegistrationPage */}
      <PageHeading title={zone.zoneName} />

      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div
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

      {/* Summary Panel matching FarmRegistrationStatus */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '18px' }}>
          <div>
            <span className="eyebrow">{(lang === 'en' ? "Management zone record" : "Hồ sơ khu vực quản lý")}</span>
          </div>
          <span className="profile-role-pill">
            {blocks.length}{' '}{translate("blocks ·")}{' '}{displayNumber(zone.areaValue, lang)} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
          </span>
        </div>

        <dl className="detail-list" style={{ marginBottom: 0 }}>
          <div>
            <dt>{(lang === 'en' ? "Zone Name" : "Tên khu vực")}</dt>
            <dd>
              {zone.zoneName}
            </dd>
          </div>
          <div>
            <dt>{translate("Assigned Farm")}</dt>
            <dd>{farmName}</dd>
          </div>
          <div>
            <dt>{translate("Area")}</dt>
            <dd>
              {displayNumber(zone.areaValue, lang)} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
            </dd>
          </div>
          <div>
            <dt>{translate("Total Blocks")}</dt>
            <dd>{blocks.length} {(lang === 'en' ? " production blocks" : " lô trồng")}</dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Assigned staff" : "Nhân sự phụ trách")}</dt>
            <dd>
              {activeAssignments.length > 0
                ? activeAssignments.map((a) => a.staffName || (lang === 'en' ? `Staff` : `Nhân viên`)).join(', ')
                : (lang === 'en' ? "Unassigned" : 'Chưa phân công')}
            </dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Created date" : "Ngày khởi tạo")}</dt>
            <dd>{(lang === 'en' ? zone.createdAt ? displayDateTime(zone.createdAt, lang) : "Active" : zone.createdAt ? displayDateTime(zone.createdAt, lang) : 'Đang hoạt động')}</dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-actions" style={{ justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Link to="/zones" className="ui-button ui-button--secondary ui-back-action">
            {lang === 'en' ? 'Back to Zones' : 'Quay lại danh sách'}
          </Link>
          {isOwner && (
            <>
              <Button className={'ui-edit-action'} type="button" variant="secondary" onClick={() => setIsEditZoneOpen(true)}>{translate("Edit Zone")}</Button>
              <Button className="ui-assign-action" type="button" variant="secondary" onClick={() => setIsAssignStaffOpen(true)}><Icon name="users" size={16} />{translate("Assign Staff")}</Button>
              <Button
                type="button"
                variant="danger"
              onClick={() => setIsDeleteZoneOpen(true)}
              >{translate("Delete Zone")}</Button>
            </>
          )}
        </div>

      {/* Tabs Navigation: Overview | Blocks | Risk Records */}
      <TabList idPrefix="zone-detail" label={lang === 'en' ? 'Zone details' : 'Chi tiết khu vực'}
            value={activeTab} onChange={setActiveTab} items={[
              { value: 'overview', label: <><Icon name="home" size={16} /> {(lang === 'en' ? " Overview" : " Tổng quan")}</> },
              { value: 'blocks', label: <><Icon name="leaf" size={16} /> {(lang === 'en' ? " Production blocks" : " Lô trồng")}</> },
              { value: 'risks', label: <><Icon name="warning" size={16} /> {(lang === 'en' ? " Risk assessments" : " Đánh giá rủi ro")}</> },
            ]} />

      {/* =========================================================
          TAB 1: OVERVIEW
         ========================================================= */}
      {activeTab === 'overview' && (
        <div {...tabPanelProps('zone-detail', 'overview')} className="zone-overview-content">
          {/* Zone Information Panel */}
          <div className="panel zone-overview-panel">
            <h2>{translate('Zone Information')}</h2>

            <dl className="detail-list zone-overview-facts">
              
              <div>
                <dt>{translate("Zone Code")}</dt>
                <dd>{zone.areaCode || `ZN-${String(zone.zoneId).padStart(3, '0')}`}</dd>
              </div>
              <div>
                <dt>{translate("Area")}</dt>
                <dd>
                  {displayNumber(zone.areaValue, lang)} {zone.areaUnit === 'm2' ? 'm²' : zone.areaUnit}
                </dd>
              </div>
              <div>
                <dt>{translate("Total Blocks")}</dt>
                <dd>{blocks.length} {(lang === 'en' ? " blocks" : " lô")}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>{translate("Zone Description")}</dt>
                <dd>{zone.description || translate("No description provided for this zone.")}</dd>
              </div>
            </dl>
          </div>

          {/* Assigned Staff Panel */}
          <div className="panel zone-overview-panel">
            <h2>{lang === 'en' ? 'Assigned Staff' : 'Nhân sự được phân công'}</h2>

            {activeAssignments.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', margin: 0 }}>{translate('No staff members currently assigned to this zone.')}</p>
            ) : (
              <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
                <table className="ui-data-table zone-assigned-staff-table">
                  <thead><tr>
                    <th scope="col">{lang === 'en' ? 'Staff member' : 'Nhân sự'}</th>
                    <th scope="col">{lang === 'en' ? 'Role' : 'Vai trò'}</th>
                    <th scope="col">{lang === 'en' ? 'Assigned date' : 'Ngày phân công'}</th>
                    {isOwner && <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>}
                  </tr></thead>
                  <tbody>{activeAssignments.map(asgn => {
                    const name = asgn.staffName?.replace(/\s*\([^)]*\)\s*$/, '').trim() || (lang === 'en' ? 'Staff' : 'Nhân viên');
                    const words = name.split(/\s+/);
                    const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
                    const roles: Record<string, string> = {
                      owner: lang === 'en' ? 'Farm owner' : 'Chủ trang trại',
                      manager: lang === 'en' ? 'Manager' : 'Quản lý',
                      member: lang === 'en' ? 'Member' : 'Thành viên',
                    };
                    const role = asgn.jobTitle?.trim() || '';
                    return <tr key={asgn.assignmentId}>
                      <td><div className="zone-assigned-person"><span className="staff-initials-avatar" aria-hidden="true">{initials}</span><strong>{name}</strong></div></td>
                      <td><span className="knowledge-tag" style={role.toLowerCase() === 'owner' ? undefined : { background: 'var(--color-page)', color: 'var(--color-body)' }}>{roles[role.toLowerCase()] || role || '—'}</span></td>
                      <td>{displayDate(asgn.assignedAt?.slice(0, 10), lang)}</td>
                      {isOwner && <td style={{ textAlign: 'right' }}><div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="table-icon-btn danger" onClick={() => setAssignmentToCancel(asgn)}
                          title={lang === 'en' ? 'Cancel assignment' : 'Hủy phân công'}
                          aria-label={lang === 'en' ? `Cancel assignment for ${name}` : `Hủy phân công cho ${name}`}><Icon name="close" size={16} /></button>
                      </div></td>}
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: BLOCKS (Cố định Zone hiện tại)
         ========================================================= */}
      {activeTab === 'blocks' && (
        <div {...tabPanelProps('zone-detail', 'blocks')}>
          <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Production blocks in " : "Danh sách lô trồng thuộc ")} {zone.zoneName}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{lang === 'en' ? 'Blocks' : 'Lô trồng'}</h2>
                </div>
                {isOwner && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setBlockToEdit(null);
                      setIsBlockModalOpen(true);
                    }}
                  >
                    <Icon name="plus" /> {lang === 'en' ? 'Add Block' : 'Thêm lô trồng'}
                  </Button>
                )}
              </div>

              <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none' }}>
                <div className="zone-clean-search">
                  <span className="search-icon" aria-hidden="true"><Icon name="search" size={17} /></span>
                  <input className="ui-input" id="zone-blocks-search" type="search"
                    aria-label={lang === 'en' ? 'Search by block name or code' : 'Tìm theo tên hoặc mã lô trồng'}
                    placeholder={lang === 'en' ? 'Search by block name or code...' : 'Tìm theo tên hoặc mã lô trồng...'}
                    value={blockSearch} onChange={event => setBlockSearch(event.target.value)} />
                </div>
                <button type="button" className="zone-clean-reload-btn"
                  title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                  aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                  onClick={() => setBlockSearch('')}><Icon name="refresh" size={16} /></button>
              </div>
            {filteredBlocks.length === 0 ? (

            <EmptyState  className="panel" title={<>{translate("No blocks created yet")}</>} description={<>
                {isOwner
                  ? (lang === 'en' ? `Click "Add Block" to add a production block to ${zone.zoneName}.` : `Nhấn "Thêm lô trồng" để thêm lô trồng vào ${zone.zoneName}.`)
                  : (lang === 'en' ? "No blocks match the search keyword." : 'Không tìm thấy blocks nào khớp với từ khóa tìm kiếm.')}
              </>} icon={<>🌿</>} action={<><span className="sr-only">{(lang === 'en' ? "This Zone has no Blocks" : "Khu vực chưa có lô trồng nào")}</span>{isOwner && (
                <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setBlockToEdit(null);
                      setIsBlockModalOpen(true);
                    }}
                  >
                  <Icon name="plus" /> {lang === 'en' ? 'Add Block' : 'Thêm lô trồng'}
                </Button>
              )}</>} />
                      ) : (
              <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
                <table className="ui-data-table zone-blocks-table">
                  <colgroup>
                    <col className="zone-blocks-name-column" />
                    <col className="zone-blocks-zone-column" />
                    <col />
                    <col className="zone-blocks-area-column" />
                    <col className="zone-blocks-actions-column" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">{lang === 'en' ? 'Block Name' : 'Tên lô đất'}</th>
                      <th scope="col">{lang === 'en' ? 'Zone' : 'Khu vực'}</th>
                      <th scope="col">{lang === 'en' ? 'Soil Type' : 'Loại đất'}</th>
                      <th scope="col" style={{ textAlign: 'center' }}>{lang === 'en' ? 'Area' : 'Diện tích'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlocks.map((b) => (
                      <tr key={b.blockId}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Quick-preview trigger keeping aria-label="Xem chi tiết ${b.blockName}" for tests/block-detail.test.mjs */}
                            <button
                              type="button"
                              aria-label={(lang === 'en' ? `View details ${b.blockName}` : `Xem chi tiết ${b.blockName}`)}
                              onClick={() => setBlockToView(b.blockId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                fontWeight: 750,
                                fontSize: '15.5px',
                                color: 'var(--color-text)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              {b.blockName}
                            </button>
                          </div>
                        </td>

                        <td>
                          <span className="knowledge-tag">{zone.zoneName}</span>
                        </td>

                        <td className="zone-blocks-description">
                          {b.soilType || '—'}
                        </td>

                        <td className="zone-blocks-area" style={{ textAlign: 'center' }}>
                          <strong style={{ color: 'var(--color-text)', fontSize: '14.5px' }}>
                            {displayNumber(b.areaValue, lang)} {b.areaUnit === 'm2' ? 'm²' : b.areaUnit}
                          </strong>
                        </td>

                        <td className="zone-blocks-actions" style={{ textAlign: 'right' }}>
                          <div className="table-action-btns">
                            <Link
                              to={`/zones/${zone.zoneId}/blocks/${b.blockId}`}
                              className="table-icon-btn primary"
                              title={(lang === 'en' ? "View block details" : "Xem chi tiết blocks")}
                              aria-label={(lang === 'en' ? `View details ${b.blockName}` : `Xem chi tiết ${b.blockName}`)}
                            >
                              <Icon name="eye" size={16} />
                            </Link>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={translate("Edit Block")}
                              aria-label={(lang === 'en' ? `Edit ${b.blockName}` : `Chỉnh sửa ${b.blockName}`)}
                              onClick={() => {
                                setBlockToEdit(b);
                                setIsBlockModalOpen(true);
                              }}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn condition"
                              title={(lang === 'en' ? "Record soil / water conditions" : "Ghi nhận điều kiện đất / nước")}
                              aria-label={(lang === 'en' ? `Record conditions for ${b.blockName}` : `Ghi nhận điều kiện cho ${b.blockName}`)}
                              onClick={() => {
                                setConditionBlock({ ...b, zoneName: zone.zoneName });
                                setIsRecordConditionOpen(true);
                              }}
                            >
                              <Icon name="activity" size={16} />
                            </button>
                            {isOwner && (
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={translate("Delete Block")}
                                aria-label={(lang === 'en' ? `Delete ${b.blockName}` : `Xóa ${b.blockName}`)}
                                onClick={() => setBlockToDelete(b)}
                              >
                                <Icon name="trash" size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: RISK RECORDS
         ========================================================= */}
      {activeTab === 'risks' && (
        <div {...tabPanelProps('zone-detail', 'risks')} className="panel" style={{ padding: '24px' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <div>
              <span className="eyebrow">{(lang === 'en' ? "Production area risk assessment" : "Đánh giá rủi ro vùng sản xuất")}</span>
              <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Zone risk records" : "Hồ sơ rủi ro khu vực")}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--color-muted)' }}>
                {(lang === 'en' ? "Production area risks and control measures are linked directly to " : "Rủi ro vùng sản xuất và biện pháp kiểm soát gắn trực tiếp với ")} {zone.zoneName}
              </p>
            </div>
            <Button type="button" variant="primary" onClick={openAddRiskModal}>
              <Icon name="plus" /> {lang === 'en' ? 'Add Risk Record' : 'Thêm ghi nhận rủi ro'}
            </Button>
          </div>

          <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
            <table className="ui-data-table">
              <thead>
                <tr>
                  <th scope="col">{lang === 'en' ? 'Assessment Date' : 'Ngày đánh giá'}</th>
                  <th scope="col">{lang === 'en' ? 'Risk Type' : 'Loại rủi ro'}</th>
                  <th scope="col" style={{ textAlign: 'center' }}>{lang === 'en' ? 'Risk Level' : 'Mức độ rủi ro'}</th>
                  <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody>
                {riskRecords.map((r) => (
                  <tr key={r.riskId}>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.assessedAt}</td>
                    <td style={{ maxWidth: '280px' }}>
                      <strong style={{ color: 'var(--color-text)', display: 'block' }}>{r.riskType}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="knowledge-tag">{translate(r.riskLevel)}</span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="table-icon-btn primary"
                          title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                          aria-label={(lang === 'en' ? `Details ${r.riskType}` : `Chi tiết ${r.riskType}`)}
                          onClick={() => openEditRiskModal(r, 'view')}
                        >
                          <Icon name="eye" size={16} />
                          <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          title={lang === 'en' ? 'Update risk assessment' : 'Cập nhật đánh giá rủi ro'}
                          aria-label={lang === 'en' ? `Update risk assessment ${r.riskType}` : `Cập nhật đánh giá rủi ro ${r.riskType}`}
                          onClick={() => openEditRiskModal(r, 'edit')}
                        >
                          <Icon name="edit" size={16} />
                          <span className="sr-only">{lang === 'en' ? 'Update risk assessment' : 'Cập nhật đánh giá rủi ro'}</span>
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn danger"
                          title={(lang === 'en' ? "Delete risk" : "Xóa rủi ro")}
                          aria-label={(lang === 'en' ? `Delete ${r.riskType}` : `Xóa ${r.riskType}`)}
                          onClick={() => setRiskToDelete(r)}
                        >
                          <Icon name="trash" size={16} />
                          <span className="sr-only">{(lang === 'en' ? "Delete" : "Xóa")}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS
         ========================================================= */}
      {blockToView !== null && (
        <BlockDetailModal blockId={blockToView} onClose={() => setBlockToView(null)} />
      )}

      {riskModalMode && (
        <Modal structured open customLayout className="risk-assessment-modal" onClose={() => setRiskModalMode(null)} style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h2>
                  {riskModalMode === 'create'
                    ? (lang === 'en' ? 'Add Risk Record' : 'Thêm ghi nhận rủi ro')
                    : riskModalMode === 'edit'
                    ? (lang === 'en' ? 'Update risk assessment' : 'Cập nhật đánh giá rủi ro')
                    : (lang === 'en' ? 'Risk assessment details' : 'Chi tiết đánh giá rủi ro')}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setRiskModalMode(null)}>
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveRiskRecord}>
              <div className="structured-field-card ui-form-context" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
                  <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                    {(lang === 'en' ? "Applicable zone" : "Khu vực áp dụng")}
                  </span>
                  <span className="structured-field-badge">{(lang === 'en' ? "Fixed" : "Cố định")}</span>
                </div>
                <strong style={{ color: 'var(--color-primary-text)' }}>{zone.zoneName} · {farmName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</span>
                    <label htmlFor="zone-detail-page-control-2" className="structured-field-badge">{(lang === 'en' ? "Date" : "Ngày")}</label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="zone-detail-page-control-2" className="ui-input"
                      type="date"
                      value={riskForm.assessedAt}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) => setRiskForm({ ...riskForm, assessedAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">{(lang === 'en' ? "Risk level" : "Mức độ rủi ro")}</span>
                    <label htmlFor="zone-detail-page-control-3" className="structured-field-badge">{(lang === 'en' ? "Level" : "Mức độ")}</label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select id="zone-detail-page-control-3" className="ui-select"
                      value={riskForm.riskLevel}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })
                      }
                    >
                      <option value="LOW">{(lang === 'en' ? "Low" : "Thấp")}</option>
                      <option value="MEDIUM">{(lang === 'en' ? "Medium" : "Trung bình")}</option>
                      <option value="HIGH">{(lang === 'en' ? "High" : "Cao")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="zone-detail-page-control-4" className="structured-field-label">{(lang === 'en' ? "Risk type" : "Loại rủi ro")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input id="zone-detail-page-control-4" className="ui-input"
                    type="text"
                    value={riskForm.riskType}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, riskType: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="zone-detail-page-control-5" className="structured-field-label">{(lang === 'en' ? "Previous findings" : "Phát hiện trước đây")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="zone-detail-page-control-5" className="ui-textarea"
                    rows={2}
                    value={riskForm.priorFindings}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, priorFindings: e.target.value })}
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="zone-detail-page-control-6" className="structured-field-label">{(lang === 'en' ? "Risk description" : "Mô tả nguy cơ rủi ro")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="zone-detail-page-control-6" className="ui-textarea"
                    rows={2}
                    value={riskForm.description}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="zone-detail-page-control-7" className="structured-field-label">{(lang === 'en' ? "Control measures" : "Biện pháp kiểm soát")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="zone-detail-page-control-7" className="ui-textarea"
                    rows={3}
                    value={riskForm.controlMeasures}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, controlMeasures: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <Button className={((riskModalMode === 'view' ? '' : 'ui-cancel-button')) + ' ' + (riskModalMode === 'view' ? 'ui-close-action' : '')} type="button" variant="secondary" onClick={() => setRiskModalMode(null)}>
                  {(lang === 'en' ? riskModalMode === 'view' ? "Close" : "Cancel" : riskModalMode === 'view' ? 'Đóng' : 'Hủy')}
                </Button>
                {riskModalMode !== 'view' && (
                  <Button type="submit" variant="primary">
                    {(lang === 'en' ? riskModalMode === 'create' ? "Save record" : "Save measures" : riskModalMode === 'create' ? 'Lưu ghi nhận' : 'Lưu biện pháp')}
                  </Button>
                )}
              </div>
            </form>
          </Modal>
      )}

      <ZoneModal
        isOpen={isEditZoneOpen}
        mode="edit"
        farmId={farmId}
        farmName={farmName}
        initialZone={zone}
        onClose={() => setIsEditZoneOpen(false)}
        onSuccess={(updated) => {
          setZone(updated);
          showToast((message("Updated zone \"{value1}\" successfully!", { value1: updated.zoneName })));
        }}
      />

      <BlockModal
        isOpen={isBlockModalOpen}
        mode={blockToEdit ? 'edit' : 'create'}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        lockZone={true}
        initialBlock={blockToEdit}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={(saved) => {
          if (blockToEdit) {
            setBlocks((prev) => prev.map((b) => (b.blockId === saved.blockId ? saved : b)));
            showToast((message("Updated block \"{value1}\" successfully!", { value1: saved.blockName })));
          } else {
            setBlocks((prev) => [saved, ...prev]);
            showToast((message("Created block \"{value1}\" in {value2}!", { value1: saved.blockName, value2: zone.zoneName })));
          }
        }}
      />

      <AssignStaffModal
        isOpen={isAssignStaffOpen}
        farmId={farmId}
        zoneId={zone.zoneId}
        zoneName={zone.zoneName}
        onClose={() => setIsAssignStaffOpen(false)}
        onSuccess={(newAssign) => {
          setAssignments((prev) => [newAssign, ...prev]);
          showToast((message("Assigned \"{value1}\" to {value2}!", { value1: newAssign.staffName || message("Staff"), value2: zone.zoneName })));
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={conditionBlock}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs: BlockConditionObservation) => {
          showToast((message("Saved condition record ({value1})!", { value1: obs.conditionType })));
        }}
      />

      <ConfirmDialog
        open={Boolean(riskToDelete)}
        title={(lang === 'en' ? "Confirm risk record deletion" : "Xác nhận xóa hồ sơ rủi ro")}
        description={(lang === 'en' ? <>{"Are you sure you want to delete risk record \""}<strong>{riskToDelete?.riskType}</strong>{"\"? This will delete the data from the system."}</> : <>{"Bạn có chắc chắn muốn xóa hồ sơ rủi ro \""}<strong>{riskToDelete?.riskType}</strong>{"\"? Hành động này sẽ xóa dữ liệu trên hệ thống."}</>)}
        confirmLabel="Xóa rủi ro"
        tone="danger"
        onClose={() => setRiskToDelete(null)}
        onConfirm={handleConfirmDeleteRisk}
      />

      <ConfirmDialog
        open={isDeleteZoneOpen}
        title={translate("Confirm Zone Deletion")}
        confirmLabel="Delete Zone"
        tone="danger"
        onClose={() => setIsDeleteZoneOpen(false)}
        onConfirm={handleConfirmDeleteZone}
      >
        <p>
          {lang === 'en' ? 'Are you sure you want to delete zone ' : 'Bạn có chắc chắn muốn xóa khu vực '}
          &quot;<strong>{zone.zoneName}</strong>&quot;?
          <br />
          {lang === 'en'
            ? 'Deletion is allowed only for zones without linked blocks.'
            : 'Hệ thống chỉ cho phép xóa khi khu vực không còn lô trồng trực thuộc.'}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title={(lang === 'en' ? "Confirm block deletion" : "Xác nhận xóa lô trồng")}
        description={(lang === 'en' ? <>{"Are you sure you want to delete block \""}<strong>{blockToDelete?.blockName}</strong>{"\" from "}<strong>{zone.zoneName}</strong>{"?"}</> : <>{"Bạn có chắc chắn muốn xóa lô trồng \""}<strong>{blockToDelete?.blockName}</strong>{"\" khỏi "}<strong>{zone.zoneName}</strong>{"?"}</>)}
        confirmLabel="Delete Block"
        tone="danger"
        onClose={() => setBlockToDelete(null)}
        onConfirm={handleConfirmDeleteBlock}
      />

      <ConfirmDialog
        open={Boolean(assignmentToCancel)}
        title={(lang === 'en' ? "Revoke staff assignment" : "Thu hồi phân công staff members")}
        description={(lang === 'en' ? <>{"Revoke assignment for \""}<strong>{assignmentToCancel?.staffName || 'nhân viên'}</strong>{"\" at "}<strong>{zone.zoneName}</strong>{"?"}</> : <>{"Thu hồi phân công của \""}<strong>{assignmentToCancel?.staffName || 'nhân viên'}</strong>{"\" tại "}<strong>{zone.zoneName}</strong>{"?"}</>)}
        confirmLabel="Thu hồi"
        tone="danger"
        onClose={() => setAssignmentToCancel(null)}
        onConfirm={handleConfirmUnassign}
      />
    </section>
  );
}
