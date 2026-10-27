import { getAdminSupabaseClient } from './supabaseService.js';
import { sendMetaConversionEvent } from './metaCapiService.js';
import { getPageAccessToken, fetchMetaUserProfile, saveLeadToDatabase } from './metaMessengerService.js';

export interface BotcakeWebhookPayload {
  page_id?: string;
  psid?: string;
  full_name?: string;
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  email?: string;
  customer_email?: string;
  avatar?: string;
  avatar_url?: string;
  profile_pic?: string;
  user_profile_pic?: string;
  tags?: string[] | string;
  gender?: string;
  ad_id?: string;
  campaign?: string;
  [key: string]: any;
}

/**
 * Chuẩn hóa số điện thoại Việt Nam về định dạng E.164 (VD: 0912345678 -> 84912345678)
 * và định dạng nội địa chuẩn (0912345678)
 */
export function normalizeVietnamesePhone(rawInput: string | null | undefined): {
  e164: string | null;
  local: string | null;
} {
  if (!rawInput) return { e164: null, local: null };
  const str = String(rawInput).trim();

  // Bóc tách toàn bộ ký tự số và dấu +
  let clean = str.replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);

  let localPhone: string | null = null;
  let e164Phone: string | null = null;

  if (clean.startsWith('84') && clean.length === 11) {
    localPhone = '0' + clean.slice(2);
    e164Phone = clean;
  } else if (clean.startsWith('0') && clean.length === 10) {
    localPhone = clean;
    e164Phone = '84' + clean.slice(1);
  } else if (clean.length === 9 && ['3', '5', '7', '8', '9'].includes(clean[0])) {
    localPhone = '0' + clean;
    e164Phone = '84' + clean;
  } else if (clean.length >= 9 && clean.length <= 11) {
    localPhone = clean;
    e164Phone = clean.startsWith('84') ? clean : (clean.startsWith('0') ? '84' + clean.slice(1) : '84' + clean);
  }

  return {
    e164: e164Phone,
    local: localPhone
  };
}

/**
 * Gửi thông báo nội bộ hệ thống (Ghi nhận vào Bảng thông báo CRM)
 */
