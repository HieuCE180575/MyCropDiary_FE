export type Collection = 'registrations' | 'users' | 'crops' | 'rules' | 'articles' | 'feedback' | 'audit';
export interface AdminRecord { id: string; name: string; status: string; createdAt: string; [key: string]: string }
export interface SeasonSummary { month: string; planned: number; active: number; completed: number; cancelled: number; cost: number; checked: number; complete: number }
export type AdminState = Record<Collection, AdminRecord[]> & { seasons: SeasonSummary[] };
export interface Field { key: string; label: string; type?: 'textarea' | 'select'; options?: Record<string, string>; required?: boolean; maxLength?: number }
export interface CollectionConfig {
  title: string; description: string; icon: string; singular: string;
  statuses: Record<string, string>; columns: { key: string; label: string }[];
  fields: Field[]; details?: Field[]; createLabel?: string;
}
export type AdminCommand =
  | { type: 'save'; collection: 'crops' | 'rules' | 'articles'; id?: string; values: Record<string, string> }
  | { type: 'status'; collection: 'users' | 'crops' | 'rules' | 'articles'; id: string; status: string }
  | { type: 'review'; collection: 'registrations'; id: string; status: 'APPROVED' | 'REJECTED'; reason: string }
  | { type: 'feedback'; collection: 'feedback'; id: string; status: string; reply: string };
