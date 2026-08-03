// Trong ai.controller.ts
import { Request, Response } from 'express'
import aiService, { isEnglishText } from './ai.service'
import fs from 'fs'

export const voiceChatController = async (req: Request, res: Response) => {
  const audioFile = req.file
  if (!audioFile) return res.status(400).json({ message: 'Không nhận được file ghi âm' })

  try {
    const userQuestion = await aiService.transcribeAudio(audioFile.path)
    if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)

    console.log('🎙️ [VoiceChat] User Question:', userQuestion)

    let chatHistory = []
    try {
      chatHistory = JSON.parse(req.body.chatHistory || '[]')
    } catch {
      chatHistory = []
    }

    // 1. AI sinh câu trả lời (Đã được ép đúng ngôn ngữ từ Prompt)
    const aiReplyText = await aiService.answerQuestion('', '', chatHistory, userQuestion)
    console.log('🤖 [VoiceChat] AI Reply Text:', aiReplyText)

    // 2. Kiểm tra xem câu trả lời là Tiếng Anh hay Tiếng Việt
    const isEnglish = isEnglishText(aiReplyText) || isEnglishText(userQuestion)
    const isVN = !isEnglish

    console.log('🌐 [VoiceChat] Is Vietnamese?:', isVN)

    let audioBase64 = null
    // Nếu là Tiếng Anh -> Gọi AWS Polly Joanna phát âm chuẩn Native
    if (isEnglish) {
      console.log('🔊 [VoiceChat] Gọi AWS Polly Joanna (English)...')
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
    if (audioFile && fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)
    return res.status(500).json({ message: 'Lỗi máy chủ khi xử lý Voice AI' })
  }
}
