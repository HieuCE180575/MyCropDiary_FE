import { useRef, type ReactNode } from 'react';

export function tabPanelProps(idPrefix: string, value: string) {
  return { id: `${idPrefix}-panel-${value}`, role: 'tabpanel',
    'aria-labelledby': `${idPrefix}-tab-${value}`, tabIndex: 0 };
}

/** Manual activation: arrows move focus; Enter/Space activate the focused tab. */
export function TabList<T extends string>({ idPrefix, label, value, items, onChange, inset = false }: {
  idPrefix: string;
  label: string;
  value: T;
  items: readonly { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  inset?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  return <div ref={root} className={`ui-tab-list${inset ? ' ui-tab-list--inset' : ''}`} role="tablist" aria-label={label}>
    {items.map(item => <button key={item.value} type="button" role="tab"
      id={`${idPrefix}-tab-${item.value}`} aria-controls={`${idPrefix}-panel-${item.value}`}
      aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1}
      disabled={item.disabled} onClick={() => { if (value !== item.value) onChange(item.value); }}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? []);
        if (!buttons.length) return;
        event.preventDefault();
        const index = buttons.indexOf(event.currentTarget);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}>{item.label}</button>)}
  </div>;
}
