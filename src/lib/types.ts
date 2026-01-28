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
  dueDate?: string; // ISO datetime string (YYYY-MM-DDTHH:mm or YYYY-MM-DD)
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

// AI Chat Types
export type ChatRole = 'user' | 'assistant' | 'system';
export type AIModelType = 'glm4' | 'deepseek_v3.1';

// AI 操作类型 - 统一的操作接口
export interface AIActions {
  // 添加新任务
  add?: AIAddAction[];
  // 完成任务（通过 ID）
  complete?: string[];
  // 删除任务（通过 ID）
  delete?: string[];
  // 更新任务（通过 ID）
  update?: AIUpdateAction[];
}

export interface AIAddAction {
  text: string;
  priority?: Priority;
  groupName?: string;
  dueDate?: string;
  // 用于记录过去已完成的事项
  isCompleted?: boolean;
  createdAt?: string;
  completedAt?: string;
}

export interface AIUpdateAction {
  id: string;
  text?: string;
  priority?: Priority;
  groupName?: string;
  dueDate?: string;
}

// 执行结果
export interface AIExecutionResult {
  added: { id: string; text: string }[];
  completed: { id: string; text: string }[];
  deleted: { id: string; text: string }[];
  updated: { id: string; text: string }[];
  errors: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  // 新架构：AI 执行的操作结果
  executionResult?: AIExecutionResult;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  models: {
    glm4: string;
    deepseek_v3_1: string;
  };
  defaultModel: AIModelType;
  temperature: number;
  maxTokens: number;
  timeout: number;
}
