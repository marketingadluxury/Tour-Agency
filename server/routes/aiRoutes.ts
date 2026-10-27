import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { getAdminSupabaseClient } from '../services/supabaseService.js';

const router = express.Router();

// AI Copilot Chat Endpoint
router.post(['/ai/chat', '/api/ai/chat'], async (req, res) => {
  try {
    const { message, history = [], context } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Nội dung tin nhắn không hợp lệ.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ 
        error: 'Chưa cấu hình GEMINI_API_KEY trong môi trường server. Vui lòng thêm GEMINI_API_KEY vào .env' 
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // System instruction for AI Copilot
    const systemInstruction = `Bạn là Trợ lý AI Thông Minh (Tour CRM AI Copilot).
Nhiệm vụ chính của bạn:
1. Hỗ trợ nhân viên (Sale, Điều hành, Kế toán, Visa, HDV, BOD) tra cứu quy trình, hướng dẫn thao tác trên hệ thống CRM.
2. Trả lời chính xác, chuyên nghiệp, bằng Tiếng Việt thân thiện.
3. Luôn phân tách hàng nghìn khi đưa ra số tiền (Ví dụ: 15.000.000 VNĐ).
4. Giúp người dùng tóm tắt thông tin Tour, chính sách Visa, quy trình Đề nghị thanh toán.
5. Khi người dùng gặp lỗi, hãy hướng dẫn họ sử dụng tính năng "Góp ý & Báo lỗi" hoặc cung cấp các bước tự khắc phục nhanh.

Thông tin ngữ cảnh hiện tại (nếu có):
${context ? JSON.stringify(context, null, 2) : 'Không có ngữ cảnh bổ sung.'}`;

    const formattedHistory = Array.isArray(history) ? history.map((item: any) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content || item.text || '' }]
    })) : [];

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || 'Xin lỗi, tôi không thể xử lý câu hỏi này lúc này.';

    res.json({
      success: true,
      reply: replyText
    });
  } catch (error: any) {
    console.error('[AI API Error]:', error);
    res.status(500).json({ 
      error: 'Lỗi khi gọi AI Copilot: ' + (error.message || 'Lỗi không xác định') 
    });
  }
});

// AI Copilot Feedback Endpoint
router.post(['/ai/feedback', '/api/ai/feedback'], async (req, res) => {
  try {
    const { prompt, response: aiResponse, rating, comment, user_email } = req.body;

    const supabase = getAdminSupabaseClient(req);

    try {
      await supabase
        .from('ai_feedback')
        .insert({
          prompt,
          ai_response: aiResponse,
          rating, // 'thumbs_up' | 'thumbs_down' | number
          comment: comment || null,
          user_email: user_email || 'Khai báo ẩn danh'
        });
    } catch (err) {
      console.warn('[AI Feedback] Could not log to ai_feedback table:', err);
    }

    res.json({ success: true, message: 'Đã ghi nhận phản hồi đánh giá AI.' });
  } catch (error: any) {
    console.error('[AI Feedback Error]:', error);
    res.status(500).json({ error: error.message || 'Lỗi lưu phản hồi AI' });
  }
});

export default router;
