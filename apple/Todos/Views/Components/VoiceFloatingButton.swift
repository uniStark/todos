//
//  VoiceFloatingButton.swift
//  Todos
//
//  底部浮动语音按钮
//  Author: Adrian Stark
//

import SwiftUI

struct VoiceFloatingButton: View {
    @EnvironmentObject var settings: SettingsManager
    let action: () -> Void
    
    var body: some View {
        Button {
            HapticManager.shared.mediumImpact()
            action()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.12))
                    .frame(width: 76, height: 76)
                
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.blue, .blue.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 60, height: 60)
                    .shadow(color: .blue.opacity(0.3), radius: 8, y: 4)
                
                Image(systemName: "waveform")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(BounceButtonStyle())
    }
}

#Preview {
    VoiceFloatingButton {}
        .environmentObject(SettingsManager())
}
