'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Zap } from 'lucide-react';

const StarkLogo: React.FC = () => {
  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        type: 'spring',
        stiffness: 100,
      },
    }),
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        delay: 0.6,
        duration: 0.6,
        type: 'spring',
        stiffness: 200,
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
      {/* Icon + Text Logo */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3">
        <motion.div
          variants={iconVariants}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          {/* Animated background glow */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-xl blur-xl"
          />
          
          {/* Icon */}
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-3 rounded-xl shadow-lg">
            <CheckSquare className="text-white" size={32} strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Text Logo with modern font */}
        <div className="flex items-center">
          {['S', 'T', 'A', 'R', 'K'].map((letter, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                fontWeight: 900,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Subtitle with elegant animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="flex items-center gap-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium"
      >
        <span>极简任务管理</span>
        <Zap size={16} className="text-blue-600 dark:text-blue-400" />
        <span>高效生活方式</span>
      </motion.div>

      {/* Decorative underline */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
        className="h-0.5 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent mt-4 max-w-md"
      />
    </div>
  );
};

export default StarkLogo;
