export type ModuleGroup = 'public' | 'account' | 'farm' | 'production' | 'operations' | 'compliance' | 'reports' | 'ai' | 'admin';

export interface ModuleDefinition {
  key: string;
  path: string;
  title: string;
  ucRange: string;
  group: ModuleGroup;
  access: 'account' | 'user' | 'farm' | 'owner' | 'admin';
  icon: string;
  description: string;
}
