//
//  GroupManagementSheet.swift
//  Todos
//
//  分组管理表单
//

import SwiftUI
import SwiftData

struct GroupManagementSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var settings: SettingsManager
    
    @Query(sort: \TodoGroup.createdAt)
    private var groups: [TodoGroup]
    
    @Query(sort: \TodoItem.createdAt)
    private var allTodos: [TodoItem]
    
    @State private var newGroupName = ""
    @State private var showDeleteAlert = false
    @State private var groupToDelete: TodoGroup?
    
    @FocusState private var isTextFieldFocused: Bool
    
    var body: some View {
        NavigationStack {
            List {
                // 添加新分组
                Section {
                    HStack {
                        TextField(settings.localized(.newGroupName), text: $newGroupName)
                            .focused($isTextFieldFocused)
                            .onSubmit { addGroup() }
                        
                        Button {
                            HapticManager.shared.success()
                            addGroup()
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(.blue)
                        }
                        .disabled(newGroupName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                } header: {
                    Text(settings.language == .zh ? "添加分组" : "Add Group")
                }
                
                // 分组列表
                Section {
                    ForEach(groups) { group in
                        HStack {
                            Image(systemName: "folder.fill")
                                .foregroundStyle(group.isDefault ? .blue : .orange)
                            
                            Text(group.isDefault ? settings.localized(.defaultGroup) : group.name)
                                .fontWeight(group.isDefault ? .semibold : .regular)
                            
                            Spacer()
                            
                            if group.isDefault {
                                Text(settings.language == .zh ? "默认" : "Default")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .clipShape(Capsule())
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            if !group.isDefault {
                                Button(role: .destructive) {
                                    HapticManager.shared.warning()
                                    groupToDelete = group
                                    showDeleteAlert = true
                                } label: {
                                    Label(settings.localized(.delete), systemImage: "trash")
                                }
                            }
                        }
                    }
                } header: {
                    Text(settings.localized(.allGroups))
                } footer: {
                    Text(settings.language == .zh
                         ? "删除分组后，该分组下的任务将移动到默认分组。"
                         : "Tasks in a deleted group will be moved to the default group.")
                }
            }
            .navigationTitle(settings.localized(.manageGroups))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(settings.localized(.done)) {
                        HapticManager.shared.lightImpact()
                        dismiss()
                    }
                }
            }
            .alert(
                settings.language == .zh ? "删除分组" : "Delete Group",
                isPresented: $showDeleteAlert,
                presenting: groupToDelete
            ) { group in
                Button(settings.localized(.cancel), role: .cancel) {
                    groupToDelete = nil
                }
                Button(settings.localized(.delete), role: .destructive) {
                    deleteGroup(group)
                }
            } message: { group in
                Text(settings.language == .zh
                     ? "确定要删除分组「\(group.name)」吗？该分组下的任务将移动到默认分组。"
                     : "Are you sure you want to delete the group \"\(group.name)\"? Tasks in this group will be moved to the default group.")
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
    
    // MARK: - 方法
    
    private func addGroup() {
        let trimmedName = newGroupName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        
        let group = TodoGroup(name: trimmedName)
        modelContext.insert(group)
        
        do {
            try modelContext.save()
            newGroupName = ""
        } catch {
            print("Failed to save group: \(error)")
        }
    }
    
    private func deleteGroup(_ group: TodoGroup) {
        let targetGroupId = group.id
        
        for todo in allTodos where todo.groupId == targetGroupId {
            todo.groupId = defaultGroupId
        }
        
        modelContext.delete(group)
        groupToDelete = nil
        
        do {
            try modelContext.save()
        } catch {
            print("Failed to delete group: \(error)")
        }
    }
}

#Preview {
    GroupManagementSheet()
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self], inMemory: true)
}
