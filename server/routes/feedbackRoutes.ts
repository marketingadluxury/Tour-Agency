import express from 'express';
import { getAdminSupabaseClient } from '../services/supabaseService.js';
import { 
  getGoogleDriveAccessToken, 
  getOrCreateFeedbackFolder, 
  uploadFileToGoogleDrive,
  appendFeedbackToGoogleSheet 
} from '../services/googleDriveService.js';

const router = express.Router();

// Feedback / Bug reports API
router.post(['/feedback', '/api/feedback', '/submit-feedback', '/api/submit-feedback'], async (req, res) => {
  try {
    const rawType = req.body.type || 'Góp ý & Báo lỗi';
    const content = (req.body.content || req.body.description || req.body.title || '').trim();
    
    if (!content) {
      res.status(400).json({ error: 'Nội dung góp ý/báo lỗi không được để trống' });
      return;
    }

    const title = req.body.title || (rawType === 'feature' ? 'Đề xuất tính năng mới' : 'Góp ý & Báo lỗi hệ thống');
    const description = content;
    const user_email = req.body.user_email || req.body.senderEmail || 'Khai báo ẩn danh';
    const user_name = req.body.user_name || req.body.senderName || 'Người dùng CRM';
    const screenshot_url = req.body.screenshot_url || req.body.imageUrl || null;
    const page_url = req.body.page_url || '';
    const metadata = {
      sender_role: req.body.senderRole || req.body.user_role || '',
      sender_phone: req.body.senderPhone || req.body.user_phone || '',
      submitted_at: new Date().toISOString(),
      ...(req.body.metadata || {})
    };

    const supabase = getAdminSupabaseClient(req);

    // 1. Try to save to Supabase system_feedback table
    let feedbackRecord = null;
    try {
      const { data, error } = await supabase
        .from('system_feedback')
        .insert({
          type: rawType,
          title,
          description,
          user_email,
          user_name,
          page_url,
          screenshot_url,
          metadata
        })
        .select()
        .single();

      if (error) {
        console.warn('[Feedback API] Warning when saving feedback to database:', error.message);
      } else {
        feedbackRecord = data;
      }
    } catch (err) {
      console.warn('[Feedback API] Database table "system_feedback" might not exist or error:', err);
    }

    // 2. Export / save to Google Drive & Google Sheet if Drive is active
    let driveFileUrl = null;
    let sheetId = null;
    const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('PRIVATE KEY'));
    const hasOAuth = !!(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);

    if (hasServiceAccount || hasOAuth) {
      try {
        const token = await getGoogleDriveAccessToken();
        const feedbackFolderId = await getOrCreateFeedbackFolder(token);

        // 2.1 Ghi dòng mới vào Google Sheet (realtime)
        try {
          const sheetResult = await appendFeedbackToGoogleSheet(
            {
              type: rawType || 'bug',
              title,
              description,
              user_name,
              user_email,
              page_url,
              screenshot_url,
              status: 'new',
              created_at: new Date().toISOString()
            },
            token,
            feedbackFolderId
          );
          sheetId = sheetResult.spreadsheetId;
        } catch (sheetErr) {
          console.warn('[Feedback API] Could not append row to Google Sheet:', sheetErr);
        }

        // 2.2 Lưu trữ bản ghi JSON vào Google Drive
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `Feedback_${rawType || 'bug'}_${timestamp}.json`;
          const content = JSON.stringify({
            type: rawType || 'bug',
            title,
            description,
            user_email,
            user_name,
            page_url,
            screenshot_url,
            metadata,
            created_at: new Date().toISOString()
          }, null, 2);

          const uploadRes = await uploadFileToGoogleDrive(
            filename,
            'application/json',
            Buffer.from(content, 'utf-8'),
            feedbackFolderId,
            token,
            user_email
          );
          driveFileUrl = uploadRes.webViewLink;
        } catch (jsonErr) {
          console.warn('[Feedback API] Could not save feedback JSON to Drive:', jsonErr);
        }
      } catch (driveErr) {
        console.warn('[Feedback API] Could not process Google Drive integration:', driveErr);
      }
    }

    res.json({
      success: true,
      message: 'Cảm ơn bạn! Yêu cầu góp ý/báo lỗi đã được ghi nhận thành công.',
      feedback: feedbackRecord,
      driveUrl: driveFileUrl,
      spreadsheetId: sheetId
    });
  } catch (error: any) {
    console.error('Lỗi API /api/feedback:', error);
    res.status(500).json({ error: error.message || 'Lỗi gửi góp ý' });
  }
});

router.get(['/feedback', '/api/feedback'], async (req, res) => {
  try {
    const supabase = getAdminSupabaseClient(req);
    const { data, error } = await supabase
      .from('system_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ feedback: data || [] });
  } catch (error: any) {
    console.error('Lỗi API GET /api/feedback:', error);
    res.status(500).json({ error: error.message || 'Lỗi lấy danh sách góp ý' });
  }
});

export default router;
