import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'todos.json');

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
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading todos:', error);
    return [];
  }
};

export const saveTodos = (todos: Todo[]) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
  } catch (error) {
    console.error('Error saving todos:', error);
  }
};

