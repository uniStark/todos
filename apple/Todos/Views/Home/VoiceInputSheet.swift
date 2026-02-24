//
//  VoiceInputSheet.swift
//  Todos
//
//  语音输入表单
//

import SwiftUI
import SwiftData

struct VoiceInputSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var settings: SettingsManager
    
    @Query(sort: \TodoItem.createdAt, order: .reverse)
    private var allTodosRaw: [TodoItem]
    
    private var todos: [TodoItem] {
        allTodosRaw.filter { !$0.isDeleted }
    }
    
    @Query(sort: \TodoGroup.createdAt)
    private var groups: [TodoGroup]
    
    @Query(sort: \ChatMessage.timestamp, order: .reverse)
    private var messages: [ChatMessage]
    
    @StateObject private var speechRecognizer = SpeechRecognizer()
    
    let onRefresh: () -> Void
    
    @State private var isRecording = false
    @State private var isProcessing = false
    @State private var aiService: AIService?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 聊天历史
                chatHistoryView
                
                Divider()
                
                // 语音输入区域
                voiceInputView
            }
            .navigationTitle(settings.localized(.aiAssistant))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(settings.localized(.close)) {
                        HapticManager.shared.lightImpact()
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        HapticManager.shared.warning()
                        clearChat()
                    } label: {
                        Image(systemName: "trash")
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear {
            aiService = AIService(apiKey: AppConfig.aiApiKey, model: settings.aiModel)
            speechRecognizer.setLanguage(settings.language)
        }
    }
    
    // MARK: - 子视图
    
    /// 聊天历史
    private var chatHistoryView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    if messages.isEmpty {
                        emptyStateView
                    } else {
                        ForEach(messages.reversed()) { message in
                            MessageBubble(message: message, settings: settings)
                                .id(message.id)
                        }
                    }
                }
                .padding()
            }
            .onChange(of: messages.count) { _, _ in
                if let lastMessage = messages.first {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }
    
    /// 空状态
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 64))
                .foregroundStyle(.secondary.opacity(0.5))
            
            Text(settings.localized(.holdToSpeak))
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Text(settings.language == .zh
                 ? "按住下方按钮说话，AI 将自动管理你的待办事项"
                 : "Hold the button below to speak, AI will manage your todos automatically")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 60)
    }
    
    /// 语音输入区域
    private var voiceInputView: some View {
        VStack(spacing: 16) {
            // 识别文本预览
            if !speechRecognizer.transcript.isEmpty || isRecording {
                Text(speechRecognizer.transcript.isEmpty ? settings.localized(.listening) : speechRecognizer.transcript)
                    .font(.body)
                    .foregroundStyle(speechRecognizer.transcript.isEmpty ? .secondary : .primary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
            }
            
            // 录音按钮
            VoiceRecordButton(
                isRecording: isRecording,
                isProcessing: isProcessing,
                settings: settings,
                onStart: startRecording,
                onStop: stopRecording
            )
            .padding(.bottom, 20)
            
            // 错误提示
            if case .error(let message) = speechRecognizer.state {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(.top, 16)
        .background(Color(.systemBackground))
    }
    
    // MARK: - 方法
    
    private func startRecording() {
        HapticManager.shared.mediumImpact()
        Task {
            isRecording = true
            try? await speechRecognizer.startRecording()
        }
    }
    
    private func stopRecording() {
        HapticManager.shared.lightImpact()
        isRecording = false
        speechRecognizer.stopRecording()
        
        let transcript = speechRecognizer.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if !transcript.isEmpty {
            processMessage(transcript)
        }
        
        speechRecognizer.reset()
    }
    
    private func processMessage(_ text: String) {
        guard let aiService = aiService else { return }
        
        isProcessing = true
        
        // 保存用户消息
        let userMessage = ChatMessage(role: .user, content: text)
        modelContext.insert(userMessage)
        try? modelContext.save()
        
        Task {
            do {
                let aiSettings = AIFeatureSettings(
                    enablePriority: settings.enablePriority,
                    enableGroups: settings.enableGroups
                )
                
                let response = try await aiService.sendMessage(
                    text,
                    todos: Array(todos),
                    groups: Array(groups),
                    settings: aiSettings
                )
                
                // 执行 AI 操作
                var executionResult = AIExecutionResult.empty
                
                if let actions = response.actions {
                    executionResult = await executeActions(actions)
                }
                
                // 保存 AI 回复
                let assistantMessage = ChatMessage(
                    role: .assistant,
                    content: response.content,
                    executionResult: executionResult.hasResults ? executionResult : nil
                )
                
                await MainActor.run {
                    modelContext.insert(assistantMessage)
                    try? modelContext.save()
                    isProcessing = false
                    
                    if executionResult.hasResults {
                        HapticManager.shared.success()
                        onRefresh()
                    }
                }
            } catch {
                await MainActor.run {
                    let errorMessage = ChatMessage(
                        role: .assistant,
                        content: settings.language == .zh
                            ? "抱歉，AI 服务暂时不可用。请稍后再试。"
                            : "Sorry, AI service is temporarily unavailable. Please try again later."
                    )
                    modelContext.insert(errorMessage)
                    try? modelContext.save()
                    isProcessing = false
                }
            }
        }
    }
    
    private func executeActions(_ actions: AIActions) async -> AIExecutionResult {
        var result = AIExecutionResult.empty
        
        await MainActor.run {
            // 执行添加操作
            if let addActions = actions.add {
                for action in addActions {
                    var groupId = defaultGroupId
                    
                    // 处理分组
                    if settings.enableGroups, let groupName = action.groupName {
                        if let existingGroup = groups.first(where: { $0.name.lowercased() == groupName.lowercased() }) {
                            groupId = existingGroup.id
                        } else {
                            let newGroup = TodoGroup(name: groupName)
                            modelContext.insert(newGroup)
                            groupId = newGroup.id
                        }
                    }
                    
                    // 解析优先级
                    let priority: Priority
                    if settings.enablePriority, let p = action.priority {
                        priority = Priority(rawValue: p) ?? .p2
                    } else {
                        priority = .p2
                    }
                    
                    // 解析日期
                    var dueDate: Date?
                    if let dueDateStr = action.dueDate {
                        let formatter = ISO8601DateFormatter()
                        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        dueDate = formatter.date(from: dueDateStr)
                        if dueDate == nil {
                            formatter.formatOptions = [.withInternetDateTime]
                            dueDate = formatter.date(from: dueDateStr)
                        }
                        if dueDate == nil {
                            // 尝试简单格式
                            let simpleFormatter = DateFormatter()
                            simpleFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
                            dueDate = simpleFormatter.date(from: dueDateStr)
                        }
                    }
                    
                    let todo = TodoItem(
                        text: action.text,
                        completed: action.isCompleted ?? false,
                        groupId: groupId,
                        priority: priority,
                        dueDate: dueDate
                    )
                    
                    if action.isCompleted == true {
                        todo.completedAt = Date()
                    }
                    
                    modelContext.insert(todo)
                    result.added.append(.init(id: todo.id.uuidString, text: todo.text))
                }
            }
            
            // 执行完成操作
            if let completeIds = actions.complete {
                for idString in completeIds {
                    if let uuid = UUID(uuidString: idString),
                       let todo = todos.first(where: { $0.id == uuid && !$0.completed }) {
                        todo.markComplete()
                        result.completed.append(.init(id: idString, text: todo.text))
                    }
                }
            }
            
            // 执行删除操作
            if let deleteIds = actions.delete {
                for idString in deleteIds {
                    if let uuid = UUID(uuidString: idString),
                       let todo = todos.first(where: { $0.id == uuid && !$0.isDeleted }) {
                        todo.softDelete()
                        result.deleted.append(.init(id: idString, text: todo.text))
                    }
                }
            }
            
            // 执行更新操作
            if let updateActions = actions.update {
                for action in updateActions {
                    if let uuid = UUID(uuidString: action.id),
                       let todo = todos.first(where: { $0.id == uuid && !$0.isDeleted }) {
                        
                        if let newText = action.text {
                            todo.text = newText
                        }
                        
                        if settings.enablePriority, let p = action.priority {
                            todo.priority = Priority(rawValue: p) ?? todo.priority
                        }
                        
                        if let dueDateStr = action.dueDate {
                            let formatter = ISO8601DateFormatter()
                            todo.dueDate = formatter.date(from: dueDateStr)
                        }
                        
                        if settings.enableGroups, let groupName = action.groupName {
                            if let existingGroup = groups.first(where: { $0.name.lowercased() == groupName.lowercased() }) {
                                todo.groupId = existingGroup.id
                            }
                        }
                        
                        result.updated.append(.init(id: action.id, text: todo.text))
                    }
                }
            }
            
            try? modelContext.save()
        }
        
        return result
    }
    
    private func clearChat() {
        for message in messages {
            modelContext.delete(message)
        }
        try? modelContext.save()
    }
}

// MARK: - 录音按钮
struct VoiceRecordButton: View {
    let isRecording: Bool
    let isProcessing: Bool
    let settings: SettingsManager
    let onStart: () -> Void
    let onStop: () -> Void
    
    var body: some View {
        Button {
            // 点击不触发
        } label: {
            ZStack {
                Circle()
                    .fill(isRecording ? Color.red : Color.blue)
                    .frame(width: 80, height: 80)
                    .shadow(color: (isRecording ? Color.red : Color.blue).opacity(0.3), radius: 10)
                
                if isProcessing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.5)
                } else {
                    Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(.white)
                }
            }
        }
        .disabled(isProcessing)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isRecording && !isProcessing {
                        onStart()
                    }
                }
                .onEnded { _ in
                    if isRecording {
                        onStop()
                    }
                }
        )
        .scaleEffect(isRecording ? 1.1 : 1.0)
        .animation(.spring(response: 0.3), value: isRecording)
    }
}

