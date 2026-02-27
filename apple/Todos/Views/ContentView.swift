//
//  ContentView.swift
//  Todos
//
//  主内容视图：Tab 导航（懒加载各 Tab 页面）
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @EnvironmentObject var settings: SettingsManager
    @State private var selectedTab = 0
    @State private var loadedTabs: Set<Int> = [0]
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label(settings.localized(.allTasks), systemImage: "checklist")
                }
                .tag(0)
            
            if AppConfig.enableAnalytics {
                Group {
                    if loadedTabs.contains(1) {
                        AnalyticsView()
                    } else {
                        Color(.systemGroupedBackground)
                    }
                }
                .tabItem {
                    Label(settings.localized(.analytics), systemImage: "chart.bar")
                }
                .tag(1)
            }
            
            Group {
                if loadedTabs.contains(2) {
                    SettingsView()
                } else {
                    Color(.systemGroupedBackground)
                }
            }
            .tabItem {
                Label(settings.localized(.settings), systemImage: "gearshape")
            }
            .tag(2)
        }
        .tint(.blue)
        .onChange(of: selectedTab) { _, newTab in
            if !loadedTabs.contains(newTab) {
                loadedTabs.insert(newTab)
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self, ChatMessage.self], inMemory: true)
}
