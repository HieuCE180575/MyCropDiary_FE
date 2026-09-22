export type ModuleGroup = 'public' | 'account' | 'farm' | 'production' | 'operations' | 'compliance' | 'reports' | 'ai' | 'admin';

export interface ModuleDefinition {
  key: string;
  path: string;
  title: string;
  ucRange: string;
  group: ModuleGroup;
}
