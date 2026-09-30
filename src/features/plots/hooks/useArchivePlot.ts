import { useState } from 'react';
import { archivePlot } from '../plotService';
import type { Plot } from '../types';

/** Quản lý trạng thái hộp thoại xác nhận + gọi API lưu trữ một lô đất. */
export function useArchivePlot(onArchived: (plot: Plot) => void) {
  const [target, setTarget] = useState<Plot | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestArchive(plot: Plot) {
    setError(null);
    setTarget(plot);
  }

  function cancelArchive() {
    setTarget(null);
    setError(null);
  }

  async function confirmArchive() {
    if (!target) return;
    setArchiving(true);
    setError(null);
    try {
      const updated = await archivePlot(target.plotId);
      onArchived(updated);
      setTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu trữ lô đất thất bại. Vui lòng thử lại.');
    } finally {
      setArchiving(false);
    }
  }

  return { target, requestArchive, cancelArchive, confirmArchive, archiving, error };
}
