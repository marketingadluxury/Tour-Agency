import { JWT, OAuth2Client } from 'google-auth-library';
import { uploadFileToSupabase, getAdminSupabaseClient } from './supabaseService.js';
import express from 'express';

export interface GoogleDriveConfig {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  parent_folder_id?: string;
  service_account_email?: string;
  service_account_private_key?: string;
  account_email?: string;
  is_active?: boolean;
  source?: 'database' | 'env';
}

let cachedDriveConfig: GoogleDriveConfig | null = null;
let lastConfigFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30s cache

export function clearDriveConfigCache() {
  cachedDriveConfig = null;
  lastConfigFetchTime = 0;
}

/**
 * Lấy cấu hình Google Drive kích hoạt (ưu tiên từ Supabase app_settings, sau đó fallback về process.env)
 */
export async function getActiveDriveConfig(): Promise<GoogleDriveConfig> {
  const now = Date.now();
  if (cachedDriveConfig && now - lastConfigFetchTime < CACHE_TTL_MS) {
    return cachedDriveConfig;
  }

  try {
    const supabase = getAdminSupabaseClient();
    const { data: settingData, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive_config')
      .maybeSingle();

    if (!error && settingData && settingData.value && settingData.value.is_active !== false) {
      const dbVal = settingData.value;
      
      // 1. Kiểm tra nếu có danh sách connected_accounts
      if (Array.isArray(dbVal.connected_accounts) && dbVal.connected_accounts.length > 0) {
        const activeEmail = dbVal.active_email;
        const targetAcc = (activeEmail ? dbVal.connected_accounts.find((a: any) => a.email === activeEmail) : null) 
                          || dbVal.connected_accounts[0];

        if (targetAcc && targetAcc.refresh_token) {
          cachedDriveConfig = {
            client_id: targetAcc.client_id || dbVal.client_id || process.env.GOOGLE_DRIVE_CLIENT_ID,
            client_secret: targetAcc.client_secret || dbVal.client_secret || process.env.GOOGLE_DRIVE_CLIENT_SECRET,
            refresh_token: targetAcc.refresh_token,
            parent_folder_id: dbVal.parent_folder_id || process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
            account_email: targetAcc.email,
            is_active: dbVal.is_active !== false,
            source: 'database'
          };
          lastConfigFetchTime = now;
          return cachedDriveConfig;
        }
      }

      // 2. Cấu hình đơn lẻ cũ
      const hasDbOAuth = !!(dbVal.client_id && dbVal.client_secret && dbVal.refresh_token);
      const hasDbService = !!(dbVal.service_account_email && dbVal.service_account_private_key);

      if (hasDbOAuth || hasDbService) {
        cachedDriveConfig = {
          client_id: dbVal.client_id || process.env.GOOGLE_DRIVE_CLIENT_ID,
          client_secret: dbVal.client_secret || process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          refresh_token: dbVal.refresh_token,
          parent_folder_id: dbVal.parent_folder_id,
          service_account_email: dbVal.service_account_email,
          service_account_private_key: dbVal.service_account_private_key,
          account_email: dbVal.account_email || dbVal.active_email,
          is_active: true,
          source: 'database'
        };
        lastConfigFetchTime = now;
        return cachedDriveConfig;
      }
    }
  } catch (err) {
    console.warn('[Drive Service] Lỗi khi nạp cấu hình từ database app_settings, sử dụng .env:', err);
  }

  // Fallback về process.env
  cachedDriveConfig = {
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    parent_folder_id: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 
                      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 
                      process.env.GOOGLE_DRIVE_FOLDER_ID ||
                      process.env.DRIVE_PARENT_FOLDER_ID ||
                      process.env.DRIVE_ROOT_ID,
    service_account_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    service_account_private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    account_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'admin@yourcompany.com',
    is_active: true,
    source: 'env'
  };
  lastConfigFetchTime = now;
  return cachedDriveConfig;
}

export async function getGoogleDriveAccessToken(): Promise<string> {
  const config = await getActiveDriveConfig();

  const serviceEmail = config.service_account_email;
  let serviceKey = config.service_account_private_key;
  const clientId = config.client_id;
  const clientSecret = config.client_secret;
  const refreshToken = config.refresh_token;

  const hasOAuth = !!(clientId && clientSecret && refreshToken);
  const hasServiceAccount = !!(serviceEmail && serviceKey && serviceKey.includes('PRIVATE KEY'));

  // 1. OAuth 2.0
  if (hasOAuth) {
    try {
      console.log(`[Drive] Authorizing using OAuth 2.0 Refresh Token (Source: ${config.source})...`);
      const oauth2Client = new OAuth2Client(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const tokenResponse = await oauth2Client.getAccessToken();
      if (tokenResponse.token) {
        console.log('[Drive] OAuth 2.0 authorization successful.');
        return tokenResponse.token;
      }
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error('[Drive] OAuth 2.0 authorization failed:', errMsg);
      if (hasServiceAccount) {
        console.log('[Drive] OAuth 2.0 failed, falling back to Service Account...');
      } else {
        throw new Error(`Xác thực OAuth 2.0 thất bại (${errMsg}). Vui lòng kiểm tra lại Refresh Token trong phần Cài đặt Google Drive.`);
      }
    }
  }

  // 2. Service Account
  if (hasServiceAccount) {
    try {
      console.log(`[Drive] Authorizing using Service Account (Source: ${config.source})...`);
      if (serviceKey && serviceKey.includes('\\n')) {
        serviceKey = serviceKey.replace(/\\n/g, '\n');
      }
      const client = new JWT({
        email: serviceEmail,
        key: serviceKey,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
      const tokens = await client.authorize();
      if (tokens.access_token) {
        return tokens.access_token;
      }
    } catch (sErr: any) {
      console.error('[Drive] Service Account auth failed:', sErr.message || sErr);
      throw new Error(`Service Account auth failed: ${sErr.message || sErr}`);
    }
  }

  throw new Error('Chưa cấu hình Google Drive credentials (vui lòng cấu hình tài khoản Google Drive trong phần Cài đặt hệ thống hoặc file .env).');
}

export async function searchFolder(folderName: string, parentId?: string, token?: string): Promise<string | null> {
  const safeName = folderName.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,capabilities/canAddChildren,capabilities/canEdit)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Drive] Search folder failed:', errText);
    return null;
  }
  
  const data: any = await res.json();
  if (data.files && data.files.length > 0) {
    // Chỉ chọn thư mục mà tài khoản hiện tại có quyền tạo file con (canAddChildren !== false)
    const writableFolder = data.files.find((f: any) => f.capabilities?.canAddChildren !== false);
    if (writableFolder) {
      return writableFolder.id;
    }
    console.warn(`[Drive] Tìm thấy thư mục '${folderName}' (${data.files.length} kết quả) nhưng người dùng không có quyền ghi/thêm file (read-only). Bỏ qua để tạo mới.`);
  }
  return null;
}

export async function createFolder(folderName: string, parentId?: string, token?: string): Promise<string> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Drive] Create folder failed: ${errText}`);
  }
  
  const data: any = await res.json();
  return data.id;
}

export async function makeFolderPublic(fileId: string, token?: string, userEmail?: string | string[]): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`;
  
  const targets: Array<{ type: string; role: string; emailAddress?: string }> = [
    { type: 'anyone', role: 'reader' }
  ];

  if (userEmail) {
    const emails = Array.isArray(userEmail) ? userEmail : [userEmail];
    emails.forEach(email => {
      if (email && email.trim() && email.includes('@')) {
        const cleanEmail = email.trim().toLowerCase();
        if (!targets.some(t => t.emailAddress === cleanEmail)) {
          targets.push({ type: 'user', emailAddress: cleanEmail, role: 'reader' });
        }
      }
    });
  }

  await Promise.all(targets.map(async (target) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(target)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Drive] Failed to share with ${target.emailAddress || target.type}:`, errText);
      }
    } catch (err) {
      console.error(`[Drive] Error sharing with ${target.emailAddress || target.type}:`, err);
    }
  }));
}

export async function getFolderWebViewLink(fileId: string, token?: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Drive] Failed to get webViewLink: ${errText}`);
  }
  
  const data: any = await res.json();
  return data.webViewLink;
}

