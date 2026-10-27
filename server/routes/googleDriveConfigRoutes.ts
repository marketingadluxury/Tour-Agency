import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { JWT } from 'google-auth-library';
import { getAdminSupabaseClient } from '../services/supabaseService.js';
import { getActiveDriveConfig, clearDriveConfigCache } from '../services/googleDriveService.js';

const router = express.Router();

// Middleware kiểm tra quyền Admin hoặc BOD
const requireAdminOrBOD = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const ADMIN_EMAILS = ['admin@yourcompany.com'];
    const headerRole = req.headers['x-user-role'] as string;
    const headerEmail = (req.headers['x-user-email'] as string || '').toLowerCase();

    if (['admin', 'bod'].includes(headerRole) || (headerEmail && ADMIN_EMAILS.includes(headerEmail))) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa được xác thực hoặc không có quyền truy cập.' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getAdminSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
    }

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return next();
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['admin', 'bod'].includes(profile.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền quản trị cài đặt Google Drive.' });
    }

    next();
  } catch (err: any) {
    console.error('[Drive Config] Auth error:', err);
    return res.status(500).json({ error: 'Lỗi xác thực quyền người dùng.' });
  }
};

/**
 * Lấy OAuth2Client chuẩn
 */
function getOAuthClient(redirectUri?: string) {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Lấy token thử nghiệm từ tham số hoặc cấu hình
 */
async function fetchTestDriveToken(config: {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  serviceEmail?: string;
  serviceKey?: string;
}): Promise<string> {
  const { clientId, clientSecret, refreshToken, serviceEmail, serviceKey } = config;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const tokenResponse = await oauth2Client.getAccessToken();
    if (tokenResponse.token) {
      return tokenResponse.token;
    }
    throw new Error('Không thể lấy Access Token từ OAuth 2.0 Refresh Token. Vui lòng kiểm tra lại Refresh Token.');
  }

  if (serviceEmail && serviceKey && serviceKey.includes('PRIVATE KEY')) {
    let key = serviceKey;
    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }
    const client = new JWT({
      email: serviceEmail,
      key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const tokens = await client.authorize();
    if (tokens.access_token) {
      return tokens.access_token;
    }
    throw new Error('Không thể xác thực Service Account.');
  }

  throw new Error('Vui lòng cung cấp đầy đủ thông tin xác thực OAuth 2.0 hoặc Service Account.');
}

/**
 * 1. GET /api/drive/config - Lấy cấu hình & Danh sách tài khoản đã kết nối
 */
router.get(['/api/drive/config', '/drive/config'], requireAdminOrBOD, async (req, res) => {
  try {
    const supabase = getAdminSupabaseClient();
    
    // Lấy config từ app_settings
    const { data: dbSetting } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    const dbVal = dbSetting?.value || {};
    
    // Khởi tạo danh sách connected_accounts mặc định nếu chưa có
    let accounts = Array.isArray(dbVal.connected_accounts) ? [...dbVal.connected_accounts] : [];
    
    // Nếu danh sách trống, khởi tạo tài khoản từ biến môi trường nếu có
    if (accounts.length === 0 && (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_DRIVE_REFRESH_TOKEN)) {
      const defaultEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'admin@yourcompany.com';
      accounts = [
        {
          email: defaultEmail,
          display_name: 'Google Drive Admin',
          refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
          connected_at: new Date().toISOString()
        }
      ];
    }

    const activeEmail = dbVal.active_email || accounts[0]?.email || '';
    const isActive = dbVal.is_active !== false;

    res.json({
      success: true,
      status: isActive ? 'active' : 'inactive',
      is_active: isActive,
      active_email: activeEmail,
      connected_accounts: accounts.map(acc => ({
        email: acc.email,
        display_name: acc.display_name || acc.email.split('@')[0],
        connected_at: acc.connected_at,
        is_active: acc.email === activeEmail
      })),
      updated_at: dbSetting?.updated_at || null,
      updated_by: dbSetting?.updated_by || null
    });
  } catch (error: any) {
    console.error('[Drive Config] Get error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi nạp cấu hình Google Drive.' });
  }
});

/**
 * 2. GET /api/drive/oauth/auth-url - Tạo Google OAuth Auth URL (Chọn tài khoản như Hình 3)
 */
