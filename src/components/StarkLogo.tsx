'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Zap } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';

interface StarkLogoProps {
  logoText?: string;
}

const StarkLogo: React.FC<StarkLogoProps> = ({ logoText: customLogoText }) => {
  const { settings } = useSettings();
  const t = translations[settings.language];
  const logoText = customLogoText || settings.logoText || 'STARK';
  const letters = logoText.split('');
  const letterVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        delay: i * 0.08,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1], // Custom Pro Max Ease
      },
    }),
  };

  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0, rotate: -15 },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        delay: 0.4,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 select-none">
      {/* Icon + Text Logo */}
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
        <motion.div
          variants={iconVariants}
          initial="hidden"
          animate="visible"
          className="relative group"
        >
          {/* Animated background glow Pro Max */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-4 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-2xl"
          />
          
          {/* Icon Pro Max */}
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-3 sm:p-4 rounded-2xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
            <CheckSquare className="text-white" size={28} strokeWidth={2.5} />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Zap className="text-amber-300 fill-amber-300" size={14} />
            </motion.div>
          </div>
        </motion.div>

        {/* Text Logo with modern font Pro Max */}
        <div className="flex items-center">
          {letters.map((letter, i) => (
            <motion.span
              key={`${letter}-${i}`}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)]"
              style={{
                fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
                fontWeight: 900,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Subtitle Pro Max */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="flex items-center gap-3 px-6 py-2 rounded-full bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-md"
      >
        <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
          {t.subtitle1}
        </span>
        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">
          {t.subtitle2}
        </span>
      </motion.div>
    </div>
  );
};

export default StarkLogo;
