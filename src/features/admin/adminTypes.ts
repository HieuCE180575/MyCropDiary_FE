export type Collection =
  | 'registrations'
  | 'farms'
  | 'zones'
  | 'blocks'
  | 'users'
  | 'crops'
  | 'rules'
  | 'articles'
  | 'feedback'
  | 'audit';

export interface AdminRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  [key: string]: string;
}

export interface SeasonSummary {
  month: string;
  planned: number;
  active: number;
  completed: number;
  cancelled: number;
  cost: number;
  checked: number;
  complete: number;
}

export type AdminState = Record<Collection, AdminRecord[]> & { seasons: SeasonSummary[] };

export type EditableCollection = 'farms' | 'zones' | 'blocks' | 'users' | 'registrations' | 'crops' | 'rules' | 'articles';
export type StatusCollection = 'farms' | 'zones' | 'blocks' | 'users' | 'crops' | 'rules' | 'articles';

export interface Field {
  key: string;
  label: string;
  type?: 'textarea' | 'select';
  options?: Record<string, string>;
  required?: boolean;
  maxLength?: number;
}

export interface CollectionConfig {
  title: string;
  description: string;
  icon: string;
  singular: string;
  statuses: Record<string, string>;
  columns: { key: string; label: string }[];
  fields: Field[];
  details?: Field[];
  createLabel?: string;
  allowEdit?: boolean;
}

export type AdminCommand =
  | { type: 'save'; collection: EditableCollection; id?: string; values: Record<string, string> }
  | { type: 'status'; collection: StatusCollection; id: string; status: string }
  | { type: 'review'; collection: 'registrations'; id: string; status: 'APPROVED' | 'REJECTED'; reason: string }
  | { type: 'feedback'; collection: 'feedback'; id: string; status: string; reply: string };
