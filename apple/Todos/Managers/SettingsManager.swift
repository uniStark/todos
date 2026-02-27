//
//  SettingsManager.swift
//  Todos
//
//  设置管理器：管理应用设置和持久化
//  Author: Adrian Stark
//

import SwiftUI
import CloudKit

/// 支持的语言
enum AppLanguage: String, CaseIterable, Codable {
    case zh = "zh"
    case en = "en"
    
    var displayName: String {
        switch self {
        case .zh: return "中文"
        case .en: return "English"
        }
    }
    
    var locale: Locale {
        Locale(identifier: rawValue)
    }
}

/// 主题模式
enum ThemeMode: String, CaseIterable, Codable {
    case light
    case dark
    case system
    
    var localizedName: (AppLanguage) -> String {
        return { language in
            switch (self, language) {
            case (.light, .zh): return "浅色"
            case (.light, .en): return "Light"
            case (.dark, .zh): return "深色"
            case (.dark, .en): return "Dark"
            case (.system, .zh): return "跟随系统"
            case (.system, .en): return "System"
            }
        }
    }
}

/// 设置管理器
final class SettingsManager: ObservableObject {
    private enum Keys {
        static let language = "settings_language"
        static let theme = "settings_theme"
        static let logoText = "settings_logoText"
        static let enablePriority = "settings_enablePriority"
        static let enableGroups = "settings_enableGroups"
        static let aiModel = "settings_aiModel"
        static let iCloudSyncEnabled = "settings_iCloudSyncEnabled"
    }
    
    @Published var language: AppLanguage {
        didSet { UserDefaults.standard.set(language.rawValue, forKey: Keys.language) }
    }
    
    @Published var theme: ThemeMode {
        didSet { UserDefaults.standard.set(theme.rawValue, forKey: Keys.theme) }
    }
    
    @Published var logoText: String {
        didSet { UserDefaults.standard.set(logoText, forKey: Keys.logoText) }
    }
    
    @Published var enablePriority: Bool {
        didSet { UserDefaults.standard.set(enablePriority, forKey: Keys.enablePriority) }
    }
    
    @Published var enableGroups: Bool {
        didSet { UserDefaults.standard.set(enableGroups, forKey: Keys.enableGroups) }
    }
    
    @Published var aiModel: AIModelType {
        didSet { UserDefaults.standard.set(aiModel.rawValue, forKey: Keys.aiModel) }
    }
    
    @Published var iCloudSyncEnabled: Bool {
        didSet {
            UserDefaults.standard.set(iCloudSyncEnabled, forKey: Keys.iCloudSyncEnabled)
            if oldValue != iCloudSyncEnabled { needsRestart = true }
        }
    }
    
    @Published var iCloudAvailable: Bool = false
    @Published var needsRestart: Bool = false
    
    var aiApiKey: String { AppConfig.aiApiKey }
    
    var colorScheme: ColorScheme? {
        switch theme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
    
    init() {
        let languageRaw = UserDefaults.standard.string(forKey: Keys.language) ?? AppConfig.defaultLanguage.rawValue
        self.language = AppLanguage(rawValue: languageRaw) ?? AppConfig.defaultLanguage
        
        let themeRaw = UserDefaults.standard.string(forKey: Keys.theme) ?? AppConfig.defaultTheme.rawValue
        self.theme = ThemeMode(rawValue: themeRaw) ?? AppConfig.defaultTheme
        
        self.logoText = UserDefaults.standard.string(forKey: Keys.logoText) ?? AppConfig.defaultLogoText
        
        if UserDefaults.standard.object(forKey: Keys.enablePriority) == nil {
            UserDefaults.standard.set(AppConfig.defaultEnablePriority, forKey: Keys.enablePriority)
        }
        self.enablePriority = UserDefaults.standard.bool(forKey: Keys.enablePriority)
        
        if UserDefaults.standard.object(forKey: Keys.enableGroups) == nil {
            UserDefaults.standard.set(AppConfig.defaultEnableGroups, forKey: Keys.enableGroups)
        }
        self.enableGroups = UserDefaults.standard.bool(forKey: Keys.enableGroups)
        
        let aiModelRaw = UserDefaults.standard.string(forKey: Keys.aiModel) ?? AppConfig.defaultAIModel.rawValue
        self.aiModel = AIModelType(rawValue: aiModelRaw) ?? AppConfig.defaultAIModel
        
        self.iCloudSyncEnabled = UserDefaults.standard.bool(forKey: Keys.iCloudSyncEnabled)
        
        if AppConfig.enableiCloudSync {
            checkiCloudStatus()
        }
    }
    
    func resetToDefaults() {
        language = AppConfig.defaultLanguage
        theme = AppConfig.defaultTheme
        logoText = AppConfig.defaultLogoText
        enablePriority = AppConfig.defaultEnablePriority
        enableGroups = AppConfig.defaultEnableGroups
        aiModel = AppConfig.defaultAIModel
    }
    
    private func checkiCloudStatus() {
        CKContainer.default().accountStatus { [weak self] status, _ in
            DispatchQueue.main.async {
                self?.iCloudAvailable = (status == .available)
            }
        }
    }
    
    func localized(_ key: LocalizedKey) -> String {
        key.string(for: language)
    }
}

// MARK: - 本地化

enum LocalizedKey {
    case save, cancel, close, delete, edit, done, add
    case allTasks, activeTasks, completedTasks
    case addTask, taskPlaceholder
    case past, today, future
    case noTasks, noActiveTasks, noCompletedTasks
    case allGroups, manageGroups, newGroupName, defaultGroup
    case priority, urgent, important, normal
    case settings, language, theme, logoCustomization
    case features, priorityFeature, groupsFeature
    case aiSettings, aiModel, apiKey
    case aiAssistant, holdToSpeak, listening, processing
    case release, noSpeech, clearChat
    case added, completed, deleted, updated, tasks
    case analytics, totalCreated, totalCompleted
    case completionRate, dailyActivity
    case created, completedLabel
    
