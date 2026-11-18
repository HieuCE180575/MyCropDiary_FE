import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

export type StatusFilterKey = 'all' | 'pending' | 'fail' | 'missing_evidence' | 'pass';
export type MethodFilterKey = 'all' | 'auto' | 'field';

interface AuditFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilterKey;
  onStatusFilterChange: (status: StatusFilterKey) => void;
  methodFilter: MethodFilterKey;
  onMethodFilterChange: (method: MethodFilterKey) => void;
  counts: {
    all: number;
    pending: number;
    fail: number;
    missing_evidence: number;
    auto: number;
    field: number;
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
  methodFilter,
  onMethodFilterChange,
  counts,
  onResetFilters,
  hasActiveFilters,
}: AuditFiltersProps) {
  const { lang } = useLanguage();

  const statusOptions: {
    key: StatusFilterKey;
    labelVi: string;
    labelEn: string;
    count: number;
    activeBg: string;
    activeColor: string;
  }[] = [
    { key: 'all', labelVi: 'Tất cả', labelEn: 'All', count: counts.all, activeBg: '#f1f5f9', activeColor: '#0f172a' },
    { key: 'pending', labelVi: 'Chờ đánh giá', labelEn: 'Pending', count: counts.pending, activeBg: '#fffbeb', activeColor: '#b45309' },
    { key: 'fail', labelVi: 'Chưa đạt', labelEn: 'Fail', count: counts.fail, activeBg: '#fef2f2', activeColor: '#b91c1c' },
    { key: 'pass', labelVi: 'Đạt chuẩn', labelEn: 'Pass', count: counts.pass, activeBg: '#ecfdf5', activeColor: '#047857' },
    { key: 'missing_evidence', labelVi: 'Thiếu minh chứng', labelEn: 'Missing Evidence', count: counts.missing_evidence, activeBg: '#fff7ed', activeColor: '#c2410c' },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {/* ─── TẦNG 1: PRIMARY STATUS TABS ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {statusOptions.map((opt) => {
          const isActive = statusFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusFilterChange(opt.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: isActive ? 650 : 500,
                border: 'none',
                background: isActive ? opt.activeBg : 'transparent',
                color: isActive ? opt.activeColor : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{lang === 'en' ? opt.labelEn : opt.labelVi}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: isActive ? '#ffffff' : '#f1f5f9',
                  color: isActive ? opt.activeColor : '#64748b',
                }}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TẦNG 2: METHOD TOGGLE + SEARCH + RESET ──────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Method Segmented Toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f8fafc',
            padding: '2px',
            borderRadius: '7px',
            border: '1px solid #e2e8f0',
          }}
          title={lang === 'en' ? 'Filter by audit evaluation method' : 'Lọc theo hình thức đánh giá'}
        >
          {[
            { key: 'all' as MethodFilterKey, labelVi: 'Tất cả', labelEn: 'All', count: counts.all },
            { key: 'auto' as MethodFilterKey, labelVi: '⚡ Tự đối soát', labelEn: '⚡ Auto', count: counts.auto },
            { key: 'field' as MethodFilterKey, labelVi: '📷 Hiện trường', labelEn: '📷 Field', count: counts.field },
          ].map((m) => {
            const isActive = methodFilter === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onMethodFilterChange(m.key)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 600 : 450,
                  boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{lang === 'en' ? m.labelEn : m.labelVi}</span>
                <span style={{ fontSize: '10px', opacity: 0.75 }}>({m.count})</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '200px' }}>
          <div style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
            <Icon name="search" size={13} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={lang === 'en' ? 'Search criteria...' : 'Tìm mã, tên...'}
            style={{
              width: '100%',
              padding: '5px 8px 5px 27px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              borderRadius: '6px',
              fontSize: '12px',
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
                right: '6px',
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
              <Icon name="close" size={11} />
            </button>
          )}
        </div>

        {/* Reset filter button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11.5px',
              color: '#dc2626',
              background: '#fef2f2',
              border: 'none',
              padding: '5px 8px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            title={lang === 'en' ? 'Reset all filters' : 'Khôi phục bộ lọc mặc định'}
          >
            <Icon name="refresh" size={11} />
            <span>{lang === 'en' ? 'Reset' : 'Đặt lại'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
