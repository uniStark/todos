//
//  ChatMessage.swift
//  Todos
//
//  数据模型：聊天消息
//

import Foundation
import SwiftData

/// 消息角色
enum ChatRole: String, Codable {
    case user
    case assistant
    case system
}

/// AI 模型类型
enum AIModelType: String, Codable, CaseIterable {
    case deepseek = "deepseek_v3.1"
    case glm4 = "glm4"
    
    var displayName: String {
        switch self {
        case .deepseek: return "DeepSeek V3.1"
        case .glm4: return "GLM-4"
        }
    }
    
    var modelName: String {
        switch self {
        case .deepseek: return "deepseek-ai/DeepSeek-V3"
        case .glm4: return "THUDM/glm-4-9b-chat"
        }
    }
}

/// AI 执行结果
struct AIExecutionResult: Codable {
    var added: [TaskInfo]
    var completed: [TaskInfo]
    var deleted: [TaskInfo]
    var updated: [TaskInfo]
    var errors: [String]
    
    struct TaskInfo: Codable {
        var id: String
        var text: String
    }
    
    static var empty: AIExecutionResult {
        AIExecutionResult(added: [], completed: [], deleted: [], updated: [], errors: [])
    }
    
    var hasResults: Bool {
        !added.isEmpty || !completed.isEmpty || !deleted.isEmpty || !updated.isEmpty || !errors.isEmpty
    }
}

/// AI 操作
struct AIActions: Codable {
    var add: [AIAddAction]?
    var complete: [String]?
    var delete: [String]?
    var update: [AIUpdateAction]?
}

struct AIAddAction: Codable {
    var text: String
    var priority: String?
    var groupName: String?
    var dueDate: String?
    var isCompleted: Bool?
    var createdAt: String?
    var completedAt: String?
}

struct AIUpdateAction: Codable {
    var id: String
    var text: String?
    var priority: String?
    var groupName: String?
    var dueDate: String?
}

/// 聊天消息模型
@Model
final class ChatMessage {
    var id: UUID
    var roleRaw: String
    var content: String
    var timestamp: Date
    var executionResultData: Data?
    
    /// 角色（计算属性）
    var role: ChatRole {
        get { ChatRole(rawValue: roleRaw) ?? .user }
        set { roleRaw = newValue.rawValue }
    }
    
    /// 执行结果（计算属性）
    var executionResult: AIExecutionResult? {
        get {
            guard let data = executionResultData else { return nil }
            return try? JSONDecoder().decode(AIExecutionResult.self, from: data)
        }
        set {
            executionResultData = try? JSONEncoder().encode(newValue)
        }
    }
    
    init(
        id: UUID = UUID(),
        role: ChatRole,
        content: String,
        timestamp: Date = Date(),
        executionResult: AIExecutionResult? = nil
    ) {
        self.id = id
        self.roleRaw = role.rawValue
        self.content = content
        self.timestamp = timestamp
        self.executionResultData = try? JSONEncoder().encode(executionResult)
    }
}

// MARK: - 预览数据
extension ChatMessage {
    static var previewUser: ChatMessage {
        ChatMessage(role: .user, content: "帮我添加一个明天下午3点开会的任务")
    }
    
    static var previewAssistant: ChatMessage {
        let result = AIExecutionResult(
            added: [.init(id: "1", text: "下午3点开会")],
            completed: [],
            deleted: [],
            updated: [],
            errors: []
        )
        return ChatMessage(role: .assistant, content: "好的，我已经为你添加了任务。", executionResult: result)
    }
}
