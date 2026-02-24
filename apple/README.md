# Todos - iOS Native App

这是 Todos 任务管理应用的原生 Swift 版本，使用 SwiftUI 和 SwiftData 构建，支持 iOS 17.0+、iPadOS 17.0+ 和 macOS（通过 Mac Catalyst）。

## 功能特性

### 核心功能
- ✅ **任务管理**：创建、编辑、完成、删除任务
- ✅ **分组管理**：自定义分组，按分组筛选任务
- ✅ **优先级系统**：P0（紧急）、P1（重要）、P2（普通）
- ✅ **时间筛选**：过去、今天、未来
- ✅ **截止日期**：设置任务截止时间

### AI 助手
- 🎤 **语音输入**：按住说话，自动识别
- 🤖 **自然语言处理**：支持 DeepSeek V3.1 和 GLM-4 模型
- ⚡ **智能操作**：通过语音添加、完成、删除、更新任务

### 数据统计
- 📊 **KPI 指标**：总创建、已完成、完成率
- 📈 **每日动态图表**：创建与完成趋势
- 🗓️ **时间范围**：7天、30天、全部时间

### 个性化设置
- 🌍 **多语言**：中文、English
- 🎨 **主题切换**：浅色、深色、跟随系统
- ✏️ **Logo 自定义**：最多 10 字符
- ⚙️ **功能开关**：优先级、分组可独立启用/禁用

## 技术架构

### 技术栈
- **UI 框架**：SwiftUI
- **数据持久化**：SwiftData
- **语音识别**：Speech Framework
- **图表**：Swift Charts
- **最低系统版本**：iOS 17.0

### 项目结构

```
apple/
├── Todos.xcodeproj/        # Xcode 项目文件
├── Todos/
│   ├── TodosApp.swift      # 应用入口
│   ├── Config.swift        # 项目配置（功能开关、常量）
│   ├── Info.plist          # 应用配置
│   ├── Todos.entitlements  # 能力配置（iCloud 等）
│   ├── Assets.xcassets/    # 资源文件
│   ├── Models/             # 数据模型
│   │   ├── TodoItem.swift
│   │   ├── TodoGroup.swift
│   │   └── ChatMessage.swift
│   ├── Views/              # 视图
│   │   ├── ContentView.swift
│   │   ├── Home/
│   │   ├── Settings/
│   │   ├── Analytics/
│   │   └── Components/
│   ├── Managers/           # 状态管理
│   │   └── SettingsManager.swift
│   └── Services/           # 服务
│       ├── AIService.swift
│       ├── SpeechRecognizer.swift
│       └── HapticManager.swift
└── README.md
```

## 开始使用

### 系统要求
- macOS 14.0+ (Sonoma)
- Xcode 15.0+
- iOS 17.0+ / iPadOS 17.0+ / macOS 14.0+ (Mac Catalyst)

### 打开项目

1. 在 Finder 中进入 `apple` 目录
2. 双击 `Todos.xcodeproj` 打开 Xcode
3. 选择目标设备（iPhone/iPad/Mac）
4. 点击运行按钮（或按 `Cmd + R`）

### 配置开发者团队

1. 在 Xcode 中选择项目
2. 选择 "Todos" Target
3. 在 "Signing & Capabilities" 中选择你的开发者团队

### 添加 App Icon

当前项目没有包含 App Icon 图片，你可以：

1. 准备一张 1024x1024 的图片
2. 使用工具（如 https://makeappicon.com/）生成不同尺寸
3. 将图片拖入 `Assets.xcassets/AppIcon.appiconset`

## 权限说明

应用需要以下权限：

- **麦克风**：用于语音输入
- **语音识别**：将语音转换为文字

这些权限会在首次使用语音功能时请求。

## 项目配置（Config.swift）

所有功能开关和常量集中在 `Todos/Config.swift` 中管理，修改后重新编译即可生效：

```swift
enum AppConfig {
    // 功能开关
    static let enableiCloudSync    = false   // iCloud 同步（当前关闭）
    static let enableVoiceInput    = true    // 语音输入
    static let enableAIAssistant   = true    // AI 助手
    static let enableAnalytics     = true    // 数据统计
    static let enableMacCatalyst   = true    // Mac Catalyst

    // AI 配置
    static let aiBaseURL           = "https://api.siliconflow.cn/v1"
    static let aiApiKey            = "sk-..."
    static let defaultAIModel      = .deepseek
    static let aiRequestTimeout    = 60.0
    static let aiTemperature       = 0.7
    static let aiMaxTokens         = 2000

    // 默认设置
    static let defaultLanguage     = .en
    static let defaultTheme        = .system
    static let defaultLogoText     = "STARK"
    ...
}
```

### 支持的 AI 模型
- DeepSeek V3.1（默认）
- GLM-4

## 与 Web 版本的区别

| 功能 | iOS 原生版 | Web 版 |
|------|-----------|--------|
| 数据存储 | SwiftData（本地） | JSON 文件 + API |
| 语音识别 | Apple Speech Framework | Web Speech API |
| 认证 | 无（本地应用） | API Key |
| PV/UV 统计 | 无 | 有 |
| 图表 | Swift Charts | Recharts |
| 动画 | SwiftUI 原生动画 | Framer Motion |

## 后续规划

- [ ] iCloud 同步（已预留开关，待配置开发者账号后启用）
- [ ] Apple Watch 支持
- [ ] iOS 小组件
- [ ] Siri 快捷指令
- [ ] App Intent (iOS 17+)

## 许可证

MIT License
