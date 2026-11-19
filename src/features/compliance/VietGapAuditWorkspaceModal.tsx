import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { getFarmById } from '../farm-management/api';
import {
  autoCheckRunApi,
  completeChecklistRunApi,
  exportAuditReportPdfApi,
} from './vietgapComplianceService';
import type { ChecklistRunResp, ChecklistResultItemResp } from './vietgapComplianceService';

import { AuditHeader } from './workspace/AuditHeader';
import { AuditCategorySidebar } from './workspace/AuditCategorySidebar';
import { AuditFilters } from './workspace/AuditFilters';
import type { StatusFilterKey, MethodFilterKey } from './workspace/AuditFilters';
import { ChecklistItemCard } from './workspace/ChecklistItemCard';
import { AuditConfirmationModal } from './workspace/AuditConfirmationModal';
import { AUDIT_CATEGORIES, getCategoryMeta } from './workspace/types';
import { isAutoEvaluatedCriterion } from './workspace/vietgapCriteriaKnowledge';

interface VietGapAuditWorkspaceModalProps {
  run: ChecklistRunResp;
  farmId: number;
  onClose: () => void;
  onRunUpdated: (updated: ChecklistRunResp) => void;
}

export function VietGapAuditWorkspaceModal({
  run,
  farmId,
  onClose,
  onRunUpdated,
}: VietGapAuditWorkspaceModalProps) {
  const { lang } = useLanguage();
  const [currentRun, setCurrentRun] = useState<ChecklistRunResp>(run);
  const [items, setItems] = useState<ChecklistResultItemResp[]>(run.results ?? []);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all' | 'priority' | categoryCode
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Action States
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [farmMapUrl, setFarmMapUrl] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      getFarmById(farmId).then((f) => setFarmMapUrl(f.farmMapUrl ?? null)).catch(() => {});
    }
  }, [farmId]);

  const isLocked = currentRun.runStatus === 'completed' || currentRun.runStatus === 'cancelled';

  // Computed Metrics
  const totalItems = items.length;
  const passedItems = items.filter((i) => i.resultStatus === 'pass').length;
  const failedItems = items.filter((i) => i.resultStatus === 'fail').length;
  const naItems = items.filter((i) => i.resultStatus === 'not_applicable').length;
  const pendingItems = items.filter((i) => i.resultStatus === 'pending').length;
  const completedItems = totalItems - pendingItems; // Processed items
  const missingEvidenceCount = items.filter((i) => i.resultStatus === 'pass' && i.isMissingEvidence).length;

  const compliancePercent =
    currentRun.compliancePercent ?? (totalItems > 0 ? (passedItems / totalItems) * 100 : 0);

  // Items scoped to the selected category (or all/priority)
  const categoryScopedItems = useMemo(() => {
    if (selectedCategory === 'all') return items;
    if (selectedCategory === 'priority') {
      return items.filter(
        (it) => it.resultStatus === 'fail' || (it.resultStatus === 'pass' && it.isMissingEvidence)
      );
    }
    return items.filter((it) => it.category === selectedCategory);
  }, [items, selectedCategory]);

  // Filter Counts scoped to selected category scope
  const filterCounts = useMemo(() => {
    return {
      all: categoryScopedItems.length,
      pending: categoryScopedItems.filter((i) => i.resultStatus === 'pending').length,
      fail: categoryScopedItems.filter((i) => i.resultStatus === 'fail').length,
      missing_evidence: categoryScopedItems.filter((i) => i.resultStatus === 'pass' && i.isMissingEvidence).length,
      auto: categoryScopedItems.filter((i) => isAutoEvaluatedCriterion(i.ruleCode) || i.isAutoEvaluated).length,
      field: categoryScopedItems.filter((i) => !isAutoEvaluatedCriterion(i.ruleCode) && !i.isAutoEvaluated).length,
      pass: categoryScopedItems.filter((i) => i.resultStatus === 'pass').length,
    };
  }, [categoryScopedItems]);

  // Level 1: Category Header Information
  const activeCategoryInfo = useMemo(() => {
    if (selectedCategory === 'all') {
      return {
        title: lang === 'en' ? 'All VietGAP Criteria' : 'Tất cả tiêu chí VietGAP',
        evaluated: completedItems,
        total: totalItems,
        failed: failedItems,
        desc:
          lang === 'en'
            ? 'Complete 33-criteria internal assessment checklist under standard TCVN 11892-1:2017.'
            : 'Bảng kiểm 33 tiêu chí đánh giá nội bộ toàn diện theo tiêu chuẩn quốc gia TCVN 11892-1:2017.',
      };
    }
    if (selectedCategory === 'priority') {
      const priorityItems = items.filter(
        (it) => it.resultStatus === 'fail' || (it.resultStatus === 'pass' && it.isMissingEvidence)
      );
      return {
        title: lang === 'en' ? 'Priority Attention Items' : 'Cần xử lý ưu tiên',
        evaluated: priorityItems.filter((it) => it.resultStatus !== 'pending').length,
        total: priorityItems.length,
        failed: priorityItems.filter((it) => it.resultStatus === 'fail').length,
        desc:
          lang === 'en'
            ? 'Criteria non-compliant or missing photographic/documentary evidence requiring immediate resolution.'
            : 'Các tiêu chí bị đánh giá chưa đạt hoặc còn thiếu minh chứng thực tế cần khắc phục trước khi khóa hồ sơ.',
      };
    }
    const meta = getCategoryMeta(selectedCategory);
    const catIndex = AUDIT_CATEGORIES.findIndex((c) => c.code === selectedCategory);
    const prefix = catIndex >= 0 ? `${catIndex + 1}. ` : '';
    const catItems = items.filter((it) => it.category === selectedCategory);
    const catTotal = catItems.length;
    const catEvaluated = catItems.filter((it) => it.resultStatus !== 'pending').length;
    const catFailed = catItems.filter((it) => it.resultStatus === 'fail').length;

    return {
      title: `${prefix}${meta ? (lang === 'en' ? meta.nameEn : meta.nameVi) : selectedCategory}`,
      evaluated: catEvaluated,
      total: catTotal,
      failed: catFailed,
      desc: meta ? (lang === 'en' ? meta.descEn : meta.descVi) : '',
    };
  }, [selectedCategory, items, completedItems, totalItems, failedItems, lang]);

  // Filter & Search Engine (operates on the category-scoped criteria)
  const filteredItems = useMemo(() => {
    return categoryScopedItems.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'pending' && item.resultStatus !== 'pending') return false;
      if (statusFilter === 'fail' && item.resultStatus !== 'fail') return false;
      if (statusFilter === 'missing_evidence' && !(item.resultStatus === 'pass' && item.isMissingEvidence)) return false;
      if (statusFilter === 'pass' && item.resultStatus !== 'pass') return false;

      // 2. Method Filter
      const isAuto = isAutoEvaluatedCriterion(item.ruleCode) || item.isAutoEvaluated;
      if (methodFilter === 'auto' && !isAuto) return false;
      if (methodFilter === 'field' && isAuto) return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = item.ruleCode?.toLowerCase().includes(query);
        const nameMatch = item.ruleName?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [categoryScopedItems, statusFilter, methodFilter, searchQuery]);

  const hasActiveFilters = selectedCategory !== 'all' || statusFilter !== 'all' || methodFilter !== 'all' || Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setStatusFilter('all');
    setMethodFilter('all');
    setSearchQuery('');
  };

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Actions
  const handleAutoCheck = async () => {
    setIsAutoChecking(true);
    try {
      const updated = await autoCheckRunApi(farmId, currentRun.runId);
      setCurrentRun(updated);
      setItems(updated.results ?? []);
      onRunUpdated(updated);
      showToast(lang === 'en' ? 'Auto-check completed successfully' : 'Hệ thống đã hoàn tất quét đối soát tự động', 'ok');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : (lang === 'en' ? 'Auto-check failed' : 'Quét tự động thất bại'),
        'err'
      );
    } finally {
      setIsAutoChecking(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAuditReportPdfApi(farmId, currentRun.runId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bien_Ban_Tu_Danh_Gia_VietGAP_${currentRun.seasonName ?? 'VuMua'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(lang === 'en' ? 'Official dossier PDF downloaded' : 'Đã xuất file biên bản thẩm định PDF', 'ok');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : (lang === 'en' ? 'PDF export failed' : 'Xuất PDF thất bại'),
        'err'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmLock = async () => {
    setIsLocking(true);
    try {
      const updated = await completeChecklistRunApi(farmId, currentRun.runId);
      setCurrentRun(updated);
      onRunUpdated(updated);
      setIsLockModalOpen(false);
      showToast(lang === 'en' ? 'Audit dossier locked successfully' : 'Hồ sơ đánh giá đã được đóng băng thành công', 'ok');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : (lang === 'en' ? 'Failed to lock dossier' : 'Khóa hồ sơ thất bại'),
        'err'
      );
    } finally {
      setIsLocking(false);
    }
  };

  const handleItemUpdate = (updated: ChecklistResultItemResp) => {
    setItems((prev) => prev.map((it) => (it.resultId === updated.resultId ? updated : it)));
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2vh 2vw',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="vietgap-audit-workspace"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1440px',
          height: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Responsive CSS for Tablet / Mobile */}
        <style>{`
          .audit-mobile-cat-selector {
            display: none;
          }
          @media (max-width: 900px) {
            .vietgap-audit-workspace {
              width: 100vw !important;
              height: 100vh !important;
              border-radius: 0 !important;
            }
            aside.audit-category-sidebar {
              display: none !important;
            }
            .audit-mobile-cat-selector {
              display: block !important;
            }
          }
        `}</style>

        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: 1200,
              padding: '10px 18px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 600,
              background: toast.type === 'ok' ? '#ecfdf5' : '#fef2f2',
              color: toast.type === 'ok' ? '#065f46' : '#991b1b',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* ─── 1. FIXED HEADER ───────────────────────────── */}
        <AuditHeader
          run={currentRun}
          totalItems={totalItems}
          completedItems={completedItems}
          passedItems={passedItems}
          failedItems={failedItems}
          naItems={naItems}
          pendingItems={pendingItems}
          missingEvidenceCount={missingEvidenceCount}
          compliancePercent={compliancePercent}
          isLocked={isLocked}
          isAutoChecking={isAutoChecking}
          isExporting={isExporting}
          onAutoCheck={() => void handleAutoCheck()}
          onExportPdf={() => void handleExportPdf()}
          onRequestLock={() => setIsLockModalOpen(true)}
          onClose={onClose}
        />

        {/* ─── 2. TWO-COLUMN WORKSPACE BODY ─────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: Category Sidebar (Flat background, no borders) */}
          <AuditCategorySidebar
            items={items}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Right: Main Scrollable Content Area */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* ─── LEVEL 1: CATEGORY HEADER ────────────────────── */}
            <div
              style={{
                padding: '16px 28px 12px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: '#ffffff',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    {activeCategoryInfo.title}
                  </h3>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                    {lang === 'en'
                      ? `${activeCategoryInfo.evaluated}/${activeCategoryInfo.total} evaluated`
                      : `${activeCategoryInfo.evaluated}/${activeCategoryInfo.total} tiêu chí đã đánh giá`}
                  </span>
                  {activeCategoryInfo.failed > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                      }}
                    >
                      {activeCategoryInfo.failed} {lang === 'en' ? 'failed' : 'chưa đạt'}
                    </span>
                  )}
                </div>

                {/* Tablet / Mobile category switcher */}
                <div className="audit-mobile-cat-selector">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '12.5px',
                      color: '#334155',
                      outline: 'none',
                    }}
                  >
                    <option value="all">
                      {lang === 'en' ? `All Criteria (${totalItems})` : `Tất cả tiêu chí (${totalItems})`}
                    </option>
                    <option value="priority">
                      {lang === 'en' ? 'Needs Attention' : 'Cần xử lý ưu tiên'}
                    </option>
                    {AUDIT_CATEGORIES.map((cat, idx) => {
                      const count = items.filter((it) => it.category === cat.code).length;
                      return (
                        <option key={cat.code} value={cat.code}>
                          {idx + 1}. {lang === 'en' ? cat.nameEn : cat.nameVi} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {activeCategoryInfo.desc && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.45, maxWidth: '880px' }}>
                  {activeCategoryInfo.desc}
                </p>
              )}
            </div>

            {/* ─── LEVEL 2: FILTER TOOLBAR ─────────────────────── */}
            <AuditFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              methodFilter={methodFilter}
              onMethodFilterChange={setMethodFilter}
              counts={filterCounts}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* ─── LEVEL 3: CHECKLIST ROWS ─────────────────────── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 28px 24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#64748b',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                    {lang === 'en' ? 'No criteria match the selected filters' : 'Không có tiêu chí nào khớp với bộ lọc'}
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                    {lang === 'en'
                      ? 'Try clearing the search query or switching to another category.'
                      : 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn lại nhóm danh mục khác.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleResetFilters}
                      style={{ fontSize: '13px', background: '#f1f5f9', border: 'none', padding: '6px 14px', borderRadius: '4px' }}
                    >
                      {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
                    </button>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <ChecklistItemCard
                    key={item.resultId}
                    item={item}
                    isLocked={isLocked}
                    farmId={farmId}
                    runId={currentRun.runId}
                    selectedCategory={selectedCategory}
                    farmMapUrl={farmMapUrl}
                    onUpdate={handleItemUpdate}
                  />
                ))
              )}
            </div>

            {/* ─── 3. MAIN AREA FOOTER (Summary & Close only, NO DUPLICATE PDF BUTTON) ─── */}
            <footer
              style={{
                background: '#ffffff',
                borderTop: '1px solid #f1f5f9',
                padding: '12px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              <div>
                <div>
                  <span>
                    {selectedCategory === 'all'
                      ? lang === 'en'
                        ? `Showing ${filteredItems.length} of ${totalItems} criteria`
                        : `Hiển thị ${filteredItems.length} / ${totalItems} tiêu chí`
                      : lang === 'en'
                        ? `Showing ${filteredItems.length} of ${categoryScopedItems.length} criteria in group`
                        : `Hiển thị ${filteredItems.length} / ${categoryScopedItems.length} tiêu chí trong nhóm`}
                  </span>
                  {hasActiveFilters && (
                    <span style={{ marginLeft: '6px', color: '#059669', fontWeight: 600 }}>
                      ({lang === 'en' ? 'Filtered' : 'Đang lọc'})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', marginTop: '3px' }}>
                  {lang === 'en'
                    ? 'Internal VietGAP Self-Assessment Dossier in compliance with TCVN 11892-1:2017 & transitional TCVN 11892-1:2026.'
                    : 'Biên bản Tự kiểm tra & Đánh giá nội bộ phục vụ công tác chuẩn bị hồ sơ chứng nhận theo TCVN 11892-1:2017 & chuyển tiếp TCVN 11892-1:2026.'}
                </div>
              </div>

              <div>
                <button className={'ui-close-action'}
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '6px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'en' ? 'Close' : 'Đóng'}
                </button>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Confirmation Modal for Lock Dossier */}
      <AuditConfirmationModal
        isOpen={isLockModalOpen}
        pendingCount={pendingItems}
        isLoading={isLocking}
        onConfirm={() => void handleConfirmLock()}
        onClose={() => setIsLockModalOpen(false)}
      />
    </div>
  );
}
