import fs from 'fs';
import path from 'path';
import { ChatSession, ChatMessage, AIConfig, AIModelType, Todo, Group } from './types';

// 支持 Docker 数据目录 and 本地开发
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const CHAT_FILE = path.join(DATA_DIR, 'chat-history.json');

// 从环境变量获取 AI 配置
export const getAIConfig = (): AIConfig => {
  return {
    apiKey: process.env.AI_API_KEY || '***REMOVED-API-KEY***',
    baseUrl: process.env.AI_BASE_URL || 'https://api.siliconflow.cn/v1',
    models: {
      glm4: process.env.AI_MODEL_GLM4 || 'zai-org/GLM-4.6',
      deepseek_v3_1: process.env.AI_MODEL_DEEPSEEK || 'deepseek-ai/DeepSeek-V3.1-Terminus',
    },
    defaultModel: (process.env.AI_DEFAULT_MODEL || 'deepseek_v3.1') as AIModelType,
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
    timeout: parseInt(process.env.AI_TIMEOUT || '600', 10),
  };
};

// 获取模型名称
export const getModelName = (modelType: AIModelType): string => {
  const config = getAIConfig();
  switch (modelType) {
    case 'glm4':
      return config.models.glm4;
    case 'deepseek_v3.1':
      return config.models.deepseek_v3_1;
    default:
      return config.models.deepseek_v3_1;
  }
};

// 获取聊天历史
export const getChatSession = (): ChatSession => {
  try {
    const dir = path.dirname(CHAT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(CHAT_FILE)) {
      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      fs.writeFileSync(CHAT_FILE, JSON.stringify(initialSession, null, 2), 'utf-8');
      console.log(`[ChatStorage] Created new chat session: ${CHAT_FILE}`);
      return initialSession;
    }

    const data = fs.readFileSync(CHAT_FILE, 'utf-8');
    const session = JSON.parse(data);
    console.log(`[ChatStorage] Loaded ${session.messages.length} messages from ${CHAT_FILE}`);
    return session;
  } catch (error) {
    console.error('[ChatStorage] Error reading chat session:', error);
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
};

// 保存聊天历史
export const saveChatSession = (session: ChatSession): void => {
  try {
    const dir = path.dirname(CHAT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    session.updatedAt = Date.now();
    fs.writeFileSync(CHAT_FILE, JSON.stringify(session, null, 2), 'utf-8');
    console.log(`[ChatStorage] Saved ${session.messages.length} messages to ${CHAT_FILE}`);
  } catch (error) {
    console.error('[ChatStorage] Error saving chat session:', error);
    throw error;
  }
};

// 添加消息
export const addMessage = (message: ChatMessage): ChatSession => {
  const session = getChatSession();
  session.messages.push(message);
  saveChatSession(session);
  return session;
};

// 更新消息
export const updateMessage = (messageId: string, updates: Partial<ChatMessage>): ChatSession => {
  const session = getChatSession();
  const index = session.messages.findIndex(m => m.id === messageId);
  if (index !== -1) {
    session.messages[index] = { ...session.messages[index], ...updates };
    saveChatSession(session);
  }
  return session;
};

// 清除聊天历史
export const clearChatSession = (): ChatSession => {
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveChatSession(newSession);
  return newSession;
};

// AI 功能设置
export interface AIFeatureSettings {
  enablePriority: boolean;
  enableGroups: boolean;
}

// 格式化待办事项列表（只给未完成且未删除的任务）
export const formatTodosForAI = (
  todos: Todo[], 
  groups: Group[],
  settings: AIFeatureSettings
): string => {
  // 只筛选未完成且未删除的任务
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
    
    // 如果启用了优先级功能
    if (settings.enablePriority) {
      parts.push(`  优先级: ${t.priority || 'P2'}`);
    }
    
    if (t.dueDate) {
      parts.push(`  截止时间: ${t.dueDate}`);
    }
    
    // 如果启用了分组功能
    if (settings.enableGroups && t.groupId && t.groupId !== 'default') {
      const groupName = groupMap.get(t.groupId) || t.groupId;
      parts.push(`  分组: ${groupName}`);
    }
    
    return parts.join('\n');
  }).join('\n\n');
};

// 生成系统提示词 - 纯 JSON 输出格式
export const getSystemPrompt = (
  currentDateTime: string, 
  todosText: string, 
  groupsText: string,
  settings: AIFeatureSettings
): string => {
  // 根据设置构建操作说明
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