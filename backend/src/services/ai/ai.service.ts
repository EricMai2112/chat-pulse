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

class AiService {
  private groq: Groq
  private modelName: string
  private pollyClient: PollyClient

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string })
    this.modelName = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
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
      // 1. Làm sạch ký tự markdown
      let cleanText = text
        .replace(/[*#_`]/g, '')
        .trim()
        .substring(0, 1200)

      // 2. Chuyển các dấu câu thành khoảng nghỉ tự nhiên trong SSML
      cleanText = cleanText
        .replace(/\.\.\./g, '<break time="300ms"/>')
        .replace(/!/g, '! <break time="150ms"/>')
        .replace(/\?/g, '? <break time="200ms"/>')

      // 3. Dùng thẻ prosody chuẩn (Hỗ trợ 100% cho Neural Engine)
      const ssmlText = `<speak><prosody rate="102%" pitch="+2%">${cleanText}</prosody></speak>`

      const command = new SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: ssmlText,
        TextType: 'ssml',
        VoiceId: 'Joanna' as VoiceId,
        Engine: 'neural' // Vẫn giữ Neural engine để giọng cực kỳ tự nhiên
      })

      const response = await this.pollyClient.send(command)
      const audioByteArray = await response.AudioStream?.transformToByteArray()
      return Buffer.from(audioByteArray || [])
    } catch (error) {
      console.error('Lỗi Polly SSML, fallback sang Plain Text:', error)

      // Fallback an toàn nếu vẫn có lỗi
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
      // 1. Kiểm tra ngôn ngữ trực tiếp từ câu hỏi vừa nhận diện được
      const isVN = isVietnameseText(question)

      // 2. Ép cứng quy tắc cho Llama: Phải tuân thủ ngôn ngữ của LƯỢT NÓI MỚI NHẤT
      const langInstruction = isVN
        ? '\n\n[STRICT LANGUAGE OVERRIDE]: The user asked in VIETNAMESE. You MUST answer strictly in VIETNAMESE. Ignore previous English context if any.'
        : '\n\n[STRICT LANGUAGE OVERRIDE]: The user asked in ENGLISH. You MUST answer strictly in ENGLISH. Ignore previous Vietnamese context if any.'

      const baseInstruction = PromptBuilder.buildSystemInstruction(globalContextString, userMetadataString)
      const systemInstruction = baseInstruction + langInstruction

      const formattedHistory = (chatHistory || [])
        .map((item: any) => {
          let contentString = ''
          if (Array.isArray(item.parts)) {
            contentString = item.parts.map((p: any) => p.text || '').join('\n')
          } else if (typeof item.parts === 'string') {
            contentString = item.parts
          } else {
            contentString = String(item.content || item.parts || '')
          }
          return {
            role: item.role === 'model' ? 'assistant' : 'user',
            content: contentString
          }
        })
        .filter((msg: any) => msg.content.trim() !== '')

      const messages: any[] = [
        { role: 'system', content: systemInstruction },
        ...formattedHistory,
        { role: 'user', content: question }
      ]

      const completion = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: messages,
        temperature: 0.5 // Hạ bớt temperature để AI tuân thủ System Prompt tốt hơn
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('Lỗi AiService.answerQuestion:', error)
      throw new ErrorWithStatus({
        message: 'AI hiện không thể trả lời. Vui lòng thử lại.',
        status: httpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }
}

export default new AiService()
