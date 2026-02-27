//
//  TodoRow.swift
//  Todos
//
//  任务行视图
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData

struct TodoRow: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var settings: SettingsManager
    @Bindable var todo: TodoItem
    let groups: [TodoGroup]
    
    @State private var isEditing = false
    @State private var editText = ""
    @State private var showEditSheet = false
    
    private var priorityColor: Color {
        switch todo.priority {
        case .p0: return .red
        case .p1: return .orange
        case .p2: return .blue
        }
    }
    
    private var groupName: String? {
        guard settings.enableGroups, let groupId = todo.groupId else { return nil }
        return groups.first { $0.id == groupId }?.name
    }
    
    var body: some View {
        HStack(spacing: 12) {
            if settings.enablePriority {
                RoundedRectangle(cornerRadius: 2)
                    .fill(priorityColor)
                    .frame(width: 4)
            }
            
            // 完成按钮
            Button {
                toggleComplete()
            } label: {
                ZStack {
                    Circle()
                        .strokeBorder(todo.completed ? .green : .gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 26, height: 26)
                    
                    if todo.completed {
                        Circle()
                            .fill(.green)
                            .frame(width: 26, height: 26)
                        
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
            }
            .buttonStyle(.plain)
            
            // 内容
            VStack(alignment: .leading, spacing: 4) {
                if isEditing {
                    TextField("", text: $editText)
                        .font(.system(size: 16, weight: .medium))
                        .onSubmit { saveEdit() }
                } else {
                    Text(todo.text)
                        .font(.system(size: 16, weight: .medium))
                        .strikethrough(todo.completed, color: .secondary)
                        .foregroundStyle(todo.completed ? .secondary : .primary)
                        .lineLimit(2)
                }
                
                // 元信息（仅非编辑态显示）
                if !isEditing {
                    metaInfoView
                }
            }
            
            Spacer(minLength: 4)
            
            if isEditing {
                editButtons
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.secondarySystemBackground))
        )
        .contentShape(Rectangle())
        .onLongPressGesture {
            HapticManager.shared.mediumImpact()
            showEditSheet = true
        }
        .sheet(isPresented: $showEditSheet) {
            TodoEditSheet(todo: todo, groups: groups)
        }
    }
    
    // MARK: - 子视图（拆分减少 body 复杂度）
    
    @ViewBuilder
    private var metaInfoView: some View {
        let hasGroup = groupName != nil
        let hasDueDate = todo.dueDate != nil
        let hasPriority = settings.enablePriority && !todo.completed
        
        if hasGroup || hasDueDate || hasPriority {
            HStack(spacing: 8) {
                if let name = groupName {
                    Label(name, systemImage: "folder")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                
                if let dueDate = todo.dueDate {
                    Label(dueDate.formatted(date: .abbreviated, time: .shortened), systemImage: "clock")
                        .font(.system(size: 11))
                        .foregroundStyle(dueDate < Date() && !todo.completed ? .red : .secondary)
                }
                
                if hasPriority {
                    Text(todo.priority.displayName)
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(priorityColor.opacity(0.15))
                        .foregroundStyle(priorityColor)
                        .clipShape(Capsule())
                }
            }
        }
    }
    
    private var editButtons: some View {
        HStack(spacing: 8) {
            Button {
                HapticManager.shared.lightImpact()
                cancelEdit()
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(.red)
            }
            .buttonStyle(.plain)
            
            Button {
                HapticManager.shared.success()
                saveEdit()
            } label: {
                Image(systemName: "checkmark")
                    .foregroundStyle(.green)
            }
            .buttonStyle(.plain)
        }
    }
    
    // MARK: - 方法
    
    private func toggleComplete() {
        HapticManager.shared.mediumImpact()
        withAnimation(.spring(response: 0.3)) {
            if todo.completed {
                todo.markIncomplete()
            } else {
                todo.markComplete()
            }
            try? modelContext.save()
        }
    }
    
    private func cancelEdit() {
        isEditing = false
        editText = ""
    }
    
    private func saveEdit() {
        let trimmed = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            todo.text = trimmed
            try? modelContext.save()
        }
        isEditing = false
    }
}

// MARK: - 任务编辑 Sheet
struct TodoEditSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var settings: SettingsManager
    
    @Bindable var todo: TodoItem
    let groups: [TodoGroup]
    
    @State private var editText: String = ""
    @State private var selectedPriority: Priority = .p2
    @State private var selectedGroupId: UUID?
    @State private var hasDueDate: Bool = false
    @State private var dueDate: Date = Date()
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(settings.localized(.taskPlaceholder), text: $editText, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text(settings.language == .zh ? "任务内容" : "Task Content")
                }
                
                if settings.enablePriority {
                    Section {
                        Picker(settings.localized(.priority), selection: $selectedPriority) {
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
                    } header: {
                        Text(settings.localized(.priority))
                    }
                }
                
                if settings.enableGroups {
                    Section {
                        Picker(settings.localized(.allGroups), selection: $selectedGroupId) {
                            Text(settings.localized(.defaultGroup))
                                .tag(defaultGroupId as UUID?)
                            
                            ForEach(groups.filter { !$0.isDefault }) { group in
                                Text(group.name)
                                    .tag(group.id as UUID?)
                            }
                        }
                        .pickerStyle(.menu)
                    } header: {
                        Text(settings.localized(.allGroups))
                    }
                }
                
                Section {
                    Toggle(isOn: $hasDueDate.animation()) {
                        Label(settings.language == .zh ? "设置截止日期" : "Set Due Date", systemImage: "calendar")
                    }
                    
                    if hasDueDate {
                        DatePicker(
                            settings.language == .zh ? "截止日期" : "Due Date",
                            selection: $dueDate,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        HapticManager.shared.warning()
                        deleteTodo()
                    } label: {
                        Label(settings.localized(.delete), systemImage: "trash")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(settings.localized(.edit))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(settings.localized(.cancel)) {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(settings.localized(.save)) {
                        HapticManager.shared.success()
                        saveChanges()
                    }
                    .fontWeight(.semibold)
                    .disabled(editText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                editText = todo.text
                selectedPriority = todo.priority
                selectedGroupId = todo.groupId ?? defaultGroupId
                hasDueDate = todo.dueDate != nil
                dueDate = todo.dueDate ?? Date()
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
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
    
    private func saveChanges() {
        todo.text = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        todo.priority = selectedPriority
        todo.groupId = selectedGroupId
        todo.dueDate = hasDueDate ? dueDate : nil
        try? modelContext.save()
        dismiss()
    }
    
    private func deleteTodo() {
        todo.softDelete()
        try? modelContext.save()
        dismiss()
    }
}

#Preview {
    List {
        TodoRow(todo: TodoItem.preview, groups: TodoGroup.previewList)
            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
    .listStyle(.plain)
    .environmentObject(SettingsManager())
    .modelContainer(for: [TodoItem.self, TodoGroup.self], inMemory: true)
}
