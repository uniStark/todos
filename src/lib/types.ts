export type Priority = 'P0' | 'P1' | 'P2';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  deleted?: boolean;
  deletedAt?: number;
  groupId?: string;
  priority?: Priority;
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

export const DEFAULT_GROUP_ID = 'default';

export interface Stats {
  pv: number;
  uv: number;
}
