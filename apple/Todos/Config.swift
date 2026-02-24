//
//  Config.swift
//  Todos
//
//  项目配置文件：集中管理所有功能开关和常量
//  Author: Adrian Stark
//

import Foundation

/// 项目配置
enum AppConfig {
    
    // MARK: - 功能开关
    
    /// iCloud 同步（需要 entitlements 和开发者账号配置）
    static let enableiCloudSync = false
    
    /// 语音输入功能
    static let enableVoiceInput = true
    
    /// AI 助手功能
    static let enableAIAssistant = true
    
    /// 数据统计图表
    static let enableAnalytics = true
    
    /// Mac Catalyst 支持
    static let enableMacCatalyst = true
    
    // MARK: - AI 配置
    
    /// AI API Base URL
    static let aiBaseURL = "https://api.siliconflow.cn/v1"
    
    /// AI API Key（内置，用户不可见）
    static let aiApiKey = "***REMOVED-API-KEY***"
    
    /// 默认 AI 模型
    static let defaultAIModel: AIModelType = .deepseek
    
    /// AI 请求超时（秒）
    static let aiRequestTimeout: TimeInterval = 60
    
    /// AI 温度参数
    static let aiTemperature: Double = 0.7
    
    /// AI 最大 Token 数
    static let aiMaxTokens: Int = 2000
    
    // MARK: - 默认设置
    
    /// 默认语言
    static let defaultLanguage: AppLanguage = .en
    
    /// 默认主题
    static let defaultTheme: ThemeMode = .system
    
    /// 默认 Logo 文字
    static let defaultLogoText = "STARK"
    
    /// Logo 最大字符数
    static let maxLogoLength = 10
    
    /// 默认启用优先级
    static let defaultEnablePriority = true
    
    /// 默认启用分组
    static let defaultEnableGroups = true
    
    // MARK: - 应用信息
    
    /// 应用版本
    static let appVersion = "1.0.0"
    
    /// Bundle ID
    static let bundleId = "com.stark.todos"
    
    /// GitHub 仓库地址
    static let githubURL = "https://github.com/uniStark/To-Do-List"
}
