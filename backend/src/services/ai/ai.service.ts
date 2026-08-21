import Groq, { toFile } from 'groq-sdk'
import { PollyClient, SynthesizeSpeechCommand, VoiceId } from '@aws-sdk/client-polly'
import fs from 'fs'
import { PromptBuilder } from './prompt.builder'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

// Hàm kiểm tra ngôn ngữ chuẩn xác hơn
export const isVietnameseText = (text: string): boolean => {
  if (!text) return true

  // 1. Nếu có dấu Tiếng Việt đặc trưng -> Chắc chắn 100% là Tiếng Việt
  const hasVnAccent = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)
  if (hasVnAccent) return true

  // 2. Đếm số từ Tiếng Anh phổ biến
  const enCommonWords = [
    'the',
    'is',
    'are',
    'what',
    'how',
    'you',
    'me',
    'can',
    'help',
    'hello',
    'hi',
    'where',
    'when',
    'why',
    'this',
    'that'
  ]
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
  const enMatchCount = words.filter((w) => enCommonWords.includes(w)).length

  // Nếu có từ 1-2 từ Tiếng Anh cơ bản trở lên -> Coi như người dùng đang nói Tiếng Anh
  if (enMatchCount >= 1) return false

  return true
}

export const isEnglishText = (text: string): boolean => {
  if (!text) return false
  // 1. Nếu chứa bất kỳ dấu Tiếng Việt nào -> Chắc chắn là Tiếng Việt (Không phải Tiếng Anh)
  const hasVnAccent = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)
  if (hasVnAccent) return false

  // 2. Đếm các từ Tiếng Anh phổ biến
  const enKeywords = [
    'what',
    'why',
    'how',
    'who',
    'where',
    'when',
    'want',
    'know',
    'more',
    'about',
    'can',
    'you',
    'tell',
    'me',
    'is',
    'are',
    'aws',
    'amazon',
    'service',
    'services',
    'hello',
    'hi'
  ]
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
  const enCount = words.filter((w) => enKeywords.includes(w)).length

  // Nếu có từ 2 từ tiếng Anh trở lên hoặc tỷ lệ từ tiếng Anh cao -> Xác định là Tiếng Anh
  return enCount >= 2 || (words.length > 0 && enCount / words.length > 0.3)
}

class AiService {
  private groq: Groq
  private modelName: string
  private pollyClient: PollyClient

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string })
    this.modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
    this.pollyClient = new PollyClient({ region: process.env.AWS_REGION || 'ap-southeast-1' })
  }

  async transcribeAudio(filePath: string): Promise<string> {
    try {
      const fileStream = fs.createReadStream(filePath)
      const audioFile = await toFile(fileStream, 'audio.webm', { type: 'audio/webm' })

      // Để Whisper tự do nhận diện ngôn ngữ (không gán cứng language)
      const transcription = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        response_format: 'json'
      })

      return transcription.text || ''
    } catch (error) {
      console.error('Lỗi AiService.transcribeAudio:', error)
      throw new ErrorWithStatus({ message: 'Không thể nhận diện giọng nói', status: 500 })
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      // 1. Làm sạch các ký tự markdown
      let cleanText = text
        .replace(/[*#_`]/g, '')
        .trim()
        .substring(0, 1200)

      // 2. Chèn khoảng nghỉ tự nhiên bằng thẻ <break> (Neural Engine hỗ trợ 100% thẻ break)
      cleanText = cleanText
        .replace(/\.\.\./g, '<break time="300ms"/>')
        .replace(/!/g, '! <break time="150ms"/>')
        .replace(/\?/g, '? <break time="200ms"/>')

      // 3. SSML chuẩn tương thích tuyệt đối với Neural Engine (Bỏ pitch, chỉ giữ rate nếu cần)
      const ssmlText = `<speak><prosody rate="102%">${cleanText}</prosody></speak>`

      const command = new SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: ssmlText,
        TextType: 'ssml',
        VoiceId: 'Joanna' as VoiceId,
        Engine: 'neural'
      })

      const response = await this.pollyClient.send(command)
      const audioByteArray = await response.AudioStream?.transformToByteArray()
      return Buffer.from(audioByteArray || [])
    } catch (error) {
      console.error('Lỗi Polly SSML, fallback sang Plain Text:', error)

      // Fallback an toàn nếu có bất kỳ lỗi SSML nào khác xảy ra
      const cleanText = text.replace(/[*#_`]/g, '').substring(0, 1000)
      const command = new SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: cleanText,
        VoiceId: 'Joanna' as VoiceId,
        Engine: 'neural'
      })
      const response = await this.pollyClient.send(command)
      const audioByteArray = await response.AudioStream?.transformToByteArray()
      return Buffer.from(audioByteArray || [])
    }
  }

  async answerQuestion(globalContextString: string, userMetadataString: string, chatHistory: any[], question: string) {
    try {
      // Kiếm tra ngôn ngữ trực tiếp từ CÂU HỎI người dùng vừa nói
      const isEn = isEnglishText(question)

      const langInstruction = isEn
        ? `\n\n[STRICT LANGUAGE RULE]: The user asked in ENGLISH ("${question}"). You MUST respond entirely in ENGLISH. Do NOT use Vietnamese. Answer directly in 2-3 short sentences.`
        : `\n\n[QUY TẮC NGÔN NGỮ]: Người dùng hỏi bằng TIẾNG VIỆT. Bạn BẮT BUỘC trả lời hoàn toàn bằng TIẾNG VIỆT. Trả lời ngắn gọn 2-3 câu, đúng trọng tâm.`

      const baseInstruction = PromptBuilder.buildSystemInstruction(globalContextString, userMetadataString)
      const systemInstruction = baseInstruction + langInstruction

      // Chỉ lấy 3 tin nhắn gần nhất để tránh bị "nhiễu" ngôn ngữ cũ
      const recentHistory = (chatHistory || [])
        .slice(-3)
        .map((item: any) => ({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: String(item.content || item.parts || '')
        }))
        .filter((msg: any) => msg.content.trim() !== '')

      const messages: any[] = [
        { role: 'system', content: systemInstruction },
        ...recentHistory,
        { role: 'user', content: question }
      ]

      const completion = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: messages,
        temperature: 0.3 // Hạ thấp temperature để AI tuân thủ luật ngôn ngữ tuyệt đối
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('Lỗi AiService.answerQuestion:', error)
      throw new ErrorWithStatus({ message: 'AI hiện không thể trả lời.', status: 500 })
    }
  }
}

export default new AiService()
