//
//  TodoRow.swift
//  Todos
//
//  任务行视图
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
    
    // 优先级颜色
    private var priorityColor: Color {
        switch todo.priority {
        case .p0: return .red
        case .p1: return .orange
        case .p2: return .blue
        }
    }
    
    // 分组名称
    private var groupName: String? {
        guard settings.enableGroups, let groupId = todo.groupId else { return nil }
        return groups.first { $0.id == groupId }?.name
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // 优先级指示器
            if settings.enablePriority {
                RoundedRectangle(cornerRadius: 2)
                    .fill(priorityColor)
                    .frame(width: 4)
            }
            
            // 完成按钮
            Button {
                HapticManager.shared.mediumImpact()
                withAnimation(.spring(response: 0.3)) {
                    toggleComplete()
                }
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
            
            // 内容区域
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
                
                // 元信息
                HStack(spacing: 8) {
                    // 分组标签
                    if let name = groupName {
                        Label(name, systemImage: "folder")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                    
                    // 截止日期
                    if let dueDate = todo.dueDate {
                        Label(dueDate.formatted(date: .abbreviated, time: .shortened), systemImage: "clock")
                            .font(.system(size: 11))
                            .foregroundStyle(dueDate < Date() && !todo.completed ? .red : .secondary)
                    }
                    
                    // 优先级标签
                    if settings.enablePriority && !todo.completed {
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
            
            Spacer()
            
            // 操作按钮
            if isEditing {
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
    
    // MARK: - 方法
    
    private func toggleComplete() {
        if todo.completed {
            todo.markIncomplete()
        } else {
            todo.markComplete()
            HapticManager.shared.success()
        }
        try? modelContext.save()
    }
    
    private func startEdit() {
        editText = todo.text
        isEditing = true
    }
    
    private func cancelEdit() {
        isEditing = false
        editText = ""
    }
    
    private func saveEdit() {
        if !editText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            todo.text = editText.trimmingCharacters(in: .whitespacesAndNewlines)
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
                // 任务内容
                Section {
                    TextField(settings.localized(.taskPlaceholder), text: $editText, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text(settings.language == .zh ? "任务内容" : "Task Content")
                }
                
                // 优先级
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
                        .onChange(of: selectedPriority) { _, _ in
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
                                .tag(defaultGroupId as UUID?)
                            
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
                
                // 删除按钮
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
                        HapticManager.shared.lightImpact()
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
