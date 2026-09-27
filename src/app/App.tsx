import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
// import { PublicLayout } from './layouts/PublicLayout';
import { moduleDefinitions } from './routes/moduleDefinitions';
import { DashboardPage } from '../pages/DashboardPage';
import { FarmInfoPage } from '../pages/FarmInfoPage';
// import { FarmRegistrationPage } from '../pages/FarmRegistrationPage';
// import { KnowledgePage } from '../pages/KnowledgePage';
import { LoginPage } from '../pages/LoginPage';
import { ModulePage } from '../pages/ModulePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Khu vực công khai: khách xem trước khi có tài khoản, không dùng AppLayout */}
      {/* <Route element={<PublicLayout />}>
        <Route path="/knowledge" element={<KnowledgePage />} />
      </Route> */}

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* <Route path="/farm-registration" element={<FarmRegistrationPage />} /> */}
        <Route path="/farm" element={<FarmInfoPage />} />
        {moduleDefinitions
          .filter((module) => !['knowledge', 'farm-registration', 'farm'].includes(module.key))
          .map((module) => (
            <Route
              key={module.key}
              path={module.path}
              element={<ModulePage module={module} />}
            />
          ))}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}