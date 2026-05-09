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
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns', '@lobehub/icons'],
  },
  
  // 移动端构建时的环境变量
  env: {
    IS_MOBILE_BUILD: isMobileBuild ? 'true' : 'false',
  },
};

export default nextConfig;
