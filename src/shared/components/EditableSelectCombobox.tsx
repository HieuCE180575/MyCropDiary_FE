import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface EditableSelectComboboxProps {
  id: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

export function EditableSelectCombobox({
  id,
  value,
  options,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  maxLength = 60,
}: EditableSelectComboboxProps) {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value.toLowerCase() === (value || '').trim().toLowerCase()),
    [options, value],
  );

  // Sync display text when value changes externally (e.g. opening Edit modal or Voice auto-fill)
  useEffect(() => {
    if (!isTyping) {
      setQuery(selectedOption ? selectedOption.label : value || '');
    }
  }, [value, selectedOption, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = isTyping ? query.trim().toLowerCase() : '';
    if (!q) return options;
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }, [options, query, isTyping]);

  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(
    () =>
      options.some(
        (opt) =>
          opt.label.toLowerCase() === trimmedQuery.toLowerCase() ||
          opt.value.toLowerCase() === trimmedQuery.toLowerCase(),
      ),
    [options, trimmedQuery],
  );

  const handleSelectOption = (opt: ComboboxOption) => {
    setQuery(opt.label);
    setIsTyping(false);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(opt.value);
  };

  const handleInputChange = (nextText: string) => {
    setQuery(nextText);
    setIsTyping(true);
    setIsOpen(true);
    setActiveIndex(-1);
    const exact = options.find(
      (opt) =>
        opt.label.toLowerCase() === nextText.trim().toLowerCase() ||
        opt.value.toLowerCase() === nextText.trim().toLowerCase(),
    );
    onChange(exact ? exact.value : nextText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      return;
    }
    if (e.key === 'Enter' && isOpen) {
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        e.preventDefault();
        handleSelectOption(filteredOptions[activeIndex]);
      } else {
        setIsOpen(false);
        setIsTyping(false);
      }
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="text"
          className="ui-input"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={
            placeholder ||
            (lang === 'en' ? 'Select or type a custom value...' : 'Chọn hoặc nhập giá trị tùy chỉnh...')
          }
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', paddingRight: '36px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={lang === 'en' ? 'Toggle suggestions' : 'Mở danh sách gợi ý'}
          onClick={() => {
            if (disabled) return;
            setIsTyping(false);
            setIsOpen((prev) => !prev);
          }}
          style={{
            position: 'absolute',
            right: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-muted)',
            cursor: disabled ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
        >
          <Icon name="chevron" size={16} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredOptions.map((opt, idx) => {
            const isSelected = opt.value.toLowerCase() === (value || '').trim().toLowerCase();
            const isHighlighted = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectOption(opt);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: '7px',
                  background: isSelected
                    ? 'var(--color-success-bg)'
                    : isHighlighted
                      ? 'var(--color-subtle)'
                      : 'transparent',
                  color: isSelected ? 'var(--color-primary-text)' : 'var(--color-text)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Icon name="check" size={14} />}
              </button>
            );
          })}

          {trimmedQuery && !hasExactMatch && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(trimmedQuery);
                setIsTyping(false);
                setIsOpen(false);
                onChange(trimmedQuery);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                border: 'none',
                borderTop: filteredOptions.length > 0 ? '1px dashed var(--color-border)' : 'none',
                borderRadius: '7px',
                background: 'transparent',
                color: 'var(--color-primary-text)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {lang === 'en' ? `Use custom: "${trimmedQuery}"` : `Dùng giá trị tự nhập: "${trimmedQuery}"`}
            </button>
          )}

          {filteredOptions.length === 0 && !trimmedQuery && (
            <div style={{ padding: '8px 10px', fontSize: '13px', color: 'var(--color-muted)' }}>
              {lang === 'en' ? 'No suggestions' : 'Không có gợi ý'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