export function getDriveRootParentId(): string | undefined {
  if (cachedDriveConfig && cachedDriveConfig.parent_folder_id !== undefined) {
    return cachedDriveConfig.parent_folder_id || undefined;
  }
  return process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 
         process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 
         process.env.GOOGLE_DRIVE_FOLDER_ID ||
         process.env.DRIVE_PARENT_FOLDER_ID ||
         process.env.DRIVE_ROOT_ID;
}

export async function getOrCreateTourCRMRootFolder(baseParentId: string | undefined, token: string): Promise<string> {
  // 1. Nếu có chỉ định thư mục cha baseParentId (GOOGLE_DRIVE_PARENT_FOLDER_ID)
  if (baseParentId) {
    try {
      const parentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${baseParentId}?fields=id,name,capabilities/canAddChildren,trashed&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (parentRes.ok) {
        const parentData: any = await parentRes.json();
        if (!parentData.trashed && parentData.capabilities?.canAddChildren !== false) {
          // Nếu chính thư mục được cấu hình đã tên là "Tour CRM"
          if (parentData.name === 'Tour CRM') {
            return parentData.id;
          }

          // Tìm thư mục con "Tour CRM" CHỈ nằm trong baseParentId
          let rootId = await searchFolder('Tour CRM', baseParentId, token);
          if (!rootId) {
            console.log(`[Drive] Tạo mới thư mục 'Tour CRM' bên trong thư mục gốc ${baseParentId}...`);
            rootId = await createFolder('Tour CRM', baseParentId, token);
            await makeFolderPublic(rootId, token);
          }
          return rootId;
        } else {
          console.warn(`[Drive] Thư mục cha baseParentId (${baseParentId}) bị xóa hoặc không có quyền ghi.`);
        }
      } else {
        console.warn(`[Drive] Không thể truy vấn baseParentId (${baseParentId}): status ${parentRes.status}`);
      }
    } catch (parentCheckErr) {
      console.warn('[Drive] Lỗi kiểm tra baseParentId:', parentCheckErr);
    }
  }

  // 2. Không có baseParentId hoặc baseParentId không thể ghi: tìm trên phạm vi cá nhân
  let rootId = await searchFolder('Tour CRM', undefined, token);
  if (!rootId) {
    rootId = await createFolder('Tour CRM', undefined, token);
    await makeFolderPublic(rootId, token);
  }
  return rootId;
}