    func string(for lang: AppLanguage) -> String {
        switch (self, lang) {
        case (.save, .zh): return "保存"
        case (.save, .en): return "Save"
        case (.cancel, .zh): return "取消"
        case (.cancel, .en): return "Cancel"
        case (.close, .zh): return "关闭"
        case (.close, .en): return "Close"
        case (.delete, .zh): return "删除"
        case (.delete, .en): return "Delete"
        case (.edit, .zh): return "编辑"
        case (.edit, .en): return "Edit"
        case (.done, .zh): return "完成"
        case (.done, .en): return "Done"
        case (.add, .zh): return "添加"
        case (.add, .en): return "Add"
        case (.allTasks, .zh): return "全部"
        case (.allTasks, .en): return "All"
        case (.activeTasks, .zh): return "进行中"
        case (.activeTasks, .en): return "Active"
        case (.completedTasks, .zh): return "已完成"
        case (.completedTasks, .en): return "Completed"
        case (.addTask, .zh): return "添加任务"
        case (.addTask, .en): return "Add Task"
        case (.taskPlaceholder, .zh): return "输入任务内容..."
        case (.taskPlaceholder, .en): return "Enter task..."
        case (.past, .zh): return "过去"
        case (.past, .en): return "Past"
        case (.today, .zh): return "今天"
        case (.today, .en): return "Today"
        case (.future, .zh): return "未来"
        case (.future, .en): return "Future"
        case (.noTasks, .zh): return "暂无任务"
        case (.noTasks, .en): return "No tasks"
        case (.noActiveTasks, .zh): return "暂无进行中的任务"
        case (.noActiveTasks, .en): return "No active tasks"
        case (.noCompletedTasks, .zh): return "暂无已完成的任务"
        case (.noCompletedTasks, .en): return "No completed tasks"
        case (.allGroups, .zh): return "所有分组"
        case (.allGroups, .en): return "All Groups"
        case (.manageGroups, .zh): return "管理分组"
        case (.manageGroups, .en): return "Manage Groups"
        case (.newGroupName, .zh): return "新分组名称"
        case (.newGroupName, .en): return "New group name"
        case (.defaultGroup, .zh): return "默认"
        case (.defaultGroup, .en): return "Default"
        case (.priority, .zh): return "优先级"
        case (.priority, .en): return "Priority"
        case (.urgent, .zh): return "紧急"
        case (.urgent, .en): return "Urgent"
        case (.important, .zh): return "重要"
        case (.important, .en): return "Important"
        case (.normal, .zh): return "普通"
        case (.normal, .en): return "Normal"
        case (.settings, .zh): return "设置"
        case (.settings, .en): return "Settings"
        case (.language, .zh): return "语言"
        case (.language, .en): return "Language"
        case (.theme, .zh): return "主题"
        case (.theme, .en): return "Theme"
        case (.logoCustomization, .zh): return "Logo 自定义"
        case (.logoCustomization, .en): return "Logo Customization"
        case (.features, .zh): return "功能"
        case (.features, .en): return "Features"
        case (.priorityFeature, .zh): return "优先级功能"
        case (.priorityFeature, .en): return "Priority Feature"
        case (.groupsFeature, .zh): return "分组功能"
        case (.groupsFeature, .en): return "Groups Feature"
        case (.aiSettings, .zh): return "AI 设置"
        case (.aiSettings, .en): return "AI Settings"
        case (.aiModel, .zh): return "AI 模型"
        case (.aiModel, .en): return "AI Model"
        case (.apiKey, .zh): return "API 密钥"
        case (.apiKey, .en): return "API Key"
        case (.aiAssistant, .zh): return "AI 助手"
        case (.aiAssistant, .en): return "AI Assistant"
        case (.holdToSpeak, .zh): return "按住说话"
        case (.holdToSpeak, .en): return "Hold to Speak"
        case (.listening, .zh): return "正在聆听..."
        case (.listening, .en): return "Listening..."
        case (.processing, .zh): return "处理中..."
        case (.processing, .en): return "Processing..."
        case (.release, .zh): return "松开发送"
        case (.release, .en): return "Release to Send"
        case (.noSpeech, .zh): return "没有检测到语音"
        case (.noSpeech, .en): return "No speech detected"
        case (.clearChat, .zh): return "清除对话"
        case (.clearChat, .en): return "Clear Chat"
        case (.added, .zh): return "已添加"
        case (.added, .en): return "Added"
        case (.completed, .zh): return "已完成"
        case (.completed, .en): return "Completed"
        case (.deleted, .zh): return "已删除"
        case (.deleted, .en): return "Deleted"
        case (.updated, .zh): return "已更新"
        case (.updated, .en): return "Updated"
        case (.tasks, .zh): return "项任务"
        case (.tasks, .en): return "tasks"
        case (.analytics, .zh): return "数据统计"
        case (.analytics, .en): return "Analytics"
        case (.totalCreated, .zh): return "总创建"
        case (.totalCreated, .en): return "Total Created"
        case (.totalCompleted, .zh): return "已完成"
        case (.totalCompleted, .en): return "Completed"
        case (.completionRate, .zh): return "完成率"
        case (.completionRate, .en): return "Completion Rate"
        case (.dailyActivity, .zh): return "每日动态"
        case (.dailyActivity, .en): return "Daily Activity"
        case (.created, .zh): return "已创建"
        case (.created, .en): return "Created"
        case (.completedLabel, .zh): return "已完成"
        case (.completedLabel, .en): return "Completed"
        }
    }
}
