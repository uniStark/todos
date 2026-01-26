'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Copy, Check, Lock, Unlock, Send, 
  FileJson, Code2, Zap, Shield, Clock, Terminal
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  descriptionZh: string;
  auth: boolean;
  requestBody?: {
    type: string;
    properties: { name: string; type: string; required: boolean; description: string }[];
  };
  responseExample: object;
  curlExample: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/todos',
    description: 'Get all active todos',
    descriptionZh: '获取所有活跃的任务',
    auth: false,
    responseExample: [
      { id: 'uuid', text: 'Task content', completed: false, createdAt: 1706000000000 }
    ],
    curlExample: 'curl https://your-domain.com/api/todos',
  },
  {
    method: 'POST',
    path: '/api/todos',
    description: 'Create a new todo',
    descriptionZh: '创建新任务',
    auth: true,
    requestBody: {
      type: 'application/json',
      properties: [
        { name: 'text', type: 'string', required: true, description: 'Task content' },
        { name: 'createdAt', type: 'number', required: false, description: 'Custom timestamp (ms)' },
      ],
    },
    responseExample: { id: 'uuid', text: 'New task', completed: false, createdAt: 1706000000000 },
    curlExample: `curl -X POST https://your-domain.com/api/todos \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-password" \\
  -d '{"text": "New task"}'`,
  },
  {
    method: 'PUT',
    path: '/api/todos',
    description: 'Update a todo',
    descriptionZh: '更新任务',
    auth: true,
    requestBody: {
      type: 'application/json',
      properties: [
        { name: 'id', type: 'string', required: true, description: 'Todo ID' },
        { name: 'text', type: 'string', required: false, description: 'New content' },
        { name: 'completed', type: 'boolean', required: false, description: 'Completion status' },
        { name: 'createdAt', type: 'number', required: false, description: 'Override created time' },
        { name: 'completedAt', type: 'number', required: false, description: 'Custom completion time' },
      ],
    },
    responseExample: { id: 'uuid', text: 'Updated', completed: true, createdAt: 1706000000000, completedAt: 1706100000000 },
    curlExample: `curl -X PUT https://your-domain.com/api/todos \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-password" \\
  -d '{"id": "todo-id", "completed": true}'`,
  },
  {
    method: 'DELETE',
    path: '/api/todos',
    description: 'Soft delete a todo',
    descriptionZh: '删除任务（软删除）',
    auth: true,
    responseExample: { success: true, id: 'deleted-id' },
    curlExample: `curl -X DELETE "https://your-domain.com/api/todos?id=todo-id" \\
  -H "X-API-Key: your-password"`,
  },
  {
    method: 'GET',
    path: '/api/stats',
    description: 'Get site statistics (PV/UV)',
    descriptionZh: '获取站点统计（PV/UV）',
    auth: false,
    responseExample: { pv: 1234, uv: 56 },
    curlExample: 'curl https://your-domain.com/api/stats',
  },
  {
    method: 'POST',
    path: '/api/auth',
    description: 'Verify password',
    descriptionZh: '验证密码',
    auth: false,
    requestBody: {
      type: 'application/json',
      properties: [
        { name: 'password', type: 'string', required: true, description: 'Password to verify' },
      ],
    },
    responseExample: { success: true },
    curlExample: `curl -X POST https://your-domain.com/api/auth \\
  -H "Content-Type: application/json" \\
  -d '{"password": "your-password"}'`,
  },
];

const methodColors: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  POST: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  PUT: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
};

export default function ApiDocsPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const t = translations[settings.language];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <main className="min-h-screen bg-light-primary selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 mb-12"
        >
          <button
            onClick={() => router.push('/')}
            className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Code2 size={24} className="text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                API {settings.language === 'zh' ? '文档' : 'Documentation'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              {settings.language === 'zh' 
                ? 'RESTful API 接口说明 · 支持自定义时间戳' 
                : 'RESTful API Reference · Custom Timestamps Supported'}
            </p>
          </div>
        </motion.div>

        {/* Auth Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-3xl mb-8 border-l-4 border-amber-500"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <Shield size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                {settings.language === 'zh' ? '认证方式' : 'Authentication'}
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                {settings.language === 'zh' 
                  ? '需要认证的接口请在请求头中添加 API Key：' 
                  : 'For protected endpoints, add API key to request headers:'}
              </p>
              <div className="flex flex-wrap gap-2">
                <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300">
                  X-API-Key: your-password
                </code>
                <span className="text-slate-400 self-center">{settings.language === 'zh' ? '或' : 'or'}</span>
                <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300">
                  Authorization: Bearer your-password
                </code>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Endpoints List */}
        <div className="space-y-4">
          {endpoints.map((endpoint, index) => {
            const colors = methodColors[endpoint.method];
            const isExpanded = expandedIndex === index;
            
            return (
              <motion.div
                key={`${endpoint.method}-${endpoint.path}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="glass-card rounded-3xl overflow-hidden"
              >
                {/* Endpoint Header */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-slate-700 dark:text-slate-300 flex-1 text-left">
                    {endpoint.path}
                  </code>
                  {endpoint.auth ? (
                    <Lock size={16} className="text-amber-500" />
                  ) : (
                    <Unlock size={16} className="text-emerald-500" />
                  )}
                  <span className="text-sm text-slate-500 hidden sm:block">
                    {settings.language === 'zh' ? endpoint.descriptionZh : endpoint.description}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Zap size={18} className={`transition-colors ${isExpanded ? 'text-blue-500' : 'text-slate-400'}`} />
                  </motion.div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-slate-200 dark:border-slate-700/50"
                    >
                      <div className="p-5 space-y-5">
                        {/* Description on mobile */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 sm:hidden">
                          {settings.language === 'zh' ? endpoint.descriptionZh : endpoint.description}
                        </p>

                        {/* Request Body */}
                        {endpoint.requestBody && (
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                              <FileJson size={14} />
                              Request Body
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                                    <th className="pb-2 pr-4">Field</th>
                                    <th className="pb-2 pr-4">Type</th>
                                    <th className="pb-2 pr-4">Required</th>
                                    <th className="pb-2">Description</th>
                                  </tr>
                                </thead>
                                <tbody className="font-mono">
                                  {endpoint.requestBody.properties.map((prop) => (
                                    <tr key={prop.name} className="border-t border-slate-200 dark:border-slate-700/50">
                                      <td className="py-2 pr-4 text-blue-500">{prop.name}</td>
                                      <td className="py-2 pr-4 text-emerald-500">{prop.type}</td>
                                      <td className="py-2 pr-4">
                                        {prop.required ? (
                                          <span className="text-red-400">*</span>
                                        ) : (
                                          <span className="text-slate-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-slate-500 font-sans text-xs">{prop.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Response Example */}
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                            <Send size={14} />
                            Response Example
                          </h4>
                          <pre className="bg-slate-900 text-slate-100 rounded-2xl p-4 overflow-x-auto text-xs font-mono">
                            {JSON.stringify(endpoint.responseExample, null, 2)}
                          </pre>
                        </div>

                        {/* cURL Example */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Terminal size={14} />
                              cURL Example
                            </h4>
                            <button
                              onClick={() => copyToClipboard(endpoint.curlExample, index)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-bold"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check size={14} className="text-emerald-500" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="bg-slate-900 text-emerald-400 rounded-2xl p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                            {endpoint.curlExample}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-slate-400 font-medium">
            {settings.language === 'zh' 
              ? '基于 Next.js API Routes 构建 · 数据持久化于 JSON' 
              : 'Built with Next.js API Routes · Data persisted in JSON'}
          </p>
        </motion.div>
      </div>
    </main>
  );
}
