import type { NextConfig } from "next";
import path from "node:path";

// 检测是否是移动端构建
const isMobileBuild = process.env.NEXT_OUTPUT === 'export';

const nextConfig: NextConfig = {
  // 输出模式：
  // - 'standalone': Docker/服务器部署（默认）
  // - 'export': 静态导出，用于 Capacitor 移动端
  output: isMobileBuild ? 'export' : 'standalone',
  
  // 编译优化
  compiler: {
    // 移除 console.log (生产环境)
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 性能优化
  reactStrictMode: true,

  // build 时跳过 ESLint 与类型检查以加速构建：
  // 提交/部署前已用 `tsc --noEmit`（和 `next lint`）单独把关，build 里再查一遍是重复开销。
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // 压缩优化
  compress: true,

  // Mobile static export uses an isolated build directory so it cannot corrupt
  // a regular server build running in the same workspace.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Avoid workspace-root inference from unrelated lockfiles above this project.
  outputFileTracingRoot: path.resolve(__dirname),
  
  // 图片优化
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    // 静态导出需要禁用图片优化
    unoptimized: isMobileBuild,
  },
  
  // 转译 @lobehub/icons 包以支持 SSR
  transpilePackages: ['@lobehub/icons'],

  // better-sqlite3 是原生模块，必须作为外部依赖，不能被 Next 打包（否则 .node 绑定丢失）
  serverExternalPackages: ['better-sqlite3'],
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns', '@lobehub/icons'],
  },
  
  // 移动端构建时的环境变量
  env: {
    IS_MOBILE_BUILD: isMobileBuild ? 'true' : 'false',
  },

  // 安全响应头。
  // 注意：静态导出（output:'export'，移动端 Capacitor 构建）不支持 headers()，
  // 若在 export 构建下返回 headers() 会触发 Next 报错/警告，因此 export 构建时不挂载该函数。
  ...(isMobileBuild
    ? {}
    : {
        async headers() {
          const securityHeaders = [
            // 禁止被任何站点 iframe 嵌入，防点击劫持
            { key: 'X-Frame-Options', value: 'DENY' },
            // 禁止浏览器对响应做 MIME 嗅探
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            // 跨源时仅发送来源（scheme+host+port），不泄露完整路径
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            // 禁用本应用不需要的浏览器特性
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
            },
          ];

          // HSTS 不在应用层下发：HSTS 应由 HTTPS 终止处（反代）统一管理。
          // 本应用部署在 openresty 反代之后（root_ssl.conf 已全站下发 Strict-Transport-Security），
          // 应用层再加会产生重复的 HSTS 头。若你的部署不经反代/反代未设 HSTS，
          // 可在反代或此处任一处补 HSTS（二者取其一）。

          // 不设置 CSP：Next + framer-motion + lobehub 存在 inline 样式/脚本，
          // 严格 CSP 易破坏页面，已确认不加。
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