export async function getOrCreatePassengerFolder(fullName: string, passportNumber: string, token: string): Promise<string> {
  const cleanPassport = (passportNumber || 'CHUA_CO_HC').trim().toUpperCase();
  const getInitials = (name: string) => {
    if (!name) return 'KH';
    const words = name.trim().split(/\s+/);
    return words.map(w => w.charAt(0).toUpperCase()).join('');
  };
  const initials = getInitials(fullName);
  const folderName = `${cleanPassport}-${initials}`;
  const baseParentId = getDriveRootParentId();

  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);

  let khachHangFolderId = await searchFolder('Khách hàng', rootId, token);
  if (!khachHangFolderId) {
    khachHangFolderId = await createFolder('Khách hàng', rootId, token);
    await makeFolderPublic(khachHangFolderId, token);
  }

  let passengerFolderId = await searchFolder(folderName, khachHangFolderId, token);
  if (!passengerFolderId) {
    passengerFolderId = await createFolder(folderName, khachHangFolderId, token);
    await makeFolderPublic(passengerFolderId, token);
  }

  return passengerFolderId;
}

export async function getOrCreateTourFolder(category: string, token: string): Promise<string> {
  const cleanCategory = (category || 'Chung').trim();
  const baseParentId = getDriveRootParentId();

  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);

  let tourFolderId = await searchFolder('Tour', rootId, token);
  if (!tourFolderId) {
    tourFolderId = await createFolder('Tour', rootId, token);
    await makeFolderPublic(tourFolderId, token);
  }

  let categoryFolderId = await searchFolder(cleanCategory, tourFolderId, token);
  if (!categoryFolderId) {
    categoryFolderId = await createFolder(cleanCategory, tourFolderId, token);
    await makeFolderPublic(categoryFolderId, token);
  }

  return categoryFolderId;
}

