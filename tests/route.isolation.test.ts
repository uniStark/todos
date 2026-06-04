import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTmpDataDir, cleanupTmpDataDir } from './helpers/tmpDb';

// 在 import 任何 route/db 模块之前设置独立临时 DATA_DIR + 放开注册门控。
const tmpDir = setupTmpDataDir();
process.env.ALLOW_REGISTRATION = 'true';
// 确保非生产，避免 secure cookie 等生产分支干扰（NODE_ENV 在 TS 类型里只读，运行时仍可写）
(process.env as Record<string, string>).NODE_ENV = 'test';

const ORIGIN = 'http://localhost:3000';
const HOST = 'localhost:3000';
// isSameOrigin 比对 Origin.host 与请求的 Host 头。`new Request()` 不会自动注入 Host 头，
// 故写请求必须显式带上 Host，否则 CSRF 校验恒拒绝。

// 动态 import route handler，保证 DATA_DIR 已生效。
type RegisterRoute = typeof import('@/app/api/auth/register/route');
type TodosRoute = typeof import('@/app/api/todos/route');
type GroupsRoute = typeof import('@/app/api/groups/route');

let registerRoute: RegisterRoute;
let todosRoute: TodosRoute;
let groupsRoute: GroupsRoute;

// 从 NextResponse 提取 todo_session cookie 值（用于后续请求构造 Cookie 头）。
function extractSessionCookie(res: Response): string {
  // Next 的 cookies.set 会写入 set-cookie。getSetCookie() 返回数组。
  const setCookies =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [res.headers.get('set-cookie') ?? ''];
  for (const sc of setCookies) {
    const m = /(?:^|;\s*)todo_session=([^;]+)/.exec(sc);
    if (m) return `todo_session=${m[1]}`;
  }
  throw new Error('未能从响应中提取 todo_session cookie: ' + JSON.stringify(setCookies));
}

async function register(username: string): Promise<string> {
  const req = new Request(`${ORIGIN}/api/auth/register`, {
    method: 'POST',
    headers: { Host: HOST, Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'password123' }),
  });
  const res = await registerRoute.POST(req);
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
}

let cookieA = '';
let cookieB = '';
let todoAId = '';
let groupAId = '';

beforeAll(async () => {
  registerRoute = await import('@/app/api/auth/register/route');
  todosRoute = await import('@/app/api/todos/route');
  groupsRoute = await import('@/app/api/groups/route');

  cookieA = await register('alice');
  cookieB = await register('bob');
});

afterAll(() => cleanupTmpDataDir(tmpDir));

describe('route-level 跨用户隔离矩阵', () => {
  it('用户 A 创建 todo（带 Origin + cookie）→ 201', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'POST',
      headers: { Host: HOST, Origin: ORIGIN, 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ text: 'A 的私密任务' }),
    });
    const res = await todosRoute.POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.text).toBe('A 的私密任务');
    todoAId = body.id;
    expect(todoAId).toBeTruthy();
  });

  it('用户 B GET /api/todos 看不到 A 的 todo', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'GET',
      headers: { Cookie: cookieB },
    });
    const res = await todosRoute.GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.map((t: { id: string }) => t.id)).not.toContain(todoAId);
  });

  it('用户 A GET 能看到自己的 todo', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'GET',
      headers: { Cookie: cookieA },
    });
    const res = await todosRoute.GET(req);
    const list = await res.json();
    expect(list.map((t: { id: string }) => t.id)).toContain(todoAId);
  });

  it('用户 B PUT A 的 todoId → 404（不可改）', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'PUT',
      headers: { Host: HOST, Origin: ORIGIN, 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ id: todoAId, text: 'B 篡改' }),
    });
    const res = await todosRoute.PUT(req);
    expect(res.status).toBe(404);
  });

  it('用户 B DELETE A 的 todoId → 404（不可删）', async () => {
    const req = new Request(`${ORIGIN}/api/todos?id=${todoAId}`, {
      method: 'DELETE',
      headers: { Host: HOST, Origin: ORIGIN, Cookie: cookieB },
    });
    const res = await todosRoute.DELETE(req);
    expect(res.status).toBe(404);
  });

  it('A 的 todo 经 B 的攻击后仍存在且未被改', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'GET',
      headers: { Cookie: cookieA },
    });
    const list = await (await todosRoute.GET(req)).json();
    const t = list.find((x: { id: string }) => x.id === todoAId);
    expect(t).toBeDefined();
    expect(t.text).toBe('A 的私密任务');
  });

  it('用户 A 创建 group → 201', async () => {
    const req = new Request(`${ORIGIN}/api/groups`, {
      method: 'POST',
      headers: { Host: HOST, Origin: ORIGIN, 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ name: 'A 的分组' }),
    });
    const res = await groupsRoute.POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    groupAId = body.id;
    expect(groupAId).toBeTruthy();
  });

  it('用户 B GET /api/groups 看不到 A 的 group', async () => {
    const req = new Request(`${ORIGIN}/api/groups`, {
      method: 'GET',
      headers: { Cookie: cookieB },
    });
    const list = await (await groupsRoute.GET(req)).json();
    expect(list.map((g: { id: string }) => g.id)).not.toContain(groupAId);
  });

  it('用户 B DELETE A 的 groupId 不影响 A（B 视角无该组，A 仍可见）', async () => {
    const req = new Request(`${ORIGIN}/api/groups?id=${groupAId}`, {
      method: 'DELETE',
      headers: { Host: HOST, Origin: ORIGIN, Cookie: cookieB },
    });
    // groups DELETE 对不属于自己的 id 不会报错（WHERE user_id 无行被删），返回 success。
    await groupsRoute.DELETE(req);
    // A 仍能看到自己的分组
    const aReq = new Request(`${ORIGIN}/api/groups`, { method: 'GET', headers: { Cookie: cookieA } });
    const aList = await (await groupsRoute.GET(aReq)).json();
    expect(aList.map((g: { id: string }) => g.id)).toContain(groupAId);
  });

  it('未登录（无 cookie）GET /api/todos → 401', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, { method: 'GET' });
    const res = await todosRoute.GET(req);
    expect(res.status).toBe(401);
  });

  it('无 Origin 的写请求（POST todos）→ 403（CSRF）', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'POST',
      headers: { Host: HOST, 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ text: '缺 Origin' }),
    });
    const res = await todosRoute.POST(req);
    expect(res.status).toBe(403);
  });

  it('跨站 Origin 的写请求 → 403（CSRF）', async () => {
    const req = new Request(`${ORIGIN}/api/todos`, {
      method: 'POST',
      headers: {
        Host: HOST,
        Origin: 'http://evil.example.com',
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({ text: '跨站' }),
    });
    const res = await todosRoute.POST(req);
    expect(res.status).toBe(403);
  });
});
