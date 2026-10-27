import { getAdminSupabaseClient } from './supabaseService.js';
import { sendMetaConversionEvent } from './metaCapiService.js';

export interface PosCakeOrderPayload {
  id?: string | number;
  order_id?: string | number;
  code?: string;
  display_id?: string;
  total_price?: number | string;
  total_amount?: number | string;
  grand_total?: number | string;
  subtotal?: number | string;
  pre_payment?: number | string;
  paid_amount?: number | string;
  deposit_amount?: number | string;
  customer_pay?: number | string;
  status?: string | number;
  status_name?: string;
  status_text?: string;
  customer?: any;
  partner?: any;
  shipping_address?: any;
  bill_full_name?: string;
  bill_phone_number?: string;
  items?: any[];
  order_items?: any[];
  note?: string;
  created_at?: string;
  inserted_at?: string;
  shop_id?: string | number;
  [key: string]: any;
}

/**
 * Định dạng tiền tệ VNĐ chuẩn (Ví dụ: 15.000.000 VNĐ)
 */
export function formatCurrencyVND(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `${num.toLocaleString('vi-VN')} VNĐ`;
}

/**
 * Định dạng ngày giờ theo chuẩn hh:mm dd/mm/yyyy
 */
export function formatDateTimeVi(dateInput?: string | Date | number | null): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Chuẩn hóa số điện thoại về chuẩn E.164 (VD: 0912345678 -> 84912345678)
 * và số nội địa (0912345678)
 */
export function normalizePhoneToE164(rawInput: string | null | undefined): {
  e164: string | null;
  local: string | null;
} {
  if (!rawInput) return { e164: null, local: null };
  let clean = String(rawInput).trim().replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);

  if (!clean || clean.length < 8) return { e164: null, local: null };

  let localPhone: string | null = null;
  let e164Phone: string | null = null;

  if (clean.startsWith('84') && clean.length >= 10 && clean.length <= 12) {
    e164Phone = clean;
    localPhone = '0' + clean.slice(2);
  } else if (clean.startsWith('0') && clean.length >= 10 && clean.length <= 11) {
    localPhone = clean;
    e164Phone = '84' + clean.slice(1);
  } else if (clean.length === 9 && ['3', '5', '7', '8', '9'].includes(clean[0])) {
    localPhone = '0' + clean;
    e164Phone = '84' + clean;
  } else {
    localPhone = clean.startsWith('84') ? '0' + clean.slice(2) : clean;
    e164Phone = clean.startsWith('84') ? clean : (clean.startsWith('0') ? '84' + clean.slice(1) : '84' + clean);
  }

  return { e164: e164Phone, local: localPhone };
}

/**
 * Gửi thông báo nội bộ hệ thống và kênh Chat Hub (ADL - Điều hành, ADL - Kế toán)
 */
export async function sendInternalSystemNotification(params: {
  channelId?: 'dieu-hanh' | 'ke-toan' | 'chung' | string;
  spaceName?: string;
  title: string;
  message: string;
  customerName?: string;
  customerPhone?: string;
  amountFormatted?: string;
  orderCode?: string;
  type?: 'poscake_order' | 'poscake_payment' | 'new_lead_botcake' | 'system';
}) {
  const {
    channelId = 'chung',
    spaceName = 'Hệ thống',
    title,
    message,
    customerName,
    customerPhone,
    amountFormatted,
    orderCode,
    type = 'poscake_order'
  } = params;

  const supabase = getAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const timeFormatted = formatDateTimeVi(nowIso);

  // 1. Ghi nhận vào bảng system_notifications (để hiển thị chuông thông báo CRM)
  try {
    const notifId = `pos_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await supabase.from('system_notifications').insert({
      id: notifId,
      type: type,
      title: title,
      message: `${message} (${timeFormatted})`,
      created_at: nowIso,
      read: false
    });
  } catch (notifErr: any) {
    console.warn('[Notification Hub] Ghi system_notifications:', notifErr.message);
  }

  // 2. Bắn tin nhắn vào Chat Hub (Bảng chat_messages: ADL - Kế toán hoặc ADL - Điều hành)
  try {
    const chatMsgId = `msg_pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await supabase.from('chat_messages').insert({
      id: chatMsgId,
      channel_id: channelId,
      sender_id: 'system_poscake_bot',
      sender_name: 'Poscake Realtime Bot',
      sender_role: 'system',
      content: `${message}\n⏰ Thời gian: ${timeFormatted}`,
      order_code: orderCode || null,
      created_at: nowIso
    });
  } catch (chatErr: any) {
    console.warn('[Chat Hub] Ghi chat_messages:', chatErr.message);
  }
}

