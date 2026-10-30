import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../../shared/components/Icon';
import type { CropCategoryResp } from './cropSeasonService';

export interface CropCategoryComboboxProps {
  id?: string;
  value: number; // cropCategoryId
  categoryName?: string;
  categories: CropCategoryResp[];
  onChange: (categoryId: number, categoryName: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function CropCategoryCombobox({
  id = 'crop-category-combobox',
  value,
  categoryName = '',
  categories,
  onChange,
  disabled = false,
  placeholder = 'Type to search or enter custom crop (e.g. Rau Muống, Dưa Leo)...',
}: CropCategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'short_term' | 'leafy' | 'fruit' | 'root'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query with selected value / name
  useEffect(() => {
    if (categoryName) {
      setQuery(categoryName);
    } else if (value) {
      const found = categories.find((c) => c.id === value);
      if (found) {
        setQuery(found.categoryName);
      }
    }
  }, [value, categoryName, categories]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories by search query and type filter
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();

    return categories.filter((cat) => {
      // Type pill filter
      if (activeFilter === 'short_term') {
        const isLongTerm = cat.categoryName.toLowerCase().includes('xoài') ||
          cat.categoryName.toLowerCase().includes('cam') ||
          cat.categoryName.toLowerCase().includes('bưởi');
        if (isLongTerm) return false;
      } else if (activeFilter === 'leafy') {
        const name = cat.categoryName.toLowerCase();
        if (!name.includes('rau') && !name.includes('cải') && !name.includes('xà lách') && !name.includes('hành')) return false;
      } else if (activeFilter === 'fruit') {
        const name = cat.categoryName.toLowerCase();
        if (!name.includes('dưa') && !name.includes('cà chua') && !name.includes('ớt') && !name.includes('đậu') && !name.includes('bí')) return false;
      } else if (activeFilter === 'root') {
        const name = cat.categoryName.toLowerCase();
        if (!name.includes('củ') && !name.includes('cà rốt') && !name.includes('khoai')) return false;
      }

      // Query filter
      if (!q) return true;
      const matchName = cat.categoryName.toLowerCase().includes(q);
      const matchDesc = cat.description ? cat.description.toLowerCase().includes(q) : false;
      return matchName || matchDesc;
    });
  }, [categories, query, activeFilter]);

  const exactMatch = categories.find(
    (c) => c.categoryName.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelect = (cat: CropCategoryResp) => {
    setQuery(cat.categoryName);
    onChange(cat.id, cat.categoryName);
    setIsOpen(false);
  };

  const handleCustomInput = (customText: string) => {
    setQuery(customText);
    const match = categories.find(
      (c) => c.categoryName.trim().toLowerCase() === customText.trim().toLowerCase()
    );
    if (match) {
      onChange(match.id, match.categoryName);
    } else {
      // Custom crop entered by user
      onChange(0, customText.trim());
    }
  };

  return (
    <div
      ref={containerRef}
      className="crop-combobox-container"
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        className="crop-combobox-input-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          border: isOpen ? '1.5px solid #10b981' : '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '2px 8px',
          boxShadow: isOpen ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
          <Icon name="leaf" size={17} />
        </span>

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setIsOpen(true);
            handleCustomInput(e.target.value);
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '8px 4px',
            fontSize: '14px',
            background: 'transparent',
            color: '#0f172a',
          }}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange(0, '');
              inputRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '50%',
            }}
            title="Clear"
            aria-label="Clear crop selection"
          >
            ✕
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Toggle crop categories list"
        >
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
      </div>

      {isOpen && (
        <div
          className="crop-combobox-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px 8px',
              borderBottom: '1px solid #f1f5f9',
              overflowX: 'auto',
              marginBottom: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'all' ? '#10b981' : '#f1f5f9',
                color: activeFilter === 'all' ? '#ffffff' : '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('short_term')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'short_term' ? '#10b981' : '#ecfdf5',
                color: activeFilter === 'short_term' ? '#ffffff' : '#059669',
                whiteSpace: 'nowrap',
              }}
            >
              🌱 Cây ngắn ngày
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('leafy')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'leafy' ? '#10b981' : '#f1f5f9',
                color: activeFilter === 'leafy' ? '#ffffff' : '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              🥬 Rau ăn lá
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('fruit')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'fruit' ? '#10b981' : '#f1f5f9',
                color: activeFilter === 'fruit' ? '#ffffff' : '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              🍅 Rau ăn quả
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('root')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'root' ? '#10b981' : '#f1f5f9',
                color: activeFilter === 'root' ? '#ffffff' : '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              🥕 Củ quả
            </button>
          </div>

          {/* Option to create custom crop if user typed something not matching exactly */}
          {query.trim() && !exactMatch && (
            <div
              onClick={() => handleCustomInput(query.trim())}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1px dashed #10b981',
                color: '#065f46',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontWeight: 700, color: '#10b981' }}>+</span>
              <span>
                Thêm cây trồng tự điền: <strong>"{query.trim()}"</strong>
              </span>
            </div>
          )}

          {/* List of matched categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Không tìm thấy cây trồng phù hợp. Bạn có thể tự điền tên cây trồng ở trên!
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = cat.id === value || cat.categoryName.toLowerCase() === query.trim().toLowerCase();
                const isShortTerm = !cat.categoryName.toLowerCase().includes('xoài');

                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelect(cat)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isSelected ? '#ecfdf5' : 'transparent',
                      color: isSelected ? '#065f46' : '#1e293b',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13.5px' }}>
                        {cat.categoryName}
                      </div>
                      {cat.description && (
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                          {cat.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {isShortTerm && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 650,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          Ngắn ngày
                        </span>
                      )}
                      {isSelected && (
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