export async function sendInternalSystemNotification(params: {
  fullName: string;
  phone?: string | null;
  psid?: string | null;
  pageId?: string | null;
  tags?: string[] | string;
  orderId?: string | null;
}) {
  const { fullName, phone } = params;
  const displayPhone = phone || 'Chưa cung cấp SĐT';

  // Ghi nhận vào bảng system_notifications trong Supabase để hiển thị trên chuông thông báo CRM
  try {
    const supabase = getAdminSupabaseClient();
    await supabase.from('system_notifications').insert({
      id: `botcake_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'new_lead_botcake',
      title: `Lead mới: ${fullName}`,
      message: `Khách hàng ${fullName} (${displayPhone}) vừa để lại thông tin trên hệ thống.`,
      created_at: new Date().toISOString(),
      read: false
    });
  } catch (dbNotifError: any) {
    // Không chặn luồng nếu bảng system_notifications có RLS hoặc lỗi nhẹ
  }
}

/**
 * Xử lý chính dữ liệu Webhook nhận được từ Botcake
 */
export async function processBotcakeWebhook(payload: BotcakeWebhookPayload) {
  const supabase = getAdminSupabaseClient();

  let fullName = (payload.full_name || payload.name || payload.customer_name || 'Khách hàng Botcake').trim();
  const rawPhone = payload.phone || payload.customer_phone || '';
  const email = (payload.email || payload.customer_email || '').trim() || null;
  const pageId = payload.page_id || null;
  const psid = payload.psid ? String(payload.psid).trim() : null;
  const tags = Array.isArray(payload.tags) ? payload.tags : (payload.tags ? [String(payload.tags)] : []);
  const tagsString = tags.join(', ');

  // Trích xuất hoặc lấy Avatar tự động
  let avatar: string | null = payload.avatar || payload.avatar_url || payload.profile_pic || payload.user_profile_pic || payload.customer_avatar || null;
  if (!avatar && psid && !psid.includes('{')) {
    if (pageId) {
      try {
        const pageToken = await getPageAccessToken(pageId);
        if (pageToken) {
          const profile = await fetchMetaUserProfile(psid, pageToken);
          if (profile.avatar_url) avatar = profile.avatar_url;
          if (profile.name && (!fullName || fullName.includes('{') || fullName === 'Khách hàng Botcake')) {
            fullName = profile.name;
          }
        }
      } catch (e) {}
    }
    if (!avatar) {
      avatar = `https://graph.facebook.com/${psid}/picture?type=normal`;
    }
  }

  const { e164, local: localPhone } = normalizeVietnamesePhone(rawPhone);
  const primaryPhone = localPhone || rawPhone || null;

  let existingOrderId: string | null = null;
  let orderCreated = false;

  // 1. Kiểm tra trong bảng bookings / orders của Supabase xem SĐT này đã có đơn hàng/hồ sơ nháp nào chưa
  if (primaryPhone || e164) {
    try {
      const phoneQueries: string[] = [];
      if (primaryPhone) {
        phoneQueries.push(`customer_phone.eq.${primaryPhone}`, `booker_phone.eq.${primaryPhone}`);
      }
      if (e164 && e164 !== primaryPhone) {
        phoneQueries.push(`customer_phone.eq.${e164}`, `booker_phone.eq.${e164}`);
      }

      // Kiểm tra trong bảng bookings (được ánh xạ là orders)
      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, code, meta_lead_id, customer_name')
        .or(phoneQueries.join(','))
        .limit(1);

      if (!checkError && existingBookings && existingBookings.length > 0) {
        existingOrderId = existingBookings[0].id;
        // Nếu ĐÃ CÓ: Cập nhật thêm meta_lead_id (psid) nếu chưa có
        if (psid && !existingBookings[0].meta_lead_id) {
          await supabase
            .from('bookings')
            .update({ meta_lead_id: psid })
            .eq('id', existingOrderId);
        }
      } else {
        // Nếu CHƯA CÓ: Tự động INSERT một bản ghi mới vào bảng bookings với trạng thái booking_status = 'pending'
        // Tìm 1 customer_id hợp lệ hoặc tạo khách hàng mới
        let customerId: string | null = null;
        try {
          let custQuery = supabase.from('customers').select('id');
          if (primaryPhone && e164 && e164 !== primaryPhone) {
            custQuery = custQuery.or(`phone.eq.${primaryPhone},phone.eq.${e164}`);
          } else if (primaryPhone) {
            custQuery = custQuery.eq('phone', primaryPhone);
          } else {
            custQuery = custQuery.eq('phone', '0000000000');
          }

          const { data: existCust } = await custQuery.maybeSingle();

          if (existCust?.id) {
            customerId = existCust.id;
          } else {
            const { data: newCust } = await supabase
              .from('customers')
              .insert({
                name: fullName,
                phone: primaryPhone || e164 || '0000000000',
                email: email,
                type: 'individual'
              })
              .select('id')
              .single();
            if (newCust?.id) customerId = newCust.id;
          }
        } catch (custErr) {}

        // Tìm 1 tour_id và salesperson_id mặc định
        let defaultTourId: string | null = null;
        let defaultSalesId: string | null = null;
        try {
          const { data: firstTour } = await supabase.from('tours').select('id').limit(1).maybeSingle();
          if (firstTour?.id) defaultTourId = firstTour.id;

          const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
          if (firstProfile?.id) defaultSalesId = firstProfile.id;
        } catch (e) {}

        if (defaultTourId && customerId && defaultSalesId) {
          const orderCode = `BC-${Date.now().toString().slice(-6)}`;
          const { data: newBooking, error: insertError } = await supabase
            .from('bookings')
            .insert({
              code: orderCode,
              tour_id: defaultTourId,
              customer_id: customerId,
              salesperson_id: defaultSalesId,
              customer_phone: primaryPhone,
              booker_name: fullName,
              booker_phone: primaryPhone,
              status: 'Pending',
              booking_status: 'pending',
              meta_lead_id: psid || null,
              special_requests: tagsString ? `Tags từ Botcake: ${tagsString}` : 'Lead tạo tự động từ Botcake JSON API',
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (!insertError && newBooking) {
            existingOrderId = newBooking.id;
            orderCreated = true;
          }
        }
      }
    } catch (orderErr: any) {
      console.warn('[Botcake Webhook] Lưu đơn hàng nháp:', orderErr.message);
    }
  }

  // 2. Đồng bộ vào bảng Khách Hàng Tiềm Năng (leads) qua saveLeadToDatabase
  try {
    await saveLeadToDatabase({
      customer_name: fullName,
      customer_phone: primaryPhone,
      customer_email: email,
      customer_avatar: avatar,
      source_channel: 'pancake_messenger',
      page_id: pageId,
      psid: psid,
      ad_id: payload.ad_id || null,
      utm_campaign: payload.campaign || null,
      message_text: tagsString ? `Tags Botcake: ${tagsString}` : 'Khách hàng liên hệ qua Botcake JSON API',
      notes: `Nhận tự động từ Botcake Webhook (Tags: ${tagsString || 'Không'})`,
      status: 'lead_captured'
    });

    // Đồng bộ vào meta_chat_conversations nếu có psid và pageId hợp lệ
    if (psid && pageId && !psid.includes('{')) {
      await supabase.from('meta_chat_conversations').upsert({
        page_id: pageId,
        psid: psid,
        customer_name: fullName,
        customer_phone: primaryPhone,
        customer_email: email,
        meta_lead_id: psid,
        last_message_text: `Botcake Lead: ${fullName} (${primaryPhone || 'Chưa có số'})`,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        status: 'active'
      }, { onConflict: 'page_id,psid' });
    }
  } catch (leadDbErr: any) {
    console.warn('[Botcake Webhook] Lưu lead:', leadDbErr.message);
  }

  // 3. Kích hoạt trigger thông báo nội bộ CRM Notifications
  await sendInternalSystemNotification({
    fullName,
    phone: primaryPhone,
    psid,
    pageId,
    tags,
    orderId: existingOrderId
  });

  // 4. Bắn sự kiện chuyển đổi Lead lên Meta CAPI nếu có SĐT
  if (primaryPhone || e164) {
    try {
      await sendMetaConversionEvent({
        event_name: 'Lead',
        tracking_type: 'PHONE_LEAD',
        customer_name: fullName,
        customer_phone: primaryPhone || e164 || undefined,
        customer_email: email || undefined,
        utm_source: 'botcake_webhook'
      });
    } catch (capiErr: any) {
      console.warn('[Botcake -> Meta CAPI] Lỗi gửi CAPI:', capiErr.message);
    }
  }

  return {
    success: true,
    fullName,
    phone: primaryPhone,
    e164Phone: e164,
    orderCreated,
    orderId: existingOrderId
  };
}
