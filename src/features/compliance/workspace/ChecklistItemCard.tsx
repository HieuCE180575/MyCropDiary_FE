import { useState, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { getCategoryDisplayName } from './types';
import { updateChecklistItemApi } from '../vietgapComplianceService';
import type { ChecklistResultItemResp, UpdateChecklistItemPayload } from '../vietgapComplianceService';
import { VIETGAP_CRITERIA_KNOWLEDGE } from './vietgapCriteriaKnowledge';

interface ChecklistItemCardProps {
  item: ChecklistResultItemResp;
  isLocked: boolean;
  farmId: number;
  runId: number;
  selectedCategory: string;
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
        padding: '12px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        transition: 'background 0.15s ease',
      }}
    >
      {/* ─── TẦNG 1: IDENTITY, CONTENT & SEGMENTED CONTROLS ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Metadata & Title */}
        <div style={{ flex: '1 1 380px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {localItem.ruleLevel && (
            <span
              style={{
                fontSize: '10.5px',
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

          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              fontFamily: 'ui-monospace, monospace',
              flexShrink: 0,
            }}
          >
            {localItem.ruleCode ?? `#${localItem.resultId}`}
          </span>

          {showCategoryLabel && (
            <>
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>·</span>
              <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
                {getCategoryDisplayName(localItem.category, lang)}
              </span>
            </>
          )}

          {/* Criterion Name */}
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 650,
              color: '#0f172a',
              lineHeight: 1.35,
            }}
          >
            {localItem.ruleName ?? (lang === 'en' ? `Criterion #${localItem.resultId}` : `Tiêu chí #${localItem.resultId}`)}
          </span>

          {localItem.isAutoEvaluated && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                background: '#f5f3ff',
                color: '#6d28d9',
                flexShrink: 0,
              }}
              title={lang === 'en' ? 'Pre-evaluated by system auto-check engine' : 'Hệ thống tự động quét và đối soát'}
            >
              <Icon name="zap" size={10} />
              <span>{lang === 'en' ? 'Auto-check' : 'Tự đối soát'}</span>
            </span>
          )}

          {localItem.isMissingEvidence && localItem.resultStatus === 'pass' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                background: '#fff7ed',
                color: '#c2410c',
                flexShrink: 0,
              }}
            >
              <Icon name="warning" size={10} />
              <span>{lang === 'en' ? 'Need evidence' : 'Cần minh chứng'}</span>
            </span>
          )}
        </div>

        {/* Right: Segmented Control & Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {savingStatus === 'saving' && (
            <span style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px' }}>
              <Icon name="loader" size={11} className="spin" />
              <span>{lang === 'en' ? 'Saving' : 'Lưu...'}</span>
            </span>
          )}
          {savingStatus === 'saved' && (
            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px' }}>
              <Icon name="check" size={11} />
            </span>
          )}
          {savingStatus === 'error' && (
            <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px' }} title={errorMessage ?? undefined}>
              <Icon name="warning" size={11} />
              <span>{errorMessage || (lang === 'en' ? 'Error' : 'Lỗi')}</span>
            </span>
          )}

          {/* Segmented Control 4 Buttons (Compact 30px) */}
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
              { status: 'pass', vi: 'Đạt', en: 'Pass', activeBg: '#ecfdf5', activeColor: '#059669', activeWeight: 600 },
              { status: 'fail', vi: 'Chưa đạt', en: 'Fail', activeBg: '#fef2f2', activeColor: '#b91c1c', activeWeight: 600 },
              { status: 'not_applicable', vi: 'Không áp dụng', en: 'N/A', activeBg: '#ffffff', activeColor: '#475569', activeWeight: 500 },
              { status: 'pending', vi: 'Chờ', en: 'Pending', activeBg: '#ffffff', activeColor: '#475569', activeWeight: 500 },
            ].map((btn) => {
              const isActive = localItem.resultStatus === btn.status;
              return (
                <button
                  key={btn.status}
                  type="button"
                  disabled={isLocked || savingStatus === 'saving'}
                  onClick={() => handleStatusChange(btn.status as any)}
                  style={{
                    minHeight: '28px',
                    padding: '0 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: isActive ? btn.activeBg : 'transparent',
                    color: isActive ? btn.activeColor : '#64748b',
                    fontSize: '12px',
                    fontWeight: isActive ? btn.activeWeight : 400,
                    cursor: isLocked || savingStatus === 'saving' ? 'not-allowed' : 'pointer',
                    boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lang === 'en' ? btn.en : btn.vi}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── TẦNG 2: MICRO-GUIDANCE & QUICK ACTIONS ───────── */}
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
          {knowledge?.requirement ? (
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
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              <Icon name="help" size={11} />
              <span>{showGuidance ? (lang === 'en' ? 'Close Guide' : 'Đóng hướng dẫn') : (lang === 'en' ? 'How to comply?' : 'Hướng dẫn đạt chuẩn')}</span>
            </button>
          )}
        </div>

        {/* Right: Evidence & Notes Action Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Direct Photo Thumbnail Preview if already attached */}
          {localItem.evidenceImageUrl && (
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
              }}
              title={lang === 'en' ? 'Click to view full photo' : 'Nhấn để xem ảnh phóng to'}
            >
              <img
                src={localItem.evidenceImageUrl}
                alt="Evidence"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                  border: '1px solid #cbd5e1',
                }}
              />
            </button>
          )}

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: isExpanded ? '#f1f5f9' : 'transparent',
              border: 'none',
              color: isExpanded ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '4px',
            }}
          >
            <Icon name={isExpanded ? 'chevron' : 'chevron-right'} size={12} />
            <span>
              {isExpanded
                ? (lang === 'en' ? 'Collapse' : 'Thu gọn')
                : (lang === 'en' ? 'Evidence & Notes' : 'Ghi chú & minh chứng')}
            </span>
            {localItem.evidenceImageUrl && (
              <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 600 }}>•</span>
            )}
          </button>
        </div>
      </div>

      {/* Auto-evaluated System Warning / Verification Note */}
      {localItem.isAutoEvaluated && localItem.notes && (
        <div
          style={{
            background: localItem.resultStatus === 'fail' ? '#fef2f2' : '#f0fdf4',
            borderRadius: '5px',
            padding: '6px 10px',
            fontSize: '12px',
            color: localItem.resultStatus === 'fail' ? '#991b1b' : '#166534',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          <Icon name={localItem.resultStatus === 'fail' ? 'warning' : 'shield'} size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>{localItem.notes}</span>
        </div>
      )}

      {/* ─── IN-LINE FIELD GUIDANCE (TRỢ LÝ THẨM ĐỊNH TẠI CHỖ) ─ */}
      {showGuidance && knowledge && (
        <div
          style={{
            background: '#f8fafc',
            borderLeft: '3px solid #10b981',
            borderRadius: '4px',
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
            fontSize: '12.5px',
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
                    width: '64px',
                    height: '64px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: '1px solid #cbd5e1',
                  }}
                  title={lang === 'en' ? 'Click to enlarge' : 'Nhấn để phóng to'}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isLocked ? '#94a3b8' : '#059669', fontSize: '12.5px', fontWeight: 600 }}>
                  <Icon name="camera" size={15} />
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
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {localItem.notes ? (lang === 'en' ? 'Edit' : 'Sửa') : (lang === 'en' ? '+ Add note' : '+ Thêm ghi chú')}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={2}
                  placeholder={lang === 'en' ? 'Enter observation or verification details...' : 'Ghi nhận thực tế tại hiện trường kiểm tra...'}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="ghost-button"
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
          style={{ zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                {localItem.ruleCode} · {lang === 'en' ? 'Evidence Photo' : 'Ảnh minh chứng thực tế'}
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <img
              src={localItem.evidenceImageUrl}
              alt="Enlarged Evidence"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
