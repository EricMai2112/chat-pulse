/* eslint-disable @typescript-eslint/no-explicit-any */
import http from '@/utils/http'

export const aiApi = {
  askChatPulseAI: (chatContext: any[], prompt: string) => {
    return http.post('/conversations/ask-ai', {
      context: chatContext,
      question: prompt
    })
  },
  sendVoiceChat: (formData: FormData) => {
    return http.post<{
      userQuestion: string
      aiReplyText: string
      audioBase64: string
    }>('/api/ai/voice-chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}
