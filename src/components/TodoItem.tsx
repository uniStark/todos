'use client';

import React, { memo } from 'react';
import { Todo, DEFAULT_GROUP_ID } from '@/lib/types';
import { Trash2, Calendar, Clock, CheckCheck, Check, Pencil, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface TodoItemProps {
  todo: Todo;
  isMobile: boolean;
  isNativeApp: boolean;
  isPending: boolean;
  isEditing: boolean;
  isMenuOpen: boolean;
  editText: string;
  /** 该 todo 所属用户分组的名称（已在父级预计算并 memo，避免传整个 groups 数组破坏 memo） */
  groupName: string | null;
  language: 'zh' | 'en';
  enablePriority: boolean;
  enableGroups: boolean;
  // 稳定回调（均来自父级 useCallback / setState）
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onStartEdit: (id: string, text: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onOpenMenu: (id: string, rect: DOMRect) => void;
  onCloseMenu: () => void;
  hapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  formatDate: (timestamp: number) => string;
  formatDueDate: (dueDate: string) => string;
  resizeTextarea: (textarea: HTMLTextAreaElement | null) => void;
}

function TodoItemImpl({
  todo,
  isMobile,
  isNativeApp,
  isPending,
  isEditing,
  isMenuOpen,
  editText,
  groupName,
  language,
  enablePriority,
  enableGroups,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onOpenMenu,
  onCloseMenu,
  hapticFeedback,
  formatDate,
  formatDueDate,
  resizeTextarea,
}: TodoItemProps) {
  const disabled = !isNativeApp && isPending;

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    hapticFeedback('light');
    if (isMenuOpen) {
      onCloseMenu();
    } else {
      onOpenMenu(todo.id, e.currentTarget.getBoundingClientRect());
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] hover-lift group relative overflow-hidden ${
        todo.completed ? 'opacity-60 grayscale-[0.5]' : ''
      }`}
    >
      {/* Priority left border indicator for mobile */}
      {isMobile && todo.priority && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          todo.priority === 'P0' ? 'bg-red-500' :
          todo.priority === 'P1' ? 'bg-amber-500' :
          'bg-blue-500'
        }`} />
      )}

      <div className="flex items-center gap-3 sm:gap-6">
        <motion.button
          whileTap={{ scale: 0.8 }}
          disabled={disabled}
          onClick={() => {
            onToggle(todo.id, todo.completed);
            hapticFeedback('light');
          }}
          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 cursor-pointer disabled:cursor-not-allowed ${
            todo.completed
              ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
          }`}
        >
          {todo.completed && <CheckCheck className="text-white" size={isMobile ? 14 : 18} strokeWidth={3} />}
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            {/* Priority Indicator - Desktop Only (Mobile uses left bar) */}
            {!isMobile && enablePriority && todo.priority && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                todo.priority === 'P0' ? 'bg-red-500 text-white shadow-sm' :
                todo.priority === 'P1' ? 'bg-amber-500 text-white shadow-sm' :
                'bg-blue-500 text-white shadow-sm'
              }`}>
                {todo.priority}
              </span>
            )}
            {/* Group Tag */}
            {enableGroups && todo.groupId && todo.groupId !== DEFAULT_GROUP_ID && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ring-1 ring-slate-200 dark:ring-slate-700">
                {groupName || '...'}
              </span>
            )}
          </div>

          {isEditing ? (
            // 编辑模式
            <div className="flex items-center gap-2">
              <textarea
                data-edit-id={todo.id}
                value={editText}
                onChange={(e) => {
                  onEditTextChange(e.target.value);
                  resizeTextarea(e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSaveEdit(todo.id);
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
                rows={1}
                className="flex-1 min-h-[40px] max-h-48 resize-none overflow-hidden bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-base sm:text-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onSaveEdit(todo.id)}
                className="p-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                <Check size={16} strokeWidth={3} />
              </motion.button>
            </div>
          ) : (
            // 显示模式：双击正文进入编辑，hover 悬浮提示
            <div
              onDoubleClick={() => onStartEdit(todo.id, todo.text)}
              title={language === 'zh' ? '双击编辑' : 'Double-click to edit'}
              className="cursor-text"
            >
              <p
                className={`text-base sm:text-xl font-semibold mb-0.5 transition-all duration-500 break-words whitespace-pre-wrap ${
                  todo.completed
                    ? 'line-through text-slate-400 dark:text-slate-500 italic'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {todo.text}
              </p>
              <div className="flex items-center justify-between gap-3 text-[11px] sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={isMobile ? 10 : 12} strokeWidth={2.5} />
                    {formatDate(todo.createdAt)}
                  </span>
                  {todo.dueDate && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <Clock size={isMobile ? 10 : 12} strokeWidth={2.5} />
                      {formatDueDate(todo.dueDate)}
                    </span>
                  )}
                </div>

                {isMobile && !isEditing && (
                  <div className="flex shrink-0 items-center gap-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleMenuToggle}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      aria-label={language === 'zh' ? '更多操作' : 'More actions'}
                    >
                      <MoreVertical size={16} strokeWidth={2.5} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(todo.id);
                      }}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={language === 'zh' ? '删除任务' : 'Delete task'}
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {!isEditing && (
          <div className={`${isMobile ? 'hidden' : 'flex'} items-center gap-0.5 sm:gap-1`}>
            {/* Menu button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleMenuToggle}
              className="p-2 sm:p-3 rounded-2xl text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 cursor-pointer"
            >
              <MoreVertical size={isMobile ? 16 : 18} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(todo.id, todo.text);
              }}
              className="p-3 rounded-2xl text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-all duration-300 cursor-pointer"
            >
              <Pencil size={18} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(todo.id);
              }}
              className="p-2 sm:p-3 rounded-2xl text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={isMobile ? 18 : 20} strokeWidth={2.5} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const TodoItem = memo(TodoItemImpl);
export default TodoItem;
