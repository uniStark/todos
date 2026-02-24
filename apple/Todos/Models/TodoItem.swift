//
//  TodoItem.swift
//  Todos
//
//  数据模型：待办事项
//

import Foundation
import SwiftData

/// 优先级枚举
enum Priority: String, Codable, CaseIterable {
    case p0 = "P0"  // 紧急 - 红色
    case p1 = "P1"  // 重要 - 橙色
    case p2 = "P2"  // 普通 - 蓝色（默认）
    
    var color: String {
        switch self {
        case .p0: return "red"
        case .p1: return "orange"
        case .p2: return "blue"
        }
    }
    
    var displayName: String {
        rawValue
    }
    
    var sortOrder: Int {
        switch self {
        case .p0: return 0
        case .p1: return 1
        case .p2: return 2
        }
    }
}

/// 待办事项模型
@Model
final class TodoItem {
    var id: UUID
    var text: String
    var completed: Bool
    var createdAt: Date
    var completedAt: Date?
    var isDeleted: Bool
    var deletedAt: Date?
    var groupId: UUID?
    var priorityRaw: String
    var dueDate: Date?
    
    /// 优先级（计算属性）
    var priority: Priority {
        get { Priority(rawValue: priorityRaw) ?? .p2 }
        set { priorityRaw = newValue.rawValue }
    }
    
    init(
        id: UUID = UUID(),
        text: String,
        completed: Bool = false,
        createdAt: Date = Date(),
        completedAt: Date? = nil,
        isDeleted: Bool = false,
        deletedAt: Date? = nil,
        groupId: UUID? = nil,
        priority: Priority = .p2,
        dueDate: Date? = nil
    ) {
        self.id = id
        self.text = text
        self.completed = completed
        self.createdAt = createdAt
        self.completedAt = completedAt
        self.isDeleted = isDeleted
        self.deletedAt = deletedAt
        self.groupId = groupId
        self.priorityRaw = priority.rawValue
        self.dueDate = dueDate
    }
    
    /// 标记为完成
    func markComplete() {
        completed = true
        completedAt = Date()
    }
    
    /// 标记为未完成
    func markIncomplete() {
        completed = false
        completedAt = nil
    }
    
    /// 软删除
    func softDelete() {
        isDeleted = true
        deletedAt = Date()
    }
    
    /// 计算完成耗时（天）
    var completionDays: Int? {
        guard let completedAt = completedAt else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: createdAt, to: completedAt)
        return components.day
    }
}

// MARK: - 排序和筛选扩展
extension TodoItem {
    /// 判断是否为今天的任务
    var isToday: Bool {
        Calendar.current.isDateInToday(dueDate ?? createdAt)
    }
    
    /// 判断是否为过去的任务（截止日期在今天之前）
    var isPast: Bool {
        let date = dueDate ?? createdAt
        return Calendar.current.compare(date, to: Date(), toGranularity: .day) == .orderedAscending
    }
    
    /// 判断是否为未来的任务
    var isFuture: Bool {
        let date = dueDate ?? createdAt
        return Calendar.current.compare(date, to: Date(), toGranularity: .day) == .orderedDescending
    }
}

// MARK: - 预览数据
extension TodoItem {
    static var preview: TodoItem {
        TodoItem(text: "示例任务", priority: .p1)
    }
    
    static var previewList: [TodoItem] {
        [
            TodoItem(text: "完成项目设计", priority: .p0),
            TodoItem(text: "学习 SwiftUI", priority: .p1),
            TodoItem(text: "购买咖啡", completed: true, completedAt: Date(), priority: .p2),
            TodoItem(text: "阅读文档", priority: .p2),
        ]
    }
}
