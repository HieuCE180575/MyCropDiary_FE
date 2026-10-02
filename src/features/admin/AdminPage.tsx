import { AdminCollectionPage } from './AdminCollectionPage';
import { AdminDashboard } from './AdminDashboard';
import { AdminStatistics } from './AdminStatistics';
import { collectionFromPath } from './adminModel';

export function AdminPage({ moduleKey }: { moduleKey: string }) {
  if (moduleKey === 'admin') return <AdminDashboard />;
  if (moduleKey === 'admin-statistics') return <AdminStatistics />;
  const collection = collectionFromPath(moduleKey);
  return collection ? <AdminCollectionPage key={collection} collection={collection} /> : null;
}
