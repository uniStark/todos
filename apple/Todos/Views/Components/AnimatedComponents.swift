//
//  AnimatedComponents.swift
//  Todos
//
//  动画组件和视图修饰符
//  Author: Adrian Stark
//

import SwiftUI

// MARK: - 按钮样式

struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct BounceButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.9 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: configuration.isPressed)
    }
}

extension View {
    func pressableButton() -> some View {
        buttonStyle(PressableButtonStyle())
    }
    
    func bounceButton() -> some View {
        buttonStyle(BounceButtonStyle())
    }
}

// MARK: - 淡入动画

struct FadeInModifier: ViewModifier {
    let delay: Double
    @State private var isVisible = false
    
    func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4).delay(delay)) {
                    isVisible = true
                }
            }
    }
}

extension View {
    func fadeIn(delay: Double = 0) -> some View {
        modifier(FadeInModifier(delay: delay))
    }
}

// MARK: - 摇晃动画

struct ShakeModifier: ViewModifier {
    @Binding var trigger: Bool
    
    func body(content: Content) -> some View {
        content
            .offset(x: trigger ? -5 : 0)
            .animation(.default.repeatCount(4, autoreverses: true).speed(4), value: trigger)
            .onChange(of: trigger) { _, newValue in
                if newValue {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        trigger = false
                    }
                }
            }
    }
}

extension View {
    func shake(trigger: Binding<Bool>) -> some View {
        modifier(ShakeModifier(trigger: trigger))
    }
}

// MARK: - 浮动按钮

struct FloatingActionButton: View {
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button {
            HapticManager.shared.mediumImpact()
            action()
        } label: {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .background(
                    Circle()
                        .fill(color)
                        .shadow(color: color.opacity(0.4), radius: 8, y: 4)
                )
        }
        .buttonStyle(BounceButtonStyle())
    }
}

// MARK: - 加载指示器

struct LoadingIndicator: View {
    @State private var isAnimating = false
    let color: Color
    
    init(color: Color = .blue) {
        self.color = color
    }
    
    var body: some View {
        Circle()
            .trim(from: 0, to: 0.7)
            .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
            .frame(width: 24, height: 24)
            .rotationEffect(Angle(degrees: isAnimating ? 360 : 0))
            .onAppear {
                withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}

// MARK: - 语音波形动画（使用 TimelineView 替代 Timer 避免泄漏）

struct VoiceWaveform: View {
    let isAnimating: Bool
    
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.15, paused: !isAnimating)) { timeline in
            HStack(spacing: 4) {
                ForEach(0..<5, id: \.self) { index in
                    let seed = timeline.date.timeIntervalSinceReferenceDate * 10 + Double(index)
                    let height: CGFloat = isAnimating
                        ? 20 + CGFloat(abs(sin(seed))) * 20
                        : 8
                    
                    Capsule()
                        .fill(.blue)
                        .frame(width: 4, height: height)
                        .animation(.easeInOut(duration: 0.15), value: height)
                }
            }
        }
    }
}

#Preview("Animations") {
    VStack(spacing: 20) {
        FloatingActionButton(icon: "plus", color: .blue) {}
        LoadingIndicator()
        VoiceWaveform(isAnimating: true)
    }
    .padding()
}
