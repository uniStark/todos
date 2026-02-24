//
//  AIService.swift
//  Todos
//
//  AI 服务：调用 AI API 处理用户输入
//

import Foundation

/// AI 服务错误
enum AIServiceError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case apiError(String)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let message):
            return "API error: \(message)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        }
    }
}

/// AI 服务
actor AIService {
    private let baseURL = AppConfig.aiBaseURL
    private var apiKey: String
    private var model: AIModelType
    
    init(apiKey: String = AppConfig.aiApiKey, model: AIModelType = AppConfig.defaultAIModel) {
        self.apiKey = apiKey
        self.model = model
    }
    
    func updateConfig(apiKey: String, model: AIModelType) {
        self.apiKey = apiKey
        self.model = model
    }
    
    /// 发送消息给 AI
    func sendMessage(
        _ message: String,
        todos: [TodoItem],
        groups: [TodoGroup],
        settings: AIFeatureSettings
    ) async throws -> AIResponse {
        // 构建系统提示词
        let systemPrompt = buildSystemPrompt(todos: todos, groups: groups, settings: settings)
        
        // 构建请求体
        let requestBody: [String: Any] = [
            "model": model.modelName,
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": message]
            ],
            "temperature": AppConfig.aiTemperature,
            "max_tokens": AppConfig.aiMaxTokens,
            "stream": false
        ]
        
        // 创建请求
        guard let url = URL(string: "\(baseURL)/chat/completions") else {
            throw AIServiceError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        request.timeoutInterval = AppConfig.aiRequestTimeout
        
        // 发送请求
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIServiceError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw AIServiceError.apiError("Status \(httpResponse.statusCode): \(errorMessage)")
        }
        
        // 解析响应
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let messageObj = firstChoice["message"] as? [String: Any],
              let content = messageObj["content"] as? String else {
            throw AIServiceError.invalidResponse
        }
        
        // 解析 AI 操作
        let (cleanContent, actions) = parseActions(from: content)
        
        return AIResponse(content: cleanContent, actions: actions)
    }
    
    /// 构建系统提示词
    private func buildSystemPrompt(todos: [TodoItem], groups: [TodoGroup], settings: AIFeatureSettings) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy年MM月dd日 HH:mm (EEEE)"
        dateFormatter.locale = Locale(identifier: "zh_CN")
        let currentDateTime = dateFormatter.string(from: Date())
        
        // 格式化待办事项
        let activeTodos = todos.filter { !$0.isDeleted && !$0.completed }
        var todosText = "暂无待办事项"
        
        if !activeTodos.isEmpty {
            todosText = activeTodos.map { todo in
                var parts = [
                    "- ID: \"\(todo.id.uuidString)\"",
                    "  内容: \"\(todo.text)\""
                ]
                
                if settings.enablePriority {
                    parts.append("  优先级: \(todo.priority.rawValue)")
                }
                
                if let dueDate = todo.dueDate {
                    parts.append("  截止时间: \(dateFormatter.string(from: dueDate))")
                }
                
                if settings.enableGroups, let groupId = todo.groupId, groupId != defaultGroupId {
                    if let groupName = groups.first(where: { $0.id == groupId })?.name {
                        parts.append("  分组: \(groupName)")
                    }
                }
                
                return parts.joined(separator: "\n")
            }.joined(separator: "\n\n")
        }
        
        // 格式化分组
        let groupsText = groups.isEmpty ? "暂无分组" :
            groups.map { "- \($0.name) (ID: \($0.id.uuidString))" }.joined(separator: "\n")
        
        // 构建动态字段
        var addFields = ["      \"text\": \"任务内容\""]
        if settings.enablePriority {
            addFields.append("      \"priority\": \"P0/P1/P2\"  // 可选")
        }
        addFields.append("      \"dueDate\": \"YYYY-MM-DDTHH:mm\"  // 可选")
        if settings.enableGroups {
            addFields.append("      \"groupName\": \"分组名称\"  // 可选")
        }
        addFields.append("      \"isCompleted\": false  // 可选")
        
        var updateFields = [
            "      \"id\": \"任务ID\"",
            "      \"text\": \"新内容\"  // 可选"
        ]
        if settings.enablePriority {
            updateFields.append("      \"priority\": \"P1\"  // 可选")
        }
        updateFields.append("      \"dueDate\": \"2026-01-30T10:00\"  // 可选")
        if settings.enableGroups {
            updateFields.append("      \"groupName\": \"新分组\"  // 可选")
        }
        
        return """
        你是一个智能待办事项助手。请用自然语言回复用户，如果需要操作待办事项，在回复末尾输出 JSON。
        
        【当前时间】\(currentDateTime)
        
        \(settings.enableGroups ? "【分组列表】\n\(groupsText)\n" : "")
        【待办事项列表】（仅显示未完成的任务）
        \(todosText)
        
        ===== 输出格式 =====
        当需要操作待办事项时，在回复末尾添加 JSON：
        
        ```json
        {
          "actions": {
            "add": [
              {
        \(addFields.joined(separator: ",\n"))
              }
            ],
            "complete": ["任务ID1", "任务ID2"],
            "delete": ["任务ID1", "任务ID2"],
            "update": [
              {
        \(updateFields.joined(separator: ",\n"))
              }
            ]
          }
        }
        ```
        
        ===== 操作说明 =====
        - **add**: 添加新任务，text 必填，其他可选
        - **complete**: 将任务标记为已完成，填写任务 ID 数组
        - **delete**: 删除/取消任务，填写任务 ID 数组
        - **update**: 修改任务，id 必填，其他可选
        
        ===== 日期解析 =====
        - "今天" → 当前日期
        - "明天" → +1天
        - "后天" → +2天
        - "下午3点" → 15:00
        
        ===== 重要规则 =====
        1. 只使用待办事项列表中存在的 ID
        2. 理解用户意图，模糊匹配任务名称
        3. 支持批量操作
        4. 无操作时不输出 JSON
        5. 先用自然语言回复，再附加 JSON
        """
    }
    
    /// 解析 AI 操作
    private func parseActions(from content: String) -> (String, AIActions?) {
        var cleanContent = content
        
        // 尝试匹配 JSON 代码块
        let pattern = "```json\\s*([\\s\\S]*?)\\s*```"
        
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return (cleanContent, nil)
        }
        
        let range = NSRange(content.startIndex..., in: content)
        
        if let match = regex.firstMatch(in: content, options: [], range: range) {
            // 提取 JSON 字符串
            if let jsonRange = Range(match.range(at: 1), in: content) {
                let jsonString = String(content[jsonRange])
                
                // 移除 JSON 块
                if let fullMatchRange = Range(match.range, in: content) {
                    cleanContent = content.replacingCharacters(in: fullMatchRange, with: "")
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                }
                
                // 解析 JSON
                if let data = jsonString.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let actionsDict = json["actions"] as? [String: Any] {
                    
                    let actions = parseActionsDict(actionsDict)
                    return (cleanContent, actions)
                }
            }
        }
        
        return (cleanContent, nil)
    }
    
    /// 解析操作字典
    private func parseActionsDict(_ dict: [String: Any]) -> AIActions {
        var actions = AIActions()
        
        // 解析添加操作
        if let addArray = dict["add"] as? [[String: Any]] {
            actions.add = addArray.compactMap { item in
                guard let text = item["text"] as? String else { return nil }
                return AIAddAction(
                    text: text,
                    priority: item["priority"] as? String,
                    groupName: item["groupName"] as? String,
                    dueDate: item["dueDate"] as? String,
                    isCompleted: item["isCompleted"] as? Bool,
                    createdAt: item["createdAt"] as? String,
                    completedAt: item["completedAt"] as? String
                )
            }
        }
        
        // 解析完成操作
        if let completeArray = dict["complete"] as? [String] {
            actions.complete = completeArray
        }
        
        // 解析删除操作
        if let deleteArray = dict["delete"] as? [String] {
            actions.delete = deleteArray
        }
        
        // 解析更新操作
        if let updateArray = dict["update"] as? [[String: Any]] {
            actions.update = updateArray.compactMap { item in
                guard let id = item["id"] as? String else { return nil }
                return AIUpdateAction(
                    id: id,
                    text: item["text"] as? String,
                    priority: item["priority"] as? String,
                    groupName: item["groupName"] as? String,
                    dueDate: item["dueDate"] as? String
                )
            }
        }
        
        return actions
    }
}

/// AI 响应
struct AIResponse {
    let content: String
    let actions: AIActions?
}

/// AI 功能设置
struct AIFeatureSettings {
    var enablePriority: Bool
    var enableGroups: Bool
}
