//
//  AnalyticsView.swift
//  Todos
//
//  数据统计页面
//  Author: Adrian Stark
//

import SwiftUI
import SwiftData
import Charts

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
    
    var dayCount: Int {
        switch self {
        case .week: return 7
        case .month, .all: return 30
        }
    }
}

struct AnalyticsView: View {
    @EnvironmentObject var settings: SettingsManager
    
    @Query(sort: \TodoItem.createdAt, order: .reverse)
    private var allTodosRaw: [TodoItem]
    
    private var todos: [TodoItem] {
        allTodosRaw.filter { !$0.isDeleted }
    }
    
    @State private var timeRange: TimeRange = .week
    
    // 单次遍历计算所有统计数据
    private var analyticsData: AnalyticsData {
        let calendar = Calendar.current
        let now = Date()
        let days = timeRange.dayCount
        let rangeStart: Date?
        
        switch timeRange {
        case .week:
            rangeStart = calendar.date(byAdding: .day, value: -7, to: now)
        case .month:
            rangeStart = calendar.date(byAdding: .day, value: -30, to: now)
        case .all:
            rangeStart = nil
        }
        
        // 预计算日期桶
        var createdBuckets = [Int: Int]()
        var completedBuckets = [Int: Int]()
        
        var totalInRange = 0
        var completedInRange = 0
        var recentlyCompleted: [TodoItem] = []
        
        let todayStart = calendar.startOfDay(for: now)
        
        for todo in todos {
            let inRange = rangeStart == nil || todo.createdAt >= rangeStart!
            
            if inRange {
                totalInRange += 1
                if todo.completed { completedInRange += 1 }
            }
            
            // 按天分桶（创建）
            let dayOffset = calendar.dateComponents([.day], from: todayStart, to: calendar.startOfDay(for: todo.createdAt)).day ?? 0
            if dayOffset >= -days + 1 && dayOffset <= 0 {
                createdBuckets[dayOffset, default: 0] += 1
            }
            
            // 按天分桶（完成）
            if let completedAt = todo.completedAt {
                let completedOffset = calendar.dateComponents([.day], from: todayStart, to: calendar.startOfDay(for: completedAt)).day ?? 0
                if completedOffset >= -days + 1 && completedOffset <= 0 {
                    completedBuckets[completedOffset, default: 0] += 1
                }
                
                if inRange && todo.completed {
                    recentlyCompleted.append(todo)
                }
            }
        }
        
        // 构建日线数据
        var dailyStats: [DailyStats] = []
        dailyStats.reserveCapacity(days)
        
        for i in (0..<days).reversed() {
            let offset = -i
            let date = calendar.date(byAdding: .day, value: offset, to: todayStart)!
            dailyStats.append(DailyStats(
                date: date,
                created: createdBuckets[offset] ?? 0,
                completed: completedBuckets[offset] ?? 0
            ))
        }
        
        recentlyCompleted.sort { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
        let topCompleted = Array(recentlyCompleted.prefix(10))
        
        let rate = totalInRange > 0 ? Double(completedInRange) / Double(totalInRange) * 100 : 0
        
        return AnalyticsData(
            totalCreated: totalInRange,
            totalCompleted: completedInRange,
            completionRate: rate,
            dailyStats: dailyStats,
            recentlyCompleted: topCompleted
        )
    }
    
    var body: some View {
        let data = analyticsData
        
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    timeRangePicker
                    kpiCards(data)
                    dailyActivityChart(data.dailyStats)
                    taskTimeline(data.recentlyCompleted)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(settings.localized(.analytics))
        }
    }
    
    // MARK: - 子视图
    
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
    
    private func kpiCards(_ data: AnalyticsData) -> some View {
        HStack(spacing: 12) {
            KPICard(
                title: settings.localized(.totalCreated),
                value: "\(data.totalCreated)",
                icon: "doc.text",
                color: .blue
            )
            
            KPICard(
                title: settings.localized(.totalCompleted),
                value: "\(data.totalCompleted)",
                icon: "checkmark.circle",
                color: .green
            )
            
            KPICard(
                title: settings.localized(.completionRate),
                value: String(format: "%.0f%%", data.completionRate),
                icon: "chart.pie",
                color: .purple
            )
        }
    }
    
    private func dailyActivityChart(_ dailyData: [DailyStats]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(settings.localized(.dailyActivity))
                .font(.headline)
            
            Chart(dailyData) { item in
                AreaMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.created)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.created)))
                .interpolationMethod(.catmullRom)
                
                LineMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.created)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.created)))
                .interpolationMethod(.catmullRom)
                .symbol(Circle())
                .lineStyle(StrokeStyle(lineWidth: 2))
                
                AreaMark(
                    x: .value("Date", item.date, unit: .day),
                    y: .value("Count", item.completed)
                )
                .foregroundStyle(by: .value("Type", settings.localized(.completedLabel)))
                .interpolationMethod(.catmullRom)
                
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
    
    private func taskTimeline(_ completedTodos: [TodoItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(settings.language == .zh ? "近期完成" : "Recently Completed")
                .font(.headline)
            
            if completedTodos.isEmpty {
                Text(settings.localized(.noCompletedTasks))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else {
                ForEach(completedTodos) { todo in
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

private struct AnalyticsData {
    let totalCreated: Int
    let totalCompleted: Int
    let completionRate: Double
    let dailyStats: [DailyStats]
    let recentlyCompleted: [TodoItem]
}

struct DailyStats: Identifiable {
    let date: Date
    let created: Int
    let completed: Int
    
    var id: Date { date }
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
            Circle()
                .fill(.green)
                .frame(width: 10, height: 10)
            
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
