//
//  AnimatedComponents.swift
//  Todos
//
//  动画组件和视图修饰符
//

import SwiftUI

// MARK: - 视图修饰符

/// 按压缩放效果
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// 弹跳按钮样式
struct BounceButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.9 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: configuration.isPressed)
    }
}

/// 卡片悬停效果
struct CardHoverModifier: ViewModifier {
    @State private var isHovered = false
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isHovered ? 1.02 : 1)
            .shadow(color: .black.opacity(isHovered ? 0.15 : 0.08), radius: isHovered ? 12 : 8, y: isHovered ? 6 : 4)
            .animation(.spring(response: 0.3), value: isHovered)
            .onHover { hovering in
                isHovered = hovering
            }
    }
}

extension View {
    func cardHover() -> some View {
        modifier(CardHoverModifier())
    }
    
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
                withAnimation(.easeOut(duration: 0.5).delay(delay)) {
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

// MARK: - 脉冲动画

struct PulseModifier: ViewModifier {
    @State private var isPulsing = false
    let duration: Double
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.1 : 1)
            .opacity(isPulsing ? 0.8 : 1)
            .onAppear {
                withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
    }
}

extension View {
    func pulse(duration: Double = 1) -> some View {
        modifier(PulseModifier(duration: duration))
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
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            action()
        }) {
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
        .scaleEffect(isPressed ? 0.9 : 1)
        .animation(.spring(response: 0.3), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
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

// MARK: - 完成动画

struct CheckmarkAnimation: View {
    @State private var isComplete = false
    let onComplete: () -> Void
    
    var body: some View {
        ZStack {
            Circle()
                .fill(.green)
                .frame(width: 60, height: 60)
                .scaleEffect(isComplete ? 1 : 0)
            
            Image(systemName: "checkmark")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.white)
                .scaleEffect(isComplete ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                isComplete = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                onComplete()
            }
        }
    }
}

// MARK: - 骨架屏

struct SkeletonView: View {
    @State private var isAnimating = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(
                LinearGradient(
                    colors: [
                        Color(.systemGray5),
                        Color(.systemGray4),
                        Color(.systemGray5)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .offset(x: isAnimating ? 200 : -200)
            .animation(.linear(duration: 1.5).repeatForever(autoreverses: false), value: isAnimating)
            .onAppear {
                isAnimating = true
            }
            .mask(
                RoundedRectangle(cornerRadius: 8)
            )
    }
}

// MARK: - 语音波形动画

struct VoiceWaveform: View {
    let isAnimating: Bool
    @State private var phases: [CGFloat] = [0, 0.2, 0.4, 0.1, 0.3]
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<5, id: \.self) { index in
                Capsule()
                    .fill(.blue)
                    .frame(width: 4, height: isAnimating ? 20 + phases[index] * 20 : 8)
                    .animation(
                        isAnimating ?
                            .easeInOut(duration: 0.3 + Double(index) * 0.1)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.05) :
                            .easeOut(duration: 0.2),
                        value: isAnimating
                    )
            }
        }
        .onAppear {
            if isAnimating {
                startAnimation()
            }
        }
        .onChange(of: isAnimating) { _, newValue in
            if newValue {
                startAnimation()
            }
        }
    }
    
    private func startAnimation() {
        Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { timer in
            if !isAnimating {
                timer.invalidate()
                return
            }
            for i in 0..<phases.count {
                phases[i] = CGFloat.random(in: 0...1)
            }
        }
    }
}

// MARK: - 预览

#Preview("Animations") {
    VStack(spacing: 20) {
        FloatingActionButton(icon: "plus", color: .blue) {}
        
        LoadingIndicator()
        
        VoiceWaveform(isAnimating: true)
        
        SkeletonView()
            .frame(width: 200, height: 20)
    }
    .padding()
}
