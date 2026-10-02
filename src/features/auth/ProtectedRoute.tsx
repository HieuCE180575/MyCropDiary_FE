import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.systemRole !== 'ADMIN' && /^\/admin(?:\/|$)/i.test(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
