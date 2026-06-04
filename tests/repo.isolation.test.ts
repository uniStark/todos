import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTmpDataDir, cleanupTmpDataDir } from './helpers/tmpDb';

// 在 import 任何 db 模块之前设置独立临时 DATA_DIR。
const tmpDir = setupTmpDataDir();

// 动态 import，保证上面的 DATA_DIR 已生效后才加载 db 单例。
type TodosRepo = typeof import('@/lib/db/todosRepo');
type GroupsRepo = typeof import('@/lib/db/groupsRepo');
type UserRepo = typeof import('@/lib/db/userRepo');

let todosRepo: TodosRepo;
let groupsRepo: GroupsRepo;
let userRepo: UserRepo;

const USER_A = 'user-a';
const USER_B = 'user-b';

beforeAll(async () => {
  userRepo = await import('@/lib/db/userRepo');
  todosRepo = await import('@/lib/db/todosRepo');
  groupsRepo = await import('@/lib/db/groupsRepo');

  const now = Date.now();
  userRepo.createUser({ id: USER_A, username: 'alice', passwordHash: 'x', createdAt: now });
  userRepo.createUser({ id: USER_B, username: 'bob', passwordHash: 'x', createdAt: now });
});

afterAll(() => cleanupTmpDataDir(tmpDir));

describe('repo-level 跨用户隔离', () => {
  it('todos：B 看不到 A 的任务', () => {
    todosRepo.insertTodo(USER_A, {
      id: 'todo-a1',
      text: 'A 的任务',
      completed: false,
      createdAt: Date.now(),
    });

    expect(todosRepo.listTodos(USER_A).map((t) => t.id)).toContain('todo-a1');
    expect(todosRepo.listTodos(USER_B)).toHaveLength(0);
  });

  it('todos：B 用同 id 查询拿不到 A 的任务（WHERE user_id 隔离）', () => {
    expect(todosRepo.getTodo(USER_A, 'todo-a1')).toBeDefined();
    expect(todosRepo.getTodo(USER_B, 'todo-a1')).toBeUndefined();
  });

  it('todos：B 对 A 的任务做 update 不影响 A（user_id 不匹配，无行被改）', () => {
    todosRepo.updateTodo(USER_B, {
      id: 'todo-a1',
      text: 'B 试图篡改',
      completed: true,
      createdAt: Date.now(),
    });
    // A 的任务文本不变
    expect(todosRepo.getTodo(USER_A, 'todo-a1')?.text).toBe('A 的任务');
    // B 仍无该任务
    expect(todosRepo.getTodo(USER_B, 'todo-a1')).toBeUndefined();
  });

  it('groups：B 看不到 A 的分组', () => {
    groupsRepo.insertGroup(USER_A, { id: 'grp-a1', name: 'A 的分组', createdAt: Date.now() });
    expect(groupsRepo.getGroup(USER_A, 'grp-a1')).toBeDefined();
    expect(groupsRepo.getGroup(USER_B, 'grp-a1')).toBeUndefined();
    expect(groupsRepo.listGroups(USER_B).map((g) => g.id)).not.toContain('grp-a1');
  });

  it('groups：B 删除 A 的分组（user_id 不匹配）不影响 A', () => {
    groupsRepo.deleteGroupAndReassign(USER_B, 'grp-a1');
    expect(groupsRepo.getGroup(USER_A, 'grp-a1')).toBeDefined();
  });
});
