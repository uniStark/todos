'use client';

import { Todo, Group, AIActions, AIExecutionResult, AIModelType, Priority, ChatMessage, ChatSession } from './types';
import { getMobileTodos, saveMobileTodos, getMobileGroups, saveMobileGroups, getMobileChatSession, saveMobileChatSession } from './mobileStorage';
import { Preferences } from '@capacitor/preferences';

// AI 配置
const AI_CONFIG = {
  apiKey: '***REMOVED-API-KEY***',
  baseUrl: 'https://api.siliconflow.cn/v1',
  models: {
    glm4: 'zai-org/GLM-4.6',
    deepseek_v3_1: 'deepseek-ai/DeepSeek-V3.1-Terminus',
  },
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 60,
};

// 获取模型名称
const getModelName = (model: AIModelType): string => {
  switch (model) {
    case 'glm4':
      return AI_CONFIG.models.glm4;
    case 'deepseek_v3.1':
      return AI_CONFIG.models.deepseek_v3_1;
    default:
      return AI_CONFIG.models.deepseek_v3_1;
  }
};

// 获取当前日期时间字符串
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

// AI 功能设置
interface AIFeatureSettings {
  enablePriority: boolean;
  enableGroups: boolean;
}

// 格式化待办事项列表
const formatTodosForAI = (
  todos: Todo[], 
  groups: Group[],
  settings: AIFeatureSettings
): string => {
  const activeTodos = todos.filter(t => !t.deleted && !t.completed);
  
  if (activeTodos.length === 0) {
    return '暂无待办事项';
  }

  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  return activeTodos.map(t => {
    const parts = [
      `- ID: "${t.id}"`,
      `  内容: "${t.text}"`,
    ];
    
    if (settings.enablePriority) {
      parts.push(`  优先级: ${t.priority || 'P2'}`);
    }
    
    if (t.dueDate) {
      parts.push(`  截止时间: ${t.dueDate}`);
    }
    
    if (settings.enableGroups && t.groupId && t.groupId !== 'default') {
      const groupName = groupMap.get(t.groupId) || t.groupId;
      parts.push(`  分组: ${groupName}`);
    }
    
    return parts.join('\n');
  }).join('\n\n');
};

// 生成系统提示词
const getSystemPrompt = (
  currentDateTime: string, 
  todosText: string, 
  groupsText: string,
  settings: AIFeatureSettings
): string => {
  const addFields: string[] = [
    '      "text": "任务内容"',
  ];
  
  if (settings.enablePriority) {
    addFields.push('      "priority": "P0/P1/P2"  // 可选，P0紧急/P1重要/P2普通(默认)');
  }
  
  addFields.push('      "dueDate": "YYYY-MM-DDTHH:mm"  // 可选，截止时间');
  
  if (settings.enableGroups) {
    addFields.push('      "groupName": "分组名称"  // 可选，不存在会自动创建');
  }
  
  addFields.push('      "isCompleted": false  // 可选，true表示记录过去已完成的事项');

  const updateFields: string[] = [
    '      "id": "任务ID"',
    '      "text": "新内容"  // 可选',
  ];
  
  if (settings.enablePriority) {
    updateFields.push('      "priority": "P1"  // 可选');
  }
  
  updateFields.push('      "dueDate": "2026-01-30T10:00"  // 可选');
  
  if (settings.enableGroups) {
    updateFields.push('      "groupName": "新分组"  // 可选');
  }

  return `你是一个智能待办事项助手。请用自然语言回复用户，如果需要操作待办事项，在回复末尾输出 JSON。

【当前时间】${currentDateTime}

${settings.enableGroups ? `【分组列表】\n${groupsText || '暂无分组'}\n` : ''}
【待办事项列表】（仅显示未完成的任务）
${todosText}

===== 输出格式 =====
当需要操作待办事项时，在回复末尾添加 JSON：

\`\`\`json
{
  "actions": {
    "add": [
      {
${addFields.join(',\n')}
      }
    ],
    "complete": ["任务ID1", "任务ID2"],
    "delete": ["任务ID1", "任务ID2"],
    "update": [
      {
${updateFields.join(',\n')}
      }
    ]
  }
}
\`\`\`

===== 操作说明 =====
- **add**: 添加新任务，text 必填，其他可选
- **complete**: 将任务标记为已完成，填写任务 ID 数组
- **delete**: 删除/取消任务，填写任务 ID 数组
- **update**: 修改任务，id 必填，其他可选

===== 日期解析 =====
基于当前时间 ${currentDateTime}：
- "今天" → 当前日期
- "明天" → +1天
- "后天" → +2天
- "下午3点" → 15:00
- "晚上8点" → 20:00

===== 重要规则 =====
1. 只使用待办事项列表中存在的 ID
2. 理解用户意图，模糊匹配任务名称
3. 支持批量操作（如"今天任务都完成了"）
4. 无操作时不输出 JSON
5. 先用自然语言回复，再附加 JSON
6. 如果用户描述过去完成的事情（如"我昨天散步了"），创建已完成的任务记录（isCompleted: true, createdAt, completedAt）`;
};