export async function getOrCreateVisaFolder(token: string): Promise<string> {
  const baseParentId = getDriveRootParentId();

  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);

  let visaFolderId = await searchFolder('Visa', rootId, token);
  if (!visaFolderId) {
    visaFolderId = await createFolder('Visa', rootId, token);
    await makeFolderPublic(visaFolderId, token);
  }

  return visaFolderId;
}

export async function getOrCreateVisaServiceFolder(visaCode: string, visaFolderId: string, token: string): Promise<string> {
  const cleanVisaCode = (visaCode || 'Dich_vu_Visa').trim().replace(/[\/\\\:\*\?\"\<\>\|]/g, '_');
  let serviceFolderId = await searchFolder(cleanVisaCode, visaFolderId, token);
  if (!serviceFolderId) {
    serviceFolderId = await createFolder(cleanVisaCode, visaFolderId, token);
    await makeFolderPublic(serviceFolderId, token);
  }
  return serviceFolderId;
}

export async function getOrCreateTourFolderV2(tourCode: string, token: string): Promise<string> {
  const cleanTourCode = (tourCode || 'TOUR_CHUNG').trim().replace(/[\/\\\:\*\?\"\<\>\|]/g, '_');
  const baseParentId = getDriveRootParentId();

  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);

  let tourFolderId = await searchFolder('Tour', rootId, token);
  if (!tourFolderId) {
    tourFolderId = await createFolder('Tour', rootId, token);
    await makeFolderPublic(tourFolderId, token);
  }

  let targetTourFolderId = await searchFolder(cleanTourCode, tourFolderId, token);
  if (!targetTourFolderId) {
    targetTourFolderId = await createFolder(cleanTourCode, tourFolderId, token);
    await makeFolderPublic(targetTourFolderId, token);
  }

  return targetTourFolderId;
}

export async function getOrCreateTourSubFolderV2(tourCode: string, subFolder: 'Đơn hàng' | 'Chi phí' | 'Anh_Doan' | 'Ảnh đoàn' | string, token: string): Promise<string> {
  const tourFolderId = await getOrCreateTourFolderV2(tourCode, token);

  let subFolderId = await searchFolder(subFolder, tourFolderId, token);
  if (!subFolderId && (subFolder === 'Ảnh đoàn' || subFolder === 'Anh_Doan')) {
    subFolderId = await searchFolder(subFolder === 'Ảnh đoàn' ? 'Anh_Doan' : 'Ảnh đoàn', tourFolderId, token);
  }
  if (!subFolderId) {
    subFolderId = await createFolder(subFolder, tourFolderId, token);
    await makeFolderPublic(subFolderId, token);
  }

  return subFolderId;
}

export async function searchFolderContaining(keyword: string, parentId?: string, token?: string): Promise<{ id: string; name: string } | null> {
  const safeKeyword = keyword.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name contains '${safeKeyword}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,capabilities/canAddChildren,capabilities/canEdit)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Drive] Search folder containing failed:', errText);
    return null;
  }
  
  const data: any = await res.json();
  if (data.files && data.files.length > 0) {
    const writableFolder = data.files.find((f: any) => f.capabilities?.canAddChildren !== false);
    if (writableFolder) {
      return { id: writableFolder.id, name: writableFolder.name };
    }
  }
  return null;
}

export async function getOrCreateOrderFolderV2(tourCode: string, orderCode: string, token: string): Promise<string> {
  const donHangFolderId = await getOrCreateTourSubFolderV2(tourCode, 'Đơn hàng', token);
  const cleanOrderCode = formatOrderCode(orderCode).replace(/[\/\\\:\*\?\"\<\>\|]/g, '_');

  // 1. Tìm chính xác theo cleanOrderCode (ví dụ: "31F7EDA9")
  let orderFolderId = await searchFolder(cleanOrderCode, donHangFolderId, token);
  if (orderFolderId) {
    console.log(`[Drive Order Folder] Đã tìm thấy thư mục chính xác: ${cleanOrderCode} (${orderFolderId})`);
    return orderFolderId;
  }

  // 2. Tìm chính xác theo "DH-[cleanOrderCode]" hoặc "BK-[cleanOrderCode]"
  orderFolderId = await searchFolder(`DH-${cleanOrderCode}`, donHangFolderId, token);
  if (orderFolderId) {
    console.log(`[Drive Order Folder] Đã tìm thấy thư mục tiền tố DH-: DH-${cleanOrderCode} (${orderFolderId})`);
    return orderFolderId;
  }

  orderFolderId = await searchFolder(`BK-${cleanOrderCode}`, donHangFolderId, token);
  if (orderFolderId) {
    console.log(`[Drive Order Folder] Đã tìm thấy thư mục tiền tố BK-: BK-${cleanOrderCode} (${orderFolderId})`);
    return orderFolderId;
  }

  // 3. Tìm thư mục có chứa mã cleanOrderCode trong thư mục "Đơn hàng" (ví dụ: "31F7EDA9 - Nguyễn Văn A")
  const partialMatchInDonHang = await searchFolderContaining(cleanOrderCode, donHangFolderId, token);
  if (partialMatchInDonHang) {
    console.log(`[Drive Order Folder] Đã tìm thấy thư mục khớp tiền tố/tên trong Đơn hàng: ${partialMatchInDonHang.name} (${partialMatchInDonHang.id})`);
    return partialMatchInDonHang.id;
  }

  // 4. Tìm thư mục có chứa mã cleanOrderCode trực tiếp trong thư mục Tour
  const tourFolderId = await getOrCreateTourFolderV2(tourCode, token);
  const partialMatchInTour = await searchFolderContaining(cleanOrderCode, tourFolderId, token);
  if (partialMatchInTour) {
    console.log(`[Drive Order Folder] Đã tìm thấy thư mục khớp trong Tour: ${partialMatchInTour.name} (${partialMatchInTour.id})`);
    return partialMatchInTour.id;
  }

  // 5. Nếu chưa có, tạo mới thư mục với tên chuẩn cleanOrderCode trong thư mục "Đơn hàng"
  console.log(`[Drive Order Folder] Chưa có thư mục cho đơn ${cleanOrderCode}, tạo mới trong Đơn hàng...`);
  orderFolderId = await createFolder(cleanOrderCode, donHangFolderId, token);
  await makeFolderPublic(orderFolderId, token);

  return orderFolderId;
}

export async function getOrCreateAccountingExpenseFolder(mmyyyyStr: string, token: string): Promise<string> {
  const baseParentId = getDriveRootParentId();

  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);

  let keToanFolderId = await searchFolder('Kế toán', rootId, token);
  if (!keToanFolderId) {
    keToanFolderId = await createFolder('Kế toán', rootId, token);
    await makeFolderPublic(keToanFolderId, token);
  }

  const monthFolderName = `Tháng ${mmyyyyStr}`;
  let monthFolderId = await searchFolder(monthFolderName, keToanFolderId, token);
  if (!monthFolderId) {
    monthFolderId = await createFolder(monthFolderName, keToanFolderId, token);
    await makeFolderPublic(monthFolderId, token);
  }

  let chiPhiFolderId = await searchFolder('Chi phí', monthFolderId, token);
  if (!chiPhiFolderId) {
    chiPhiFolderId = await createFolder('Chi phí', monthFolderId, token);
    await makeFolderPublic(chiPhiFolderId, token);
  }

  return chiPhiFolderId;
}

export async function getOrCreateFeedbackFolder(token: string): Promise<string> {
  const baseParentId = getDriveRootParentId();
  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);
  let feedbackFolderId = await searchFolder('Góp Ý & Báo Lỗi', rootId, token);
  if (!feedbackFolderId) {
    feedbackFolderId = await createFolder('Góp Ý & Báo Lỗi', rootId, token);
    await makeFolderPublic(feedbackFolderId, token);
  }
  return feedbackFolderId;
}

export async function getOrCreateChatFolder(token: string): Promise<string> {
  const baseParentId = getDriveRootParentId();
  const rootId = await getOrCreateTourCRMRootFolder(baseParentId, token);
  let chatFolderId = await searchFolder('Trò chuyện', rootId, token);
  if (!chatFolderId) {
    chatFolderId = await createFolder('Trò chuyện', rootId, token);
    await makeFolderPublic(chatFolderId, token);
  }
  return chatFolderId;
}

export async function uploadFileToGoogleDrive(
  fileName: string, 
  mimeType: string, 
  buffer: Buffer, 
  parentId: string, 
  token: string,
  userEmail?: string
): Promise<{ id: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [parentId]
  };

  const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  
  const head = Buffer.from(`${delimiter}${metadataPart}${delimiter}Content-Type: ${mimeType}\r\n\r\n`);
  const tail = Buffer.from(closeDelimiter);

  const bodyBuffer = Buffer.concat([head, buffer, tail]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Drive] File upload failed: ${errText}`);
  }

  const data: any = await res.json();
  await makeFolderPublic(data.id, token, userEmail);
  
  return {
    id: data.id,
    webViewLink: data.webViewLink
  };
}

export function getGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/open\?id=([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

export async function deleteGoogleDriveFile(fileId: string, token: string): Promise<void> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 404) {
        console.log(`[Drive] File ${fileId} không tồn tại hoặc đã bị xóa.`);
        return;
      }
      console.warn(`[Drive] Không thể xóa file vật lý ${fileId}:`, errText);
    } else {
      console.log(`[Drive] Đã xóa thành công file ${fileId}.`);
    }
  } catch (error: any) {
    console.warn(`[Drive] Lỗi khi gọi API xóa file ${fileId}:`, error.message || error);
  }
}

export function decodeUTF8(str: string | undefined): string {
  if (!str) return '';
  try {
    const decoded = Buffer.from(str, 'latin1').toString('utf8');
    if (!decoded.includes('\uFFFD') && decoded !== str) {
      return decoded;
    }
  } catch (e) {
    // fallback
  }
  return str;
}

export function formatOrderCode(orderIdOrCode: string | undefined): string {
  if (!orderIdOrCode) return 'DON_HANG';
  let str = orderIdOrCode.trim();
  if (str.toUpperCase().startsWith('BK-')) {
    str = str.substring(3);
  }
  if (str.length > 8 && !str.toUpperCase().startsWith('TOUR') && !str.toUpperCase().startsWith('CHIPHI')) {
    str = str.substring(0, 8);
  }
  return str.toUpperCase();
}

export async function getTourCodeFromOrderOrTour(
  orderCode: string, 
  bodyTourCode: string | undefined, 
  supabase: any
): Promise<{ tourCode: string; isTourCodeDirectly: boolean; orderId?: string }> {
  const cleanTourCodeParam = (bodyTourCode || '').trim();
  const cleanOrderCodeParam = (orderCode || '').trim();

  const invalidPlaceholders = ['CHUA_RO', 'CHIPHI_TOUR', 'TOUR_CHUNG', 'TOUR', 'DON_HANG', 'CHIPHI'];
  
  if (cleanTourCodeParam && !invalidPlaceholders.includes(cleanTourCodeParam.toUpperCase())) {
    const isGenericOrderCode = !cleanOrderCodeParam || invalidPlaceholders.includes(cleanOrderCodeParam.toUpperCase()) || cleanOrderCodeParam.toUpperCase() === cleanTourCodeParam.toUpperCase();
    return {
      tourCode: cleanTourCodeParam.toUpperCase(),
      isTourCodeDirectly: isGenericOrderCode,
      orderId: isGenericOrderCode ? undefined : formatOrderCode(cleanOrderCodeParam)
    };
  }

  const cleanCode = cleanOrderCodeParam;
  if (!cleanCode || invalidPlaceholders.includes(cleanCode.toUpperCase())) {
    return { tourCode: 'TOUR_CHUNG', isTourCodeDirectly: true };
  }

  try {
    const { data: tourByCode } = await supabase
      .from('tours')
      .select('code')
      .eq('code', cleanCode)
      .maybeSingle();

    if (tourByCode && tourByCode.code) {
      return { tourCode: tourByCode.code, isTourCodeDirectly: true };
    }

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('id, tour_id')
      .eq('id', cleanCode)
      .maybeSingle();

    let targetBooking = bookingData;

    if (!targetBooking) {
      const { data: bookingsLike } = await supabase
        .from('bookings')
        .select('id, tour_id')
        .ilike('id', `${cleanCode}%`)
        .limit(1);

      if (bookingsLike && bookingsLike.length > 0) {
        targetBooking = bookingsLike[0];
      }
    }

    if (targetBooking && targetBooking.tour_id) {
      const { data: tourData } = await supabase
        .from('tours')
        .select('code')
        .eq('id', targetBooking.tour_id)
        .maybeSingle();

      if (tourData && tourData.code) {
        return { tourCode: tourData.code, isTourCodeDirectly: false, orderId: formatOrderCode(targetBooking.id) };
      }
    }

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, order_id, description')
      .or(`id.eq.${cleanCode},invoice_code.eq.${cleanCode}`)
      .maybeSingle();

    if (invoiceData) {
      if (invoiceData.order_id) {
        const { data: invBooking } = await supabase
          .from('bookings')
          .select('id, tour_id')
          .eq('id', invoiceData.order_id)
          .maybeSingle();

        if (invBooking && invBooking.tour_id) {
          const { data: tourData } = await supabase
            .from('tours')
            .select('code')
            .eq('id', invBooking.tour_id)
            .maybeSingle();

          if (tourData && tourData.code) {
            return { tourCode: tourData.code, isTourCodeDirectly: false, orderId: formatOrderCode(invBooking.id) };
          }
        }
      }

      const desc = invoiceData.description || '';
      const match = desc.match(/Tour:\s*"([^"]+)"/i) || desc.match(/\[Tour:\s*"([^"]+)"\]/i) || desc.match(/Tour:\s*([A-Z0-9_-]+)/i);
      if (match && match[1]) {
        const raw = match[1].trim();
        const extractedCode = raw.split(' - ')[0].trim().toUpperCase();
        if (extractedCode) {
          return { tourCode: extractedCode, isTourCodeDirectly: true };
        }
      }
    }

    const { data: toursList } = await supabase.from('tours').select('code').limit(100);
    if (toursList) {
      const matched = toursList.find((t: any) => t.code && cleanCode.toUpperCase().includes(t.code.toUpperCase()));
      if (matched) {
        return { tourCode: matched.code, isTourCodeDirectly: true };
      }
    }
  } catch (error) {
    console.warn('[Storage Config] Lỗi khi truy vấn thông tin Tour/Booking:', error);
  }

  return { tourCode: 'TOUR_CHUNG', isTourCodeDirectly: true };
}

export async function uploadWith3TierFallback(
  req: express.Request,
  file: Express.Multer.File,
  fileName: string,
  getDriveFolderId: (token: string) => Promise<string>,
  _supabaseStoragePath: string,
  strictDriveOnly: boolean = true
): Promise<{ url: string; fileId?: string; storage: string; error?: string }> {
  const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('PRIVATE KEY'));
  const hasOAuth = !!(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
  const driveActive = hasServiceAccount || hasOAuth;

  if (!driveActive) {
    throw new Error('Hệ thống chưa được cấu hình tài khoản Google Drive hoặc thông tin xác thực chưa hợp lệ.');
  }

  try {
    const token = await getGoogleDriveAccessToken();
    const folderId = await getDriveFolderId(token);
    const userEmail = req.headers['x-user-email'] as string | undefined;
    const result = await uploadFileToGoogleDrive(fileName, file.mimetype, file.buffer, folderId, token, userEmail);
    return { url: result.webViewLink, fileId: result.id, storage: 'drive' };
  } catch (driveErr: any) {
    const driveErrorMsg = driveErr.message || String(driveErr);
    console.error('[Google Drive Upload Failure] Upload failed:', driveErrorMsg);
    throw new Error(`Lỗi tải file lên Google Drive: ${driveErrorMsg}`);
  }
}

/**
 * Tìm hoặc tạo file Google Spreadsheet 'Góp Ý & Báo Lỗi - Tour CRM' trong thư mục Góp Ý & Báo Lỗi
 */
export async function getOrCreateFeedbackSpreadsheet(folderId: string, token: string): Promise<string> {
  const sheetName = 'Góp Ý & Báo Lỗi - Tour CRM';
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.spreadsheet' and name='${sheetName}' and '${folderId}' in parents and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Tìm trong toàn bộ Drive nếu chưa nằm trong thư mục con
  const globalQuery = encodeURIComponent(`mimeType='application/vnd.google-apps.spreadsheet' and name='${sheetName}' and trashed=false`);
  const globalSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${globalQuery}&fields=files(id,name,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (globalSearchRes.ok) {
    const data = await globalSearchRes.json();
    if (data.files && data.files.length > 0) {
      const existingSheet = data.files[0];
      // Di chuyển vào folderId nếu chưa có
      try {
        const prevParents = (existingSheet.parents || []).join(',');
        await fetch(`https://www.googleapis.com/drive/v3/files/${existingSheet.id}?addParents=${folderId}&removeParents=${prevParents}&supportsAllDrives=true`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (moveErr) {
        console.warn('[Feedback Sheet] Không thể di chuyển sheet vào folder:', moveErr);
      }
      return existingSheet.id;
    }
  }

  // Tạo mới file Google Sheet nếu hoàn toàn chưa có
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: sheetName },
      sheets: [
        {
          properties: {
            title: 'Góp ý & Báo lỗi',
            gridProperties: { rowCount: 1000, columnCount: 10, frozenRowCount: 1 }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Không thể khởi tạo Google Sheet: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;

  // Di chuyển file vào thư mục Góp Ý & Báo Lỗi
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.warn('[Feedback Sheet] Warning moving new sheet to folder:', err);
  }

  // Thiết lập dòng tiêu đề (Header row)
  const headerValues = [
    [
      'Thời gian',
      'Loại yêu cầu',
      'Tiêu đề',
      'Mô tả chi tiết',
      'Người gửi',
      'Email',
      'Trang gặp sự cố',
      'Ảnh chụp màn hình',
      'Trạng thái'
    ]
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:I1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: headerValues })
  });

  return spreadsheetId;
}

