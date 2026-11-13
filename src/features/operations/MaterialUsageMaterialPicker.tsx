import { Icon } from '../../shared/components/Icon';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { MaterialOption } from './MaterialUsagePage';
import { materialTypeLabel, materialUnitLabel } from './materialUsageLabels';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function MaterialUsageMaterialPicker({ materials, value, onChange, fallbackName, error }: {
  materials: MaterialOption[];
  value: number | '';
  onChange: (value: number | '') => void;
  fallbackName?: string;
  error?: string;
}) {
  const { lang, t: translate } = useLanguage();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = materials.find(material => material.id === value);
  const filtered = materials.filter(material => normalize(`${material.materialName} ${material.materialType ?? ''} ${materialTypeLabel(material.materialType ?? '', lang)} ${materialUnitLabel(material.unit, lang)}`).includes(normalize(keyword.trim())));
  const caption = selected ? `${selected.materialName} (${materialUnitLabel(selected.unit, lang)})`
    : value ? fallbackName || (lang === 'en' ? 'Selected material' : 'Vật tư đang chọn')
      : (lang === 'en' ? 'Select material' : 'Chọn vật tư');

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target && !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, keyword]);
  const choose = (id: number | '') => {
    onChange(id);
    setOpen(false);
    trigger.current?.focus();
  };

  return <div className="mu-material-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button id="usage-material" ref={trigger} type="button" role="combobox" aria-label={lang === 'en' ? 'Material' : 'Vật tư'}
      aria-expanded={open} aria-controls="usage-material-options" aria-haspopup="listbox" aria-required="true"
      aria-invalid={Boolean(error)} aria-describedby={error ? 'usage-material-error' : undefined}
      className="mu-material-picker-trigger" onClick={() => { setKeyword(''); setActive(0); setOpen(!open); }}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); setActive(0); } }}>
      <span>{caption}</span><Icon name="chevron" size={16} />
    </button>
    {open && <div className="mu-material-picker-panel">
      <div className="mu-search-input"><Icon name="search" size={16} /><input className="ui-input" id="usage-material-search" ref={search} type="search"
        aria-label={lang === 'en' ? 'Find materials' : 'Tìm vật tư'} aria-controls="usage-material-options"
        aria-activedescendant={filtered[active] ? `usage-material-option-${filtered[active].id}` : undefined}
        placeholder={lang === 'en' ? 'Search by name or type...' : 'Tìm theo tên hoặc loại vật tư…'} value={keyword}
        onChange={event => { setKeyword(event.target.value); setActive(0); }} onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
          if (event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active].id); }
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          }
        }} /></div>
      <div id="usage-material-options" role="listbox" aria-label={lang === 'en' ? 'Materials' : 'Danh sách vật tư'}>
        {filtered.map((material, index) => <button key={material.id} id={`usage-material-option-${material.id}`} type="button" role="option"
          tabIndex={-1} aria-selected={value === material.id} data-active={active === index} onPointerMove={() => setActive(index)} onClick={() => choose(material.id)}>
          <span>{material.materialName}<small>{materialTypeLabel(material.materialType ?? '', lang)} · {materialUnitLabel(material.unit, lang)}</small></span>
          {value === material.id && <Icon name="check-circle" size={16} />}
        </button>)}
      </div>
      {!filtered.length && <p role="status" className="mu-entry-help">{lang === 'en' ? 'No matching materials. Try another keyword.' : 'Không tìm thấy vật tư phù hợp. Thử từ khóa khác.'}</p>}
      {value !== '' && <button type="button" className="mu-material-picker-clear" onClick={() => choose('')}>{lang === 'en' ? 'Clear selection' : 'Bỏ chọn vật tư'}</button>}
    </div>}
    {error && <p id="usage-material-error" role="alert" className="mu-field-error">{translate(error)}</p>}
  </div>;
}
