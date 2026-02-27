//
//  HomeView.swift
//  Todos
//
//  主页视图：Todo 列表
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData

enum TaskFilter: String, CaseIterable {
    case all, active, completed
}

enum TimeFilter: String, CaseIterable {
    case all, past, today, future
}

struct HomeView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var settings: SettingsManager
    
    @Query(sort: \TodoItem.createdAt, order: .reverse)
    private var allTodosRaw: [TodoItem]
    
    @Query(sort: \TodoGroup.createdAt)
    private var groups: [TodoGroup]
    
    private var allTodos: [TodoItem] {
        allTodosRaw.filter { !$0.isDeleted }
    }
    
    @State private var taskFilter: TaskFilter = .all
    @State private var timeFilter: TimeFilter = .all
    @State private var selectedGroupId: UUID? = nil
    @State private var showAddSheet = false
    @State private var showGroupSheet = false
    @State private var showVoiceSheet = false
    @State private var searchText = ""
    
    // 单次遍历计算统计和筛选
    private var todoStats: (active: Int, completed: Int, filtered: [TodoItem]) {
        let todos = allTodos
        var activeCount = 0
        var completedCount = 0
        var filtered: [TodoItem] = []
        
        for todo in todos {
            if todo.completed {
                completedCount += 1
            } else {
                activeCount += 1
            }
            
            // 状态筛选
            switch taskFilter {
            case .all: break
            case .active: if todo.completed { continue }
            case .completed: if !todo.completed { continue }
            }
            
            // 时间筛选
            switch timeFilter {
            case .all: break
            case .past: if !todo.isPast { continue }
            case .today: if !todo.isToday { continue }
            case .future: if !todo.isFuture { continue }
            }
            
            // 分组筛选
            if let groupId = selectedGroupId, todo.groupId != groupId {
                continue
            }
            
            // 搜索
            if !searchText.isEmpty && !todo.text.localizedCaseInsensitiveContains(searchText) {
                continue
            }
            
            filtered.append(todo)
        }
        
        filtered.sort { todo1, todo2 in
            if todo1.completed != todo2.completed { return !todo1.completed }
            if todo1.completed && todo2.completed {
                return (todo1.completedAt ?? .distantPast) > (todo2.completedAt ?? .distantPast)
            }
            if todo1.priority.sortOrder != todo2.priority.sortOrder {
                return todo1.priority.sortOrder < todo2.priority.sortOrder
            }
            return todo1.createdAt > todo2.createdAt
        }
        
        return (activeCount, completedCount, filtered)
    }
    
    var body: some View {
        let stats = todoStats
        
        NavigationStack {
            ZStack {
                Color(.systemBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    headerView
                    statsView(total: allTodos.count, active: stats.active, completed: stats.completed)
                    timeFilterView
                    todoListView(stats.filtered)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        HapticManager.shared.lightImpact()
                        showGroupSheet = true
                    } label: {
                        Image(systemName: "folder")
                            .font(.system(size: 18, weight: .medium))
                    }
                    .disabled(!settings.enableGroups)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        HapticManager.shared.mediumImpact()
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                    }
                }
            }
            .searchable(text: $searchText, prompt: settings.localized(.taskPlaceholder))
            .sheet(isPresented: $showAddSheet) {
                AddTodoSheet(groups: groups)
            }
            .sheet(isPresented: $showGroupSheet) {
                GroupManagementSheet()
            }
            .sheet(isPresented: $showVoiceSheet) {
                if AppConfig.enableVoiceInput && AppConfig.enableAIAssistant {
                    VoiceInputSheet { }
                }
            }
            .overlay(alignment: .bottom) {
                if AppConfig.enableVoiceInput && AppConfig.enableAIAssistant {
                    VoiceFloatingButton {
                        HapticManager.shared.mediumImpact()
                        showVoiceSheet = true
                    }
                    .padding(.bottom, 20)
                }
            }
        }
        .onAppear {
            ensureDefaultGroup()
        }
    }
    
    // MARK: - 子视图
    
    private var headerView: some View {
        VStack(spacing: 8) {
            Text(settings.logoText)
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            
            Text(settings.language == .zh ? "极简任务管理" : "Minimal Task Management")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(2)
        }
        .padding(.vertical, 16)
    }
    
    private func statsView(total: Int, active: Int, completed: Int) -> some View {
        HStack(spacing: 12) {
            StatCard(
                title: settings.localized(.allTasks),
                value: "\(total)",
                isSelected: taskFilter == .all,
                color: .blue
            ) {
                HapticManager.shared.selection()
                withAnimation(.spring(response: 0.3)) { taskFilter = .all }
            }
            
            StatCard(
                title: settings.localized(.activeTasks),
                value: "\(active)",
                isSelected: taskFilter == .active,
                color: .orange
            ) {
                HapticManager.shared.selection()
                withAnimation(.spring(response: 0.3)) { taskFilter = .active }
            }
            
            StatCard(
                title: settings.localized(.completedTasks),
                value: "\(completed)",
                isSelected: taskFilter == .completed,
                color: .green
            ) {
                HapticManager.shared.selection()
                withAnimation(.spring(response: 0.3)) { taskFilter = .completed }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }
    
    private var timeFilterView: some View {
        HStack(spacing: 8) {
            ForEach([TimeFilter.past, .today, .future], id: \.self) { filter in
                TimeFilterButton(
                    filter: filter,
                    isSelected: timeFilter == filter,
                    settings: settings
                ) {
                    HapticManager.shared.selection()
                    withAnimation(.spring(response: 0.3)) {
                        timeFilter = timeFilter == filter ? .all : filter
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }
    
    private func todoListView(_ todos: [TodoItem]) -> some View {
        Group {
            if todos.isEmpty {
                emptyStateView
            } else {
                List {
                    ForEach(todos) { todo in
                        TodoRow(todo: todo, groups: groups)
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                    .onDelete { offsets in
                        HapticManager.shared.warning()
                        for index in offsets {
                            guard index < todos.count else { continue }
                            todos[index].softDelete()
                        }
                        try? modelContext.save()
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            Image(systemName: "checkmark.circle")
                .font(.system(size: 64))
                .foregroundStyle(.secondary.opacity(0.5))
            
            Text(emptyStateMessage)
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Button {
                HapticManager.shared.mediumImpact()
                showAddSheet = true
            } label: {
                Label(settings.localized(.addTask), systemImage: "plus")
                    .font(.headline)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(.blue)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            
            Spacer()
        }
    }
    
    private var emptyStateMessage: String {
        switch taskFilter {
        case .all: return settings.localized(.noTasks)
        case .active: return settings.localized(.noActiveTasks)
        case .completed: return settings.localized(.noCompletedTasks)
        }
    }
    
    // MARK: - 方法
    
    private func ensureDefaultGroup() {
        if !groups.contains(where: { $0.isDefault }) {
            let defaultGroup = TodoGroup.createDefault()
            modelContext.insert(defaultGroup)
            try? modelContext.save()
        }
    }
}

// MARK: - StatCard
struct StatCard: View {
    let title: String
    let value: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(isSelected ? color : .secondary)
                    .textCase(.uppercase)
                
                Text(value)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(isSelected ? color : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? color.opacity(0.1) : Color(.secondarySystemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(isSelected ? color.opacity(0.3) : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - TimeFilterButton
struct TimeFilterButton: View {
    let filter: TimeFilter
    let isSelected: Bool
    let settings: SettingsManager
    let action: () -> Void
    
    private var icon: String {
        switch filter {
        case .all: return "calendar"
        case .past: return "clock.arrow.circlepath"
        case .today: return "sun.max"
        case .future: return "calendar.badge.clock"
        }
    }
    
    private var color: Color {
        switch filter {
        case .all: return .blue
        case .past: return .red
        case .today: return .orange
        case .future: return .green
        }
    }
    
    private var title: String {
        switch filter {
        case .all: return settings.localized(.allTasks)
        case .past: return settings.localized(.past)
        case .today: return settings.localized(.today)
        case .future: return settings.localized(.future)
        }
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(isSelected ? color.opacity(0.15) : Color(.tertiarySystemBackground))
            )
            .foregroundStyle(isSelected ? color : .secondary)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HomeView()
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self, ChatMessage.self], inMemory: true)
}
