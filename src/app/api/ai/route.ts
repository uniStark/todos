import { NextResponse } from 'next/server';
import {
  getChatSession,
  addMessage,
  clearChatSession,
  getAIConfig,
  getModelName,
  getSystemPrompt,
  formatTodosForAI,
  AIFeatureSettings,
} from '@/lib/chatStorage';
import { getTodos, saveTodos, getGroups, saveGroups } from '@/lib/storage';
import { unauthorizedResponse, verifyApiKey } from '@/lib/serverAuth';
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

// GET - 获取聊天历史和AI配置
export async function GET(request: Request) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const session = getChatSession();
    const config = getAIConfig();
    return NextResponse.json({
      session,
      config: {
        defaultModel: config.defaultModel,
        models: ['deepseek_v3.1', 'glm4'],
      },
    });
  } catch (error) {
    console.error('[AI API GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 });
  }
}

// POST - 发送消息给AI
export async function POST(request: Request) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { message, model, settings: featureSettings } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const config = getAIConfig();
    const selectedModel: AIModelType = model || config.defaultModel;
    
    // 功能设置（从客户端传递或使用默认值）
    const aiSettings: AIFeatureSettings = {
      enablePriority: featureSettings?.enablePriority ?? true,
      enableGroups: featureSettings?.enableGroups ?? true,
    };

    // 保存用户消息
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    // 获取历史消息用于上下文
    const session = getChatSession();
    const historyMessages = session.messages
      .filter(m => m.role !== 'system')
      .slice(-10)
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    // 获取完整的待办事项列表（未删除的）
    const allTodos = getTodos().filter(t => !t.deleted);
    const groups = getGroups();
    
    // 格式化待办事项和分组供 AI 使用（只给未完成的任务）
    const todosText = formatTodosForAI(allTodos, groups, aiSettings);
    const groupsText = groups.length > 0 
      ? groups.map(g => `- ${g.name} (ID: ${g.id})`).join('\n')
      : '暂无自定义分组';

    // 获取当前日期时间用于系统提示词
    const currentDateTime = getCurrentDateTimeString();
    const systemPrompt = getSystemPrompt(currentDateTime, todosText, groupsText, aiSettings);

    // 构建请求
    const requestBody = {
      model: getModelName(selectedModel),
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    };

    console.log(`[AI API] Sending request to ${config.baseUrl}/chat/completions with model: ${getModelName(selectedModel)}`);

    // 调用AI API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
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

      // 解析并执行 AI 操作
      const { cleanContent, executionResult } = await parseAndExecuteActions(
        aiContent, 
        allTodos, 
        groups,
        aiSettings
      );

      // 保存AI回复
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanContent,
        timestamp: Date.now(),
        executionResult: executionResult,
      };
      addMessage(assistantMessage);

      return NextResponse.json({
        message: assistantMessage,
        executionResult,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('[AI API POST] Error:', error);
    
    // 保存错误消息
    const errorMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '抱歉，AI服务暂时不可用。请稍后再试。',
      timestamp: Date.now(),
    };
    try {
      addMessage(errorMessage);
    } catch (storageError) {
      console.error('[AI API POST] Failed to save error message:', storageError);
    }

    return NextResponse.json({
      message: errorMessage,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE - 清除聊天历史
export async function DELETE(request: Request) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const session = clearChatSession();
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[AI API DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to clear chat session' }, { status: 500 });
  }
}

// 解析并执行 AI 操作（支持多种 JSON 格式）
async function parseAndExecuteActions(
  content: string, 
  currentTodos: Todo[], 
  currentGroups: Group[],
  settings: AIFeatureSettings
): Promise<{
  cleanContent: string;
  executionResult: AIExecutionResult;
}> {
  let cleanContent = content;
  const executionResult: AIExecutionResult = {
    added: [],
    completed: [],
    deleted: [],
    updated: [],
    errors: [],
  };

  // 尝试多种 JSON 解析模式
  let actions: AIActions | null = null;
  
  // 模式1: ```json ... ``` 代码块
  const jsonCodeBlockPattern = /```json\s*([\s\S]*?)\s*```/;
  const jsonMatch = content.match(jsonCodeBlockPattern);
  
  // 模式2: <<<ACTIONS>>> ... <<<END_ACTIONS>>> (兼容旧格式)
  const actionsPattern = /<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/;
  const actionsMatch = content.match(actionsPattern);
  
  // 模式3: 直接的 JSON 对象 { "actions": ... }
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
    // 只有在 JSON 在内容末尾时才移除
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

  // 获取最新的数据
  const todos = getTodos();
  const groups = getGroups();
  // 创建映射时只考虑未删除的任务
  const todoMap = new Map(todos.filter(t => !t.deleted).map(t => [t.id, t]));

  console.log('[AI API] Executing actions:', JSON.stringify(actions, null, 2));

  // 执行添加操作
  if (actions.add && Array.isArray(actions.add)) {
    for (const addAction of actions.add) {
      try {
        // 处理分组（如果启用）
        let groupId = 'default';
        if (settings.enableGroups && addAction.groupName) {
          const existingGroup = groups.find(g => 
            g.name.toLowerCase() === addAction.groupName!.toLowerCase()
          );
          if (existingGroup) {
            groupId = existingGroup.id;
          } else {
            // 创建新分组
            const newGroup: Group = {
              id: crypto.randomUUID(),
              name: addAction.groupName,
              createdAt: Date.now(),
            };
            groups.push(newGroup);
            groupId = newGroup.id;
            console.log(`[AI API] Created new group: ${addAction.groupName}`);
          }
        }

        // 创建新任务
        const newTodo: Todo = {
          id: crypto.randomUUID(),
          text: addAction.text,
          completed: addAction.isCompleted || false,
          createdAt: addAction.createdAt 
            ? new Date(addAction.createdAt).getTime() 
            : Date.now(),
          groupId,
          priority: settings.enablePriority ? (addAction.priority || 'P2') : 'P2',
          dueDate: addAction.dueDate,
        };

        // 如果是已完成的任务
        if (addAction.isCompleted) {
          newTodo.completedAt = addAction.completedAt 
            ? new Date(addAction.completedAt).getTime() 
            : Date.now();
        }

        todos.push(newTodo);
        executionResult.added.push({ id: newTodo.id, text: newTodo.text });
        console.log(`[AI API] Added todo: ${newTodo.id} - "${newTodo.text}"`);
      } catch (err) {
        console.error('[AI API] Failed to add todo:', err);
        executionResult.errors.push(`添加任务失败: ${addAction.text}`);
      }
    }
  }

  // 执行完成操作
  if (actions.complete && Array.isArray(actions.complete)) {
    for (const todoId of actions.complete) {
      const todo = todoMap.get(todoId);
      if (todo && !todo.completed && !todo.deleted) {
        const index = todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
          todos[index].completed = true;
          todos[index].completedAt = Date.now();
          executionResult.completed.push({ id: todoId, text: todo.text });
          console.log(`[AI API] Completed todo: ${todoId} - "${todo.text}"`);
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
        console.warn(`[AI API] Todo not found: ${todoId}`);
      }
    }
  }

  // 执行删除操作
  if (actions.delete && Array.isArray(actions.delete)) {
    for (const todoId of actions.delete) {
      const todo = todoMap.get(todoId);
      if (todo && !todo.deleted) {
        const index = todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
          todos[index].deleted = true;
          todos[index].deletedAt = Date.now();
          executionResult.deleted.push({ id: todoId, text: todo.text });
          console.log(`[AI API] Deleted todo: ${todoId} - "${todo.text}"`);
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
        console.warn(`[AI API] Todo not found: ${todoId}`);
      }
    }
  }

  // 执行更新操作
  if (actions.update && Array.isArray(actions.update)) {
    for (const updateAction of actions.update) {
      const todo = todoMap.get(updateAction.id);
      if (todo && !todo.deleted) {
        const index = todos.findIndex(t => t.id === updateAction.id);
        if (index !== -1) {
          if (updateAction.text) todos[index].text = updateAction.text;
          if (settings.enablePriority && updateAction.priority) {
            todos[index].priority = updateAction.priority;
          }
          if (updateAction.dueDate !== undefined) todos[index].dueDate = updateAction.dueDate;
          
          // 处理分组更新（如果启用）
          if (settings.enableGroups && updateAction.groupName) {
            const existingGroup = groups.find(g => 
              g.name.toLowerCase() === updateAction.groupName!.toLowerCase()
            );
            if (existingGroup) {
              todos[index].groupId = existingGroup.id;
            } else {
              const newGroup: Group = {
                id: crypto.randomUUID(),
                name: updateAction.groupName,
                createdAt: Date.now(),
              };
              groups.push(newGroup);
              todos[index].groupId = newGroup.id;
            }
          }
          
          executionResult.updated.push({ id: updateAction.id, text: todos[index].text });
          console.log(`[AI API] Updated todo: ${updateAction.id}`);
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${updateAction.id}`);
        console.warn(`[AI API] Todo not found for update: ${updateAction.id}`);
      }
    }
  }

  // 保存更改
  if (executionResult.added.length > 0 || 
      executionResult.completed.length > 0 || 
      executionResult.deleted.length > 0 ||
      executionResult.updated.length > 0) {
    saveTodos(todos);
    saveGroups(groups);
    console.log('[AI API] Saved changes to storage');
  }

  return { cleanContent, executionResult };
}
