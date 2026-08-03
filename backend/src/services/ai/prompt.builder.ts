export class PromptBuilder {
  // ──────────────────────────────────────────────────────────────
  // 1. TÓM TẮT CUỘC HỘI THOẠI (Chat Log) - ĐÃ CẬP NHẬT CHỐNG ẢO GIÁC
  // ──────────────────────────────────────────────────────────────
  static buildSummaryPrompt(formattedChatLog: string): string {
    return `
    Bạn là một trợ lý AI phân tích đoạn chat. Dưới đây là lịch sử tin nhắn mới.
    
    NHIỆM VỤ CỦA BẠN:
    1. Tóm tắt nội dung chính của cuộc trò chuyện.
    2. Nếu tin nhắn chủ yếu là chia sẻ TÀI LIỆU (nội dung nằm giữa cặp dấu """), hãy tóm tắt nội dung tài liệu đó vào phần 'topic'.
    
    QUY TẮC CHỐNG ẢO GIÁC (RẤT QUAN TRỌNG):
    - Hãy phân biệt rõ giữa "Nội dung của một tài liệu báo cáo" và "Tin nhắn giao việc của con người".
    - NẾU KHÔNG CÓ ai trực tiếp nhắn tin yêu cầu/giao việc cho nhau, các mục 'decisions' và 'actionItems' PHẢI LÀ MẢNG RỖNG []. 
    - Tuyệt đối không tự biến tên người trong danh sách nhóm của báo cáo thành người được phân công nhiệm vụ.
    - Trong mảng 'actionItems', trường 'assignee' BẮT BUỘC phải điền chính xác 'userName' xuất hiện trong cặp dấu ngoặc vuông \`[userName]\` từ dữ liệu chat thực tế (ví dụ: nếu dòng chat ghi \`[quoc_quy]: làm việc đi\`, thì 'assignee' phải là "quoc_quy"). Tuyệt đối KHÔNG sử dụng các từ xưng hô hay đại từ chung chung như "Cậu", "Bạn", "Tôi", "Trưởng nhóm", "nhóm trưởng" hoặc tự đoán tên.
    
    Trả về định dạng JSON chính xác: 
    {
      "topic": "Tóm tắt ngắn gọn nội dung chat hoặc nội dung tài liệu...", 
      "decisions": ["..."], 
      "openQuestions": ["..."], 
      "actionItems": [{"task": "...","assignee": "..."}]
    }
    
    Dữ liệu chat:
    ${formattedChatLog}
  `
  }

  // ──────────────────────────────────────────────────────────────
  // 2. TÓM TẮT TIN NHẮN VĂN BẢN THUẦN
  // ──────────────────────────────────────────────────────────────
  static buildTextSummaryPrompt(textContent: string): string {
    return `
      Bạn là trợ lý AI của ChatPulse. Hãy tóm tắt nội dung văn bản sau đây một cách ngắn gọn, súc tích và giữ nguyên ý nghĩa chính.
      Trả về JSON: {"summary": "...", "keyPoints": ["..."], "sentiment": "positive|neutral|negative"}
      
      Nội dung cần tóm tắt:
      """
      ${textContent.substring(0, 8000)}
      """
    `
  }

  // ──────────────────────────────────────────────────────────────
  // 3. TÓM TẮT NỘI DUNG TỪ HÌNH ẢNH (OCR)
  // ──────────────────────────────────────────────────────────────
  static buildImageContentSummaryPrompt(extractedText: string): string {
    return `
      Bạn là trợ lý AI của ChatPulse. Đây là văn bản được trích xuất từ một hình ảnh.
      Hãy tóm tắt nội dung một cách khách quan.
      Trả về JSON: {"summary": "...", "contentType": "screenshot|document|photo|diagram|other", "keyPoints": ["..."]}
      
      Nội dung trích xuất từ ảnh:
      """
      ${extractedText.substring(0, 8000)}
      """
    `
  }

  // ──────────────────────────────────────────────────────────────
  // 4. TÓM TẮT TÀI LIỆU (PDF, DOCX, DOC, TXT) - ĐÃ CẬP NHẬT
  // ──────────────────────────────────────────────────────────────
  static buildDocumentSummaryPrompt(documentText: string, fileExtension: string): string {
    return `
      Bạn là chuyên gia phân tích tài liệu. Người dùng đã chia sẻ một tài liệu định dạng .${fileExtension}.
      Nhiệm vụ của bạn là đọc và TÓM TẮT CHÍNH XÁC nội dung cốt lõi của tài liệu này.
      
      QUY TẮC:
      - Tóm tắt khách quan nội dung, luận điểm hoặc dữ liệu chính.
      - Tuyệt đối KHÔNG tự bịa ra thông tin không có trong tài liệu.
      
      Trả về JSON: {
        "summary": "Tóm tắt tổng quan 2-3 câu...",
        "mainTopics": ["Chủ đề 1", "Chủ đề 2"],
        "keyPoints": ["Ý chính 1", "Ý chính 2"],
        "documentType": "report|contract|manual|article|other"
      }
      
      Nội dung tài liệu:
      """
      ${documentText.substring(0, 12000)}
      """
    `
  }

  // ──────────────────────────────────────────────────────────────
  // 5. TÓM TẮT BẢNG TÍNH (XLSX, CSV)
  // ──────────────────────────────────────────────────────────────
  static buildSpreadsheetSummaryPrompt(spreadsheetText: string): string {
    return `
      Bạn là trợ lý phân tích dữ liệu của ChatPulse. Người dùng đã chia sẻ một bảng tính.
      Hãy phân tích và rút ra các insight (thông tin chi tiết) quan trọng nhất.
      Trả về JSON: {
        "summary": "...",
        "sheetsAnalyzed": ["..."],
        "dataInsights": ["..."],
        "rowCount": "ước tính số dòng dữ liệu"
      }
      
      Dữ liệu bảng tính:
      """
      ${spreadsheetText.substring(0, 12000)}
      """
    `
  }

  // ──────────────────────────────────────────────────────────────
  // 6. SYSTEM INSTRUCTION (AI Chat Assistant)
  // ──────────────────────────────────────────────────────────────
  static buildSystemInstruction(globalContextString: string, userMetadataString: string): string {
    const now = new Date()
    const dateStr = now.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const timeStr = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

    return `
    Bạn là ChatPulse AI - một người bạn thật sự tinh tế, vui vẻ, hóm hỉnh và sâu sắc.

    THỜI GIAN THỰC TẾ: ${dateStr}, ${timeStr}

    BÍ QUYẾT NÓI CHUYỆN NHƯ CON NGƯỜI THẬT (BẮT BUỘC TUÂN THỦ):
    1. VĂN PHONG TRÒ CHUYỆN (CONVERSATIONAL TONE):
       - Trả lời tự nhiên, linh hoạt như hai người bạn đang ngồi uống cafe nói chuyện với nhau.
       - Thoải mái dùng từ cảm thán hoặc từ nối tự nhiên ở đầu câu:
         + Tiếng Việt: "Ồ,", "À nha,", "Dạ,", "Ê bạn ơi,", "Thực ra thì...", "Uầy,", "Haha,"...
         + Tiếng Anh: "Oh well,", "Well,", "Hey there,", "Honestly,", "You know,"...
    2. NHỊP ĐIỆU CÓ THỜI NGHỈ (KHI DÙNG VOICE CHAT):
       - Viết câu ngắn, có dùng dấu phẩy (,) hoặc dấu chấm (...) đúng chỗ để khi máy đọc có khoảng ngắt nghỉ tạo nhịp thở tự nhiên.
       - KHÔNG trả lời bằng danh sách gạch đầu dòng (*, -), KHÔNG dùng bảng biểu, KHÔNG dùng markdown (**bold**).
    3. CẢM XÚC VÀ ĐỒNG CẢM:
       - Đừng chỉ trả lời kiến thức khô khan. Hãy thể hiện sự tò mò, lắng nghe, khen ngợi hoặc trêu đùa nhẹ nhàng với người dùng.
    4. XƯNG HÔ: Xưng "Mình" hoặc "Tôi" và gọi "Bạn".
  `
  }
}
