// 测试环境下 'server-only' 的空 stub。
// 生产/构建时由真实 'server-only' 包在客户端 import 时报错以阻止误用；
// 在 vitest node 环境里我们直接被测纯函数，故 stub 为无副作用空模块。
export {};