// 解析并执行 AI 操作
async function parseAndExecuteActions(
  content: string, 
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
      console.error('[MobileAI] Failed to parse JSON code block:', e);
    }
  } else if (actionsMatch) {
    cleanContent = cleanContent.replace(actionsPattern, '').trim();
    try {
      actions = JSON.parse(actionsMatch[1].trim());
    } catch (e) {
      console.error('[MobileAI] Failed to parse ACTIONS block:', e);
    }
  } else if (directMatch) {
    const jsonStartIndex = content.lastIndexOf('{');
    if (jsonStartIndex > content.length / 2) {
      cleanContent = content.substring(0, jsonStartIndex).trim();
      try {
        const parsed = JSON.parse(directMatch[0]);
        actions = parsed.actions || parsed;
      } catch (e) {
        console.error('[MobileAI] Failed to parse direct JSON:', e);
      }
    }
  }

  if (!actions) {
    return { cleanContent, executionResult };
  }

  // 获取本地数据
  let todos = await getMobileTodos();
  let groups = await getMobileGroups();
  const todoMap = new Map(todos.filter(t => !t.deleted).map(t => [t.id, t]));

  console.log('[MobileAI] Executing actions:', JSON.stringify(actions, null, 2));

  // 执行添加操作
  if (actions.add && Array.isArray(actions.add)) {
    for (const addAction of actions.add) {
      try {
        let groupId = 'default';
        if (settings.enableGroups && addAction.groupName) {
          const existingGroup = groups.find(g => 
            g.name.toLowerCase() === addAction.groupName!.toLowerCase()
          );
          if (existingGroup) {
            groupId = existingGroup.id;
          } else {
            const newGroup: Group = {
              id: crypto.randomUUID(),
              name: addAction.groupName,
              createdAt: Date.now(),
            };
            groups.push(newGroup);
            groupId = newGroup.id;
          }
        }

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

        if (addAction.isCompleted) {
          newTodo.completedAt = addAction.completedAt 
            ? new Date(addAction.completedAt).getTime() 
            : Date.now();
        }

        todos.push(newTodo);
        executionResult.added.push({ id: newTodo.id, text: newTodo.text });
      } catch (err) {
        console.error('[MobileAI] Failed to add todo:', err);
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
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
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
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${todoId}`);
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
        }
      } else if (!todo) {
        executionResult.errors.push(`任务不存在: ${updateAction.id}`);
      }
    }
  }

  // 保存更改
  if (executionResult.added.length > 0 || 
      executionResult.completed.length > 0 || 
      executionResult.deleted.length > 0 ||
      executionResult.updated.length > 0) {
    await saveMobileTodos(todos);
    await saveMobileGroups(groups);
    console.log('[MobileAI] Saved changes to local storage');
  }

  return { cleanContent, executionResult };
}

// 移动端 AI 聊天服务
export async function sendMobileAIMessage(
  message: string,
  model: AIModelType = 'deepseek_v3.1',
  settings: AIFeatureSettings = { enablePriority: true, enableGroups: true }
): Promise<{
  message: ChatMessage;
  executionResult: AIExecutionResult;
}> {
  // 保存用户消息
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
    timestamp: Date.now(),
  };
  
  const session = await getMobileChatSession();
  session.messages.push(userMessage);
  await saveMobileChatSession(session);

  try {
    // 获取本地数据
    const allTodos = (await getMobileTodos()).filter(t => !t.deleted);
    const groups = await getMobileGroups();
    
    // 格式化数据
    const todosText = formatTodosForAI(allTodos, groups, settings);
    const groupsText = groups.length > 0 
      ? groups.map(g => `- ${g.name} (ID: ${g.id})`).join('\n')
      : '暂无自定义分组';

    // 获取历史消息
    const historyMessages = session.messages
      .filter(m => m.role !== 'system')
      .slice(-10)
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    // 构建请求
    const currentDateTime = getCurrentDateTimeString();
    const systemPrompt = getSystemPrompt(currentDateTime, todosText, groupsText, settings);

    const requestBody = {
      model: getModelName(model),
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      stream: false,
    };

    console.log('[MobileAI] Sending request with model:', getModelName(model));

    // 调用 AI API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout * 1000);

    const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '抱歉，我没有收到有效的回复。';

    // 解析并执行操作
    const { cleanContent, executionResult } = await parseAndExecuteActions(aiContent, settings);

    // 保存 AI 回复
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: cleanContent,
      timestamp: Date.now(),
      executionResult,
    };

    const updatedSession = await getMobileChatSession();
    updatedSession.messages.push(assistantMessage);
    await saveMobileChatSession(updatedSession);

    return { message: assistantMessage, executionResult };
  } catch (error) {
    console.error('[MobileAI] Error:', error);

    // 保存错误消息
    const errorMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '抱歉，AI服务暂时不可用。请稍后再试。',
      timestamp: Date.now(),
    };

    const updatedSession = await getMobileChatSession();
    updatedSession.messages.push(errorMessage);
    await saveMobileChatSession(updatedSession);

    return {
      message: errorMessage,
      executionResult: {
        added: [],
        completed: [],
        deleted: [],
        updated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
    };
  }
}

// 获取聊天历史
export async function getMobileAIChatHistory(): Promise<ChatSession> {
  return await getMobileChatSession();
}

// 清除聊天历史
export async function clearMobileAIChatHistory(): Promise<ChatSession> {
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveMobileChatSession(newSession);
  return newSession;
}
