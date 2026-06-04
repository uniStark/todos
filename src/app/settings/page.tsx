'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Type, Clock, Sun, Moon, Monitor, Check, Tag, FolderOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { translations, Language } from '@/lib/translations';
import { TIMEZONES } from '@/lib/timezones';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [tempLogoText, setTempLogoText] = useState(settings.logoText);
  const [showSaved, setShowSaved] = useState(false);
  const t = translations[settings.language];

  // Update tempLogoText when settings.logoText changes
  useEffect(() => {
    setTempLogoText(settings.logoText);
  }, [settings.logoText]);

  const handleSave = () => {
    updateSettings({ logoText: tempLogoText });
    showSaveNotification();
  };

  const showSaveNotification = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleLanguageChange = (lang: Language) => {
    updateSettings({ language: lang });
    showSaveNotification();
  };

  const handleTimezoneChange = (timezone: string) => {
    updateSettings({ timezone });
    showSaveNotification();
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
    showSaveNotification();
  };

  const handlePriorityToggle = () => {
    updateSettings({ enablePriority: !settings.enablePriority });
    showSaveNotification();
  };

  const handleGroupsToggle = () => {
    updateSettings({ enableGroups: !settings.enableGroups });
    showSaveNotification();
  };

  return (
    <main className="min-h-screen bg-light-primary selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Save Notification Pro Max */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 ring-1 ring-white/20"
            >
              <div className="bg-emerald-500 rounded-full p-1">
                <Check className="text-white" size={16} strokeWidth={4} />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">
                {t.settingsSaved}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Pro Max */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6 mb-12 sm:mb-16"
        >
          <button
            onClick={() => router.push('/')}
            className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
              {t.settings}
            </h1>
            <div className="h-1 w-12 bg-blue-500 rounded-full mt-2" />
          </div>
        </motion.div>

        {/* Settings Sections Pro Max */}
        <div className="space-y-6 sm:space-y-8">
          {[
            {
              id: 'language',
              icon: Globe,
              title: t.language,
              desc: t.languageDesc,
              color: 'blue',
              content: (
                <div className="flex gap-3">
                  {(['zh', 'en'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all cursor-pointer ring-1 ring-inset ${
                        settings.language === lang
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl ring-transparent'
                          : 'bg-white dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 ring-slate-200 dark:ring-slate-700'
                      }`}
                    >
                      {lang === 'zh' ? '中文' : 'English'}
                    </button>
                  ))}
                </div>
              )
            },
            {
              id: 'logo',
              icon: Type,
              title: t.logoCustomization,
              desc: t.logoCustomizationDesc,
              color: 'purple',
              content: (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={tempLogoText}
                    onChange={(e) => setTempLogoText(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder={t.logoTextPlaceholder}
                    maxLength={10}
                    className="flex-1 bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all uppercase tracking-widest"
                  />
                  <button
                    onClick={handleSave}
                    disabled={tempLogoText === settings.logoText || !tempLogoText.trim()}
                    className="w-full sm:w-auto px-8 py-4 sm:py-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-20 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-95"
                  >
                    {t.save}
                  </button>
                </div>
              )
            },
            {
              id: 'timezone',
              icon: Clock,
              title: t.timezone,
              desc: t.timezoneDesc,
              color: 'emerald',
              content: (
                <select
                  value={settings.timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              )
            },
            {
              id: 'priority',
              icon: Tag,
              title: settings.language === 'zh' ? '优先级功能' : 'Priority Feature',
              desc: settings.language === 'zh' ? '启用或关闭任务优先级' : 'Enable or disable task priority',
              color: 'rose',
              content: (
                <button
                  onClick={handlePriorityToggle}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer ring-1 ring-inset ${
                    settings.enablePriority
                      ? 'bg-rose-500/10 dark:bg-rose-500/20 ring-rose-300 dark:ring-rose-700'
                      : 'bg-slate-100 dark:bg-slate-800/50 ring-slate-200 dark:ring-slate-700'
                  }`}
                >
                  <span className={`text-sm font-bold ${
                    settings.enablePriority ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                  }`}>
                    {settings.enablePriority 
                      ? (settings.language === 'zh' ? '已启用 P0/P1/P2' : 'Enabled P0/P1/P2')
                      : (settings.language === 'zh' ? '已关闭' : 'Disabled')
                    }
                  </span>
                  {settings.enablePriority ? (
                    <ToggleRight size={32} className="text-rose-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-400" />
                  )}
                </button>
              )
            },
            {
              id: 'groups',
              icon: FolderOpen,
              title: settings.language === 'zh' ? '分组功能' : 'Groups Feature',
              desc: settings.language === 'zh' ? '启用或关闭任务分组' : 'Enable or disable task groups',
              color: 'cyan',
              content: (
                <button
                  onClick={handleGroupsToggle}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer ring-1 ring-inset ${
                    settings.enableGroups
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 ring-cyan-300 dark:ring-cyan-700'
                      : 'bg-slate-100 dark:bg-slate-800/50 ring-slate-200 dark:ring-slate-700'
                  }`}
                >
                  <span className={`text-sm font-bold ${
                    settings.enableGroups ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
                  }`}>
                    {settings.enableGroups 
                      ? (settings.language === 'zh' ? '已启用分组管理' : 'Groups Enabled')
                      : (settings.language === 'zh' ? '已关闭' : 'Disabled')
                    }
                  </span>
                  {settings.enableGroups ? (
                    <ToggleRight size={32} className="text-cyan-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-400" />
                  )}
                </button>
              )
            },
            {
              id: 'theme',
              icon: Sun,
              title: t.themeMode,
              desc: t.themeModeDesc,
              color: 'orange',
              content: (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light' as const, icon: Sun, label: t.themeLight },
                    { value: 'dark' as const, icon: Moon, label: t.themeDark },
                    { value: 'system' as const, icon: Monitor, label: t.themeSystem },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl transition-all cursor-pointer ring-1 ring-inset ${
                        settings.theme === value
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl ring-transparent'
                          : 'bg-white dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-700'
                      }`}
                    >
                      <Icon size={20} strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                    </button>
                  ))}
                </div>
              )
            }
          ].map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 sm:p-8 rounded-[2.5rem] ring-1 ring-black/5 dark:ring-white/5"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 bg-${section.color}-500/10 rounded-2xl`}>
                  <section.icon className={`text-${section.color}-500`} size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                    {section.desc}
                  </p>
                </div>
              </div>
              {section.content}
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
