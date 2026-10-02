import type { ModuleDefinition } from '../../shared/types/module';

export const moduleDefinitions: ModuleDefinition[] = [
  { key: 'knowledge', path: 'knowledge', title: 'Kiến thức VietGAP', ucRange: 'UC-01–03', group: 'public' },
  { key: 'profile', path: 'profile', title: 'Hồ sơ cá nhân', ucRange: 'UC-05–08', group: 'account' },
  { key: 'farm-registration', path: 'farm-registration', title: 'Đăng ký trang trại', ucRange: 'UC-09, 39', group: 'farm' },
  { key: 'ai', path: 'ai', title: 'Trợ lý AI', ucRange: 'UC-10–12, 32, 44', group: 'ai' },
  { key: 'farm', path: 'farm', title: 'Thông tin trang trại', ucRange: 'UC-13', group: 'farm' },
  { key: 'members', path: 'members', title: 'Nhân sự & phân công', ucRange: 'UC-14–15, 33–34', group: 'farm' },
  { key: 'production', path: 'production-areas', title: 'Khu sản xuất & lô', ucRange: 'UC-16', group: 'production' },
  { key: 'plot', path: 'land-plots', title: 'Lô đất', ucRange: 'UC-17', group: 'production' },
  { key: 'environment', path: 'environment', title: 'Điều kiện & môi trường', ucRange: 'UC-18–21', group: 'production' },
  { key: 'seasons', path: 'crop-seasons', title: 'Mùa vụ', ucRange: 'UC-22', group: 'operations' },
  { key: 'tasks', path: 'tasks', title: 'Công việc', ucRange: 'UC-23', group: 'operations' },
  { key: 'activities', path: 'activities', title: 'Nhật ký canh tác', ucRange: 'UC-24', group: 'operations' },
  { key: 'materials', path: 'materials', title: 'Vật tư & sử dụng', ucRange: 'UC-25, 35–36', group: 'operations' },
  { key: 'harvests', path: 'harvests', title: 'Thu hoạch & truy xuất', ucRange: 'UC-26, 30', group: 'operations' },
  { key: 'training', path: 'training', title: 'Đào tạo', ucRange: 'UC-27', group: 'compliance' },
  { key: 'checklists', path: 'checklists', title: 'Checklist VietGAP', ucRange: 'UC-28, 42', group: 'compliance' },
  { key: 'assessments', path: 'assessments', title: 'Đánh giá nội bộ', ucRange: 'UC-29', group: 'compliance' },
  { key: 'expenses', path: 'expenses', title: 'Chi phí', ucRange: 'UC-37', group: 'reports' },
  { key: 'reports', path: 'reports', title: 'Báo cáo sản xuất', ucRange: 'UC-31, 38', group: 'reports' },
  { key: 'admin', path: 'admin', title: 'Quản trị hệ thống', ucRange: 'UC-39–45', group: 'admin' },
];
