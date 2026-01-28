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

// 格式化待办事项列表（包含ID，供AI使用）
export const formatTodosForAI = (todos: Todo[], groups: Group[]): string => {
  if (todos.length === 0) {
    return '暂无待办事项';
  }

  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  return todos.map(t => {
    const parts = [
      `- ID: "${t.id}"`,
      `  内容: "${t.text}"`,
      `  优先级: ${t.priority || 'P2'}`,
      `  状态: ${t.completed ? '已完成' : '未完成'}`,
    ];
    
    if (t.dueDate) {
      parts.push(`  截止时间: ${t.dueDate}`);
    }
    
    if (t.groupId && t.groupId !== 'default') {
      const groupName = groupMap.get(t.groupId) || t.groupId;
      parts.push(`  分组: ${groupName}`);
    }
    
    if (t.completed && t.completedAt) {
      parts.push(`  完成时间: ${new Date(t.completedAt).toISOString()}`);
    }
    
    return parts.join('\n');
  }).join('\n\n');
};

// 生成系统提示词 - AI 拥有完全控制权
export const getSystemPrompt = (currentDateTime: string, todosText: string, groupsText: string): string => `
你是一个智能待办事项助手，拥有对用户待办事项的完全管理权限。


【重要】当前日期时间：${currentDateTime}

【现有分组列表】
${groupsText || '暂无自定义分组'}

【完整待办事项列表】
${todosText}

===== 你的能力 =====
你可以直接操作用户的待办事项：
1. **添加** - 创建新的待办事项
2. **完成** - 将待办事项标记为已完成
3. **删除** - 删除/取消待办事项
4. **更新** - 修改待办事项的内容、优先级、截止时间等

===== 操作格式 =====
当需要执行操作时，在回复末尾添加以下格式的 JSON 块：

<<<ACTIONS>>>
{
  "add": [
    {
      "text": "任务内容",
      "priority": "P0/P1/P2",
      "dueDate": "YYYY-MM-DDTHH:mm",
      "groupName": "分组名称",
      "isCompleted": false
    }
  ],
  "complete": ["任务ID1", "任务ID2"],
  "delete": ["任务ID1", "任务ID2"],
  "update": [
    {
      "id": "任务ID",
      "text": "新内容",
      "priority": "P1",
      "dueDate": "2026-01-30T10:00"
    }
  ]
}
<<<END_ACTIONS>>>

===== 操作说明 =====

**添加任务 (add)**
- text: 必填，任务内容
- priority: 可选，P0(紧急) / P1(重要) / P2(普通，默认)
- dueDate: 可选，截止时间，格式 YYYY-MM-DDTHH:mm
- groupName: 可选，分组名称（不存在会自动创建）
- isCompleted: 可选，设为 true 表示记录过去已完成的事项
- createdAt/completedAt: 当 isCompleted=true 时使用，记录历史时间

**完成任务 (complete)**
- 直接填写要完成的任务 ID 数组
- 从上方待办事项列表中获取准确的 ID
- 示例：用户说"手术做完了"，找到包含"手术"的任务 ID

**删除任务 (delete)**
- 直接填写要删除的任务 ID 数组
- 示例：用户说"不去上海了"，找到包含"上海"的任务 ID

**更新任务 (update)**
- id: 必填，要更新的任务 ID
- 其他字段可选，只填需要修改的

===== 日期时间解析 =====
基于当前时间 ${currentDateTime}：
- "今天" → 当前日期
- "明天" → +1天
- "后天" → +2天
- "下周X" → 计算到下一个星期X
- "下午3点" → 15:00
- "晚上8点" → 20:00

===== 重要规则 =====
1. **只使用存在的 ID** - 完成/删除/更新操作必须使用上方列表中的真实 ID
2. **理解用户意图** - 用户说"看牙的事情完成了"，应找到包含"看牙"或"牙医"的任务
3. **支持批量操作** - 用户说"今天的任务都完成了"，找出所有今天截止的任务 ID
4. **支持模糊匹配** - 用户说"把那个手术取消"，找到包含"手术"的任务
5. **可以组合操作** - 一次回复可以同时添加、完成、删除多个任务
6. **无操作时不输出** - 如果用户只是闲聊，不需要输出 ACTIONS 块
7. **回复要友好** - 先用自然语言回复用户，再附加操作块

`;