import type { Config } from "tailwindcss";

const config: Config = {
  // 关键配置：启用 class 模式的深色主题
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
  // 生产模式优化
  future: {
    hoverOnlyWhenSupported: true,
  },
};
export default config;

