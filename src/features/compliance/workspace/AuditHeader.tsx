import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { ChecklistRunResp } from '../vietgapComplianceService';

interface AuditHeaderProps {
  run: ChecklistRunResp;
  totalItems: number;
  completedItems: number; // processed != 'pending'
  passedItems: number;
  failedItems: number;
  naItems: number;
  pendingItems: number;
  missingEvidenceCount: number;
  compliancePercent: number;
  isLocked: boolean;
  isAutoChecking: boolean;
  isExporting: boolean;
  onAutoCheck: () => void;
  onExportPdf: () => void;
  onRequestLock: () => void;
  onClose: () => void;
}

export function AuditHeader({
  run,
  totalItems,
  completedItems,
  passedItems,
  failedItems,
  naItems: _naItems,
  pendingItems,
  missingEvidenceCount,
  compliancePercent,
  isLocked,
  isAutoChecking,
  isExporting,
  onAutoCheck,
  onExportPdf,
  onRequestLock,
  onClose,
}: AuditHeaderProps) {
  const { lang } = useLanguage();

  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const roundedCompliance = Math.round(compliancePercent);

  // If there are no failed criteria yet, compliance score is provisional (not a violation)
  const complianceColor = failedItems > 0 ? '#b91c1c' : '#059669';

  const getStatusBadge = () => {
    switch (run.runStatus) {
      case 'completed':
        return {
          label: lang === 'en' ? 'Completed' : 'Đã hoàn thành',
          bg: '#ecfdf5',
          color: '#065f46',
        };
      case 'in_progress':
        return {
          label: lang === 'en' ? 'In Progress' : 'Đang thực hiện',
          bg: '#f1f5f9',
          color: '#334155',
        };
      default:
        return {
          label: lang === 'en' ? 'Open' : 'Đang mở',
          bg: '#f8fafc',
          color: '#64748b',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* ─── TẦNG 1: IDENTITY & ACTIONS ──────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        {/* Left: Avatar + Title & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="shield" size={22} />
          </div>

          <div style={{ minWidth: 0 }}>
            {/* Row 1: Breadcrumb + Status pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
              <span>{lang === 'en' ? 'VietGAP Compliance' : 'Tuân thủ VietGAP'}</span>
              <span>/</span>
              <span style={{ fontWeight: 600, color: '#334155', fontFamily: 'ui-monospace, monospace' }}>
                #{run.runId}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 650,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: statusBadge.bg,
                  color: statusBadge.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusBadge.color }} />
                <span>{statusBadge.label}</span>
              </span>
            </div>

            {/* Row 2: Title + Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {run.seasonName || (lang === 'en' ? 'General Crop Season' : 'Mùa vụ chung')}
              </h2>
              {run.blockName && (
                <span style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                  {run.blockName}
                </span>
              )}
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
                {run.assignedToName && (
                  <span>
                    {lang === 'en' ? 'Auditor: ' : 'Người đánh giá: '}
                    <strong style={{ color: '#334155', fontWeight: 600 }}>{run.assignedToName}</strong>
                  </span>
                )}
                {run.scheduledAt && (
                  <span>({run.scheduledAt.split('T')[0]})</span>
                )}
                <span style={{ color: '#059669', fontWeight: 600, background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px', fontSize: '11.5px' }}>
                  TCVN 11892-1:2017
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            disabled={isAutoChecking || isLocked}
            onClick={onAutoCheck}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              cursor: isAutoChecking || isLocked ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={lang === 'en' ? 'Run automatic evaluation rules' : 'Quét đối soát tự động từ dữ liệu nhật ký'}
          >
            <Icon name={isAutoChecking ? 'loader' : 'refresh'} size={14} className={isAutoChecking ? 'spin' : undefined} />
            <span>{isAutoChecking ? (lang === 'en' ? 'Scanning...' : 'Đang quét...') : (lang === 'en' ? 'Auto-check' : 'Quét tự động')}</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={onExportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={lang === 'en' ? 'Export official A4 dossier' : 'Xuất biên bản thẩm định khổ A4'}
          >
            <Icon name={isExporting ? 'loader' : 'file-text'} size={14} className={isExporting ? 'spin' : undefined} />
            <span>{isExporting ? (lang === 'en' ? 'Exporting...' : 'Đang xuất...') : (lang === 'en' ? 'Export PDF' : 'Xuất PDF')}</span>
          </button>

          {!isLocked && (
            <button
              type="button"
              onClick={onRequestLock}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={lang === 'en' ? 'Lock and freeze dossier' : 'Đóng băng hồ sơ tự đánh giá'}
            >
              <Icon name="lock" size={14} />
              <span>{lang === 'en' ? 'Lock' : 'Khóa hồ sơ'}</span>
            </button>
          )}

          <div style={{ width: '1px', height: '22px', background: '#cbd5e1', margin: '0 4px' }} />

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            aria-label={lang === 'en' ? 'Close workspace' : 'Đóng'}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {/* ─── TẦNG 2: AUDIT PROGRESS & METRICS STRIP ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          background: '#f8fafc',
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid #f1f5f9',
        }}
      >
        {/* Left: Dual Progress Bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: '1 1 380px' }}>
          {/* Progress 1: Completion */}
          <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>
                {lang === 'en' ? 'Evaluation Progress' : 'Tiến độ đánh giá'}:
              </span>
              <strong style={{ color: '#0f172a', fontWeight: 700 }}>
                {completedItems}/{totalItems} ({completionPercent}%)
              </strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${completionPercent}%`,
                  height: '100%',
                  background: completionPercent === 100 ? '#10b981' : '#3b82f6',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Progress 2: Compliance Percentage */}
          <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>
                {lang === 'en' ? 'Compliance Score' : 'Mức độ tuân thủ'}:
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: complianceColor }}>
                {roundedCompliance}%
                {!isLocked && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px', fontWeight: 400 }}>
                    {lang === 'en' ? '(est.)' : '(tạm tính)'}
                  </span>
                )}
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(Math.max(roundedCompliance, 0), 100)}%`,
                  height: '100%',
                  background: complianceColor,
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Badge Indicators (Structured Pill Row) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '6px', fontWeight: 650 }}>
            {passedItems} {lang === 'en' ? 'Pass' : 'Đạt'}
          </span>
          {failedItems > 0 && (
            <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 9px', borderRadius: '6px', fontWeight: 650 }}>
              {failedItems} {lang === 'en' ? 'Fail' : 'Chưa đạt'}
            </span>
          )}
          <span style={{ background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '6px', fontWeight: 500 }}>
            {pendingItems} {lang === 'en' ? 'Pending' : 'Chờ'}
          </span>
          {missingEvidenceCount > 0 && (
            <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 9px', borderRadius: '6px', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="camera" size={12} />
              <span>{missingEvidenceCount} {lang === 'en' ? 'Need photos' : 'Cần minh chứng'}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
