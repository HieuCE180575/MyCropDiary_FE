import { useEffect, useState } from 'react';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface UsageActivityContext {
  farmingActivityId: number;
  seasonName?: string | null;
  blockId?: number | null;
  blockName?: string | null;
}

// Resolve the actual linked block; a season may contain several cultivation blocks.
export function useMaterialUsageActivity(open: boolean, activityId: number | '') {
  const [result, setResult] = useState<UsageActivityContext | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setResult(null);
    setFailedId(null);
    if (!open || !activityId) return;
    const controller = new AbortController();
    void apiRequest<ApiResponse<UsageActivityContext>>(`/farming-activities/${activityId}`, { signal: controller.signal })
      .then(response => {
        if (!response.success || response.data?.farmingActivityId !== activityId) throw new Error('Invalid activity response');
        if (!controller.signal.aborted) setResult(response.data);
      })
      .catch(() => { if (!controller.signal.aborted) setFailedId(activityId); });
    return () => controller.abort();
  }, [open, activityId, attempt]);
  return {
    activity: open && result?.farmingActivityId === activityId ? result : null,
    failed: Boolean(open && activityId && failedId === activityId),
    retry: () => setAttempt(value => value + 1),
  };
}
