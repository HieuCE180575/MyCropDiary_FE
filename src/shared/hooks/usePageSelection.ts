import { useEffect, useState, type ChangeEvent } from 'react';

/** Selection belongs to the visible page and resets when its scope changes. */
export function usePageSelection(ids: number[], scope: string) {
  const key = JSON.stringify([scope, ids]);
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>({ key, ids: [] });
  const selected = selection.key === key ? selection.ids : [];
  useEffect(() => {
    setSelection(previous => previous.key === key ? previous : { key, ids: [] });
  }, [key]);
  const toggle = (id: number, checked: boolean) => setSelection(previous => {
    const current = previous.key === key ? previous.ids : [];
    return { key, ids: checked ? [...current.filter(value => value !== id), id] : current.filter(value => value !== id) };
  });
  return {
    isSelected: (id: number) => selected.includes(id),
    toggle,
    rowProps: (id: number) => ({
      checked: selected.includes(id),
      onChange: (event: ChangeEvent<HTMLInputElement>) => toggle(id, event.target.checked),
    }),
    allProps: {
      checked: ids.length > 0 && selected.length === ids.length,
      disabled: ids.length === 0,
      ref: (input: HTMLInputElement | null) => {
        if (input) input.indeterminate = selected.length > 0 && selected.length < ids.length;
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => setSelection({ key, ids: event.target.checked ? [...ids] : [] }),
    },
  };
}
