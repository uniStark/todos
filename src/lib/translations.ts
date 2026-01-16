export const translations = {
  zh: {
    // Common
    save: '保存',
    cancel: '取消',
    close: '关闭',
    
    // Home
    addTask: '添加新任务',
    addTaskPlaceholder: '添加新任务...',
    all: '全部',
    allTasks: '全部任务',
    active: '进行中',
    completed: '已完成',
    noTasks: '暂无任务，开始记录你的灵感吧',
    created: '创建',
    completedAt: '完成',
    subtitle1: '极简任务管理',
    subtitle2: '高效生活方式',
    
    // Settings
    settings: '设置',
    language: '语言',
    languageDesc: '选择界面语言',
    logoCustomization: 'Logo 自定义',
    logoCustomizationDesc: '自定义主页 Logo 文字',
    logoTextLabel: 'Logo 文字',
    logoTextPlaceholder: '输入自定义文字（如 STARK）',
    timezone: '时区',
    timezoneDesc: '选择显示时区',
    themeMode: '主题模式',
    themeModeDesc: '选择外观主题',
    themeLight: '浅色模式',
    themeDark: '深色模式',
    themeSystem: '跟随系统',
  },
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    
    // Home
    addTask: 'Add Task',
    addTaskPlaceholder: 'Add a new task...',
    all: 'All',
    allTasks: 'All Tasks',
    active: 'Active',
    completed: 'Completed',
    noTasks: 'No tasks yet. Start tracking your ideas!',
    created: 'Created',
    completedAt: 'Completed',
    subtitle1: 'Minimal Task Management',
    subtitle2: 'Efficient Lifestyle',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    languageDesc: 'Choose interface language',
    logoCustomization: 'Logo Customization',
    logoCustomizationDesc: 'Customize homepage logo text',
    logoTextLabel: 'Logo Text',
    logoTextPlaceholder: 'Enter custom text (e.g., STARK)',
    timezone: 'Timezone',
    timezoneDesc: 'Select display timezone',
    themeMode: 'Theme Mode',
    themeModeDesc: 'Choose appearance theme',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    themeSystem: 'Follow System',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.zh;