/**
 * Xử lý tác vụ ngầm từ Webhook POS Cake
 */
export async function processPosCakeWebhookAsync(rawPayload: any): Promise<void> {
  try {
    const supabase = getAdminSupabaseClient();

    let payload = rawPayload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return;
      }
    }

    if (!payload || typeof payload !== 'object') return;

    // 1. Phân tích đối tượng đơn hàng và đối tác
    const order = payload.order || payload.data?.order || (payload.type?.includes('order') || payload.event?.includes('order') ? (payload.data || payload) : payload);
    const partner = order?.partner || payload.partner || payload.customer || payload.data?.customer || {};
    const customer = payload.customer || payload.data?.customer || order?.customer || {};
    const shipping = order?.shipping_address || payload.shipping_address || {};

    // 2. Trích xuất tên khách hàng
    let customerName = (
      order?.bill_full_name ||
      shipping?.full_name ||
      partner?.name ||
      partner?.full_name ||
      customer?.name ||
      customer?.full_name ||
      payload?.customer_name ||
      payload?.name ||
      payload?.full_name ||
      'Khách hàng POS Cake'
    ).trim();

    if (customerName.startsWith('{') || customerName.includes('{{')) {
      customerName = 'Khách hàng POS Cake';
    }

    // 3. Trích xuất số điện thoại
    const phoneCandidates = [
      order?.bill_phone_number,
      shipping?.phone_number,
      shipping?.phone,
      partner?.phone_number,
      partner?.phone,
      partner?.mobile,
      customer?.phone,
      customer?.mobile,
      customer?.phone_number,
      payload?.phone,
      payload?.customer_phone,
      payload?.phone_number,
      payload?.mobile,
      payload?.sdt,
      payload?.so_dien_thoai,
      payload?.custom_fields?.phone,
      payload?.custom_fields?.sdt,
      payload?.data?.phone,
      payload?.data?.phone_number
    ];

    let rawFoundPhone: string | null = null;
    for (const cand of phoneCandidates) {
      if (cand && !String(cand).includes('{{')) {
        const str = String(cand).trim();
        if (str.length >= 8) {
          rawFoundPhone = str;
          break;
        }
      }
    }

    const { e164: phoneE164, local: phoneLocal } = normalizePhoneToE164(rawFoundPhone);
    const finalPhone = phoneE164 || (rawFoundPhone ? String(rawFoundPhone).trim() : '84000000000');
    const displayPhone = phoneE164 || phoneLocal || 'Chưa cung cấp';

    // Trích xuất giới tính
    let custGender: string | null = null;
    const rawGender = customer?.gender || partner?.gender || payload?.gender || payload?.data?.gender;
    if (rawGender) {
      const g = String(rawGender).toLowerCase().trim();
      if (g === 'male' || g === 'nam' || g === '1') custGender = 'Nam';
      else if (g === 'female' || g === 'nu' || g === 'nữ' || g === '2') custGender = 'Nữ';
      else custGender = String(rawGender);
    }

    // Trích xuất ngày sinh
    let custBirthday = customer?.birthday || customer?.dob || customer?.date_of_birth || partner?.birthday || partner?.dob || payload?.birthday || payload?.dob || null;
    if (custBirthday && String(custBirthday).includes('{{')) custBirthday = null;

    // Trích xuất Facebook ID / PSID
    const custFbId = String(
      customer?.fb_id || 
      customer?.facebook_id || 
      customer?.psid || 
      customer?.recipient_id || 
      partner?.fb_id || 
      partner?.facebook_id || 
      payload?.fb_id || 
      payload?.facebook_id || 
      payload?.psid || 
      ''
    ).trim();

    // Trích xuất dữ liệu quảng cáo (Meta Ads)
    const adId = order?.ad_id || customer?.ad_id || payload?.ad_id || payload?.adId || payload?.fb_ad_id || null;
    const adName = order?.ad_name || customer?.ad_name || payload?.ad_name || payload?.adName || null;
    const campaignId = order?.campaign_id || customer?.campaign_id || payload?.campaign_id || payload?.campaignId || null;
    const campaignName = order?.campaign_name || customer?.campaign_name || payload?.campaign_name || payload?.campaign || payload?.utm_campaign || null;
    const adsetId = order?.adset_id || customer?.adset_id || payload?.adset_id || payload?.adsetId || null;
    const adsetName = order?.adset_name || customer?.adset_name || payload?.adset_name || payload?.adsetName || null;
    const utmSource = order?.utm_source || customer?.utm_source || payload?.utm_source || 'poscake_webhook';
    const utmMedium = order?.utm_medium || customer?.utm_medium || payload?.utm_medium || null;
    const utmContent = order?.utm_content || customer?.utm_content || payload?.utm_content || null;
    const pageId = order?.page_id || customer?.page_id || payload?.page_id || null;
    const pageName = order?.page_name || customer?.page_name || payload?.page_name || null;

    // 4. Trích xuất giá trị tiền đơn hàng & số tiền đã thanh toán
    const totalAmount = Number(
      order?.total_price ||
      order?.total_amount ||
      order?.grand_total ||
      order?.subtotal ||
      payload?.total_price ||
      payload?.total_amount ||
      payload?.amount ||
      0
    );

    const paidAmount = Number(
      order?.pre_payment ||
      order?.paid_amount ||
      order?.deposit_amount ||
      order?.customer_pay ||
      payload?.pre_payment ||
      payload?.paid_amount ||
      payload?.deposit_amount ||
      payload?.customer_pay ||
      0
    );

    const orderCode = String(
      order?.code ||
      order?.order_id ||
      order?.id ||
      order?.display_id ||
      payload?.code ||
      payload?.order_id ||
      payload?.id ||
      `POS-${Date.now()}`
    );

    const email = order?.email || partner?.email || customer?.email || payload?.email || null;
    const address = shipping?.full_address || shipping?.address || partner?.full_address || partner?.address || payload?.address || null;
    const note = order?.note || payload?.note || `Đơn hàng POS Cake #${orderCode}`;
    const createdAt = order?.inserted_at || order?.created_at || payload?.created_at || new Date().toISOString();

    const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;
    const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;
    const paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = isFullyPaid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid');
    const bookingStatus: 'pending' | 'confirmed' | 'cancelled' = isFullyPaid ? 'confirmed' : 'pending';

    const formattedTotalAmount = formatCurrencyVND(totalAmount);
    const formattedPaidAmount = formatCurrencyVND(paidAmount);

    console.log(`[Poscake Worker] Xử lý: Đơn #${orderCode} | Khách: ${customerName} | SĐT E.164: ${finalPhone} | Tổng: ${formattedTotalAmount} | Đã thu: ${formattedPaidAmount}`);

    // 5. Tương tác Supabase: Tìm kiếm đơn hàng theo SĐT (dạng E.164 hoặc Local)
    let existingOrder: any = null;

    // Tìm trong bảng bookings / orders
    try {
      const { data: foundBookings, error: searchErr } = await supabase
        .from('bookings')
        .select('*')
        .or(`booker_phone.eq.${finalPhone},booker_phone.eq.${phoneLocal || finalPhone},code.eq.${orderCode}`)
        .limit(1);

      if (!searchErr && foundBookings && foundBookings.length > 0) {
        existingOrder = foundBookings[0];
      }
    } catch (e: any) {
      console.warn('[Poscake Worker] Tra cứu bookings:', e.message);
    }

    // 6. Xử lý INSERT nếu chưa tồn tại, hoặc UPDATE nếu đã tồn tại
    if (!existingOrder) {
      // A. Tạo hoặc cập nhật khách hàng trong bảng customers
      let customerId: string | null = null;
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone')
          .or(`phone.eq.${finalPhone},phone.eq.${phoneLocal || finalPhone}`)
          .maybeSingle();

        if (custData) {
          customerId = custData.id;
          await supabase.from('customers').update({
            name: customerName || custData.name,
            gender: custGender || undefined,
            birthday: custBirthday || undefined,
            facebook_id: custFbId || undefined
          }).eq('id', custData.id);
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({
              name: customerName,
              phone: finalPhone,
              email: email,
              address: address,
              gender: custGender,
              birthday: custBirthday,
              facebook_id: custFbId || null,
              type: 'individual',
              created_at: createdAt
            })
            .select('id')
            .single();

          if (newCust) customerId = newCust.id;
        }
      } catch (custErr: any) {
        console.warn('[Poscake Worker] Thao tác bảng customers:', custErr.message);
      }

      // B. Lấy tour_id hợp lệ và salesperson_id (admin/system)
      let tourId: string | null = null;
      try {
        const { data: tours } = await supabase.from('tours').select('id').limit(1);
        if (tours && tours.length > 0) tourId = tours[0].id;
      } catch (e) {}

      let salespersonId: string | null = null;
      try {
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        if (profiles && profiles.length > 0) salespersonId = profiles[0].id;
      } catch (e) {}

      // C. INSERT vào bảng bookings
      if (tourId && customerId && salespersonId) {
        try {
          await supabase.from('bookings').insert({
            code: orderCode,
            tour_id: tourId,
            customer_id: customerId,
            salesperson_id: salespersonId,
            booker_name: customerName,
            booker_phone: finalPhone,
            passengers: 1,
            adult_count: 1,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            status: bookingStatus === 'confirmed' ? 'Confirmed' : 'Pending',
            payment_status: paymentStatus,
            special_requests: note,
            created_by: 'Poscake POS Integration',
            created_at: createdAt
          });
        } catch (insertErr: any) {
          console.warn('[Poscake Worker] Lỗi insert bookings:', insertErr.message);
        }
      }

      // D. Lưu Lead vào bảng leads để đội ngũ tư vấn theo dõi
      try {
        await supabase.from('leads').upsert({
          customer_name: customerName,
          customer_phone: finalPhone,
          customer_email: email,
          gender: custGender,
          birthday: custBirthday,
          facebook_id: custFbId || null,
          ad_id: adId,
          ad_name: adName,
          campaign_id: campaignId,
          campaign_name: campaignName,
          adset_id: adsetId,
          adset_name: adsetName,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_content: utmContent,
          page_id: pageId,
          page_name: pageName,
          source_channel: adId ? `Ad ID: ${adId}` : 'pos_cake_webhook',
          status: totalAmount > 0 ? 'order_created' : 'lead_captured',
          message_text: `Khách hàng từ POS Cake (Mã: #${orderCode}) - Giá trị: ${formattedTotalAmount}`,
          notes: `Tự động tiếp nhận từ Poscake Webhook (Mã: #${orderCode})`,
          raw_webhook_payload: rawPayload,
          created_at: createdAt,
          last_message_at: createdAt
        }, { onConflict: 'customer_phone' });
      } catch (leadErr: any) {
        console.warn('[Poscake Worker] Lưu lead:', leadErr.message);
      }

      // E. Bắn thông báo nội bộ vào không gian "ADL - Điều hành"
      await sendInternalSystemNotification({
        channelId: 'dieu-hanh',
        spaceName: 'ADL - Điều hành',
        title: `🛒 Đơn hàng mới từ Poscake: ${customerName}`,
        message: `🛒 CÓ ĐƠN HÀNG MỚI TỪ POSCAKE - Khách: ${customerName} - SĐT: ${displayPhone} - Giá trị: ${formattedTotalAmount}`,
        customerName: customerName,
        customerPhone: finalPhone,
        amountFormatted: formattedTotalAmount,
        orderCode: orderCode,
        type: 'poscake_order'
      });

      // Nếu đơn này đã có thanh toán tiền ngay khi tạo -> Bắn thêm thông báo vào "ADL - Kế toán"
      if (paidAmount > 0) {
        await sendInternalSystemNotification({
          channelId: 'ke-toan',
          spaceName: 'ADL - Kế toán',
          title: `💰 Đã nhận thanh toán từ Poscake: ${customerName}`,
          message: `💰 ĐÃ NHẬN THANH TOÁN TỪ POSCAKE - Khách: ${customerName} - Đã thu: ${formattedPaidAmount} (Tổng đơn: ${formattedTotalAmount})`,
          customerName: customerName,
          customerPhone: finalPhone,
          amountFormatted: formattedPaidAmount,
          orderCode: orderCode,
          type: 'poscake_payment'
        });
      }

      // F. Bắn sự kiện Meta CAPI (Lead / Purchase)
      try {
        if (totalAmount > 0) {
          await sendMetaConversionEvent({
            event_name: isFullyPaid ? 'Purchase' : 'Lead',
            tracking_type: isFullyPaid ? 'PURCHASE_REVENUE' : 'ORDER_CREATED',
            order_id: orderCode,
            revenue_value: totalAmount,
            currency: 'VND',
            customer_name: customerName,
            customer_phone: finalPhone,
            customer_email: email || undefined,
            utm_source: 'poscake_webhook'
          });
        }
      } catch (capiErr) {}

    } else {
      // Đã tồn tại đơn hàng -> Cập nhật trạng thái và thanh toán
      const newPaidAmount = Math.max(Number(existingOrder.paid_amount || 0), paidAmount);
      const isNowFullyPaid = newPaidAmount >= Number(existingOrder.total_amount || totalAmount);
      const updatedPaymentStatus = isNowFullyPaid ? 'paid' : (newPaidAmount > 0 ? 'partially_paid' : (existingOrder.payment_status || 'unpaid'));
      const updatedBookingStatus = isNowFullyPaid ? 'Confirmed' : existingOrder.status;

      try {
        await supabase
          .from('bookings')
          .update({
            paid_amount: newPaidAmount,
            payment_status: updatedPaymentStatus,
            status: updatedBookingStatus,
            booker_name: customerName || existingOrder.booker_name
          })
          .eq('id', existingOrder.id);
      } catch (updateErr: any) {
        console.warn('[Poscake Worker] Cập nhật bookings:', updateErr.message);
      }

      // Bắn thông báo nội bộ vào không gian "ADL - Kế toán" khi Poscake báo khách thanh toán tiền
      if (paidAmount > 0) {
        await sendInternalSystemNotification({
          channelId: 'ke-toan',
          spaceName: 'ADL - Kế toán',
          title: `💰 Đã nhận thanh toán từ Poscake: ${customerName}`,
          message: `💰 ĐÃ NHẬN THANH TOÁN TỪ POSCAKE - Khách: ${customerName} - Đã thu: ${formattedPaidAmount}`,
          customerName: customerName,
          customerPhone: finalPhone,
          amountFormatted: formattedPaidAmount,
          orderCode: orderCode,
          type: 'poscake_payment'
        });

        // Bắn sự kiện Purchase về Meta CAPI nếu thanh toán đủ
        if (isNowFullyPaid) {
          try {
            await sendMetaConversionEvent({
              event_name: 'Purchase',
              tracking_type: 'PURCHASE_REVENUE',
              order_id: orderCode,
              revenue_value: Number(existingOrder.total_amount || totalAmount),
              currency: 'VND',
              customer_name: customerName,
              customer_phone: finalPhone,
              customer_email: email || undefined,
              utm_source: 'poscake_webhook_payment'
            });
          } catch (capiErr) {}
        }
      }
    }
  } catch (globalErr: any) {
    console.error('[Poscake Worker] Lỗi xử lý async:', globalErr);
  }
}
