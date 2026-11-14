import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { AUDIT_CATEGORIES } from './types';
import type { ChecklistResultItemResp } from '../vietgapComplianceService';

interface AuditCategorySidebarProps {
  items: ChecklistResultItemResp[];
  selectedCategory: string; // 'all' | 'priority' | categoryCode
  onSelectCategory: (code: string) => void;
}

export function AuditCategorySidebar({
  items,
  selectedCategory,
  onSelectCategory,
}: AuditCategorySidebarProps) {
  const { lang } = useLanguage();

  const totalItems = items.length;
  // Aggregate criteria with fail OR (pass with missing evidence) - no double counting
  const priorityItemsCount = items.filter(
    (it) => it.resultStatus === 'fail' || (it.resultStatus === 'pass' && it.isMissingEvidence)
  ).length;

  return (
    <aside
      className="audit-category-sidebar"
      style={{
        width: '280px',
        flexShrink: 0,
        background: '#f8fafc',
        borderRight: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '16px 12px',
        gap: '16px',
      }}
    >
      {/* ─── SECTION 1: TỔNG QUAN (OVERVIEW) ──────────────── */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0 8px 6px',
          }}
        >
          {lang === 'en' ? 'Overview' : 'Tổng quan'}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {/* Item: Tất cả tiêu chí */}
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '44px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedCategory === 'all' ? '#ecfdf5' : 'transparent',
              color: selectedCategory === 'all' ? '#065f46' : '#334155',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon
                name="check"
                size={14}
                style={{ color: selectedCategory === 'all' ? '#10b981' : '#64748b' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: selectedCategory === 'all' ? 600 : 500,
                }}
              >
                {lang === 'en' ? 'All Criteria' : 'Tất cả tiêu chí'}
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 650,
                padding: '1px 6px',
                borderRadius: '4px',
                background: selectedCategory === 'all' ? '#d1fae5' : '#e2e8f0',
                color: selectedCategory === 'all' ? '#065f46' : '#475569',
              }}
            >
              {totalItems}
            </span>
          </button>

          {/* Item: Cần xử lý ưu tiên */}
          <button
            type="button"
            onClick={() => onSelectCategory('priority')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '44px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedCategory === 'priority' ? '#fef2f2' : 'transparent',
              color: selectedCategory === 'priority' ? '#991b1b' : '#334155',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon
                name="warning"
                size={14}
                style={{ color: selectedCategory === 'priority' ? '#ef4444' : '#f59e0b' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: selectedCategory === 'priority' ? 600 : 500,
                }}
              >
                {lang === 'en' ? 'Needs Attention' : 'Cần xử lý ưu tiên'}
              </span>
            </div>
            {priorityItemsCount > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: selectedCategory === 'priority' ? '#ef4444' : '#fee2e2',
                  color: selectedCategory === 'priority' ? '#ffffff' : '#b91c1c',
                }}
              >
                {priorityItemsCount}
              </span>
            ) : (
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>0</span>
            )}
          </button>
        </nav>
      </div>

      {/* ─── SECTION 2: DANH MỤC ĐÁNH GIÁ (7 NHÓM VIETGAP) ── */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0 8px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{lang === 'en' ? 'Assessment Chapters' : 'Danh mục đánh giá'}</span>
          <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#94a3b8' }}>
            7 {lang === 'en' ? 'groups' : 'nhóm'}
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {AUDIT_CATEGORIES.map((cat, idx) => {
            const catItems = items.filter((it) => it.category === cat.code);
            const totalInCat = catItems.length;
            const processedInCat = catItems.filter((it) => it.resultStatus !== 'pending').length;
            const failedInCat = catItems.filter((it) => it.resultStatus === 'fail').length;
            const isCompleted = totalInCat > 0 && processedInCat === totalInCat;
            const isAllPassed = isCompleted && failedInCat === 0;
            const isSelected = selectedCategory === cat.code;
            const progressPercent = totalInCat > 0 ? (processedInCat / totalInCat) * 100 : 0;
            const numLabel = String(idx + 1).padStart(2, '0');

            return (
              <button
                key={cat.code}
                type="button"
                onClick={() => onSelectCategory(cat.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '48px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSelected ? '#ecfdf5' : 'transparent',
                  color: isSelected ? '#065f46' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Dòng 1 (Main line): Số thứ tự + Tên danh mục đầy đủ */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: isSelected ? '#047857' : '#94a3b8',
                      lineHeight: '1.4',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {numLabel}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 500,
                      lineHeight: '1.35',
                      color: isSelected ? '#065f46' : '#1e293b',
                      flex: 1,
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {lang === 'en' ? cat.nameEn : cat.nameVi}
                  </span>
                </div>

                {/* Dòng 2 (Sub line): Trạng thái và tiến độ */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    paddingLeft: '22px', // Căn thẳng với lề chữ sau số thứ tự
                    fontSize: '11.5px',
                    lineHeight: '1.3',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {isAllPassed ? (
                      <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span>✓</span>
                        <span>{lang === 'en' ? 'Completed' : 'Hoàn thành'}</span>
                        <span style={{ color: '#047857', opacity: 0.8 }}>({processedInCat}/{totalInCat})</span>
                      </span>
                    ) : (
                      <>
                        <span style={{ color: isSelected ? '#047857' : '#64748b' }}>
                          {lang === 'en'
                            ? `Evaluated ${processedInCat}/${totalInCat}`
                            : `Đã đánh giá ${processedInCat}/${totalInCat}`}
                        </span>
                        {failedInCat > 0 && (
                          <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                            · {failedInCat} {lang === 'en' ? 'failed' : 'chưa đạt'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Mini progress bar: CHỈ hiển thị cho danh mục ĐANG CHỌN (Active) */}
                {isSelected && (
                  <div
                    style={{
                      width: 'calc(100% - 22px)',
                      marginLeft: '22px',
                      height: '2.5px',
                      background: '#d1fae5',
                      borderRadius: '2px',
                      marginTop: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: '#10b981',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
