'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Trash2,
  User,
  Plus,
  Loader2,
  Sparkles,
  Settings2,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage, AIExecutionResult, AIModelType } from '@/lib/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { OpenAI, Gemini } from '@lobehub/icons';

// 模型图标：按 model id 前缀映射到厂商 logo（lobehub/lobe-icons，github.com/lobehub/lobe-icons）
const ModelIcon = ({ model = '', size = 20, className = '' }: { model?: string; size?: number; className?: string }) => {
  const m = model.toLowerCase();
  if (m.startsWith('gpt') || m.startsWith('codex')) {
    return <OpenAI size={size} className={className} />;
  }
  if (m.startsWith('gemini')) {
    return <Gemini.Color size={size} />;
  }
  return <Sparkles size={size} className={className} />;
};

interface AIChatProps {
  onRefreshTodos: () => void;
}

async function readJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Use status-based error below when the API does not return JSON.
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message?: unknown }).message)
      : typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error?: unknown }).error)
        : fallbackMessage;
    throw new Error(`${message} (${response.status})`);
  }

  return data as T;
}

export default function AIChat({ onRefreshTodos }: AIChatProps) {
  const { settings, updateSettings } = useSettings();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelType>(settings.aiModel || 'gpt-4o-mini');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [modelMenuPos, setModelMenuPos] = useState<{ top: number; right: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 同步 settings 中的 aiModel
  useEffect(() => {
    if (settings.aiModel && settings.aiModel !== selectedModel) {
      setSelectedModel(settings.aiModel);
    }
  }, [selectedModel, settings.aiModel]);

  // 切换模型时保存到 settings
  const handleModelChange = (model: AIModelType) => {
    setSelectedModel(model);
    updateSettings({ aiModel: model });
    setShowModelSelector(false);
  };

  // 多语言翻译
  const chatTranslations = {
    zh: {
      aiAssistant: 'AI 助手',
      placeholder: '告诉我你想做什么...',
      clearChat: '清除对话',
      selectModel: '选择模型',
      deepseek: 'DeepSeek V3.1',
      glm4: 'GLM-4',
      sending: '发送中...',
      emptyChat: '开始和AI对话，它会自动管理你的待办事项',
      added: '已添加',
      completed: '已完成',
      deleted: '已删除',
      updated: '已更新',
      operationFailed: '操作失败',
      tasksCount: '项任务',
      unauthorized: '认证已失效，请重新登录后再使用 AI。',
      sendFailed: 'AI 请求失败，请稍后重试。',
    },
    en: {
      aiAssistant: 'AI Assistant',
      placeholder: 'Tell me what you want to do...',
      clearChat: 'Clear chat',
      selectModel: 'Select model',
      deepseek: 'DeepSeek V3.1',
      glm4: 'GLM-4',
      sending: 'Sending...',
      emptyChat: 'Start chatting with AI, it will manage your todos automatically',
      added: 'Added',
      completed: 'Completed',
      deleted: 'Deleted',
      updated: 'Updated',
      operationFailed: 'Operation failed',
      tasksCount: 'tasks',
      unauthorized: 'Authentication expired. Please sign in again before using AI.',
      sendFailed: 'AI request failed. Please try again later.',
    },
  };

  const ct = chatTranslations[settings.language as 'zh' | 'en'] || chatTranslations.zh;

  // 加载聊天历史
  const loadChatHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/ai');
      const data = await readJsonOrThrow<{
        session?: { messages?: ChatMessage[] };
        config?: { defaultModel?: string; models?: string[] };
      }>(response, 'Failed to load chat history');
      if (data.session?.messages) {
        setMessages(data.session.messages);
      }
      const models = data.config?.models ?? [];
      if (models.length > 0) {
        setAvailableModels(models);
      }
      // 若当前选中的模型不在网关返回的列表中，则回退到默认模型
      setSelectedModel((prev) => {
        if (models.length > 0 && models.includes(prev)) {
          return prev;
        }
        return data.config?.defaultModel || models[0] || prev;
      });
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, loadChatHistory]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // 乐观更新 - 先显示用户消息
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          settings: {
            enablePriority: settings.enablePriority,
            enableGroups: settings.enableGroups,
          }
        }),
      });

      const data = await readJsonOrThrow<{
        message?: ChatMessage;
        executionResult?: AIExecutionResult;
      }>(response, response.status === 401 ? ct.unauthorized : ct.sendFailed);
      
      // 更新消息列表
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        // 添加真实的用户消息和AI回复
        const newMessages = [...filtered];
        if (data.message) {
          // 从服务器获取完整的消息列表
          loadChatHistory();
        }
        return newMessages;
      });

      // 如果有操作被执行，刷新待办事项列表
      if (data.executionResult) {
        const result = data.executionResult as AIExecutionResult;
        if (result.added.length > 0 || 
            result.completed.length > 0 || 
            result.deleted.length > 0 ||
            result.updated.length > 0) {
          onRefreshTodos();
        }
      }

      // 重新加载聊天历史以获取最新消息
      await loadChatHistory();
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : ct.sendFailed;
      toast.error(errorMessage);
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
          executionResult: {
            added: [],
            completed: [],
            deleted: [],
            updated: [],
            errors: [errorMessage],
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除对话
  const clearChat = async () => {
    try {
      const response = await fetch('/api/ai', {
        method: 'DELETE',
      });
      await readJsonOrThrow<unknown>(response, 'Failed to clear chat');
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      toast.error(error instanceof Error ? error.message : ct.sendFailed);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 自动调整输入框高度
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // 渲染执行结果
  const renderExecutionResult = (result: AIExecutionResult) => {
    const hasResults = result.added.length > 0 || 
                       result.completed.length > 0 || 
                       result.deleted.length > 0 ||
                       result.updated.length > 0 ||
                       result.errors.length > 0;
    
    if (!hasResults) return null;

    return (
      <div className="mt-3 space-y-2">
        {/* 添加的任务 */}
        {result.added.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <Plus size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {ct.added} {result.added.length} {ct.tasksCount}
            </span>
            <span className="text-xs text-emerald-500/70 truncate">
              {result.added.map(t => t.text).join(', ')}
            </span>
          </div>
        )}

        {/* 完成的任务 */}
        {result.completed.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
            <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {ct.completed} {result.completed.length} {ct.tasksCount}
            </span>
            <span className="text-xs text-blue-500/70 truncate">
              {result.completed.map(t => t.text).join(', ')}
            </span>
          </div>
        )}

        {/* 删除的任务 */}
        {result.deleted.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <XCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {ct.deleted} {result.deleted.length} {ct.tasksCount}
            </span>
            <span className="text-xs text-red-500/70 truncate">
              {result.deleted.map(t => t.text).join(', ')}
            </span>
          </div>
        )}

        {/* 更新的任务 */}
        {result.updated.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <Edit3 size={14} className="text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {ct.updated} {result.updated.length} {ct.tasksCount}
            </span>
            <span className="text-xs text-amber-500/70 truncate">
              {result.updated.map(t => t.text).join(', ')}
            </span>
          </div>
        )}

        {/* 错误信息 */}
        {result.errors.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <AlertCircle size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500">
              {result.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 如果未登录，不显示
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* 浮动按钮 */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sparkles size={24} />
      </motion.button>

      {/* 对话框 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <ModelIcon model={selectedModel} size={24} className="text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{ct.aiAssistant}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedModel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 模型选择器 */}
                  <div className="relative">
                    <button
                      ref={modelBtnRef}
                      onClick={() => {
                        if (!showModelSelector && modelBtnRef.current) {
                          const r = modelBtnRef.current.getBoundingClientRect();
                          setModelMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                        }
                        setShowModelSelector((v) => !v);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title={ct.selectModel}
                    >
                      <Settings2 size={18} />
                    </button>
                    {/* 用 Portal 渲染到 body，fixed 定位，避免被聊天弹窗的 overflow-hidden 裁剪 */}
                    {showModelSelector && modelMenuPos && createPortal(
                      <>
                        <div className="fixed inset-0 z-[150]" onClick={() => setShowModelSelector(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ position: 'fixed', top: modelMenuPos.top, right: modelMenuPos.right }}
                          className="w-56 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-[200]"
                        >
                          {(availableModels.length > 0 ? availableModels : [selectedModel]).map((model) => (
                            <button
                              key={model}
                              onClick={() => { handleModelChange(model); setShowModelSelector(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg transition-colors cursor-pointer ${
                                selectedModel === model
                                  ? 'bg-violet-500 text-white'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <ModelIcon model={model} size={18} />
                              <span className="truncate">{model}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>,
                      document.body
                    )}
                  </div>
                  <button
                    onClick={clearChat}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title={ct.clearChat}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500">
                    <Sparkles size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">{ct.emptyChat}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {/* 头像 */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.role === 'user'
                            ? 'bg-blue-500'
                            : 'bg-white dark:bg-slate-700 shadow-sm'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User size={16} className="text-white" />
                        ) : (
                          <ModelIcon size={20} />
                        )}
                      </div>

                      {/* 消息内容 */}
                      <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block px-4 py-3 rounded-2xl max-w-[85%] ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* 执行结果 */}
                        {msg.role === 'assistant' && msg.executionResult && (
                          renderExecutionResult(msg.executionResult)
                        )}

                        {/* 时间戳 */}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString(
                            settings.language === 'zh' ? 'zh-CN' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* 加载状态 */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center">
                      <ModelIcon size={20} />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={ct.placeholder}
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
