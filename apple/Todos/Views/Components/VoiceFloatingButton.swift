//
//  VoiceFloatingButton.swift
//  Todos
//
//  底部浮动语音按钮
//

import SwiftUI

struct VoiceFloatingButton: View {
    @EnvironmentObject var settings: SettingsManager
    let action: () -> Void
    
    @State private var isPressed = false
    @State private var pulseScale: CGFloat = 1
    
    var body: some View {
        Button(action: {
            HapticManager.shared.mediumImpact()
            action()
        }) {
            ZStack {
                // 脉冲背景
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .scaleEffect(pulseScale)
                
                // 主按钮背景
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.blue, .blue.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 64, height: 64)
                    .shadow(color: .blue.opacity(0.4), radius: 12, y: 4)
                
                // 图标
                Image(systemName: "waveform")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .scaleEffect(isPressed ? 0.9 : 1)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
        .onAppear {
            // 启动脉冲动画
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulseScale = 1.15
            }
        }
    }
}

#Preview {
    VoiceFloatingButton {}
        .environmentObject(SettingsManager())
}
