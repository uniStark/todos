//
//  HapticManager.swift
//  Todos
//
//  触觉反馈管理器
//  Author: Adrian Stark
//

import UIKit

final class HapticManager {
    static let shared = HapticManager()
    
    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let selectionGenerator = UISelectionFeedbackGenerator()
    
    private init() {
        prepareAll()
    }
    
    private func prepareAll() {
        lightGenerator.prepare()
        mediumGenerator.prepare()
        notificationGenerator.prepare()
        selectionGenerator.prepare()
    }
    
    func lightImpact() {
        lightGenerator.impactOccurred()
        lightGenerator.prepare()
    }
    
    func mediumImpact() {
        mediumGenerator.impactOccurred()
        mediumGenerator.prepare()
    }
    
    func heavyImpact() {
        heavyGenerator.impactOccurred()
        heavyGenerator.prepare()
    }
    
    func success() {
        notificationGenerator.notificationOccurred(.success)
        notificationGenerator.prepare()
    }
    
    func warning() {
        notificationGenerator.notificationOccurred(.warning)
        notificationGenerator.prepare()
    }
    
    func error() {
        notificationGenerator.notificationOccurred(.error)
        notificationGenerator.prepare()
    }
    
    func selection() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }
}
