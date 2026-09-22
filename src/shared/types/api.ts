export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export type SystemRole = 'USER' | 'ADMIN';
export type FarmRole = 'OWNER' | 'STAFF';
