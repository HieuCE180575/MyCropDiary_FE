import type { FarmSummary } from '../farm-management/api';
import type { ModuleDefinition } from '../../shared/types/module';

export function farmRole(farm: FarmSummary | null | undefined): 'OWNER' | 'STAFF' | null {
  if (!farm?.status) return null;
  const status = farm.status.toUpperCase();
  if (status !== 'ACTIVE') return null;
  const role = farm.currentUserRole?.toUpperCase();
  if (role === 'OWNER') return 'OWNER';
  if (role === 'STAFF' || role === 'MEMBER' || role === 'MANAGER') return 'STAFF';
  return null;
}

export function canAccessModule(module: ModuleDefinition, systemRole: string | undefined, farm: FarmSummary | null): boolean {
  const role = systemRole?.toUpperCase();
  if (role !== 'USER' && role !== 'ADMIN') return false;
  switch (module.access) {
    case 'account': return true;
    case 'user': return role === 'USER';
    case 'admin': return role === 'ADMIN';
    // Administrative access alone never grants operational farm permissions.
    case 'farm': return farmRole(farm) !== null;
    case 'owner': return farmRole(farm) === 'OWNER';
  }
}
