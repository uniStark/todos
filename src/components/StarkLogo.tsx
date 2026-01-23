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
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        type: 'spring' as const,
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
        type: 'spring' as const,
        stiffness: 200,
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-12">
      {/* Icon + Text Logo */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
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
            className="absolute inset-0 bg-blue-500/30 dark:bg-blue-400/20 rounded-lg sm:rounded-xl blur-xl"
          />
          
          {/* Icon */}
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20">
            <CheckSquare className="text-white" size={24} strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Text Logo with modern font */}
        <div className="flex items-center">
          {letters.map((letter, i) => (
            <motion.span
              key={`${letter}-${i}`}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent drop-shadow-sm"
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
        className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base text-slate-700 dark:text-slate-400 font-medium px-4 text-center sm:text-left"
      >
        <span className="whitespace-nowrap">{t.subtitle1}</span>
        <Zap size={14} className="text-blue-600 dark:text-blue-400 hidden sm:inline" />
        <span className="whitespace-nowrap">{t.subtitle2}</span>
      </motion.div>

      {/* Decorative underline */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
        className="h-0.5 bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-700 to-transparent mt-3 sm:mt-4 max-w-xs sm:max-w-md"
      />
    </div>
  );
};

export default StarkLogo;
