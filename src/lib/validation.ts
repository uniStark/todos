// 纯函数输入校验模块 —— 零 Node 依赖（不 import fs/crypto/db/server-only），
// 客户端组件也可安全 import（不会破坏 Capacitor 的 output:'export' 静态导出）。

export const TODO_TEXT_MAX = 2000;
export const GROUP_NAME_MAX = 50;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type Priority = 'P0' | 'P1' | 'P2';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// text：必须是字符串，trim 后非空且长度 <= TODO_TEXT_MAX。返回去除首尾空格后的值。
function validateText(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') return { ok: false, error: '任务内容必须为文本' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: '任务内容不能为空' };
  if (trimmed.length > TODO_TEXT_MAX) {
    return { ok: false, error: `任务内容不能超过 ${TODO_TEXT_MAX} 个字符` };
  }
  return { ok: true, value: trimmed };
}

// priority：缺省（undefined/null）放行；否则只接受 'P0' | 'P1' | 'P2'。
function validatePriority(raw: unknown): ValidationResult<Priority | undefined> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (raw === 'P0' || raw === 'P1' || raw === 'P2') return { ok: true, value: raw };
  return { ok: false, error: '优先级只能是 P0、P1 或 P2' };
}

// dueDate：缺省（undefined/null/空串）放行（视为未设置）；否则必须是合法的 ISO 日期/日期时间串。
// 接受 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm（可带秒/时区），用 Date 解析 + 正则双重校验，避免 "2026-99-99" 这类被宽松解析。
function validateDueDate(raw: unknown): ValidationResult<string | undefined> {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: undefined };
  if (typeof raw !== 'string') return { ok: false, error: '截止时间格式非法' };

  const v = raw.trim();
  // YYYY-MM-DD 或 YYYY-MM-DD[T ]HH:mm(:ss)?(.sss)?(Z|±HH:mm)?
  const isoPattern =
    /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!isoPattern.test(v)) {
    return { ok: false, error: '截止时间需为 ISO 日期格式' };
  }
  const ts = Date.parse(v);
  if (Number.isNaN(ts)) {
    return { ok: false, error: '截止时间不是有效日期' };
  }
  return { ok: true, value: v };
}

// groupId：缺省放行；否则必须是非空字符串。归属校验在 route 层查 DB 完成，这里只做类型/格式。
function validateGroupId(raw: unknown): ValidationResult<string | undefined> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, error: '分组 ID 非法' };
  }
  return { ok: true, value: raw };
}

function validateBoolean(raw: unknown, field: string): ValidationResult<boolean | undefined> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw !== 'boolean') return { ok: false, error: `${field} 必须为布尔值` };
  return { ok: true, value: raw };
}

// 时间戳（毫秒）：缺省放行；否则必须是有限正整数样的数字。
function validateTimestamp(raw: unknown, field: string): ValidationResult<number | undefined> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    return { ok: false, error: `${field} 必须为有效时间戳` };
  }
  return { ok: true, value: raw };
}

export function validateTodoCreate(body: unknown): ValidationResult<{
  text: string;
  priority?: Priority;
  dueDate?: string;
  groupId?: string;
  completed?: boolean;
  createdAt?: number;
  completedAt?: number;
}> {
  if (!isObject(body)) return { ok: false, error: '请求体格式非法' };

  const text = validateText(body.text);
  if (!text.ok) return text;

  const priority = validatePriority(body.priority);
  if (!priority.ok) return priority;

  const dueDate = validateDueDate(body.dueDate);
  if (!dueDate.ok) return dueDate;

  const groupId = validateGroupId(body.groupId);
  if (!groupId.ok) return groupId;

  const completed = validateBoolean(body.completed, '完成状态');
  if (!completed.ok) return completed;

  const createdAt = validateTimestamp(body.createdAt, '创建时间');
  if (!createdAt.ok) return createdAt;

  const completedAt = validateTimestamp(body.completedAt, '完成时间');
  if (!completedAt.ok) return completedAt;

  // 忽略未知字段：只回传白名单内的字段
  const value: {
    text: string;
    priority?: Priority;
    dueDate?: string;
    groupId?: string;
    completed?: boolean;
    createdAt?: number;
    completedAt?: number;
  } = { text: text.value };
  if (priority.value !== undefined) value.priority = priority.value;
  if (dueDate.value !== undefined) value.dueDate = dueDate.value;
  if (groupId.value !== undefined) value.groupId = groupId.value;
  if (completed.value !== undefined) value.completed = completed.value;
  if (createdAt.value !== undefined) value.createdAt = createdAt.value;
  if (completedAt.value !== undefined) value.completedAt = completedAt.value;

  return { ok: true, value };
}

export function validateTodoUpdate(body: unknown): ValidationResult<{
  id: string;
  text?: string;
  priority?: Priority;
  dueDate?: string;
  groupId?: string;
  completed?: boolean;
  completedAt?: number;
  createdAt?: number;
}> {
  if (!isObject(body)) return { ok: false, error: '请求体格式非法' };

  if (typeof body.id !== 'string' || body.id.trim().length === 0) {
    return { ok: false, error: '任务 ID 必填' };
  }

  const value: {
    id: string;
    text?: string;
    priority?: Priority;
    dueDate?: string;
    groupId?: string;
    completed?: boolean;
    completedAt?: number;
    createdAt?: number;
  } = { id: body.id };

  // text 在 update 里是可选的；提供时按 create 同样的规则校验（非空且 <= max）
  if (body.text !== undefined) {
    const text = validateText(body.text);
    if (!text.ok) return text;
    value.text = text.value;
  }

  const priority = validatePriority(body.priority);
  if (!priority.ok) return priority;
  if (priority.value !== undefined) value.priority = priority.value;

  const dueDate = validateDueDate(body.dueDate);
  if (!dueDate.ok) return dueDate;
  if (dueDate.value !== undefined) value.dueDate = dueDate.value;

  const groupId = validateGroupId(body.groupId);
  if (!groupId.ok) return groupId;
  if (groupId.value !== undefined) value.groupId = groupId.value;

  const completed = validateBoolean(body.completed, '完成状态');
  if (!completed.ok) return completed;
  if (completed.value !== undefined) value.completed = completed.value;

  const completedAt = validateTimestamp(body.completedAt, '完成时间');
  if (!completedAt.ok) return completedAt;
  if (completedAt.value !== undefined) value.completedAt = completedAt.value;

  const createdAt = validateTimestamp(body.createdAt, '创建时间');
  if (!createdAt.ok) return createdAt;
  if (createdAt.value !== undefined) value.createdAt = createdAt.value;

  return { ok: true, value };
}

export function validateGroupName(name: unknown): ValidationResult<string> {
  if (typeof name !== 'string') return { ok: false, error: '分组名称必须为文本' };
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: '分组名称不能为空' };
  if (trimmed.length > GROUP_NAME_MAX) {
    return { ok: false, error: `分组名称不能超过 ${GROUP_NAME_MAX} 个字符` };
  }
  return { ok: true, value: trimmed };
}
