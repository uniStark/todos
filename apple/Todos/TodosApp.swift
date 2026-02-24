//
//  TodosApp.swift
//  Todos
//
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData

@main
struct TodosApp: App {
    @StateObject private var settingsManager = SettingsManager()
    let sharedModelContainer: ModelContainer
    
    init() {
        let schema = Schema([
            TodoItem.self,
            TodoGroup.self,
            ChatMessage.self,
        ])
        
        let useICloud = AppConfig.enableiCloudSync
            && UserDefaults.standard.bool(forKey: "settings_iCloudSyncEnabled")
        
        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: useICloud ? .automatic : .none
        )
        
        do {
            sharedModelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settingsManager)
                .preferredColorScheme(settingsManager.colorScheme)
        }
        .modelContainer(sharedModelContainer)
    }
}
