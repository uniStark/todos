import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getAIConfig,
  getModelName,
  getSystemPrompt,
  formatTodosForAI,
  AIFeatureSettings,
} from '@/lib/chatStorage';
import { getOrCreateCurrentSession, addChatMessage, clearCurrentSession } from '@/lib/db/chatRepo';
import { listTodos, getTodo, insertTodo, updateTodo } from '@/lib/db/todosRepo';
import { listGroups, insertGroup } from '@/lib/db/groupsRepo';
import { requireUser, isSameOrigin, unauthorized, forbidden } from '@/lib/auth/session';
import { ChatMessage, AIActions, AIExecutionResult, AIModelType, Todo, Group } from '@/lib/types';

// 获取当前日期时间字符串（包含时分）
function getCurrentDateTimeString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[now.getDay()];
  return `${year}年${month}月${day}日 ${hour}:${minute} (星期${weekDay})`;
}

// 从网关 /models 动态拉取可用模型 id 列表；失败时回退到 [defaultModel]
async function fetchAvailableModels(baseUrl: string, apiKey: string, defaultModel: string): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[AI API GET] Failed to fetch models: ${response.status}`);
      return [defaultModel];
    }

    const data = await response.json();
    const ids = Array.isArray(data?.data)
      ? data.data
          .map((m: { id?: unknown }) => (typeof m?.id === 'string' ? m.id : null))
          .filter((id: string | null): id is string => Boolean(id))
      : [];

    if (ids.length === 0) {
      console.warn('[AI API GET] Gateway returned empty model list, falling back to defaultModel');
      return [defaultModel];
    }

    // 确保 defaultModel 始终在列表中
    return ids.includes(defaultModel) ? ids : [defaultModel, ...ids];
  } catch (error) {
    console.error('[AI API GET] Error fetching models from gateway:', error);
    return [defaultModel];
  } finally {
    clearTimeout(timeoutId);
  }
}

// GET - 获取当前用户的聊天历史和AI配置
export async function GET(request: Request) {
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const session = getOrCreateCurrentSession(auth.userId, Date.now());
    const config = getAIConfig();
    const models = await fetchAvailableModels(config.baseUrl, config.apiKey, config.defaultModel);
    return NextResponse.json({
      session,
      config: {
        defaultModel: config.defaultModel,
        models,
      },
    });
  } catch (error) {
    console.error('[AI API GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 });
  }
}

// POST - 发送消息给AI
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();
  const userId = auth.userId;

  try {
    const { message, model, settings: featureSettings } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const config = getAIConfig();
    const selectedModel: AIModelType = model || config.defaultModel;

    const aiSettings: AIFeatureSettings = {
      enablePriority: featureSettings?.enablePriority ?? true,
      enableGroups: featureSettings?.enableGroups ?? true,
    };

    // 保存用户消息
    const now = Date.now();
    const session = getOrCreateCurrentSession(userId, now);
    const userMessage: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: message,
      timestamp: now,
    };
    addChatMessage(userId, session.id, userMessage, now);

    // 取最近 10 条（含刚加入的用户消息）作为上下文
    const historyMessages = [...session.messages, userMessage]
      .filter((m) => m.role !== 'system')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    // 当前用户未删除的任务与分组
    const allTodos = listTodos(userId).filter((t) => !t.deleted);
    const groups = listGroups(userId);

    const todosText = formatTodosForAI(allTodos, groups, aiSettings);
    const groupsText =
      groups.length > 0 ? groups.map((g) => `- ${g.name} (ID: ${g.id})`).join('\n') : '暂无自定义分组';

    const currentDateTime = getCurrentDateTimeString();
    const systemPrompt = getSystemPrompt(currentDateTime, todosText, groupsText, aiSettings);

    const requestBody = {
      model: getModelName(selectedModel),
      messages: [{ role: 'system', content: systemPrompt }, ...historyMessages],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    };

    console.log(`[AI API] Sending request to ${config.baseUrl}/chat/completions with model: ${getModelName(selectedModel)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI API] Error response: ${response.status} - ${errorText}`);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || '抱歉，我没有收到有效的回复。';

      // 解析并执行 AI 操作（全部限定在当前用户范围）
      const { cleanContent, executionResult } = await parseAndExecuteActions(aiContent, userId, aiSettings);

      const assistantMessage: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: cleanContent,
        timestamp: Date.now(),
        executionResult,
      };
      addChatMessage(userId, session.id, assistantMessage, Date.now());

      return NextResponse.json({ message: assistantMessage, executionResult });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('[AI API POST] Error:', error);

    const errorMessage: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: '抱歉，AI服务暂时不可用。请稍后再试。',
      timestamp: Date.now(),
    };
    try {
      const now = Date.now();
      const session = getOrCreateCurrentSession(userId, now);
      addChatMessage(userId, session.id, errorMessage, now);
    } catch (storageError) {
      console.error('[AI API POST] Failed to save error message:', storageError);
    }

    return NextResponse.json(
      { message: errorMessage, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - 清除当前用户的聊天历史
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const session = clearCurrentSession(auth.userId, Date.now());
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[AI API DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to clear chat session' }, { status: 500 });
  }
}

// 在用户分组缓存里按名（大小写不敏感）查找，不存在则创建并入库
function findOrCreateGroup(userId: string, name: string, cache: Group[], now: number): string {
  const existing = cache.find((g) => g.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const group: Group = { id: randomUUID(), name, createdAt: now };
  insertGroup(userId, group);
  cache.push(group);
  console.log(`[AI API] Created new group: ${name}`);
  return group.id;
}

// 解析并执行 AI 操作（支持多种 JSON 格式），全部限定在 userId 范围
async function parseAndExecuteActions(
  content: string,
  userId: string,
  settings: AIFeatureSettings
): Promise<{ cleanContent: string; executionResult: AIExecutionResult }> {
  let cleanContent = content;
  const executionResult: AIExecutionResult = {
    added: [],
    completed: [],
    deleted: [],
    updated: [],
    errors: [],
  };

  let actions: AIActions | null = null;

  const jsonCodeBlockPattern = /```json\s*([\s\S]*?)\s*```/;
  const jsonMatch = content.match(jsonCodeBlockPattern);
  const actionsPattern = /<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/;
  const actionsMatch = content.match(actionsPattern);
  const directJsonPattern = /\{[\s\S]*"actions"[\s\S]*\}/;
  const directMatch = content.match(directJsonPattern);

  if (jsonMatch) {
    cleanContent = cleanContent.replace(jsonCodeBlockPattern, '').trim();
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      actions = parsed.actions || parsed;
    } catch (e) {
      console.error('[AI API] Failed to parse JSON code block:', e);
    }
  } else if (actionsMatch) {
    cleanContent = cleanContent.replace(actionsPattern, '').trim();
    try {
      actions = JSON.parse(actionsMatch[1].trim());
    } catch (e) {
      console.error('[AI API] Failed to parse ACTIONS block:', e);
    }
  } else if (directMatch) {
    const jsonStartIndex = content.lastIndexOf('{');
    if (jsonStartIndex > content.length / 2) {
      cleanContent = content.substring(0, jsonStartIndex).trim();
      try {
        const parsed = JSON.parse(directMatch[0]);
        actions = parsed.actions || parsed;
      } catch (e) {
        console.error('[AI API] Failed to parse direct JSON:', e);
      }
    }
  }

  if (!actions) {
    return { cleanContent, executionResult };
  }

  const now = Date.now();
  const groupsCache = listGroups(userId);

  console.log('[AI API] Executing actions:', JSON.stringify(actions, null, 2));

  // 添加
  if (actions.add && Array.isArray(actions.add)) {
    for (const addAction of actions.add) {
      try {
        let groupId = 'default';
        if (settings.enableGroups && addAction.groupName) {
          groupId = findOrCreateGroup(userId, addAction.groupName, groupsCache, now);
        }

        const newTodo: Todo = {
          id: randomUUID(),
          text: addAction.text,
          completed: addAction.isCompleted || false,
          createdAt: addAction.createdAt ? new Date(addAction.createdAt).getTime() : now,
          groupId,
          priority: settings.enablePriority ? addAction.priority || 'P2' : 'P2',
          dueDate: addAction.dueDate,
        };
        if (addAction.isCompleted) {
          newTodo.completedAt = addAction.completedAt ? new Date(addAction.completedAt).getTime() : now;
        }

        insertTodo(userId, newTodo);
        executionResult.added.push({ id: newTodo.id, text: newTodo.text });
      } catch (err) {
        console.error('[AI API] Failed to add todo:', err);
        executionResult.errors.push(`添加任务失败: ${addAction.text}`);
      }
    }
  }

  // 完成
  if (actions.complete && Array.isArray(actions.complete)) {
    for (const todoId of actions.complete) {
      const todo = getTodo(userId, todoId);
      if (todo && !todo.completed && !todo.deleted) {
        updateTodo(userId, { ...todo, completed: true, completedAt: Date.now() });
        executionResult.completed.push({ id: todoId, text: todo.text });
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
      }
    }
  }

  // 删除
  if (actions.delete && Array.isArray(actions.delete)) {
    for (const todoId of actions.delete) {
      const todo = getTodo(userId, todoId);
      if (todo && !todo.deleted) {
        updateTodo(userId, { ...todo, deleted: true, deletedAt: Date.now() });
        executionResult.deleted.push({ id: todoId, text: todo.text });
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
      }
    }
  }

  // 更新
  if (actions.update && Array.isArray(actions.update)) {
    for (const updateAction of actions.update) {
      const todo = getTodo(userId, updateAction.id);
      if (todo && !todo.deleted) {
        const updated: Todo = { ...todo };
        if (updateAction.text) updated.text = updateAction.text;
        if (settings.enablePriority && updateAction.priority) updated.priority = updateAction.priority;
        if (updateAction.dueDate !== undefined) updated.dueDate = updateAction.dueDate;
        if (settings.enableGroups && updateAction.groupName) {
          updated.groupId = findOrCreateGroup(userId, updateAction.groupName, groupsCache, now);
        }
        updateTodo(userId, updated);
        executionResult.updated.push({ id: updateAction.id, text: updated.text });
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${updateAction.id}`);
      }
    }
  }

  return { cleanContent, executionResult };
}
