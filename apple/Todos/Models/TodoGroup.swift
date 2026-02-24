//
//  TodoGroup.swift
//  Todos
//
//  数据模型：分组
//

import Foundation
import SwiftData

/// 默认分组 ID
let defaultGroupId = UUID(uuidString: "00000000-0000-0000-0000-000000000000")!

/// 分组模型
@Model
final class TodoGroup {
    var id: UUID
    var name: String
    var createdAt: Date
    
    /// 是否为默认分组
    var isDefault: Bool {
        id == defaultGroupId
    }
    
    init(
        id: UUID = UUID(),
        name: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.createdAt = createdAt
    }
    
    /// 创建默认分组
    static func createDefault() -> TodoGroup {
        TodoGroup(id: defaultGroupId, name: "Default", createdAt: Date(timeIntervalSince1970: 0))
    }
}

// MARK: - 预览数据
extension TodoGroup {
    static var preview: TodoGroup {
        TodoGroup(name: "工作")
    }
    
    static var previewList: [TodoGroup] {
        [
            TodoGroup.createDefault(),
            TodoGroup(name: "工作"),
            TodoGroup(name: "个人"),
            TodoGroup(name: "学习"),
        ]
    }
}
