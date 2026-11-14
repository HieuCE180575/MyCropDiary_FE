import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

export type StatusFilterKey = 'all' | 'pending' | 'fail' | 'missing_evidence' | 'auto' | 'pass';

interface AuditFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilterKey;
  onStatusFilterChange: (status: StatusFilterKey) => void;
  counts: {
    all: number;
    pending: number;
    fail: number;
    missing_evidence: number;
    auto: number;
    pass: number;
  };
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function AuditFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  onResetFilters,
  hasActiveFilters,
}: AuditFiltersProps) {
  const { lang } = useLanguage();

  const filterOptions: { key: StatusFilterKey; labelVi: string; labelEn: string; count: number }[] = [
    { key: 'all', labelVi: 'Tất cả', labelEn: 'All', count: counts.all },
    { key: 'pending', labelVi: 'Chờ đánh giá', labelEn: 'Pending', count: counts.pending },
    { key: 'fail', labelVi: 'Chưa đạt', labelEn: 'Fail', count: counts.fail },
    { key: 'missing_evidence', labelVi: 'Thiếu minh chứng', labelEn: 'Missing Evidence', count: counts.missing_evidence },
    { key: 'auto', labelVi: 'Tự đối soát', labelEn: 'Auto-evaluated', count: counts.auto },
    { key: 'pass', labelVi: 'Đạt chuẩn', labelEn: 'Pass', count: counts.pass },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {/* ─── Filter Tabs / Chips (Flat, NO BORDER) ───────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => {
          const isActive = statusFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusFilterChange(opt.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                background: isActive ? '#ecfdf5' : 'transparent',
                color: isActive ? '#065f46' : '#64748b',
                cursor: 'pointer',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              <span>{lang === 'en' ? opt.labelEn : opt.labelVi}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#059669' : '#94a3b8',
                }}
              >
                ({opt.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search & Reset Filters ──────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
            <Icon name="search" size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={lang === 'en' ? 'Search criteria...' : 'Tìm theo mã hoặc tên...'}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              border: 'none',
              background: '#f8fafc',
              borderRadius: '6px',
              fontSize: '12.5px',
              boxSizing: 'border-box',
              outline: 'none',
              color: '#0f172a',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
              aria-label="Clear search"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#64748b',
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Icon name="refresh" size={12} />
            <span>{lang === 'en' ? 'Reset' : 'Đặt lại lọc'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
