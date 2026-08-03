import { Request, Response } from 'express'
import aiService, { isVietnameseText } from './ai.service'
import fs from 'fs'

export const voiceChatController = async (req: Request, res: Response) => {
  const audioFile = req.file

  if (!audioFile) {
    return res.status(400).json({ message: 'Không nhận được file ghi âm' })
  }

  try {
    // 1. Groq Whisper dịch âm thanh
    const userQuestion = await aiService.transcribeAudio(audioFile.path)
    if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)

    console.log('🎙️ [VoiceChat] User Question:', userQuestion)

    const hallucinations = ['subscribe', 'ghiền mì gõ', 'cảm ơn đã xem', 'like và share']
    const isHallucination = hallucinations.some((h) => userQuestion.toLowerCase().includes(h))

    if (!userQuestion || !userQuestion.trim() || isHallucination) {
      return res.status(400).json({ message: 'Không nghe rõ, vui lòng thử lại!' })
    }

    // 2. Lấy câu trả lời từ AI
    let chatHistory = []
    try {
      chatHistory = JSON.parse(req.body.chatHistory || '[]')
    } catch {
      chatHistory = []
    }

    const aiReplyText = await aiService.answerQuestion('', '', chatHistory, userQuestion)
    console.log('🤖 [VoiceChat] AI Reply Text:', aiReplyText)

    // 3. Phân loại ngôn ngữ của CÂU TRẢ LỜI thực tế
    const isVN = isVietnameseText(aiReplyText)
    console.log('🌐 [VoiceChat] Is Vietnamese?:', isVN)

    let audioBase64 = null

    // Nếu KHÔNG PHẢI Tiếng Việt (tức là Tiếng Anh) -> Gọi AWS Polly tạo audio MP3
    if (!isVN) {
      console.log('🔊 [VoiceChat] Đang gọi AWS Polly Joanna...')
      const audioBuffer = await aiService.textToSpeech(aiReplyText)
      audioBase64 = audioBuffer.toString('base64')
    }

    return res.json({
      userQuestion,
      aiReplyText,
      isVietnamese: isVN,
      audioBase64
    })
  } catch (error: any) {
    console.error('Lỗi Voice Chat Backend:', error)
    if (audioFile && fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)
    return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý Voice AI' })
  }
}