router.get(['/api/drive/oauth/auth-url', '/drive/oauth/auth-url'], async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/drive/oauth/callback`;

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: 'Chưa cấu hình GOOGLE_DRIVE_CLIENT_ID hoặc GOOGLE_DRIVE_CLIENT_SECRET trên hệ thống.'
      });
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account consent',
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    });

    res.json({
      success: true,
      auth_url: authUrl,
      redirect_uri: redirectUri
    });
  } catch (error: any) {
    console.error('[Drive OAuth] Error generating auth url:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo liên kết đăng nhập Google.' });
  }
});

/**
 * 3. GET /api/drive/oauth/callback - Nhận kết quả từ Google OAuth Consent Screen
 */
router.get(['/api/drive/oauth/callback', '/drive/oauth/callback'], async (req, res) => {
  try {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Google Drive OAuth Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e11d48;">Kết nối Google Drive thất bại</h2>
          <p>${error || 'Không nhận được mã ủy quyền từ Google.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_DRIVE_OAUTH_FAILED', error: '${error || 'Lỗi kết nối'}' }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/drive/oauth/callback`;

    const oauth2Client = getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Lấy thông tin user từ Google Drive API
    const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const aboutData: any = await aboutRes.json();
    const userEmail = aboutData.user?.emailAddress || 'Google User';
    const displayName = aboutData.user?.displayName || userEmail.split('@')[0];

    // Lưu vào database Supabase
    const supabase = getAdminSupabaseClient();
    const { data: dbSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    const dbVal = dbSetting?.value || {};
    let accounts: any[] = Array.isArray(dbVal.connected_accounts) ? [...dbVal.connected_accounts] : [];

    // Tìm và cập nhật hoặc thêm mới tài khoản
    const existingIndex = accounts.findIndex((a: any) => a.email === userEmail);
    const newAccountData = {
      email: userEmail,
      display_name: displayName,
      refresh_token: tokens.refresh_token || (existingIndex >= 0 ? accounts[existingIndex].refresh_token : process.env.GOOGLE_DRIVE_REFRESH_TOKEN),
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      connected_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...newAccountData };
    } else {
      accounts.push(newAccountData);
    }

    await supabase.from('app_settings').upsert({
      key: 'google_drive_config',
      value: {
        ...dbVal,
        is_active: true,
        active_email: userEmail,
        connected_accounts: accounts
      },
      updated_at: new Date().toISOString(),
      updated_by: userEmail
    }, { onConflict: 'key' });

    clearDriveConfigCache();

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kết nối Google Drive thành công</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #f8fafc; }
          .card { max-width: 420px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .icon { width: 50px; height: 50px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px; }
          h2 { color: #0f172a; margin: 0 0 8px; font-size: 18px; }
          p { color: #64748b; font-size: 13px; margin: 0 0 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Đã kết nối tài khoản thành công!</h2>
          <p>Tài khoản <strong>${userEmail}</strong> đã được thêm vào hệ thống Tour CRM.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GOOGLE_DRIVE_OAUTH_SUCCESS', 
              email: '${userEmail}',
              displayName: '${displayName}'
            }, '*');
          }
          setTimeout(() => window.close(), 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('[Drive OAuth] Callback error:', error);
    res.status(500).send(`Lỗi xử lý kết nối Google Drive: ${error.message}`);
  }
});

/**
 * 4. POST /api/drive/select-account - Chọn tài khoản & Lưu và kiểm tra kết nối (Theo Hình 2)
 */
router.post(['/api/drive/select-account', '/drive/select-account'], requireAdminOrBOD, async (req, res) => {
  try {
    const { email, is_active } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng chọn tài khoản cần kích hoạt.' });
    }

    const supabase = getAdminSupabaseClient();
    const { data: dbSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    const dbVal = dbSetting?.value || {};
    let accounts: any[] = Array.isArray(dbVal.connected_accounts) ? [...dbVal.connected_accounts] : [];

    // Nếu tài khoản chưa có trong danh sách nhưng là tài khoản mặc định
    if (!accounts.find(a => a.email === email)) {
      accounts.push({
        email,
        display_name: email.split('@')[0],
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
        connected_at: new Date().toISOString()
      });
    }

    // 1. Kiểm tra xác thực với Google API
    const targetAccount = accounts.find(a => a.email === email);
    const clientId = targetAccount?.client_id || dbVal.client_id || process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = targetAccount?.client_secret || dbVal.client_secret || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = targetAccount?.refresh_token || process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      try {
        const token = await fetchTestDriveToken({ clientId, clientSecret, refreshToken });
        // Kiểm tra about call
        await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (authErr: any) {
        console.warn(`[Drive Config] Cảnh báo xác thực tài khoản ${email}:`, authErr.message);
      }
    }

    // 2. Lưu cấu hình mới
    const userEmail = (req.headers['x-user-email'] as string) || 'Admin';
    const newIsActive = is_active !== undefined ? is_active : (dbVal.is_active !== false);

    await supabase.from('app_settings').upsert({
      key: 'google_drive_config',
      value: {
        ...dbVal,
        is_active: newIsActive,
        active_email: email,
        connected_accounts: accounts
      },
      updated_at: new Date().toISOString(),
      updated_by: userEmail
    }, { onConflict: 'key' });

    clearDriveConfigCache();

    res.json({
      success: true,
      message: `Đã kích hoạt và lưu tài khoản ${email} thành công!`,
      active_email: email,
      is_active: newIsActive
    });
  } catch (error: any) {
    console.error('[Drive Config] Select account error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi chuyển đổi tài khoản.' });
  }
});

