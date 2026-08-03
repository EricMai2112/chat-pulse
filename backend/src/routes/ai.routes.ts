import { Router } from 'express'
import multer from 'multer'
import { voiceChatController } from '~/services/ai/ai.controller'

const upload = multer({ dest: 'uploads/' }) // Lưu file tạm
const aiRouter = Router()

// Khai báo route POST /api/ai/voice-chat
aiRouter.post('/voice-chat', upload.single('audio'), voiceChatController)

export default aiRouter
