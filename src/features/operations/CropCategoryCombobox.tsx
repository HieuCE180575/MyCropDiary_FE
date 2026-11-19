import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useState, useRef, useEffect, useMemo } from 'react';

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
  required = false,
  disabled = false,
  placeholder = 'Type to search or enter custom crop (e.g. Rau Muống, Dưa Leo)...',
}: CropCategoryComboboxProps) {
  const { lang, t: translate } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
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

  useEffect(() => setActiveIndex(-1), [query, activeFilter, categories]);
  useEffect(() => { if (disabled) setIsOpen(false); }, [disabled]);
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      document.getElementById(`${id}-option-${filteredCategories[activeIndex]?.id}`)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeIndex, isOpen, id, filteredCategories]);

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
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          inputRef.current?.focus();
          setIsOpen(false);
        }
      }}
    >
      <div
        className={`crop-combobox-input-wrap${isOpen ? ' is-open' : ''}`}
      >
        <span style={{ color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', padding: '0 6px' }} aria-hidden="true"><Icon name="leaf" size={17} /></span>

        <input className="ui-input"
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-options` : undefined}
          aria-required={required}
          aria-activedescendant={isOpen && filteredCategories[activeIndex] ? `${id}-option-${filteredCategories[activeIndex].id}` : undefined}
          value={query}
          disabled={disabled}
          placeholder={translate(placeholder)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex(index => filteredCategories.length ?
                (index + (event.key === 'ArrowDown' ? 1 : index < 0 ? 0 : -1) + filteredCategories.length) % filteredCategories.length : -1);
            } else if (event.key === 'Enter' && isOpen) {
              event.preventDefault();
              const selected = filteredCategories[activeIndex];
              if (selected) handleSelect(selected);
              else { handleCustomInput(query); setIsOpen(false); }
            }
          }}
          onChange={(e) => {
            setIsOpen(true);
            handleCustomInput(e.target.value);
          }}
        />

        {query && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setQuery('');
              onChange(0, '');
              inputRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '50%',
            }}
            title={translate("Clear")}
            aria-label={translate("Clear crop selection")}
          >
            ✕
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-body)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label={translate("Toggle crop categories list")}
          aria-expanded={isOpen}
        >
          <Icon name="chevron" size={16} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
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
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
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
              borderBottom: '1px solid var(--color-subtle)',
              overflowX: 'auto',
              marginBottom: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              aria-pressed={activeFilter === 'all'}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'all' ? 'var(--color-primary)' : 'var(--color-subtle)',
                color: activeFilter === 'all' ? 'var(--color-on-primary)' : 'var(--color-body)',
                whiteSpace: 'nowrap',
              }}
            >{translate("All")}</button>
            <button
              type="button"
              onClick={() => setActiveFilter('short_term')}
              aria-pressed={activeFilter === 'short_term'}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'short_term' ? 'var(--color-primary)' : 'var(--color-success-bg)',
                color: activeFilter === 'short_term' ? 'var(--color-on-primary)' : 'var(--color-primary-text)',
                whiteSpace: 'nowrap',
              }}
            >
              {(lang === 'en' ? "Short-season crops" : "Cây ngắn ngày")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('leafy')}
              aria-pressed={activeFilter === 'leafy'}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'leafy' ? 'var(--color-primary)' : 'var(--color-subtle)',
                color: activeFilter === 'leafy' ? 'var(--color-on-primary)' : 'var(--color-body)',
                whiteSpace: 'nowrap',
              }}
            >
              {(lang === 'en' ? "🥬 Leafy vegetables" : "🥬 Rau ăn lá")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('fruit')}
              aria-pressed={activeFilter === 'fruit'}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'fruit' ? 'var(--color-primary)' : 'var(--color-subtle)',
                color: activeFilter === 'fruit' ? 'var(--color-on-primary)' : 'var(--color-body)',
                whiteSpace: 'nowrap',
              }}
            >
              {(lang === 'en' ? "🍅 Fruiting vegetables" : "🍅 Rau ăn quả")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('root')}
              aria-pressed={activeFilter === 'root'}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'root' ? 'var(--color-primary)' : 'var(--color-subtle)',
                color: activeFilter === 'root' ? 'var(--color-on-primary)' : 'var(--color-body)',
                whiteSpace: 'nowrap',
              }}
            >
              {(lang === 'en' ? "🥕 Root crops" : "🥕 Củ quả")}
            </button>
          </div>

          {/* Option to create custom crop if user typed something not matching exactly */}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={() => { handleCustomInput(query.trim()); inputRef.current?.focus(); setIsOpen(false); }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--color-success-bg)',
                border: '1px dashed var(--color-primary)',
                color: 'var(--color-primary-text)',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>+</span>
              <span>
                {(lang === 'en' ? "Add a custom crop: " : "Thêm cây trồng tự điền: ")} <strong>"{query.trim()}"</strong>
              </span>
            </button>
          )}

          {/* List of matched categories */}
          <div id={`${id}-options`} role="listbox" aria-label={translate("Crop categories")} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-body)', fontSize: '13px' }}>
                {(lang === 'en' ? "No matching crops. You can enter a custom crop name above!" : "Không tìm thấy cây trồng phù hợp. Bạn có thể tự điền tên cây trồng ở trên!")}
              </div>
            ) : (
              filteredCategories.map((cat, index) => {
                const isSelected = cat.id === value || cat.categoryName.toLowerCase() === query.trim().toLowerCase();
                const isShortTerm = !cat.categoryName.toLowerCase().includes('xoài');

                return (
                  <div
                    key={cat.id}
                    id={`${id}-option-${cat.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => handleSelect(cat)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isSelected ? 'var(--color-success-bg)' : 'transparent',
                      color: isSelected ? 'var(--color-primary-text)' : 'var(--color-text)',
                      transition: 'background 0.12s ease',
                      outline: activeIndex === index ? '2px solid var(--color-field-focus)' : undefined,
                      outlineOffset: '-2px',
                    }}
                    onMouseEnter={(e) => {
                      setActiveIndex(index);
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-page)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13.5px' }}>
                        {translate(cat.categoryName)}
                      </div>
                      {cat.description && (
                        <div style={{ fontSize: '11.5px', color: 'var(--color-body)', marginTop: '1px' }}>
                          {translate(cat.description)}
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
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                          }}
                        >
                          {(lang === 'en' ? "Short season" : "Ngắn ngày")}
                        </span>
                      )}
                      {isSelected && (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '14px' }}>
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
