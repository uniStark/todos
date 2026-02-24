//
//  SpeechRecognizer.swift
//  Todos
//
//  语音识别服务
//

import Foundation
import Speech
import AVFoundation

/// 语音识别器
@MainActor
class SpeechRecognizer: ObservableObject {
    /// 识别状态
    enum RecognizingState {
        case idle
        case listening
        case processing
        case error(String)
    }
    
    @Published var state: RecognizingState = .idle
    @Published var transcript: String = ""
    @Published var isAuthorized: Bool = false
    
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?
    
    init() {
        // 初始化语音识别器（支持中英文）
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
        checkAuthorization()
    }
    
    /// 检查授权状态
    func checkAuthorization() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self?.isAuthorized = true
                case .denied, .restricted, .notDetermined:
                    self?.isAuthorized = false
                    self?.state = .error("请在设置中允许语音识别权限")
                @unknown default:
                    self?.isAuthorized = false
                }
            }
        }
    }
    
    /// 设置语言
    func setLanguage(_ language: AppLanguage) {
        let locale = language == .zh ? Locale(identifier: "zh-CN") : Locale(identifier: "en-US")
        speechRecognizer = SFSpeechRecognizer(locale: locale)
    }
    
    /// 开始录音
    func startRecording() async throws {
        guard isAuthorized else {
            state = .error("语音识别未授权")
            return
        }
        
        // 停止之前的录音
        stopRecording()
        
        // 配置音频会话
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        // 创建音频引擎
        audioEngine = AVAudioEngine()
        
        guard let audioEngine = audioEngine,
              let speechRecognizer = speechRecognizer,
              speechRecognizer.isAvailable else {
            state = .error("语音识别不可用")
            return
        }
        
        // 创建识别请求
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = true
        recognitionRequest?.requiresOnDeviceRecognition = false
        
        // 获取音频输入节点
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        // 安装音频 tap
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }
        
        // 准备并启动音频引擎
        audioEngine.prepare()
        try audioEngine.start()
        
        // 开始识别
        transcript = ""
        state = .listening
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest!) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                // 忽略取消错误
                if (error as NSError).domain == "kAFAssistantErrorDomain" {
                    return
                }
                DispatchQueue.main.async {
                    self.state = .error(error.localizedDescription)
                }
                return
            }
            
            if let result = result {
                DispatchQueue.main.async {
                    self.transcript = result.bestTranscription.formattedString
                }
                
                if result.isFinal {
                    DispatchQueue.main.async {
                        self.state = .idle
                    }
                }
            }
        }
    }
    
    /// 停止录音
    func stopRecording() {
        // 停止音频引擎
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        
        // 结束识别请求
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        
        // 重置
        audioEngine = nil
        recognitionRequest = nil
        recognitionTask = nil
        
        // 停用音频会话
        try? AVAudioSession.sharedInstance().setActive(false)
        
        if case .listening = state {
            state = .processing
        }
    }
    
    /// 重置
    func reset() {
        stopRecording()
        transcript = ""
        state = .idle
    }
}
