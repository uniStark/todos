//
//  SettingsView.swift
//  Todos
//
//  设置页面
//  Author: Adrian Stark
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: SettingsManager
    @State private var tempLogoText = ""
    @State private var showSavedAlert = false
    @State private var showRestartAlert = false
    
    var body: some View {
        NavigationStack {
            Form {
                // 语言设置
                Section {
                    Picker(settings.localized(.language), selection: $settings.language) {
                        ForEach(AppLanguage.allCases, id: \.self) { lang in
                            Text(lang.displayName).tag(lang)
                        }
                    }
                    .onChange(of: settings.language) { _, _ in
                        HapticManager.shared.selection()
                    }
                } header: {
                    Label(settings.localized(.language), systemImage: "globe")
                }
                
                // Logo 自定义
                Section {
                    HStack {
                        TextField(AppConfig.defaultLogoText, text: $tempLogoText)
                            .textInputAutocapitalization(.characters)
                            .onChange(of: tempLogoText) { _, newValue in
                                if newValue.count > AppConfig.maxLogoLength {
                                    tempLogoText = String(newValue.prefix(AppConfig.maxLogoLength))
                                }
                            }
                        
                        Button(settings.localized(.save)) {
                            HapticManager.shared.success()
                            saveLogoText()
                        }
                        .disabled(tempLogoText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                } header: {
                    Label(settings.localized(.logoCustomization), systemImage: "textformat")
                } footer: {
                    Text(settings.language == .zh
                         ? "最多\(AppConfig.maxLogoLength)个字符"
                         : "Maximum \(AppConfig.maxLogoLength) characters")
                }
                
                // 功能开关
                Section {
                    Toggle(isOn: $settings.enablePriority) {
                        Label(settings.localized(.priorityFeature), systemImage: "flag")
                    }
                    .onChange(of: settings.enablePriority) { _, _ in
                        HapticManager.shared.selection()
                    }
                    
                    Toggle(isOn: $settings.enableGroups) {
                        Label(settings.localized(.groupsFeature), systemImage: "folder")
                    }
                    .onChange(of: settings.enableGroups) { _, _ in
                        HapticManager.shared.selection()
                    }
                } header: {
                    Label(settings.localized(.features), systemImage: "switch.2")
                }
                
                // AI 设置
                if AppConfig.enableAIAssistant {
                    Section {
                        Picker(settings.localized(.aiModel), selection: $settings.aiModel) {
                            ForEach(AIModelType.allCases, id: \.self) { model in
                                Text(model.displayName).tag(model)
                            }
                        }
                        .onChange(of: settings.aiModel) { _, _ in
                            HapticManager.shared.selection()
                        }
                    } header: {
                        Label(settings.localized(.aiSettings), systemImage: "brain")
                    } footer: {
                        Text(settings.language == .zh
                             ? "选择 AI 助手使用的模型"
                             : "Select the model for AI assistant")
                    }
                }
                
                // 主题设置
                Section {
                    Picker(settings.localized(.theme), selection: $settings.theme) {
                        ForEach(ThemeMode.allCases, id: \.self) { mode in
                            Text(mode.localizedName(settings.language)).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: settings.theme) { _, _ in
                        HapticManager.shared.selection()
                    }
                } header: {
                    Label(settings.localized(.theme), systemImage: "paintpalette")
                }
                
                // iCloud 同步（受 Config 开关控制）
                if AppConfig.enableiCloudSync {
                    Section {
                        Toggle(isOn: $settings.iCloudSyncEnabled) {
                            HStack {
                                Label("iCloud", systemImage: "icloud")
                                if !settings.iCloudAvailable {
                                    Text(settings.language == .zh ? "不可用" : "Unavailable")
                                        .font(.caption)
                                        .foregroundStyle(.red)
                                }
                            }
                        }
                        .disabled(!settings.iCloudAvailable)
                        .onChange(of: settings.iCloudSyncEnabled) { oldValue, newValue in
                            HapticManager.shared.selection()
                            if oldValue != newValue { showRestartAlert = true }
                        }
                    } header: {
                        Label(settings.language == .zh ? "数据同步" : "Data Sync", systemImage: "arrow.triangle.2.circlepath")
                    } footer: {
                        if settings.iCloudSyncEnabled {
                            Text(settings.language == .zh
                                 ? "已开启：数据将同步到 iCloud，在所有设备上保持一致。"
                                 : "Enabled: Data will sync to iCloud across all your devices.")
                        } else {
                            Text(settings.language == .zh
                                 ? "已关闭：数据仅存储在本地设备。"
                                 : "Disabled: Data is stored locally on this device only.")
                        }
                    }
                }
                
                // 关于
                Section {
                    HStack {
                        Text(settings.language == .zh ? "版本" : "Version")
                        Spacer()
                        Text(AppConfig.appVersion)
                            .foregroundStyle(.secondary)
                    }
                    
                    Link(destination: URL(string: AppConfig.githubURL)!) {
                        HStack {
                            Label("GitHub", systemImage: "link")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Label(settings.language == .zh ? "关于" : "About", systemImage: "info.circle")
                }
            }
            .navigationTitle(settings.localized(.settings))
            .onAppear { tempLogoText = settings.logoText }
            .alert(
                settings.language == .zh ? "已保存" : "Saved",
                isPresented: $showSavedAlert
            ) {
                Button("OK", role: .cancel) {}
            }
            .alert(
                settings.language == .zh ? "需要重启应用" : "Restart Required",
                isPresented: $showRestartAlert
            ) {
                Button(settings.language == .zh ? "稍后" : "Later", role: .cancel) {}
                Button(settings.language == .zh ? "立即退出" : "Quit Now") { exit(0) }
            } message: {
                Text(settings.language == .zh
                     ? "iCloud 同步设置已更改，请重启应用以生效。"
                     : "iCloud sync setting has changed. Please restart the app to apply.")
            }
        }
    }
    
    private func saveLogoText() {
        let trimmed = tempLogoText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            settings.logoText = trimmed
            showSavedAlert = true
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(SettingsManager())
}
