import type { ModuleDefinition } from '../shared/types/module';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { Icon } from '../shared/components/Icon';
import { UserProfilePanel } from '../features/auth/UserProfilePanel';
import { FarmInfoPage } from './FarmInfoPage';
import { FarmRegistrationPage } from './FarmRegistrationPage';
import { KnowledgePage } from './KnowledgePage';
import { StaffManagementPage } from '../features/staff/StaffManagementPage';
import { ZoneListPage } from './zone';
import { FarmingActivitiesPage } from '../features/operations/FarmingActivitiesPage';
import { MaterialUsagePage } from '../features/operations/MaterialUsagePage';
import { HarvestPage } from '../features/operations/HarvestPage';
import { InputPurchasesPage } from '../features/operations/InputPurchasesPage';
import { SuppliersPage } from '../features/operations/SuppliersPage';
import { CropSeasonsPage } from '../features/operations/CropSeasonsPage';
import { TasksPage } from '../features/operations/TasksPage';
import { VietGAPCompliancePage } from '../features/compliance/VietGAPCompliancePage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { AIAssistantPage } from '../features/ai/AIAssistantPage';

export function ModulePage({ module }: { module: ModuleDefinition }) {
  const { user } = useAuth();
  if (module.key === 'password') return <Navigate to="/profile" replace />;

  if (module.key === 'farm') return <FarmInfoPage />;
  if (module.key === 'farm-registration') return <FarmRegistrationPage />;
  if (module.key === 'knowledge') return <KnowledgePage />;
  if (module.key === 'workers' || module.key === 'members') return <StaffManagementPage />;
  if (module.key === 'production') return <ZoneListPage />;
  if (module.key === 'activities') return <FarmingActivitiesPage />;
  if (module.key === 'materials') return <MaterialUsagePage />;
  if (module.key === 'harvests') return <HarvestPage />;
  if (module.key === 'seasons') return <CropSeasonsPage />;
  if (module.key === 'tasks') return <TasksPage />;
  if (module.key === 'checklists') return <VietGAPCompliancePage initialTab="checklists" />;
  if (module.key === 'assessments') return <VietGAPCompliancePage initialTab="assessments" />;
  if (module.key === 'environment') return <VietGAPCompliancePage initialTab="environment" />;
  if (module.key === 'training') return <VietGAPCompliancePage initialTab="training" />;
  if (module.key === 'reports') return <ReportsPage initialTab="reports" />;
  if (module.key === 'expenses') return <ReportsPage initialTab="expenses" />;
  if (module.key === 'purchases') return <InputPurchasesPage />;
  if (module.key === 'suppliers') return <SuppliersPage />;
  if (module.key === 'ai') return <AIAssistantPage initialTab="ai" />;
  if (module.key === 'ai-history') return <AIAssistantPage initialTab="ai-history" />;
  if (module.key === 'ai-feedback') return <AIAssistantPage initialTab="ai-feedback" />;
  if (module.key === 'ai-drafts') return <AIAssistantPage initialTab="ai-drafts" />;

  const displayName = user?.fullName?.trim() || user?.email || 'Người dùng VietGAP';

  return (
    <section className="profile-page-section">
      <div className="page-heading">
        <div>
          <h1>Xin chào, {displayName}!</h1>
          <p className="module-description">{module.description}</p>
        </div>
      </div>
      <div className="profile-container">
        {/* Profile Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-avatar-wrap">
            <span className="profile-hero-avatar">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Icon name="user" />
              )}
            </span>
            <span className="profile-hero-status-dot" title="Tài khoản trực tuyến"></span>
          </div>
          <div className="profile-hero-info">
            <div className="profile-hero-badges">
              <span className="profile-tag-pill">
                <Icon name="leaf" /> Hồ sơ cá nhân
              </span>
            </div>
            <h2 className="profile-hero-name">{displayName}</h2>
            <p className="profile-hero-email">
              <Icon name="mail" /> {user?.email || 'Chưa cập nhật email'}
            </p>
          </div>
        </div>

        <div className="profile-layout">
          <UserProfilePanel />
        </div>
      </div>
    </section>
  );
}