/**
 * Ghi 1 dòng phản hồi / báo lỗi mới vào Google Sheet realtime
 */
export async function appendFeedbackToGoogleSheet(
  feedbackData: {
    type: string;
    title: string;
    description: string;
    user_name?: string;
    user_email?: string;
    page_url?: string;
    screenshot_url?: string;
    status?: string;
    created_at?: string;
  },
  token: string,
  folderId: string
): Promise<{ spreadsheetId: string; updatedRows: number }> {
  const spreadsheetId = await getOrCreateFeedbackSpreadsheet(folderId, token);

  const now = feedbackData.created_at ? new Date(feedbackData.created_at) : new Date();
  const vnTimeStr = now.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const typeLabelMap: Record<string, string> = {
    bug: 'Báo lỗi hệ thống',
    feature: 'Đề xuất tính năng',
    ui: 'Giao diện & Trải nghiệm',
    other: 'Khác'
  };

  const statusLabelMap: Record<string, string> = {
    new: 'Mới tiếp nhận',
    pending: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng'
  };

  const row = [
    vnTimeStr,
    typeLabelMap[feedbackData.type] || feedbackData.type || 'Khác',
    feedbackData.title || '',
    feedbackData.description || '',
    feedbackData.user_name || 'Người dùng ẩn danh',
    feedbackData.user_email || '',
    feedbackData.page_url || '',
    feedbackData.screenshot_url || '',
    statusLabelMap[feedbackData.status || 'new'] || 'Mới tiếp nhận'
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(`Lỗi khi ghi dòng vào Google Sheet: ${errText}`);
  }

  const result = await appendRes.json();
  return {
    spreadsheetId,
    updatedRows: result.updates?.updatedRows || 1
  };
}
