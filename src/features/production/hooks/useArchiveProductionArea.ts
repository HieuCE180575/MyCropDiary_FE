import { useState } from 'react';
import { archiveProductionArea } from '../productionAreaService';
import type { ProductionArea } from '../types';

/** Quản lý trạng thái hộp thoại xác nhận + gọi API lưu trữ một khu sản xuất. */
export function useArchiveProductionArea(onArchived: (area: ProductionArea) => void) {
  const [target, setTarget] = useState<ProductionArea | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestArchive(area: ProductionArea) {
    setError(null);
    setTarget(area);
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
      const updated = await archiveProductionArea(target.productionAreaId);
      onArchived(updated);
      setTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu trữ khu sản xuất thất bại. Vui lòng thử lại.');
    } finally {
      setArchiving(false);
    }
  }

  return { target, requestArchive, cancelArchive, confirmArchive, archiving, error };
}