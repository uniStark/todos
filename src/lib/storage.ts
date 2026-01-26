import fs from 'fs';
import path from 'path';
import { Todo, Group, Stats, DEFAULT_GROUP_ID } from './types';

// 支持 Docker 数据目录 and 本地开发
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'todos.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

export { DEFAULT_GROUP_ID };
export type { Todo, Group, Stats };

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
    let todos: Todo[] = JSON.parse(data);
    
    // 迁移逻辑：确保所有任务都有 groupId，如果没有则归入默认分组
    let needsSave = false;
    todos = todos.map(todo => {
      if (!todo.groupId) {
        todo.groupId = DEFAULT_GROUP_ID;
        needsSave = true;
      }
      return todo;
    });

    if (needsSave) {
      saveTodos(todos);
    }

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

export const getGroups = (): Group[] => {
  try {
    const dir = path.dirname(GROUPS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(GROUPS_FILE)) {
      const defaultGroups: Group[] = [{ id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() }];
      fs.writeFileSync(GROUPS_FILE, JSON.stringify(defaultGroups, null, 2), 'utf-8');
      return defaultGroups;
    }
    
    const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error reading groups:', error);
    return [{ id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() }];
  }
};

export const saveGroups = (groups: Group[]) => {
  try {
    const dir = path.dirname(GROUPS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Storage] Error saving groups:', error);
    throw error;
  }
};

export const getStats = (): Stats => {
  try {
    // 确保数据目录存在
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Storage] Created data directory: ${dir}`);
    }
    
    if (!fs.existsSync(STATS_FILE)) {
      const initialStats = { pv: 0, uv: 0 };
      fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2), 'utf-8');
      console.log(`[Storage] Created new stats file: ${STATS_FILE}`);
      return initialStats;
    }
    
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    const stats = JSON.parse(data);
    console.log(`[Storage] Loaded stats from ${STATS_FILE}: PV=${stats.pv}, UV=${stats.uv}`);
    return stats;
  } catch (error) {
    console.error('[Storage] Error reading stats:', error);
    return { pv: 0, uv: 0 };
  }
};

export const updateStats = (isNewVisitor: boolean): Stats => {
  try {
    // 确保数据目录存在
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const stats = getStats();
    stats.pv += 1;
    if (isNewVisitor) {
      stats.uv += 1;
    }
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
    console.log(`[Storage] Updated stats: PV=${stats.pv}, UV=${stats.uv}`);
    return stats;
  } catch (error) {
    console.error('[Storage] Error updating stats:', error);
    return { pv: 0, uv: 0 };
  }
};