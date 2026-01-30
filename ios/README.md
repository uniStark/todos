# Todos - iOS 开发指南

## 环境要求

- macOS Sonoma 或更高版本
- Xcode 15.0 或更高版本
- CocoaPods (`sudo gem install cocoapods`)
- Node.js 18+
- pnpm

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 开发模式（实时重载）
连接到本地开发服务器进行实时开发：
```bash
# 终端 1：启动 Next.js 开发服务器
pnpm dev

# 终端 2：在模拟器上运行 iOS 应用
pnpm ios:dev
```

### 3. 生产构建
```bash
# 构建并打开 Xcode
pnpm ios
```

## 项目结构

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift      # 应用委托
│   │   ├── Info.plist             # 应用配置
│   │   └── Assets.xcassets/       # 图标和资源
│   └── App.xcodeproj/             # Xcode 项目
├── Podfile                        # CocoaPods 依赖
└── README.md                      # 本文件
```

## 配置说明

### 应用图标
替换 `ios/App/App/Assets.xcassets/AppIcon.appiconset/` 中的图标文件。

需要以下尺寸：
- 20x20 (1x, 2x, 3x)
- 29x29 (1x, 2x, 3x)
- 40x40 (1x, 2x, 3x)
- 60x60 (2x, 3x)
- 76x76 (1x, 2x)
- 83.5x83.5 (2x)
- 1024x1024 (App Store)

### 启动画面
编辑 `ios/App/App/Base.lproj/LaunchScreen.storyboard` 自定义启动画面。

### Bundle ID
在 `capacitor.config.ts` 中修改 `appId`。

## 支持的设备

- iPhone (iOS 14.0+)
- iPad (iPadOS 14.0+)
- Mac (通过 Mac Catalyst)

## 发布到 App Store

1. 在 Xcode 中选择 `Product > Archive`
2. 使用 Organizer 上传到 App Store Connect
3. 在 App Store Connect 中配置应用信息
4. 提交审核

## 常见问题

### Pod 安装失败
```bash
cd ios/App
pod deintegrate
pod install
```

### 签名问题
在 Xcode 中：
1. 选择项目
2. 选择 Target
3. 在 Signing & Capabilities 中选择你的开发团队

### 构建失败
确保已安装最新的 Xcode 命令行工具：
```bash
xcode-select --install
```

## 数据存储

iOS 版本使用 Capacitor Preferences 存储数据，数据保存在设备本地：
- 待办事项
- 分组
- 聊天记录
- 设置

数据会随 iCloud 备份自动同步。

## 后续计划

- [ ] Apple Watch 支持
- [ ] 小组件 (Widget)
- [ ] Siri 快捷指令
- [ ] iCloud 同步
- [ ] 推送通知
