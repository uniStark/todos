import fs from 'fs';
import path from 'path';
import { ChatSession, ChatMessage, AIConfig, AIModelType, Todo, Group } from './types';

// 支持 Docker 数据目录 and 本地开发
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const CHAT_FILE = path.join(DATA_DIR, 'chat-history.json');

function ensureParentDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupCorruptFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.corrupt.${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  console.error(`[ChatStorage] Backed up corrupt JSON file to ${backupPath}`);
}

function writeJsonFile(filePath: string, value: unknown) {
  ensureParentDir(filePath);
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function readChatSession(): ChatSession {
  try {
    return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8')) as ChatSession;
  } catch (error) {
    backupCorruptFile(CHAT_FILE);
    console.error(`[ChatStorage] Invalid chat JSON at ${CHAT_FILE}:`, error);
    throw new Error(`[ChatStorage] Invalid chat JSON at ${CHAT_FILE}`);
  }
}

// 从环境变量获取 AI 配置（接入 OpenAI 兼容网关）
export const getAIConfig = (): AIConfig => {
  return {
    apiKey: process.env.AI_API_KEY || '',
    // 任意 OpenAI 兼容网关：用 AI_BASE_URL 指定（默认 OpenAI 官方），模型列表动态从 /v1/models 拉取
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
    timeout: parseInt(process.env.AI_TIMEOUT || '60', 10),
  };
};

// 模型 id 现在直接就是网关侧的真实模型名，原样返回即可
export const getModelName = (modelType: AIModelType): string => modelType;

// 获取聊天历史
export const getChatSession = (): ChatSession => {
  try {
    ensureParentDir(CHAT_FILE);

    if (!fs.existsSync(CHAT_FILE)) {
      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      writeJsonFile(CHAT_FILE, initialSession);
      console.log(`[ChatStorage] Created new chat session: ${CHAT_FILE}`);
      return initialSession;
    }

    const session = readChatSession();
    if (!Array.isArray(session.messages)) {
      backupCorruptFile(CHAT_FILE);
      throw new Error(`[ChatStorage] Chat JSON must include messages array: ${CHAT_FILE}`);
    }
    console.log(`[ChatStorage] Loaded ${session.messages.length} messages from ${CHAT_FILE}`);
    return session;
  } catch (error) {
    console.error('[ChatStorage] Error reading chat session:', error);
    throw error;
  }
};

// 保存聊天历史
export const saveChatSession = (session: ChatSession): void => {
  try {
    session.updatedAt = Date.now();
    writeJsonFile(CHAT_FILE, session);
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

  // 提示词注入加固：所有用户可控文本（任务内容、分组名）用 JSON.stringify 包裹，
  // 自动转义引号/反斜杠/换行，避免用户在 todo 文本里注入指令而破坏 system prompt 结构。
  return activeTodos.map(t => {
    const parts = [
      `- ID: ${JSON.stringify(t.id)}`,
      `  内容: ${JSON.stringify(t.text)}`,
    ];

    // 如果启用了优先级功能
    if (settings.enablePriority) {
      parts.push(`  优先级: ${t.priority || 'P2'}`);
    }

    if (t.dueDate) {
      parts.push(`  截止时间: ${JSON.stringify(t.dueDate)}`);
    }

    // 如果启用了分组功能
    if (settings.enableGroups && t.groupId && t.groupId !== 'default') {
      const groupName = groupMap.get(t.groupId) || t.groupId;
      parts.push(`  分组: ${JSON.stringify(groupName)}`);
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
