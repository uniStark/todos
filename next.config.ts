import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出优化：standalone 模式可大幅减少 Docker 镜像大小
  output: 'standalone',
  
  // 编译优化
  compiler: {
    // 移除 console.log (生产环境)
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 性能优化
  reactStrictMode: true,
  
  // 压缩优化
  compress: true,
  
  // 图片优化
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
