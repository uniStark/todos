'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Type, Clock, Sun, Moon, Monitor, Check } from 'lucide-react';
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

  return (
    <main className="min-h-screen bg-light-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Save Notification */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
            >
              <Check size={20} />
              <span className="font-medium">{t.language === 'zh' ? '设置已保存' : 'Settings Saved'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.settings}</h1>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Language */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Globe className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.language}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.languageDesc}</p>
                <div className="flex gap-2">
                  {(['zh', 'en'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                        settings.language === lang
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {lang === 'zh' ? '中文' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Logo Customization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Type className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.logoCustomization}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.logoCustomizationDesc}</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={tempLogoText}
                    onChange={(e) => setTempLogoText(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder={t.logoTextPlaceholder}
                    maxLength={10}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSave}
                    disabled={tempLogoText === settings.logoText || !tempLogoText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Timezone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Clock className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.timezone}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.timezoneDesc}</p>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Theme Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Sun className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.themeMode}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.themeModeDesc}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light' as const, icon: Sun, label: t.themeLight },
                    { value: 'dark' as const, icon: Moon, label: t.themeDark },
                    { value: 'system' as const, icon: Monitor, label: t.themeSystem },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all cursor-pointer ${
                        settings.theme === value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