// MARK: - 消息气泡
struct MessageBubble: View {
    let message: ChatMessage
    let settings: SettingsManager
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.role == .user {
                Spacer()
            }
            
            // 头像
            Circle()
                .fill(message.role == .user ? Color.blue : Color.purple.opacity(0.2))
                .frame(width: 36, height: 36)
                .overlay {
                    Image(systemName: message.role == .user ? "person.fill" : "brain")
                        .font(.system(size: 16))
                        .foregroundStyle(message.role == .user ? .white : .purple)
                }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
                // 消息内容
                Text(message.content)
                    .font(.body)
                    .padding(12)
                    .background(message.role == .user ? Color.blue : Color(.secondarySystemBackground))
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                
                // 执行结果
                if let result = message.executionResult, result.hasResults {
                    ExecutionResultView(result: result, settings: settings)
                }
                
                // 时间戳
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            
            if message.role == .assistant {
                Spacer()
            }
        }
    }
}

// MARK: - 执行结果视图
struct ExecutionResultView: View {
    let result: AIExecutionResult
    let settings: SettingsManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !result.added.isEmpty {
                ResultRow(
                    icon: "plus.circle.fill",
                    color: .green,
                    text: "\(settings.localized(.added)) \(result.added.count) \(settings.localized(.tasks))"
                )
            }
            
            if !result.completed.isEmpty {
                ResultRow(
                    icon: "checkmark.circle.fill",
                    color: .blue,
                    text: "\(settings.localized(.completed)) \(result.completed.count) \(settings.localized(.tasks))"
                )
            }
            
            if !result.deleted.isEmpty {
                ResultRow(
                    icon: "xmark.circle.fill",
                    color: .red,
                    text: "\(settings.localized(.deleted)) \(result.deleted.count) \(settings.localized(.tasks))"
                )
            }
            
            if !result.updated.isEmpty {
                ResultRow(
                    icon: "pencil.circle.fill",
                    color: .orange,
                    text: "\(settings.localized(.updated)) \(result.updated.count) \(settings.localized(.tasks))"
                )
            }
        }
    }
}

struct ResultRow: View {
    let icon: String
    let color: Color
    let text: String
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }
}

#Preview {
    VoiceInputSheet(onRefresh: {})
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self, ChatMessage.self], inMemory: true)
}
