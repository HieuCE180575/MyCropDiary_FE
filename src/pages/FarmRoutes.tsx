import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { FarmInfoPage } from './FarmInfoPage';
import { NotFoundPage } from './NotFoundPage';

export function FarmDetailRoute() {
  const { farmId = '' } = useParams();
  if (!/^[1-9]\d*$/.test(farmId) || !Number.isSafeInteger(Number(farmId))) return <NotFoundPage />;
  return <FarmInfoPage key={farmId} defaultTab="detail" />;
}

export function LegacyFarmRoute() {
  const [params] = useSearchParams();
  const { selectedFarm, loading } = useFarmWorkspace();
  if (loading) return null;
  const farmId = params.get('farmId') || selectedFarm?.id;
  if (params.get('tab') === 'register') return <Navigate to="/farms/new" replace />;
  const detail = params.get('edit') === '1' || params.get('view') === 'detail' || params.has('farmId');
  return <Navigate to={detail && farmId ? `/farms/${farmId}${params.get('edit') === '1' ? '?edit=1' : ''}` : '/farms'} replace />;
}
