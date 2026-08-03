/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react'
import { ChatHeader } from './ChatHeader'
import type { ChatItem } from '@/context/app.context'
import { Send, Bot, Loader2, Copy, Check, Mic, PhoneOff, Volume2, Square } from 'lucide-react'
import { aiApi } from '@/apis/ai.api'
import { trafficApi } from '@/apis/traffic.api'
import { TrafficCard } from './TrafficCard'
import type { TrafficResponseCard } from './TrafficCard'

interface AIChatAreaProps {
  chat: ChatItem
  onToggleInfoPanel?: () => void
  isInfoPanelOpen?: boolean
}

interface AIMessage {
  id: string
  role: 'user' | 'model'
  text: string
  timestamp: Date
  cardData?: TrafficResponseCard | null
  isError?: boolean
}

const TRAFFIC_SUGGESTIONS = [
  { icon: '🚗', label: 'Tốc độ tối đa đường cao tốc' },
  { icon: '🍺', label: 'Nồng độ cồn khi lái xe' },
  { icon: '📱', label: 'Dùng điện thoại khi lái xe' },
  { icon: '🪖', label: 'Quy định đội mũ bảo hiểm' },
  { icon: '🚦', label: 'Vượt đèn đỏ bị phạt bao nhiêu?' },
  { icon: '🅿️', label: 'Đỗ xe sai quy định phạt thế nào?' }
]

function TrafficAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-[15px]' : 'h-16 w-16 text-3xl'
  const dot =
    size === 'sm' ? 'w-2.5 h-2.5 border-[1.5px] -bottom-0.5 -right-0.5' : 'w-4 h-4 border-2 bottom-0.5 right-0.5'
  return (
    <div className='shrink-0'>
      <div
        className={`${dim} relative flex items-center justify-center rounded-full bg-[#1e3a5f] border-2 border-blue-500 shadow-sm`}
      >
        🚦
        <span className={`absolute ${dot} rounded-full bg-green-500 border-background`} />
      </div>
    </div>
  )
}

function AIAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border border-border shadow-sm shrink-0`}
    >
      <Bot className='w-4 h-4 text-white' />
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className='flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors'
    >
      {copied ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
      {copied ? 'Đã sao chép' : 'Sao chép'}
    </button>
  )
}

export function AIChatArea({ chat, onToggleInfoPanel = () => {}, isInfoPanelOpen = false }: AIChatAreaProps) {
  const isTraffic = chat.type === 'traffic-ai'
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const config = {
    welcomeText: isTraffic
      ? 'Chào bạn! Tôi là chuyên gia Luật Giao Thông của ChatPulse. Bạn muốn tra cứu mức phạt, điều luật hay quy định nào?'
      : 'Xin chào! Tôi là ChatPulse AI. Tôi có thể giúp gì cho bạn hôm nay?',
    placeholder: isTraffic ? 'Hỏi về luật giao thông...' : 'Hỏi ChatPulse AI điều gì đó...',
    themeGradient: isTraffic ? 'from-blue-600 to-blue-700' : 'from-purple-600 to-indigo-600',
    ringColor: isTraffic ? 'focus-within:ring-blue-500' : 'focus-within:ring-purple-500',
    typingDotColor: isTraffic ? 'bg-blue-500' : 'bg-purple-500'
  }

  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  // ── States & Refs cho Voice Call & Barge-in ──
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false)
  const [voiceStatusText, setVoiceStatusText] = useState<string>('Đang nghe bạn nói...')
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isUserCancelledRef = useRef<boolean>(false)

  // Audio Context phục vụ việc đo giọng nói để ngắt AI (Barge-in)
  const audioContextRef = useRef<AudioContext | null>(null)
  const bargeInAnimFrameRef = useRef<number | null>(null)

  useEffect(() => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'model',
        text: config.welcomeText,
        timestamp: new Date()
      }
    ])
    setInputText('')
    setIsTyping(false)
    setShowSuggestions(true)
  }, [chat.id, chat.type])

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '44px'
      const sh = inputRef.current.scrollHeight
      inputRef.current.style.height = sh > 130 ? '130px' : `${sh}px`
      inputRef.current.style.overflowY = sh > 130 ? 'auto' : 'hidden'
    }
  }, [inputText])

  // ── 1. MỞ OVERLAY & LẮNG NGHE ─────────────────────────────────────────────
  const handleStartVoiceCall = async () => {
    isUserCancelledRef.current = false
    setIsVoiceOverlayOpen(true)
    startListening()
  }

  const startListening = async () => {
    if (isUserCancelledRef.current) return

    try {
      stopAiAudio()
      setIsAiSpeaking(false)
      setIsRecordingVoice(true)
      setVoiceStatusText('Đang nghe bạn nói... (Bấm nút vuông để gửi)')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecordingVoice(false)
        stopStream()

        if (isUserCancelledRef.current) return

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size > 3000) {
          await processVoiceAndReply(audioBlob)
        } else {
          setVoiceStatusText('Chưa nghe rõ câu hỏi. Đang lắng nghe lại...')
          setTimeout(() => {
            if (!isUserCancelledRef.current) startListening()
          }, 1200)
        }
      }

      mediaRecorderRef.current.start()
    } catch (err) {
      console.error('Lỗi mở Micro:', err)
      setVoiceStatusText('Không thể truy cập Micro!')
    }
  }

  // ── 2. HÀM DỪNG GHI ÂM CHỐT CÂU HỎI ────────────────────────────────────────
  const handleStopAndSendVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setVoiceStatusText('Đang chốt câu hỏi...')
      mediaRecorderRef.current.stop()
    }
  }

  // ── 3. PHÁT LOA AI & KÍCH HOẠT TÍNH NĂNG CẮT LỜI (BARGE-IN) ──────────────────
  const processVoiceAndReply = async (blob: Blob) => {
    if (isUserCancelledRef.current) return

    setVoiceStatusText('AI đang suy nghĩ...')
    setIsAiSpeaking(true)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'voice.webm')

      const chatContext = messages.filter((m) => m.id !== 'welcome-msg').map((m) => ({ role: m.role, content: m.text }))
      formData.append('chatHistory', JSON.stringify(chatContext))

      const res = await (aiApi as any).sendVoiceChat(formData)
      if (isUserCancelledRef.current) return

      const { aiReplyText, isVietnamese, audioBase64 } = res.data
      setVoiceStatusText('AI đang trả lời... (Nói vào mic để cắt lời AI)')

      // KÍCH HOẠT LẮNG NGHE LỚP NỀN ĐỂ BẮT GIỌNG NÓI CẮT LỜI AI (BARGE-IN)
      listenForBargeIn()

      const handleFinishedSpeaking = () => {
        stopBargeInListener()
        setIsAiSpeaking(false)
        if (!isUserCancelledRef.current) {
          startListening()
        }
      }

      // Phát âm thanh
      if (!isVietnamese && audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
        currentAudioRef.current = audio
        audio.onended = handleFinishedSpeaking
        await audio.play().catch(() => {})
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const cleanText = aiReplyText.replace(/[*#_`]/g, '').replace(/([.,!?])/g, '$1 ')
        const utterance = new SpeechSynthesisUtterance(cleanText)
        utterance.lang = 'vi-VN'
        utterance.rate = 0.96
        utterance.pitch = 1.05

        const voices = window.speechSynthesis.getVoices()
        const bestViVoice =
          voices.find(
            (v) =>
              (v.lang.includes('vi') || v.lang.includes('VN')) &&
              (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))
          ) || voices.find((v) => v.lang.includes('vi'))

        if (bestViVoice) utterance.voice = bestViVoice
        utterance.onend = handleFinishedSpeaking

        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      console.error('Lỗi voice chat:', error)
      stopBargeInListener()
      if (!isUserCancelledRef.current) {
        setVoiceStatusText('Lỗi kết nối AI. Đang thử lại...')
        setTimeout(() => startListening(), 2000)
      }
    }
  }

  // ── 4. LOGIC GIÁM SÁT ÂM LƯỢNG MICRO ĐỂ CẮT NGẮT LỜI AI ────────────────────
  const listenForBargeIn = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      analyser.fftSize = 512
      source.connect(analyser)

      audioContextRef.current = audioContext

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const detectSpeech = () => {
        if (isUserCancelledRef.current) return

        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const averageVolume = sum / bufferLength

        // Tần số giọng nói người dùng phát ra (> 25) -> CẮT LỜI AI NGAY LẬP TỨC!
        if (averageVolume > 25) {
          stopBargeInListener()
          stopAiAudio() // Dừng loa AI
          setVoiceStatusText('Đã ngắt AI! Đang nghe bạn nói...')
          startListening() // Chuyển sang thu âm giọng nói của bạn
          return
        }

        bargeInAnimFrameRef.current = requestAnimationFrame(detectSpeech)
      }

      detectSpeech()
    } catch (e) {
      console.error('Lỗi lắng nghe Barge-in:', e)
    }
  }

  const stopBargeInListener = () => {
    if (bargeInAnimFrameRef.current) cancelAnimationFrame(bargeInAnimFrameRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }

  const stopAiAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  // ── 5. TẮT HOÀN TOÀN CUỘC GỌI VOICE CALL ───────────────────────────────────
  const handleCloseVoiceOverlay = () => {
    isUserCancelledRef.current = true
    stopBargeInListener()
    stopAiAudio()
    stopStream()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    setIsVoiceOverlayOpen(false)
    setIsRecordingVoice(false)
    setIsAiSpeaking(false)
  }

  // ── NHẮN TIN CHỮ THƯỜNG ─────────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const query = (overrideText ?? inputText).trim()
    if (!query || isTyping) return

    setShowSuggestions(false)

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)
    if (inputRef.current) inputRef.current.style.height = '44px'

    try {
      if (isTraffic) {
        const response = await trafficApi.askTrafficAI(query)
        const trafficData = response.data?.data as any
        const cardData: TrafficResponseCard | null =
          trafficData?.card && ['violation', 'general', 'not_found'].includes(trafficData.card.type)
            ? (trafficData.card as TrafficResponseCard)
            : null

        const fallbackText =
          cardData?.type === 'not_found'
            ? (cardData as any).message
            : (cardData as any)?.userFriendlyExplanation ||
              (cardData as any)?.summary ||
              trafficData?.rawText ||
              'Xin lỗi, hệ thống không thể xử lý câu hỏi lúc này.'

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: fallbackText,
            timestamp: new Date(),
            cardData
          }
        ])
      } else {
        const chatContext = messages
          .filter((m) => m.id !== 'welcome-msg')
          .map((m) => ({ role: m.role, content: m.text }))

        const response = await aiApi.askChatPulseAI(chatContext, query)
        const aiResponseText =
          response.data?.result ||
          response.data?.data ||
          (response.data as any)?.text ||
          (response.data as any)?.message ||
          'Xin lỗi, tôi gặp chút trục trặc.'

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: aiResponseText,
            timestamp: new Date()
          }
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Mất kết nối với máy chủ AI. Vui lòng thử lại!',
          timestamp: new Date(),
          isError: true
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='flex flex-col h-screen w-full overflow-hidden bg-background relative'>
      {/* Header */}
      <div className='shrink-0 bg-background z-20 border-b border-border/40'>
        <ChatHeader chat={chat} onToggleInfoPanel={onToggleInfoPanel} isInfoPanelOpen={isInfoPanelOpen} />
      </div>

      {/* Message list */}
      <div ref={containerRef} className='flex-1 overflow-y-auto scroll-smooth bg-muted/10'>
        <div className='flex flex-col gap-4 min-h-full pb-4'>
          {isTraffic && (
            <div className='flex flex-col items-center py-10 px-6 gap-4'>
              <div className='relative'>
                <div className='h-20 w-20 flex items-center justify-center rounded-full bg-[#1e3a5f] border-[3px] border-blue-500 shadow-lg text-4xl'>
                  🚦
                </div>
                <span className='absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background' />
              </div>

              <div className='text-center space-y-1.5'>
                <h2 className='text-xl font-extrabold tracking-tight text-foreground'>ChatPulse Giao Thông</h2>
                <p className='text-sm text-muted-foreground'>Trợ lý AI về luật giao thông Việt Nam</p>
                <div className='inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5 mt-1'>
                  <span className='w-2 h-2 rounded-full bg-blue-500' />
                  <span className='text-xs text-muted-foreground font-medium'>
                    Powered by RAG · Dữ liệu pháp luật VN
                  </span>
                </div>
              </div>

              {showSuggestions && (
                <div className='w-full max-w-xl'>
                  <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center'>
                    Câu hỏi gợi ý
                  </p>
                  <div className='grid grid-cols-2 gap-2'>
                    {TRAFFIC_SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSend(s.label)}
                        className='flex items-center gap-3 bg-muted hover:bg-muted/80 border border-border rounded-xl px-4 py-3 text-left transition-colors group'
                      >
                        <span className='text-xl shrink-0'>{s.icon}</span>
                        <span className='text-xs font-medium text-muted-foreground group-hover:text-foreground leading-snug transition-colors'>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div key={msg.id} className={`flex gap-3 px-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (isTraffic ? <TrafficAvatar size='sm' /> : <AIAvatar size='sm' />)}

                <div className={`flex flex-col ${isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[85%]'}`}>
                  {!isUser && isTraffic && msg.id !== 'welcome-msg' && (
                    <span className='text-[11px] text-muted-foreground font-semibold mb-1 ml-1'>
                      ChatPulse Giao Thông
                    </span>
                  )}

                  {isUser ? (
                    <div
                      className={`px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm bg-gradient-to-r ${config.themeGradient} text-white`}
                    >
                      <p className='text-[15px] leading-relaxed whitespace-pre-wrap'>{msg.text}</p>
                    </div>
                  ) : msg.isError ? (
                    <div className='px-4 py-2.5 rounded-2xl rounded-tl-sm border border-red-800/50 bg-red-950/30 text-red-300 max-w-md'>
                      <p className='text-sm leading-relaxed'>{msg.text}</p>
                    </div>
                  ) : isTraffic && msg.id !== 'welcome-msg' && msg.cardData ? (
                    <TrafficCard data={msg.cardData} />
                  ) : (
                    <div className='px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm bg-background border border-border text-foreground'>
                      <p className='text-[15px] leading-relaxed whitespace-pre-wrap'>{msg.text}</p>
                    </div>
                  )}

                  <div className={`flex items-center gap-3 mt-1 ${isUser ? 'flex-row-reverse' : 'flex-row'} ml-1`}>
                    <span className='text-[10px] text-muted-foreground'>
                      {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!isUser && !msg.isError && msg.id !== 'welcome-msg' && <CopyButton text={msg.text} />}
                  </div>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className='flex gap-3 items-end px-4'>
              {isTraffic ? <TrafficAvatar size='sm' /> : <AIAvatar size='sm' />}
              <div className='bg-background border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5'>
                {[0, 200, 400].map((delay) => (
                  <span
                    key={delay}
                    className={`w-2 h-2 ${config.typingDotColor} rounded-full animate-bounce`}
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className='shrink-0 border-t border-border/40 bg-background px-4 py-3 shadow-sm z-20 flex items-end gap-2'>
        <div
          className={`relative flex-1 flex items-end bg-muted rounded-[24px] border border-border outline-none transition-all ring-2 ring-transparent focus-within:ring-2 ${config.ringColor}`}
        >
          <textarea
            ref={inputRef}
            placeholder={config.placeholder}
            className='w-full bg-transparent text-foreground px-5 py-[10px] outline-none resize-none leading-relaxed text-sm placeholder:text-muted-foreground'
            style={{ minHeight: '44px', height: '44px', maxHeight: '130px' }}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            rows={1}
          />
        </div>

        {/* NÚT MỞ VOICE CALL OVERLAY */}
        <button
          type='button'
          onClick={handleStartVoiceCall}
          disabled={isTyping}
          className='w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all duration-200 shadow-md shrink-0'
          title='Trò chuyện giọng nói với AI'
        >
          <Mic className='w-5 h-5' />
        </button>

        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          className={`w-11 h-11 bg-gradient-to-r ${config.themeGradient} text-white rounded-full flex items-center justify-center shadow-md shrink-0`}
        >
          <Send className='w-4 h-4 ml-0.5' />
        </button>
      </div>

      {/* ── 🌟 OVERLAY BACKGROUND MỜ MỜ (FROSTED GLASS) 🌟 ── */}
      {isVoiceOverlayOpen && (
        <div className='absolute inset-0 z-50 bg-black/50 backdrop-blur-md flex flex-col items-center justify-between py-10 px-6 animate-in fade-in duration-300'>
          {/* Header Overlay */}
          <div className='text-center space-y-1.5 mt-2 bg-black/40 px-6 py-3 rounded-full border border-white/10 shadow-lg backdrop-blur-md'>
            <h3 className='text-base font-bold text-white tracking-wide flex items-center justify-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-purple-400 animate-ping' />
              ChatPulse Voice AI
            </h3>
            <p className='text-xs text-purple-200 font-medium animate-pulse'>{voiceStatusText}</p>
          </div>

          {/* Sóng âm & Orb nhảy nhót ở giữa */}
          <div className='relative flex items-center justify-center my-auto'>
            <div
              className={`absolute w-44 h-44 rounded-full bg-purple-500/30 ${
                isAiSpeaking ? 'animate-ping' : 'animate-pulse'
              }`}
            />
            <div
              className={`absolute w-32 h-32 rounded-full bg-indigo-500/40 ${
                isAiSpeaking ? 'animate-bounce' : 'animate-pulse'
              }`}
            />

            <div className='relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-2xl border-2 border-white/30 animate-bounce'>
              {isAiSpeaking ? (
                <Volume2 className='w-10 h-10 text-white animate-pulse' />
              ) : (
                <Mic className='w-10 h-10 text-white animate-pulse' />
              )}
            </div>
          </div>

          {/* Footer: Cụm Nút Điều Khiển Voice Call */}
          <div className='flex items-center gap-6 mb-2'>
            {/* Nút vuông: Bấm để CHỐT CÂU HỎI & gửi AI */}
            {isRecordingVoice && (
              <button
                onClick={handleStopAndSendVoice}
                className='w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ring-4 ring-purple-500/40'
                title='Bấm để chốt và gửi câu hỏi'
              >
                <Square className='w-6 h-6 fill-current' />
              </button>
            )}

            {/* Nút đỏ: Bấm để TẮT HOÀN TOÀN voice call */}
            <button
              onClick={handleCloseVoiceOverlay}
              className='w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ring-4 ring-red-500/40'
              title='Tắt cuộc gọi giọng nói'
            >
              <PhoneOff className='w-6 h-6' />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