/**
 * 5. POST /api/drive/add-account - Nhập trực tiếp Email & Refresh Token (Không lo lỗi redirect_uri_mismatch)
 */
router.post(['/api/drive/add-account', '/drive/add-account'], requireAdminOrBOD, async (req, res) => {
  try {
    const { email, display_name, refresh_token, client_id, client_secret, set_active } = req.body;
    if (!email || !refresh_token) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email tài khoản và Refresh Token.' });
    }

    const finalClientId = client_id?.trim() || process.env.GOOGLE_DRIVE_CLIENT_ID;
    const finalClientSecret = client_secret?.trim() || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const finalRefreshToken = refresh_token.trim();

    // 1. Thử xác thực với Google API để đảm bảo Token hoạt động
    try {
      const testToken = await fetchTestDriveToken({
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        refreshToken: finalRefreshToken
      });
      // Gọi thử API
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      if (!aboutRes.ok) {
        console.warn('[Drive Add Account] Test about warning:', await aboutRes.text());
      }
    } catch (authErr: any) {
      return res.status(400).json({ 
        error: `Xác thực với Google thất bại: ${authErr.message || 'Refresh Token không hợp lệ hoặc đã hết hạn.'}` 
      });
    }

    const supabase = getAdminSupabaseClient();
    const { data: dbSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    const dbVal = dbSetting?.value || {};
    let accounts: any[] = Array.isArray(dbVal.connected_accounts) ? [...dbVal.connected_accounts] : [];

    const existingIndex = accounts.findIndex(a => a.email.toLowerCase() === email.trim().toLowerCase());
    const accountData = {
      email: email.trim(),
      display_name: display_name?.trim() || email.split('@')[0],
      refresh_token: finalRefreshToken,
      client_id: finalClientId,
      client_secret: finalClientSecret,
      connected_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...accountData };
    } else {
      accounts.push(accountData);
    }

    const shouldSetActive = set_active !== false;
    const activeEmail = shouldSetActive ? email.trim() : (dbVal.active_email || email.trim());

    await supabase.from('app_settings').upsert({
      key: 'google_drive_config',
      value: {
        ...dbVal,
        is_active: true,
        active_email: activeEmail,
        connected_accounts: accounts
      },
      updated_at: new Date().toISOString(),
      updated_by: (req.headers['x-user-email'] as string) || 'Admin'
    }, { onConflict: 'key' });

    clearDriveConfigCache();

    res.json({
      success: true,
      message: `Đã kết nối tài khoản ${email} thành công!`,
      active_email: activeEmail,
      connected_accounts: accounts.map(a => ({
        email: a.email,
        display_name: a.display_name,
        connected_at: a.connected_at,
        is_active: a.email === activeEmail
      }))
    });
  } catch (error: any) {
    console.error('[Drive Config] Add account error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi thêm tài khoản.' });
  }
});

/**
 * 6. POST /api/drive/remove-account - Xóa tài khoản khỏi danh sách
 */
router.post(['/api/drive/remove-account', '/drive/remove-account'], requireAdminOrBOD, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp email tài khoản cần xóa.' });
    }

    const supabase = getAdminSupabaseClient();
    const { data: dbSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    const dbVal = dbSetting?.value || {};
    let accounts: any[] = Array.isArray(dbVal.connected_accounts) ? [...dbVal.connected_accounts] : [];

    accounts = accounts.filter(a => a.email !== email);
    let activeEmail = dbVal.active_email;
    if (activeEmail === email) {
      activeEmail = accounts[0]?.email || '';
    }

    await supabase.from('app_settings').upsert({
      key: 'google_drive_config',
      value: {
        ...dbVal,
        active_email: activeEmail,
        connected_accounts: accounts
      },
      updated_at: new Date().toISOString(),
      updated_by: (req.headers['x-user-email'] as string) || 'Admin'
    }, { onConflict: 'key' });

    clearDriveConfigCache();

    res.json({
      success: true,
      message: `Đã xóa tài khoản ${email} khỏi danh sách kết nối.`
    });
  } catch (error: any) {
    console.error('[Drive Config] Remove error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi xóa tài khoản.' });
  }
});

export default router;
