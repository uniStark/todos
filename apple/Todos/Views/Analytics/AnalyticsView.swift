//
//  AnalyticsView.swift
//  Todos
//
//  数据统计页面
//

import SwiftUI
import SwiftData
import Charts

/// 时间范围
enum TimeRange: String, CaseIterable {
    case week = "7d"
    case month = "30d"
    case all = "all"
    
    func localizedName(_ language: AppLanguage) -> String {
        switch (self, language) {
        case (.week, .zh): return "7天"
        case (.week, .en): return "7 Days"
        case (.month, .zh): return "30天"
        case (.month, .en): return "30 Days"
        case (.all, .zh): return "全部"
        case (.all, .en): return "All Time"
        }
    }
}

struct AnalyticsView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var settings: SettingsManager
    
    @Query(sort: \TodoItem.createdAt, order: .reverse)
    private var allTodosRaw: [TodoItem]
    
    private var todos: [TodoItem] {
        allTodosRaw.filter { !$0.isDeleted }
    }
    
    @State private var timeRange: TimeRange = .week
    
    // 计算属性
    private var totalCreated: Int {
        filteredTodos.count
    }
    
    private var totalCompleted: Int {
        filteredTodos.filter { $0.completed }.count
    }
    
    private var completionRate: Double {
        guard totalCreated > 0 else { return 0 }
        return Double(totalCompleted) / Double(totalCreated) * 100
    }
    
    private var filteredTodos: [TodoItem] {
        let calendar = Calendar.current
        let now = Date()
        
        switch timeRange {
        case .week:
            let startDate = calendar.date(byAdding: .day, value: -7, to: now)!
            return todos.filter { $0.createdAt >= startDate }
        case .month:
            let startDate = calendar.date(byAdding: .day, value: -30, to: now)!
            return todos.filter { $0.createdAt >= startDate }
        case .all:
            return Array(todos)
        }
    }
    
    private var dailyData: [DailyStats] {
        let calendar = Calendar.current
        let now = Date()
        
        let days: Int
        switch timeRange {
        case .week: days = 7
        case .month: days = 30
        case .all: days = 30 // 全部模式也只显示30天图表
        }
        
        var result: [DailyStats] = []
        
        for i in (0..<days).reversed() {
            guard let date = calendar.date(byAdding: .day, value: -i, to: now) else { continue }
            let startOfDay = calendar.startOfDay(for: date)
            let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
            
            let created = todos.filter { $0.createdAt >= startOfDay && $0.createdAt < endOfDay }.count
            let completed = todos.filter {
                guard let completedAt = $0.completedAt else { return false }
                return completedAt >= startOfDay && completedAt < endOfDay
            }.count
            
            result.append(DailyStats(date: date, created: created, completed: completed))
        }
        
        return result
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // 时间范围选择
                    timeRangePicker
                    
                    // KPI 卡片
                    kpiCards
                    
                    // 每日动态图表
                    dailyActivityChart
                    
                    // 任务时间轴
                    taskTimeline
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(settings.localized(.analytics))
        }
    }
    
    // MARK: - 子视图
    
    /// 时间范围选择器
    private var timeRangePicker: some View {
        Picker("", selection: $timeRange) {
            ForEach(TimeRange.allCases, id: \.self) { range in
                Text(range.localizedName(settings.language)).tag(range)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: timeRange) { _, _ in
            HapticManager.shared.selection()
        }
    }
    
    /// KPI 卡片
    private var kpiCards: some View {
        HStack(spacing: 12) {
            KPICard(
                title: settings.localized(.totalCreated),
                value: "\(totalCreated)",
                icon: "doc.text",
                color: .blue
            )
            
            KPICard(
                title: settings.localized(.totalCompleted),
                value: "\(totalCompleted)",
                icon: "checkmark.circle",
                color: .green
            )
            
            KPICard(
                title: settings.localized(.completionRate),
                value: String(format: "%.0f%%", completionRate),
                icon: "chart.pie",
                color: .purple
            )
        }
    }
    
    /// 每日动态图表
    private var dailyActivityChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(settings.localized(.dailyActivity))
                .font(.headline)
            
            Chart(dailyData) { item in
                // 创建的任务 - 面积
                AreaMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.created)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.created)))
                .interpolationMethod(.catmullRom)
                
                // 创建的任务 - 折线
                LineMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.created)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.created)))
                .interpolationMethod(.catmullRom)
                .symbol(Circle())
                .lineStyle(StrokeStyle(lineWidth: 2))
                
                // 完成的任务 - 面积
                AreaMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.completed)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.completedLabel)))
                .interpolationMethod(.catmullRom)
                
                // 完成的任务 - 折线
                LineMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.completed)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.completedLabel)))
                .interpolationMethod(.catmullRom)
                .symbol(Circle())
                .lineStyle(StrokeStyle(lineWidth: 2))
            }
            .chartForegroundStyleScale([
                settings.localized(.created): .blue,
                settings.localized(.completedLabel): .green
            ])
            .chartLegend(position: .top)
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: timeRange == .week ? 1 : 5)) { _ in
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.day().month())
                }
            }
            .frame(height: 200)
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
    
    /// 任务时间轴
    private var taskTimeline: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(settings.language == .zh ? "近期完成" : "Recently Completed")
                .font(.headline)
            
            let completedTodos = filteredTodos
                .filter { $0.completed }
                .sorted { ($0.completedAt ?? Date.distantPast) > ($1.completedAt ?? Date.distantPast) }
                .prefix(10)
            
            if completedTodos.isEmpty {
                Text(settings.localized(.noCompletedTasks))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else {
                ForEach(Array(completedTodos)) { todo in
                    TimelineRow(todo: todo, settings: settings)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - 数据模型
struct DailyStats: Identifiable {
    let id = UUID()
    let date: Date
    let created: Int
    let completed: Int
}

// MARK: - KPI 卡片
struct KPICard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(color)
                
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            
            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - 时间轴行
struct TimelineRow: View {
    let todo: TodoItem
    let settings: SettingsManager
    
    private var daysToComplete: String {
        guard let completedAt = todo.completedAt else { return "-" }
        let days = Calendar.current.dateComponents([.day], from: todo.createdAt, to: completedAt).day ?? 0
        if days == 0 {
            return settings.language == .zh ? "当天" : "Same day"
        }
        return settings.language == .zh ? "\(days)天" : "\(days)d"
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // 完成指示器
            Circle()
                .fill(.green)
                .frame(width: 10, height: 10)
            
            // 任务信息
            VStack(alignment: .leading, spacing: 4) {
                Text(todo.text)
                    .font(.subheadline)
                    .lineLimit(1)
                
                if let completedAt = todo.completedAt {
                    Text(completedAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // 耗时
            Text(daysToComplete)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.1))
                .foregroundStyle(.green)
                .clipShape(Capsule())
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    AnalyticsView()
        .environmentObject(SettingsManager())
        .modelContainer(for: [TodoItem.self, TodoGroup.self], inMemory: true)
}
