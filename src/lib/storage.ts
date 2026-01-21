import fs from 'fs';
import path from 'path';

// 支持 Docker 数据目录和本地开发
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export const getTodos = (): Todo[] => {
  try {
    // 确保目录存在
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 如果文件不存在，创建空数组
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
      console.log(`[Storage] Created new todos file: ${DATA_FILE}`);
      return [];
    }
    
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const todos = JSON.parse(data);
    console.log(`[Storage] Loaded ${todos.length} todos from ${DATA_FILE}`);
    return todos;
  } catch (error) {
    console.error('[Storage] Error reading todos:', error);
    return [];
  }
};

export const saveTodos = (todos: Todo[]) => {
  try {
    // 确保目录存在
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf-8');
    console.log(`[Storage] Saved ${todos.length} todos to ${DATA_FILE}`);
  } catch (error) {
    console.error('[Storage] Error saving todos:', error);
    throw error; // 抛出错误以便 API 能捕获
  }
};

