// src/components/chat/VoiceRecorderButton.tsx
import React, { useState, useRef } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { aiApi } from '@/apis/ai.api'

interface VoiceRecorderButtonProps {
  onTranscribed?: (userQuestion: string, aiReplyText: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatHistory?: any[]
}

export const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({ onTranscribed, chatHistory = [] }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 1. Bắt đầu Thu âm từ Micro
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToBackend(audioBlob)
        // Tắt micro
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Không thể truy cập Micro:', err)
      alert('Vui lòng cấp quyền truy cập Microphone cho trình duyệt!')
    }
  }

  // 2. Dừng thu âm
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // 3. Gửi File Audio sang Backend & Bật Audio giọng nói AI trả về
  const sendAudioToBackend = async (blob: Blob) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('chatHistory', JSON.stringify(chatHistory))

      const res = await aiApi.sendVoiceChat(formData)
      const { userQuestion, aiReplyText, audioBase64 } = res.data

      // Callback để cập nhật tin nhắn lên giao diện Chat UI
      if (onTranscribed) {
        onTranscribed(userQuestion, aiReplyText)
      }

      // Phát Giọng nói AI (Audio MP3) ra Loa
      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
        audio.play()
      }
    } catch (error) {
      console.error('Lỗi khi gửi Voice Chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type='button'
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center ${
        isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-muted hover:bg-muted-foreground/20 text-foreground'
      }`}
      title={isRecording ? 'Bấm để dừng và gửi' : 'Bấm để nói chuyện với AI'}
    >
      {isLoading ? (
        <Loader2 className='h-5 w-5 animate-spin text-primary' />
      ) : isRecording ? (
        <Square className='h-5 w-5 fill-current' />
      ) : (
        <Mic className='h-5 w-5' />
      )}
    </button>
  )
}
