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
  console.error(`[Storage] Backed up corrupt JSON file to ${backupPath}`);
}

function readJsonFile<T>(filePath: string, label: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (error) {
    backupCorruptFile(filePath);
    console.error(`[Storage] Invalid ${label} JSON at ${filePath}:`, error);
    throw new Error(`[Storage] Invalid ${label} JSON at ${filePath}`);
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  ensureParentDir(filePath);
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

export const getTodos = (): Todo[] => {
  try {
    ensureParentDir(DATA_FILE);
    
    // 如果文件不存在，创建空数组
    if (!fs.existsSync(DATA_FILE)) {
      writeJsonFile(DATA_FILE, []);
      console.log(`[Storage] Created new todos file: ${DATA_FILE}`);
      return [];
    }
    
    let todos = readJsonFile<Todo[]>(DATA_FILE, 'todos');
    if (!Array.isArray(todos)) {
      backupCorruptFile(DATA_FILE);
      throw new Error(`[Storage] Todos JSON must be an array: ${DATA_FILE}`);
    }
    
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
    throw error;
  }
};

export const saveTodos = (todos: Todo[]) => {
  try {
    writeJsonFile(DATA_FILE, todos);
    console.log(`[Storage] Saved ${todos.length} todos to ${DATA_FILE}`);
  } catch (error) {
    console.error('[Storage] Error saving todos:', error);
    throw error; // 抛出错误以便 API 能捕获
  }
};

export const getGroups = (): Group[] => {
  try {
    ensureParentDir(GROUPS_FILE);
    
    if (!fs.existsSync(GROUPS_FILE)) {
      const defaultGroups: Group[] = [{ id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() }];
      writeJsonFile(GROUPS_FILE, defaultGroups);
      return defaultGroups;
    }
    
    const groups = readJsonFile<Group[]>(GROUPS_FILE, 'groups');
    if (!Array.isArray(groups)) {
      backupCorruptFile(GROUPS_FILE);
      throw new Error(`[Storage] Groups JSON must be an array: ${GROUPS_FILE}`);
    }
    return groups;
  } catch (error) {
    console.error('[Storage] Error reading groups:', error);
    throw error;
  }
};

export const saveGroups = (groups: Group[]) => {
  try {
    writeJsonFile(GROUPS_FILE, groups);
  } catch (error) {
    console.error('[Storage] Error saving groups:', error);
    throw error;
  }
};

export const getStats = (): Stats => {
  try {
    ensureParentDir(STATS_FILE);
    
    if (!fs.existsSync(STATS_FILE)) {
      const initialStats = { pv: 0, uv: 0 };
      writeJsonFile(STATS_FILE, initialStats);
      console.log(`[Storage] Created new stats file: ${STATS_FILE}`);
      return initialStats;
    }
    
    const stats = readJsonFile<Stats>(STATS_FILE, 'stats');
    if (typeof stats?.pv !== 'number' || typeof stats?.uv !== 'number') {
      backupCorruptFile(STATS_FILE);
      throw new Error(`[Storage] Stats JSON must include numeric pv and uv: ${STATS_FILE}`);
    }
    console.log(`[Storage] Loaded stats from ${STATS_FILE}: PV=${stats.pv}, UV=${stats.uv}`);
    return stats;
  } catch (error) {
    console.error('[Storage] Error reading stats:', error);
    throw error;
  }
};

export const updateStats = (isNewVisitor: boolean): Stats => {
  try {
    const stats = getStats();
    stats.pv += 1;
    if (isNewVisitor) {
      stats.uv += 1;
    }
    writeJsonFile(STATS_FILE, stats);
    console.log(`[Storage] Updated stats: PV=${stats.pv}, UV=${stats.uv}`);
    return stats;
  } catch (error) {
    console.error('[Storage] Error updating stats:', error);
    throw error;
  }
};
