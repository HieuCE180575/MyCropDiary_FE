import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { moduleDefinitions } from './routes/moduleDefinitions';
import { DashboardPage } from '../pages/DashboardPage';
import { FarmInfoPage } from '../pages/FarmInfoPage';
import { FarmRegistrationPage } from '../pages/FarmRegistrationPage';
import { KnowledgePage } from '../pages/KnowledgePage';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { FeaturesPage } from '../pages/FeaturesPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ModulePage } from '../pages/ModulePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../features/auth';
import { ModuleAccess } from '../features/auth/ModuleAccess';
import { AdminPage } from '../features/admin/AdminPage';
import { ZoneListPage, ZoneFormPage, ZoneDetailPage } from '../pages/zone';


export function App() {
  return (
    <Routes>
      {/* Public pages wrapped in shared PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
      </Route>

      {/* Protected pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route path="/farm-registration" element={<FarmRegistrationPage />} />
          <Route path="/farm" element={<FarmInfoPage />} />
          <Route path="/zones" element={<ZoneListPage />} />
          <Route path="/zones/new" element={<ZoneFormPage mode="create" />} />
          <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
          <Route path="/zones/:zoneId/edit" element={<ZoneFormPage mode="edit" />} />

          <Route path="/production-areas" element={<ZoneListPage />} />
          <Route path="/production-areas/new" element={<ZoneFormPage mode="create" />} />
          <Route path="/production-areas/:productionAreaId" element={<ZoneDetailPage />} />
          <Route path="/production-areas/:productionAreaId/edit" element={<ZoneFormPage mode="edit" />} />
          {moduleDefinitions.map((module) => (
            <Route
              key={module.key}
              path={module.path}
              element={
                <ModuleAccess module={module}>
                  {module.access === 'admin' ? (
                    <AdminPage moduleKey={module.key} />
                  ) : (
                    <ModulePage module={module} />
                  )}
                </ModuleAccess>
              }
            />
          ))}
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
