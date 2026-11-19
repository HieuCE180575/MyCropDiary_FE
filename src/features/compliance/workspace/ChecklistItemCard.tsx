import { useState, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { getCategoryDisplayName } from './types';
import { updateChecklistItemApi } from '../vietgapComplianceService';
import type { ChecklistResultItemResp, UpdateChecklistItemPayload } from '../vietgapComplianceService';
import { VIETGAP_CRITERIA_KNOWLEDGE, isAutoEvaluatedCriterion } from './vietgapCriteriaKnowledge';

interface ChecklistItemCardProps {
  item: ChecklistResultItemResp;
  isLocked: boolean;
  farmId: number;
  runId: number;
  selectedCategory: string;
  farmMapUrl?: string | null;
  onUpdate: (updated: ChecklistResultItemResp) => void;
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  MUST: { bg: '#fef2f2', color: '#b91c1c' },
  MAJOR: { bg: '#fffbeb', color: '#b45309' },
  MINOR: { bg: '#eff6ff', color: '#1d4ed8' },
  RECOMMENDED: { bg: '#f0fdf4', color: '#15803d' },
};

export function ChecklistItemCard({
  item,
  isLocked,
  farmId,
  runId,
  selectedCategory,
  farmMapUrl,
  onUpdate,
}: ChecklistItemCardProps) {
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [localItem, setLocalItem] = useState<ChecklistResultItemResp>(item);
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(item.notes || item.evidenceImageUrl));
  const [showGuidance, setShowGuidance] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Form states for notes
  const [notesText, setNotesText] = useState(item.notes ?? '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const knowledge = localItem.ruleCode ? VIETGAP_CRITERIA_KNOWLEDGE[localItem.ruleCode] : undefined;

  const shortClause = knowledge?.tcvnClause
    ? knowledge.tcvnClause.includes('Điều')
      ? knowledge.tcvnClause.substring(knowledge.tcvnClause.indexOf('Điều')).trim()
      : knowledge.tcvnClause
    : null;

  const level = LEVEL_STYLE[localItem.ruleLevel ?? ''] ?? {
    bg: '#f1f5f9',
    color: '#475569',
  };

  const showCategoryLabel = selectedCategory === 'all' || selectedCategory === 'priority';

  const performUpdate = async (patch: Partial<UpdateChecklistItemPayload>, previousItem: ChecklistResultItemResp) => {
    if (isLocked) return;
    setSavingStatus('saving');
    setErrorMessage(null);

    const payload: UpdateChecklistItemPayload = {
      resultStatus: (patch.resultStatus ?? localItem.resultStatus) as UpdateChecklistItemPayload['resultStatus'],
      notes: patch.notes !== undefined ? patch.notes : (localItem.notes ?? null),
      evidenceImageUrl: patch.evidenceImageUrl !== undefined ? patch.evidenceImageUrl : (localItem.evidenceImageUrl ?? null),
      evidenceReferenceType: localItem.evidenceReferenceType ?? null,
      evidenceReferenceId: localItem.evidenceReferenceId ?? null,
    };

    try {
      const updated = await updateChecklistItemApi(farmId, runId, localItem.resultId, payload);
      setLocalItem(updated);
      onUpdate(updated);
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (err) {
      setLocalItem(previousItem);
      onUpdate(previousItem);
      setSavingStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : (lang === 'en' ? 'Update failed, reverted changes.' : 'Cập nhật thất bại, đã khôi phục trạng thái.')
      );
    }
  };

  const handleStatusChange = (newStatus: 'pass' | 'fail' | 'not_applicable' | 'pending') => {
    if (localItem.resultStatus === newStatus || isLocked || savingStatus === 'saving') return;
    const prev = { ...localItem };
    const next = { ...localItem, resultStatus: newStatus };
    setLocalItem(next);
    void performUpdate({ resultStatus: newStatus }, prev);
  };

  const handleSaveNotes = () => {
    const prev = { ...localItem };
    const next = { ...localItem, notes: notesText || null };
    setLocalItem(next);
    setIsEditingNotes(false);
    void performUpdate({ notes: notesText || null }, prev);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isLocked) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'en' ? 'Image file size exceeds 5MB limit.' : 'Kích thước ảnh vượt quá giới hạn 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const prev = { ...localItem };
        const next = { ...localItem, evidenceImageUrl: dataUrl };
        setLocalItem(next);
        void performUpdate({ evidenceImageUrl: dataUrl }, prev);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveEvidence = () => {
    if (isLocked) return;
    if (!window.confirm(lang === 'en' ? 'Remove this evidence photo?' : 'Xóa ảnh minh chứng này?')) return;
    const prev = { ...localItem };
    const next = { ...localItem, evidenceImageUrl: null };
    setLocalItem(next);
    void performUpdate({ evidenceImageUrl: null }, prev);
  };

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#f8fafc' : 'transparent',
        border: 'none',
        borderBottom: '1px solid #f1f5f9',
        borderRadius: 0,
        boxShadow: 'none',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'background 0.15s ease',
      }}
    >
      {/* ─── TẦNG 1: PRIMARY IDENTITY & CONTROLS ─────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Metadata badges & Criterion Title */}
        <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', minWidth: 0 }}>
          {/* Level: MUST, MAJOR, MINOR, RECOMMENDED */}
          {localItem.ruleLevel && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '1.5px 5px',
                borderRadius: '4px',
                background: level.bg,
                color: level.color,
                flexShrink: 0,
              }}
            >
              {localItem.ruleLevel}
            </span>
          )}

          {/* Rule Code */}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              fontFamily: 'ui-monospace, monospace',
              flexShrink: 0,
            }}
          >
            {localItem.ruleCode ?? '—'}
          </span>

          {/* Dẫn chiếu điều khoản TCVN (Rút gọn) */}
          {shortClause && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#047857',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '1.5px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
              title={knowledge?.tcvnClause ?? shortClause}
            >
              {shortClause}
            </span>
          )}

          {/* Phân loại trực quan: ⚡ Tự đối soát vs 📷 Hiện trường */}
          {isAutoEvaluatedCriterion(localItem.ruleCode) ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 650,
                padding: '1.5px 6px',
                borderRadius: '4px',
                background: '#ecfdf5',
                color: '#047857',
                flexShrink: 0,
              }}
              title={
                lang === 'en'
                  ? 'Auto-evaluated by system from digital farming logs, PHI, warehouse, lab tests, harvest, and training records'
                  : 'Hệ thống tự động đối soát từ nhật ký phân thuốc, cách ly PHI, kho bãi, đất nước, thu hoạch và đào tạo'
              }
            >
              <Icon name="zap" size={10} style={{ color: '#10b981' }} />
              <span>{lang === 'en' ? 'Auto' : 'Tự đối soát'}</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 650,
                padding: '1.5px 6px',
                borderRadius: '4px',
                background: '#fffbeb',
                color: '#b45309',
                flexShrink: 0,
              }}
              title={
                lang === 'en'
                  ? 'Field inspection: Requires physical observation and photo evidence'
                  : 'Thẩm định hiện trường: Yêu cầu quan sát thực tế tại nông trại và đính kèm ảnh chụp'
              }
            >
              <Icon name="camera" size={10} style={{ color: '#f59e0b' }} />
              <span>{lang === 'en' ? 'Field' : 'Hiện trường'}</span>
            </span>
          )}

          {/* Cảnh báo thiếu ảnh minh chứng */}
          {localItem.isMissingEvidence && localItem.resultStatus === 'pass' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10.5px',
                fontWeight: 650,
                padding: '1.5px 5px',
                borderRadius: '4px',
                background: '#fef2f2',
                color: '#b91c1c',
                flexShrink: 0,
              }}
              title={lang === 'en' ? 'Missing photographic evidence' : 'Thiếu ảnh minh chứng bắt buộc'}
            >
              <Icon name="warning" size={10} />
              <span>{lang === 'en' ? 'Need photo' : 'Thiếu ảnh'}</span>
            </span>
          )}

          {showCategoryLabel && (
            <>
              <span style={{ color: '#cbd5e1', fontSize: '11px' }}>·</span>
              <span style={{ fontSize: '11.5px', color: '#64748b', flexShrink: 0 }}>
                {getCategoryDisplayName(localItem.category, lang)}
              </span>
            </>
          )}

          {/* Tên tiêu chí */}
          <span
            style={{
              fontSize: '13px',
              fontWeight: 650,
              color: '#0f172a',
              lineHeight: 1.35,
              marginLeft: '2px',
            }}
          >
            {localItem.ruleName ?? (lang === 'en' ? `Criterion` : `Tiêu chí`)}
          </span>
        </div>

        {/* Right: Saving indicator, Segmented Control & Details trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {savingStatus === 'saving' && (
            <span style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
              <Icon name="loader" size={11} className="spin" />
              <span>{lang === 'en' ? 'Saving' : 'Lưu...'}</span>
            </span>
          )}
          {savingStatus === 'saved' && (
            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
              <Icon name="check" size={11} />
            </span>
          )}
          {savingStatus === 'error' && (
            <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }} title={errorMessage ?? undefined}>
              <Icon name="warning" size={11} />
              <span>{lang === 'en' ? 'Error' : 'Lỗi'}</span>
            </span>
          )}

          {/* Segmented Control 4 Buttons (Compact) */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '6px',
            }}
            role="group"
          >
            {[
              { status: 'pass', vi: 'Đạt', en: 'Pass', activeBg: '#10b981', activeColor: '#ffffff' },
              { status: 'fail', vi: 'Chưa đạt', en: 'Fail', activeBg: '#ef4444', activeColor: '#ffffff' },
              { status: 'not_applicable', vi: 'K.áp dụng', en: 'N/A', activeBg: '#64748b', activeColor: '#ffffff' },
              { status: 'pending', vi: 'Chờ', en: 'Pending', activeBg: '#94a3b8', activeColor: '#ffffff' },
            ].map((btn) => {
              const isActive = localItem.resultStatus === btn.status;
              return (
                <button
                  key={btn.status}
                  type="button"
                  disabled={isLocked || savingStatus === 'saving'}
                  onClick={() => handleStatusChange(btn.status as any)}
                  style={{
                    height: '26px',
                    padding: '0 9px',
                    borderRadius: '4px',
                    border: 'none',
                    background: isActive ? btn.activeBg : 'transparent',
                    color: isActive ? btn.activeColor : '#64748b',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: isLocked || savingStatus === 'saving' ? 'not-allowed' : 'pointer',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lang === 'en' ? btn.en : btn.vi}
                </button>
              );
            })}
          </div>

          {/* Toggle Minh chứng / Ghi chú */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              height: '26px',
              padding: '0 8px',
              borderRadius: '4px',
              border: (localItem.notes || localItem.evidenceImageUrl) ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              background: (localItem.notes || localItem.evidenceImageUrl) ? '#ecfdf5' : '#ffffff',
              color: (localItem.notes || localItem.evidenceImageUrl) ? '#047857' : '#64748b',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
            title={lang === 'en' ? 'Open details, notes & photo evidence' : 'Mở rộng ghi chú & ảnh minh chứng'}
          >
            <Icon name={localItem.evidenceImageUrl ? 'camera' : 'file-text'} size={11} />
            <span>{lang === 'en' ? 'Evidence' : 'Minh chứng'}</span>
            <Icon name={isExpanded ? 'chevron' : 'chevron-right'} size={10} />
          </button>
        </div>
      </div>

      {/* ─── TẦNG 2: MICRO-REQUIREMENT & QUICK ACTIONS ────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '12px',
        }}
      >
        {/* Left: 1-line Micro-Requirement + Inspect Guide Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 360px' }}>
          {/* Hiển thị lý do đối soát tự động nếu có */}
          {localItem.isAutoEvaluated && localItem.notes ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: localItem.resultStatus === 'fail' ? '#b91c1c' : '#047857', fontSize: '11.5px', fontWeight: 500 }}>
              <Icon name={localItem.resultStatus === 'fail' ? 'warning' : 'check'} size={12} style={{ flexShrink: 0 }} />
              <span>{localItem.notes}</span>
            </div>
          ) : knowledge?.requirement ? (
            <span style={{ color: '#64748b', lineHeight: 1.4 }}>
              <span style={{ color: '#047857', fontWeight: 600 }}>
                {lang === 'en' ? 'Standard: ' : 'Tiêu chuẩn: '}
              </span>
              {knowledge.requirement}
            </span>
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              {lang === 'en' ? 'General VietGAP guideline applies.' : 'Áp dụng quy chuẩn chung VietGAP TCVN 11892-1.'}
            </span>
          )}

          {/* Toggle Inspect Guidance Dropdown */}
          {knowledge && (
            <button
              type="button"
              onClick={() => setShowGuidance((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                border: 'none',
                background: showGuidance ? '#ecfdf5' : 'transparent',
                color: showGuidance ? '#047857' : '#0284c7',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '1px 5px',
                borderRadius: '4px',
                flexShrink: 0,
                textDecoration: 'underline',
              }}
            >
              <Icon name="help" size={11} />
              <span>{showGuidance ? (lang === 'en' ? 'Hide guide' : 'Ẩn hướng dẫn') : (lang === 'en' ? 'How to comply?' : 'Hướng dẫn đạt chuẩn')}</span>
            </button>
          )}

          {/* Quick link for VG-CS-04 Farm Layout Map */}
          {localItem.ruleCode === 'VG-CS-04' && (
            farmMapUrl ? (
              <a
                href={farmMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #10b981',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
                title={lang === 'en' ? 'Open farm layout blueprint' : 'Xem sơ đồ mặt bằng quy hoạch'}
              >
                <span>🗺️ {lang === 'en' ? 'Farm Map ↗' : 'Sơ đồ trang trại ↗'}</span>
              </a>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  color: '#b45309',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
                title={lang === 'en' ? 'Upload map in Farm Profile' : 'Chưa tải sơ đồ trong Hồ sơ trang trại'}
              >
                ⚠️ {lang === 'en' ? 'No layout map' : 'Chưa có sơ đồ'}
              </span>
            )
          )}
        </div>

        {/* Right: Quick photo view button if photo exists and not expanded */}
        {localItem.evidenceImageUrl && !isExpanded && (
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid #a7f3d0',
              background: '#ecfdf5',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              color: '#047857',
              fontWeight: 600,
              flexShrink: 0,
            }}
            title={lang === 'en' ? 'Click to view enlarged photo' : 'Nhấn để phóng to xem ảnh minh chứng'}
          >
            <img
              src={localItem.evidenceImageUrl}
              alt="Evidence thumbnail"
              style={{ width: '15px', height: '15px', borderRadius: '2px', objectFit: 'cover' }}
            />
            <span>{lang === 'en' ? 'View Photo' : 'Xem ảnh'}</span>
          </button>
        )}
      </div>

      {/* ─── IN-LINE FIELD GUIDANCE ──────────────────────── */}
      {showGuidance && knowledge && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Icon name="search" size={13} style={{ color: '#10b981' }} />
              <span>{lang === 'en' ? 'Field Inspection Checklist:' : 'Các điểm cần kiểm tra tại hiện trường:'}</span>
            </strong>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{knowledge.tcvnClause}</span>
          </div>

          <ul style={{ margin: '2px 0 0', paddingLeft: '18px', lineHeight: 1.5 }}>
            {knowledge.checkpoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>

          <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="camera" size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>
              <strong>{lang === 'en' ? 'Required Evidence: ' : 'Minh chứng bắt buộc: '}</strong>
              {knowledge.evidenceRequired}
            </span>
          </div>
        </div>
      )}

      {/* ─── EXPANDABLE DETAILS: NOTES & DIRECT PHOTO UPLOAD ─── */}
      {isExpanded && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '12px',
          }}
        >
          {/* 1. Direct File / Photo Attachment Area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                <Icon name="camera" size={13} />
                <span>{lang === 'en' ? 'Inspection Photographic Evidence:' : 'Ảnh chụp minh chứng thực địa:'}</span>
              </span>

              {knowledge && (
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {knowledge.evidenceRequired}
                </span>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isLocked}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {localItem.evidenceImageUrl ? (
              /* Image exists: Thumbnail + Action buttons */
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <img
                  src={localItem.evidenceImageUrl}
                  alt="Evidence"
                  onClick={() => setIsPreviewModalOpen(true)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: '1px solid #cbd5e1',
                  }}
                  title={lang === 'en' ? 'Click to enlarge' : 'Nhấn để phóng to'}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {lang === 'en' ? 'Attached Photo Evidence' : 'Đã đính kèm ảnh minh chứng hiện trường'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {lang === 'en' ? 'Stored securely in audit record' : 'Đã lưu trữ an toàn trong hồ sơ đợt tự đánh giá'}
                  </span>
                </div>

                {!isLocked && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {lang === 'en' ? 'Replace' : 'Đổi ảnh'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveEvidence}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        background: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      {lang === 'en' ? 'Delete' : 'Xóa'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No image: Direct upload dropzone button */
              <div
                onClick={() => !isLocked && fileInputRef.current?.click()}
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  background: isLocked ? '#f1f5f9' : '#ffffff',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isLocked) e.currentTarget.style.borderColor = '#10b981';
                }}
                onMouseLeave={(e) => {
                  if (!isLocked) e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isLocked ? '#94a3b8' : '#059669', fontSize: '12px', fontWeight: 600 }}>
                  <Icon name="camera" size={14} />
                  <span>{lang === 'en' ? 'Take Photo or Upload Image from Device' : 'Chụp ảnh từ camera hoặc Chọn tệp từ máy'}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  {lang === 'en' ? 'Supports JPG, PNG up to 5MB. Photo will be sealed upon dossier lock.' : 'Hỗ trợ JPG, PNG tối đa 5MB. Ảnh sẽ được niêm phong khi khóa hồ sơ.'}
                </p>
              </div>
            )}
          </div>

          {/* 2. Evaluation Notes Area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                <Icon name="edit" size={12} />
                <span>{lang === 'en' ? 'Auditor Observation & Notes:' : 'Ghi chép & Nhận xét của kiểm toán viên:'}</span>
              </span>
              {!isLocked && !isEditingNotes && (
                <button className={(localItem.notes ? 'ui-edit-action' : '')}
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {localItem.notes && <Icon name="edit" size={14} />}
                  {localItem.notes ? (lang === 'en' ? 'Edit' : 'Sửa') : (lang === 'en' ? '+ Add note' : '+ Thêm ghi chú')}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="structured-field-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <textarea className="ui-textarea" aria-label={lang === 'en' ? 'Auditor observation and notes' : 'Ghi chép và nhận xét của kiểm toán viên'}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={2}
                  placeholder={lang === 'en' ? 'Enter observation or verification details...' : 'Ghi nhận thực tế tại hiện trường kiểm tra...'}

                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={"ghost-button" + ' ' + 'ui-cancel-button'}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      setNotesText(localItem.notes ?? '');
                      setIsEditingNotes(false);
                    }}
                  >
                    {lang === 'en' ? 'Cancel' : 'Hủy'}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ fontSize: '11px', padding: '3px 12px' }}
                    onClick={handleSaveNotes}
                  >
                    {lang === 'en' ? 'Save Note' : 'Lưu ghi chú'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: localItem.notes ? '#334155' : '#94a3b8', fontStyle: localItem.notes ? 'normal' : 'italic', fontSize: '12px' }}>
                {localItem.notes || (lang === 'en' ? 'No notes provided.' : 'Chưa có ghi chú kiểm tra.')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX MODAL: FULL PHOTO PREVIEW ─────────────── */}
      {isPreviewModalOpen && localItem.evidenceImageUrl && (
        <div
          className="modal-backdrop"
          style={{
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            padding: '20px',
          }}
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '18px 22px',
              maxWidth: '85vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header with Title and TCVN clause */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                    {localItem.ruleCode}
                  </span>
                  {knowledge?.tcvnClause && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1.5px 6px', borderRadius: '4px' }}>
                      {knowledge.tcvnClause}
                    </span>
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {localItem.ruleName}
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {knowledge?.evidenceRequired ? `Yêu cầu minh chứng: ${knowledge.evidenceRequired}` : 'Ảnh chụp hiện trường phục vụ kiểm tra VietGAP'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  fontWeight: 'bold',
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* High-res Image Display */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', padding: '8px' }}>
              <img
                src={localItem.evidenceImageUrl}
                alt="Enlarged Evidence"
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* Footer with Details & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '65%' }}>
                {localItem.notes ? (
                  <span><strong>Ghi chú:</strong> {localItem.notes}</span>
                ) : (
                  <span>Minh chứng đính kèm hồ sơ tự đánh giá</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={localItem.evidenceImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Icon name="external-link" size={12} />
                  <span>{lang === 'en' ? 'Open in new tab' : 'Mở trong tab mới'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className={"primary-button" + ' ' + 'ui-close-action'}
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                >
                  {lang === 'en' ? 'Close' : 'Đóng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
