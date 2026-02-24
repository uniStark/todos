'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, X, User, AlertCircle, Plus, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { DeepSeek, Zhipu } from '@lobehub/icons';
import { ChatMessage, AIExecutionResult, AIModelType } from '@/lib/types';
import { useSettings } from '@/contexts/SettingsContext';
import { sendMobileAIMessage, getMobileAIChatHistory, clearMobileAIChatHistory } from '@/lib/mobileAI';
import { useHaptics } from '@/hooks/useMobileInit';

// 模型图标组件
const ModelIcon = ({ model, size = 20, className = '' }: { model: AIModelType; size?: number; className?: string }) => {
  if (model === 'deepseek_v3.1') {
    return <DeepSeek.Color size={size} className={className} />;
  }
  return <Zhipu.Color size={size} className={className} />;
};

interface VoiceButtonProps {
  onRefreshTodos: () => void;
}

// 语音识别类型声明
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function VoiceButton({ onRefreshTodos }: VoiceButtonProps) {
  const { settings, updateSettings } = useSettings();
  const { triggerHaptic } = useHaptics();
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModelType>(settings.aiModel || 'deepseek_v3.1');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 加载聊天历史
  useEffect(() => {
    if (showChat) {
      loadChatHistory();
    }
  }, [showChat]);

  const loadChatHistory = async () => {
    try {
      const session = await getMobileAIChatHistory();
      setMessages(session.messages);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // 初始化语音识别
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language === 'zh' ? 'zh-CN' : 'en-US';
      
      recognition.onstart = () => {
        console.log('[VoiceButton] Recognition started');
        isListeningRef.current = true;
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        if (final) {
          setTranscript(prev => prev + final);
        }
        setInterimTranscript(interim);
      };
      
      recognition.onerror = (event) => {
        console.error('[VoiceButton] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError(settings.language === 'zh' ? '请允许麦克风权限' : 'Please allow microphone access');
        } else if (event.error !== 'aborted') {
          setError(settings.language === 'zh' ? '语音识别出错，请重试' : 'Speech recognition error, please try again');
        }
        setIsListening(false);
        isListeningRef.current = false;
      };
      
      recognition.onend = () => {
        console.log('[VoiceButton] Recognition ended');
        // 只有在仍然按住时才重新开始
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.log('[VoiceButton] Could not restart recognition');
          }
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setError(settings.language === 'zh' ? '您的浏览器不支持语音识别' : 'Your browser does not support speech recognition');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [settings.language]);

  // 多语言翻译
  const t = {
    zh: {
      holdToSpeak: '按住说话',
      listening: '正在聆听...',
      processing: '处理中...',
      release: '松开发送',
      noSpeech: '没有检测到语音',
      aiAssistant: 'AI 助手',
      clearChat: '清除对话',
      added: '已添加',
      completed: '已完成',
      deleted: '已删除',
      updated: '已更新',
      tasksCount: '项任务',
    },
    en: {
      holdToSpeak: 'Hold to Speak',
      listening: 'Listening...',
      processing: 'Processing...',
      release: 'Release to Send',
      noSpeech: 'No speech detected',
      aiAssistant: 'AI Assistant',
      clearChat: 'Clear Chat',
      added: 'Added',
      completed: 'Completed',
      deleted: 'Deleted',
      updated: 'Updated',
      tasksCount: 'tasks',
    },
  };

  const ct = t[settings.language as 'zh' | 'en'] || t.zh;

  // 开始录音
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isProcessing) return;
    
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);
    isListeningRef.current = true;
    triggerHaptic('medium');
    
    try {
      recognitionRef.current.lang = settings.language === 'zh' ? 'zh-CN' : 'en-US';
      recognitionRef.current.start();
    } catch (e) {
      console.error('[VoiceButton] Failed to start recognition:', e);
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [isProcessing, settings.language, triggerHaptic]);

  // 停止录音并处理
  const stopListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    isListeningRef.current = false;
    setIsListening(false);
    
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.log('[VoiceButton] Recognition already stopped');
    }
    
    // 合并最终文本和中间文本
    const finalText = (transcript + interimTranscript).trim();
    setInterimTranscript('');
    
    if (!finalText) {
      triggerHaptic('warning');
      setError(ct.noSpeech);
      setTimeout(() => setError(null), 2000);
      return;
    }
    
    triggerHaptic('success');
    
    // 发送消息给 AI
    setIsProcessing(true);
    setShowChat(true);
    
    // 乐观更新
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: finalText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setTranscript('');
    
    try {
      const { message, executionResult } = await sendMobileAIMessage(
        finalText,
        selectedModel,
        {
          enablePriority: settings.enablePriority ?? true,
          enableGroups: settings.enableGroups ?? true,
        }
      );
      
      // 更新消息列表
      await loadChatHistory();
      
      // 如果有操作被执行，刷新待办事项列表
      if (executionResult.added.length > 0 || 
          executionResult.completed.length > 0 || 
          executionResult.deleted.length > 0 ||
          executionResult.updated.length > 0) {
        onRefreshTodos();
        triggerHaptic('success');
      }
    } catch (err) {
      console.error('[VoiceButton] Failed to process message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      triggerHaptic('error');
    } finally {
      setIsProcessing(false);
    }
  }, [transcript, interimTranscript, selectedModel, settings.enablePriority, settings.enableGroups, onRefreshTodos, triggerHaptic, ct.noSpeech]);

  // 清除对话
  const clearChat = async () => {
    try {
      await clearMobileAIChatHistory();
      setMessages([]);
      triggerHaptic('light');
    } catch (err) {
      console.error('[VoiceButton] Failed to clear chat:', err);
    }
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
        {result.added.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <Plus size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {ct.added} {result.added.length} {ct.tasksCount}
            </span>
          </div>
        )}

        {result.completed.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
            <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {ct.completed} {result.completed.length} {ct.tasksCount}
            </span>
          </div>
        )}

        {result.deleted.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <XCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {ct.deleted} {result.deleted.length} {ct.tasksCount}
            </span>
          </div>
        )}

        {result.updated.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <Edit3 size={14} className="text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {ct.updated} {result.updated.length} {ct.tasksCount}
            </span>
          </div>
        )}

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

  return (
    <>
      {/* 底部按住说话按钮 */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 left-4 right-4 z-50 safe-bottom"
      >
        <motion.button
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onMouseLeave={() => {
            if (isListening) stopListening();
          }}
          disabled={isProcessing}
          className={`w-full py-5 px-6 rounded-[2rem] shadow-2xl ring-1 ring-black/5 flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer ${
            isListening
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white scale-[1.02]'
              : isProcessing
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span className="font-bold text-sm">{ct.processing}</span>
            </>
          ) : isListening ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Mic size={22} />
              </motion.div>
              <span className="font-bold text-sm">{ct.release}</span>
            </>
          ) : (
            <>
              <Mic size={22} />
              <span className="font-bold text-sm">{ct.holdToSpeak}</span>
            </>
          )}
        </motion.button>

        {/* 录音中的文本预览 */}
        <AnimatePresence>
          {(isListening || transcript || interimTranscript) && !showChat && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-4 left-0 right-0 px-2"
            >
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300 min-h-[24px]">
                  {transcript}
                  <span className="text-slate-400">{interimTranscript}</span>
                  {isListening && !transcript && !interimTranscript && (
                    <span className="text-slate-400 animate-pulse">{ct.listening}</span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-4 left-0 right-0 px-2"
            >
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
                <MicOff size={20} className="text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 对话历史面板 */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <ModelIcon model={selectedModel} size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{ct.aiAssistant}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedModel === 'deepseek_v3.1' ? 'DeepSeek V3.1' : 'GLM-4'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearChat}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                    title={ct.clearChat}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                    <Mic size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">{ct.holdToSpeak}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.role === 'user'
                            ? 'bg-blue-500'
                            : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User size={16} className="text-white" />
                        ) : (
                          <ModelIcon model={selectedModel} size={20} />
                        )}
                      </div>

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

                        {msg.role === 'assistant' && msg.executionResult && (
                          renderExecutionResult(msg.executionResult)
                        )}

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

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <ModelIcon model={selectedModel} size={20} />
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

              {/* 底部安全区域 */}
              <div className="h-[100px]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
