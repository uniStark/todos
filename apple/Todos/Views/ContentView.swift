//
//  ContentView.swift
//  Todos
//
//  主内容视图：Tab 导航
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @EnvironmentObject var settings: SettingsManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label(settings.localized(.allTasks), systemImage: "checklist")
                }
                .tag(0)
            
            if AppConfig.enableAnalytics {
                AnalyticsView()
                    .tabItem {
                        Label(settings.localized(.analytics), systemImage: "chart.bar")
                    }
                    .tag(1)
            }
            
            SettingsView()
                .tabItem {
                    Label(settings.localized(.settings), systemImage: "gearshape")
                }
                .tag(2)
        }
        .tint(.blue)
    }
}

#Preview {
    ContentView()
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self, ChatMessage.self], inMemory: true)
}
