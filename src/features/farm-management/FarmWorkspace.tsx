import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useAuth } from '../auth';
import { farmRole } from '../auth/accessPolicy';
import { useApiData } from '../../shared/hooks/useApiData';
import { getFarms, type FarmSummary } from './api';

interface Workspace {
  farms: FarmSummary[];
  selectedFarm: FarmSummary | null;
  selectFarm: (id: number | null) => void;
  loading: boolean;
  error: string | undefined;
  retry: () => void;
}
const WorkspaceContext = createContext<Workspace | null>(null);

export function FarmWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    if (user?.systemRole !== 'USER') return [];
    const farms: FarmSummary[] = [];
    // Roles are returned only for active memberships by the farms API.
    for (let page = 0; ; page++) {
      const result = await getFarms(signal, page);
      farms.push(...result.items.filter((farm) => farmRole(farm) !== null));
      if (result.last || page + 1 >= result.totalPages) break;
    }
    return farms;
  }, [user?.userId, user?.systemRole]);
  const { data, loading, error, retry } = useApiData(load);
  const farms = !loading && !error ? data ?? [] : [];
  const selectedFarm = farms.find((farm) => farm.id === selectedId) ?? null;
  return <WorkspaceContext.Provider value={{ farms, selectedFarm, selectFarm: setSelectedId, loading, error, retry }}>{children}</WorkspaceContext.Provider>;
}

export function useFarmWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('Farm workspace is unavailable.');
  return context;
}
