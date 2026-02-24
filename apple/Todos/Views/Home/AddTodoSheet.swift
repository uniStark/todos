//
//  AddTodoSheet.swift
//  Todos
//
//  添加任务表单
//

import SwiftUI
import SwiftData

struct AddTodoSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var settings: SettingsManager
    
    let groups: [TodoGroup]
    
    @State private var text = ""
    @State private var priority: Priority = .p2
    @State private var selectedGroupId: UUID?
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    
    @FocusState private var isTextFieldFocused: Bool
    
    var body: some View {
        NavigationStack {
            Form {
                // 任务内容
                Section {
                    TextField(settings.localized(.taskPlaceholder), text: $text, axis: .vertical)
                        .lineLimit(3...6)
                        .focused($isTextFieldFocused)
                } header: {
                    Text(settings.localized(.addTask))
                }
                
                // 优先级
                if settings.enablePriority {
                    Section {
                        Picker(settings.localized(.priority), selection: $priority) {
                            ForEach(Priority.allCases, id: \.self) { p in
                                HStack {
                                    Circle()
                                        .fill(priorityColor(p))
                                        .frame(width: 12, height: 12)
                                    Text(priorityName(p))
                                }
                                .tag(p)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: priority) { _, _ in
                            HapticManager.shared.selection()
                        }
                    } header: {
                        Text(settings.localized(.priority))
                    }
                }
                
                // 分组
                if settings.enableGroups {
                    Section {
                        Picker(settings.localized(.allGroups), selection: $selectedGroupId) {
                            Text(settings.localized(.defaultGroup))
                                .tag(nil as UUID?)
                            
                            ForEach(groups.filter { !$0.isDefault }) { group in
                                Text(group.name)
                                    .tag(group.id as UUID?)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedGroupId) { _, _ in
                            HapticManager.shared.selection()
                        }
                    } header: {
                        Text(settings.localized(.allGroups))
                    }
                }
                
                // 截止日期
                Section {
                    Toggle(isOn: $hasDueDate.animation()) {
                        Label(settings.language == .zh ? "设置截止日期" : "Set Due Date", systemImage: "calendar")
                    }
                    .onChange(of: hasDueDate) { _, _ in
                        HapticManager.shared.selection()
                    }
                    
                    if hasDueDate {
                        DatePicker(
                            settings.language == .zh ? "截止日期" : "Due Date",
                            selection: $dueDate,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                }
            }
            .navigationTitle(settings.localized(.addTask))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(settings.localized(.cancel)) {
                        HapticManager.shared.lightImpact()
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(settings.localized(.add)) {
                        HapticManager.shared.success()
                        addTodo()
                    }
                    .fontWeight(.semibold)
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                isTextFieldFocused = true
                // 设置默认分组
                selectedGroupId = groups.first { $0.isDefault }?.id
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
    
    // MARK: - 方法
    
    private func addTodo() {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else { return }
        
        let todo = TodoItem(
            text: trimmedText,
            groupId: selectedGroupId ?? defaultGroupId,
            priority: settings.enablePriority ? priority : .p2,
            dueDate: hasDueDate ? dueDate : nil
        )
        
        modelContext.insert(todo)
        
        do {
            try modelContext.save()
            dismiss()
        } catch {
            print("Failed to save todo: \(error)")
        }
    }
    
    private func priorityColor(_ p: Priority) -> Color {
        switch p {
        case .p0: return .red
        case .p1: return .orange
        case .p2: return .blue
        }
    }
    
    private func priorityName(_ p: Priority) -> String {
        switch (p, settings.language) {
        case (.p0, .zh): return "P0 - 紧急"
        case (.p0, .en): return "P0 - Urgent"
        case (.p1, .zh): return "P1 - 重要"
        case (.p1, .en): return "P1 - Important"
        case (.p2, .zh): return "P2 - 普通"
        case (.p2, .en): return "P2 - Normal"
        }
    }
}

#Preview {
    AddTodoSheet(groups: TodoGroup.previewList)
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self], inMemory: true)
}
