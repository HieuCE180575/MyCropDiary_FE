import type { FarmSummary } from '../farm-management/api';
import type { ModuleDefinition } from '../../shared/types/module';

export function farmRole(farm: FarmSummary | null | undefined): 'OWNER' | 'STAFF' | null {
  if (farm?.status !== 'ACTIVE') return null;
  return farm.currentUserRole === 'OWNER' || farm.currentUserRole === 'STAFF' ? farm.currentUserRole : null;
}

export function canAccessModule(module: ModuleDefinition, systemRole: string | undefined, farm: FarmSummary | null): boolean {
  if (systemRole !== 'USER' && systemRole !== 'ADMIN') return false;
  switch (module.access) {
    case 'account': return true;
    case 'user': return systemRole === 'USER';
    case 'admin': return systemRole === 'ADMIN';
    // Administrative access alone never grants operational farm permissions.
    case 'farm': return farmRole(farm) !== null;
    case 'owner': return farmRole(farm) === 'OWNER';
  }
}
