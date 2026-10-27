import { getAdminSupabaseClient } from './supabaseService.js';
import { sendMetaConversionEvent } from './metaCapiService.js';

export interface FacebookPageConfig {
  id?: string;
  page_id: string;
  name: string;
  access_token: string;
  avatar_url?: string;
  is_active?: boolean;
  webhook_subscribed?: boolean;
  created_at?: string;
}

export interface IncomingMessengerMessage {
  senderId: string;
  recipientId: string;
  timestamp: number;
  messageId?: string;
  text?: string;
  attachments?: any[];
  referral?: {
    ref?: string;
    source?: string;
    type?: string;
    ad_id?: string;
    referer_uri?: string;
  };
}

export interface IncomingLeadgenEvent {
  pageId: string;
  leadgenId: string;
  formId?: string;
  adId?: string;
  createdTime?: number;
}

export interface LeadRecord {
  id?: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_avatar?: string | null;
  gender?: string | null;
  birthday?: string | null;
  fb_id?: string | null;
  pancake_id?: string | null;
  source_channel?: string;
  page_id?: string | null;
  shop_id?: string | null;
  psid?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  adset_name?: string | null;
  form_id?: string | null;
  leadgen_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  message_text?: string | null;
  form_data?: any;
  status?: string;
  notes?: string | null;
  tour_interest?: string | null;
  assigned_to?: string | null;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Trích xuất số điện thoại Việt Nam từ nội dung tin nhắn (hỗ trợ định dạng có dấu cách, chấm, gạch ngang)
 */
export function extractVietnamesePhone(text: string): string | null {
  if (!text) return null;
  const str = String(text);
  
  // 1. Tìm pattern số điện thoại Việt Nam có thể chứa khoảng trắng, dấu chấm, dấu gạch ngang
  const regex = /(?:(?:\+84|84|0)[\s\.\-]?[35789])(?:[\s\.\-]?[0-9]){8}\b/g;
  const matches = str.match(regex);
  if (matches && matches.length > 0) {
    for (const match of matches) {
      let raw = match.replace(/[\s\.\-\(\)_]/g, '');
      if (raw.startsWith('+84')) raw = '0' + raw.slice(3);
      else if (raw.startsWith('84') && raw.length === 11) raw = '0' + raw.slice(2);
      
      if (/^0[35789][0-9]{8}$/.test(raw)) {
        return raw;
      }
    }
  }

  // 2. Thử quét chuỗi số liên tiếp 10 số bắt đầu bằng 03, 05, 07, 08, 09
  const cleanDigitsOnly = str.replace(/[^0-9+]/g, '');
  const digitMatches = cleanDigitsOnly.match(/(?:(?:\+84|84|0)[35789][0-9]{8})/g);
  if (digitMatches && digitMatches.length > 0) {
    let raw = digitMatches[0];
    if (raw.startsWith('+84')) raw = '0' + raw.slice(3);
    else if (raw.startsWith('84') && raw.length === 11) raw = '0' + raw.slice(2);
    if (/^0[35789][0-9]{8}$/.test(raw)) {
      return raw;
    }
  }

  return null;
}

/**
 * Trích xuất email từ nội dung tin nhắn
 */
export function extractEmail(text: string): string | null {
  if (!text) return null;
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(regex);
  return matches && matches.length > 0 ? matches[0].toLowerCase().trim() : null;
}

/**
 * Lấy danh sách Facebook Page đã cấu hình
 */
export async function getFacebookPages(): Promise<FacebookPageConfig[]> {
  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from('facebook_pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Meta Messenger] Lỗi lấy danh sách trang:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Lấy Access Token của một Page theo page_id
 */
export async function getPageAccessToken(pageId: string): Promise<string | null> {
  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from('facebook_pages')
    .select('access_token')
    .eq('page_id', pageId)
    .maybeSingle();

  if (error || !data) return null;
  return data.access_token;
}

/**
 * Lấy thông tin người dùng từ Meta Graph API (Họ tên, Avatar)
 */
export async function fetchMetaUserProfile(psid: string, pageAccessToken: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${pageAccessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Graph API returned status ${response.status}`);
    }
    const data = await response.json() as any;
    return {
      name: data?.name || `${data?.first_name || ''} ${data?.last_name || ''}`.trim() || `Khách Meta #${psid.substring(psid.length - 4)}`,
      avatar_url: data?.profile_pic || null
    };
  } catch (error: any) {
    console.warn(`[Meta Messenger] Không thể lấy profile cho PSID ${psid}:`, error.message);
    return {
      name: `Khách Facebook #${psid.substring(Math.max(0, psid.length - 4))}`,
      avatar_url: null
    };
  }
}

/**
 * Lấy thông tin chi tiết Form Khách hàng tiềm năng từ Meta Lead Ads Graph API
 */
export async function fetchLeadgenDetailsFromMeta(leadgenId: string, pageAccessToken: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,created_time,ad_id,form_id,page_id,field_data&access_token=${pageAccessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json() as any;

    let customerName = '';
    let customerPhone = '';
    let customerEmail = '';
    const rawAnswers: Record<string, string> = {};

    if (Array.isArray(data.field_data)) {
      for (const field of data.field_data) {
        const fieldName = (field.name || '').toLowerCase();
        const val = Array.isArray(field.values) ? field.values[0] : field.values;
        if (!val) continue;

        rawAnswers[field.name] = String(val);

        if (fieldName.includes('phone') || fieldName.includes('sdt') || fieldName.includes('tel') || fieldName === 'dien_thoai') {
          customerPhone = extractVietnamesePhone(String(val)) || String(val).trim();
        } else if (fieldName.includes('full_name') || fieldName === 'name' || fieldName.includes('ho_ten') || fieldName === 'ten') {
          customerName = String(val).trim();
        } else if (fieldName.includes('first_name') && !customerName) {
          customerName = String(val).trim();
        } else if (fieldName.includes('email')) {
          customerEmail = String(val).toLowerCase().trim();
        }
      }
    }

    return {
      leadgen_id: data.id,
      created_time: data.created_time,
      ad_id: data.ad_id,
      form_id: data.form_id,
      page_id: data.page_id,
      customer_name: customerName || `Khách Lead Form #${leadgenId.slice(-4)}`,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      form_data: rawAnswers
    };
  } catch (error: any) {
    console.error(`[Meta Leadgen] Lỗi Graph API cho Lead ID ${leadgenId}:`, error.message);
    return null;
  }
}

/**
 * Helper loại bỏ các thẻ giữ chỗ chưa được render từ Botcake / Template (VD: {{psid}}, {{user_full_name}})
 */
function cleanPlaceholder(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (str.startsWith('{{') || str.endsWith('}}') || str.includes('{{#')) {
    return null;
  }
  return str;
}

/**
 * Lưu / Cập nhật Khách Hàng Tiềm Năng trực tiếp vào bảng 'leads' trong Supabase
 */
export async function saveLeadToDatabase(leadData: LeadRecord) {
  const supabase = getAdminSupabaseClient();
  const now = new Date().toISOString();

  const cleanName = cleanPlaceholder(leadData.customer_name) || 'Khách hàng tiềm năng';
  const cleanPhone = cleanPlaceholder(leadData.customer_phone);
  const cleanEmail = cleanPlaceholder(leadData.customer_email);
  const cleanAvatar = cleanPlaceholder(leadData.customer_avatar);
  const cleanGender = cleanPlaceholder(leadData.gender);
  const cleanBirthday = cleanPlaceholder(leadData.birthday);
  const cleanFbId = cleanPlaceholder(leadData.fb_id) || cleanPlaceholder(leadData.psid);
  const cleanPancakeId = cleanPlaceholder(leadData.pancake_id);
  const cleanPsid = cleanPlaceholder(leadData.psid) || cleanFbId;
  const cleanPageId = cleanPlaceholder(leadData.page_id);
  const cleanShopId = cleanPlaceholder(leadData.shop_id);
  const cleanAdId = cleanPlaceholder(leadData.ad_id);
  const cleanAdName = cleanPlaceholder(leadData.ad_name);
  const cleanCampaignId = cleanPlaceholder(leadData.campaign_id);
  const cleanCampaign = cleanPlaceholder(leadData.utm_campaign);
  const cleanAdsetId = cleanPlaceholder(leadData.adset_id);
  const cleanAdsetName = cleanPlaceholder(leadData.adset_name);
  const cleanLeadgenId = cleanPlaceholder(leadData.leadgen_id);

  const payload: Record<string, any> = {
    customer_name: cleanName,
    customer_phone: cleanPhone,
    customer_email: cleanEmail,
    customer_avatar: cleanAvatar,
    gender: cleanGender,
    birthday: cleanBirthday,
    fb_id: cleanFbId,
    pancake_id: cleanPancakeId,
    source_channel: leadData.source_channel || 'facebook_messenger',
    page_id: cleanPageId,
    shop_id: cleanShopId,
    psid: cleanPsid,
    ad_id: cleanAdId,
    ad_name: cleanAdName,
    campaign_id: cleanCampaignId,
    adset_id: cleanAdsetId,
    adset_name: cleanAdsetName,
    form_id: leadData.form_id || null,
    leadgen_id: cleanLeadgenId,
    utm_source: leadData.utm_source || 'facebook',
    utm_medium: leadData.utm_medium || null,
    utm_campaign: cleanCampaign,
    utm_content: leadData.utm_content || null,
    utm_term: leadData.utm_term || null,
    message_text: leadData.message_text || null,
    form_data: leadData.form_data || {},
    status: leadData.status || 'lead_captured',
    notes: leadData.notes || null,
    tour_interest: leadData.tour_interest || null,
    last_message_at: leadData.last_message_at || now,
    updated_at: now
  };

  try {
    // 1. Kiểm tra lead đã tồn tại chưa trong bảng `leads`
    let existingLead: any = null;

    if (payload.leadgen_id) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('leadgen_id', payload.leadgen_id)
        .maybeSingle();
      existingLead = data;
    }

    if (!existingLead && payload.customer_phone) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_phone', payload.customer_phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingLead = data;
    }

    if (!existingLead && payload.psid) {
      // Ưu tiên khớp theo psid (Facebook PSID là định danh duy nhất theo Page)
      let q = supabase
        .from('leads')
        .select('*')
        .eq('psid', payload.psid);
      if (payload.page_id) {
        q = q.eq('page_id', payload.page_id);
      }
      const { data } = await q
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingLead = data;
    }

    // Nếu vẫn chưa tìm thấy và có tên khách hàng, tìm lead có cùng tên mà chưa có SĐT
    if (!existingLead && payload.customer_name && payload.customer_name !== 'Khách hàng Pancake' && payload.customer_name !== 'Khách hàng tiềm năng') {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_name', payload.customer_name)
        .is('customer_phone', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingLead = data;
    }

    let leadId = existingLead?.id;

    if (existingLead) {
      const updateData: Record<string, any> = {
        updated_at: now,
        last_message_at: now
      };
      if (payload.customer_name && payload.customer_name !== 'Khách hàng Pancake' && payload.customer_name !== 'Khách hàng tiềm năng') {
        updateData.customer_name = payload.customer_name;
      }
      if (payload.customer_phone) updateData.customer_phone = payload.customer_phone;
      if (payload.customer_email) updateData.customer_email = payload.customer_email;
      if (payload.message_text) updateData.message_text = payload.message_text;
      if (payload.customer_avatar) updateData.customer_avatar = payload.customer_avatar;
      if (payload.gender) updateData.gender = payload.gender;
      if (payload.birthday) updateData.birthday = payload.birthday;
      if (payload.fb_id) updateData.fb_id = payload.fb_id;
      if (payload.pancake_id) updateData.pancake_id = payload.pancake_id;
      if (payload.ad_id) updateData.ad_id = payload.ad_id;
      if (payload.ad_name) updateData.ad_name = payload.ad_name;
      if (payload.campaign_id) updateData.campaign_id = payload.campaign_id;
      if (payload.utm_campaign) updateData.utm_campaign = payload.utm_campaign;
      if (payload.adset_id) updateData.adset_id = payload.adset_id;
      if (payload.adset_name) updateData.adset_name = payload.adset_name;
      if (payload.utm_source) updateData.utm_source = payload.utm_source;
      if (payload.utm_medium) updateData.utm_medium = payload.utm_medium;
      if (payload.utm_content) updateData.utm_content = payload.utm_content;
      if (payload.utm_term) updateData.utm_term = payload.utm_term;
      if (payload.shop_id) updateData.shop_id = payload.shop_id;
      if (payload.source_channel) updateData.source_channel = payload.source_channel;
      if (payload.notes) updateData.notes = payload.notes;
      if (payload.form_data && Object.keys(payload.form_data).length > 0) updateData.form_data = payload.form_data;
      if (payload.tour_interest) updateData.tour_interest = payload.tour_interest;

      const { data: updated, error: updErr } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updErr) throw updErr;
      if (updated) leadId = updated.id;
    } else {
      payload.created_at = leadData.created_at || now;
      const { data: inserted, error: insErr } = await supabase
        .from('leads')
        .insert([payload])
        .select()
        .single();

      if (insErr) throw insErr;
      if (inserted) leadId = inserted.id;
    }

    // Tự động đồng bộ vào bảng trung tâm `customers` nếu có SĐT
    if (payload.customer_phone) {
      try {
        const { data: existCust } = await supabase
          .from('customers')
          .select('id, full_name, email, phone, gender, birthday, fb_id, pancake_id')
          .eq('phone', payload.customer_phone)
          .maybeSingle();

        const custPayload: Record<string, any> = {
          full_name: payload.customer_name && payload.customer_name !== 'Khách hàng tiềm năng' ? payload.customer_name : undefined,
          phone: payload.customer_phone,
          email: payload.customer_email || undefined,
          gender: payload.gender || undefined,
          birthday: payload.birthday || undefined,
          fb_id: payload.fb_id || payload.psid || undefined,
          pancake_id: payload.pancake_id || undefined,
          ad_id: payload.ad_id || undefined,
          campaign_name: payload.utm_campaign || undefined,
          utm_source: payload.utm_source || undefined,
          updated_at: now
        };
        // Lọc bỏ undefined
        Object.keys(custPayload).forEach(k => custPayload[k] === undefined && delete custPayload[k]);

        if (existCust) {
          await supabase.from('customers').update(custPayload).eq('id', existCust.id);
        } else {
          custPayload.created_at = now;
          if (!custPayload.full_name) custPayload.full_name = payload.customer_name || 'Khách hàng';
          await supabase.from('customers').insert([custPayload]);
        }
      } catch (cErr: any) {
        console.warn('[Sync to Customers Table] Lỗi nhẹ:', cErr.message);
      }
    }

    console.log(`[Supabase Leads] Đã lưu thành công Lead vào bảng leads: ID ${leadId} - ${payload.customer_name} (${payload.customer_phone || 'Chưa có SĐT'})`);
    return { success: true, leadId };
  } catch (error: any) {
    console.warn(`[Supabase Leads] Lưu bảng leads gặp lỗi (${error.message}), cập nhật bảng phụ trợ meta_chat_conversations.`);
    return { success: false, error: error.message };
  }
}

/**
 * Xử lý Webhook Biểu Mẫu Khách Hàng Tiềm Năng (Meta Lead Ads / Instant Forms)
 */
export async function handleIncomingLeadgen(event: IncomingLeadgenEvent) {
  const { pageId, leadgenId, formId, adId, createdTime } = event;
  console.log(`[Meta Leadgen Webhook] Nhận Form Lead mới: LeadID ${leadgenId} trên Page ${pageId}`);

  const pageToken = await getPageAccessToken(pageId);
  let customerName = `Khách Lead Form #${leadgenId.slice(-4)}`;
  let customerPhone: string | null = null;
  let customerEmail: string | null = null;
  let formData: Record<string, any> = {};

  if (pageToken) {
    const details = await fetchLeadgenDetailsFromMeta(leadgenId, pageToken);
    if (details) {
      customerName = details.customer_name;
      customerPhone = details.customer_phone;
      customerEmail = details.customer_email;
      formData = details.form_data;
    }
  }

  // 1. Lưu trực tiếp vào bảng `leads` trong Supabase
  const leadPayload: LeadRecord = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    source_channel: 'meta_lead_form',
    page_id: pageId,
    ad_id: adId || null,
    form_id: formId || null,
    leadgen_id: leadgenId,
    utm_source: 'facebook_lead_ad',
    form_data: formData,
    status: 'lead_captured',
    notes: `Biểu mẫu đăng ký Meta Lead Ads (Form ID: ${formId || 'N/A'})`,
    created_at: createdTime ? new Date(createdTime * 1000).toISOString() : new Date().toISOString()
  };

  const dbResult = await saveLeadToDatabase(leadPayload);

  // 2. Kích hoạt sự kiện Lead lên Meta Conversions API (CAPI)
  if (customerPhone || customerEmail) {
    try {
      console.log(`[Meta CAPI] Tự động bắn sự kiện Lead cho Form: ${customerName} - ${customerPhone}`);
      await sendMetaConversionEvent({
        event_name: 'Lead',
        tracking_type: 'FORM_LEAD',
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        customer_email: customerEmail || undefined,
        meta_lead_id: leadgenId,
        utm_source: 'facebook_lead_form'
      });
    } catch (capiErr: any) {
      console.warn('[Meta CAPI] Lỗi gửi event từ Lead Form:', capiErr.message);
    }
  }

  return dbResult;
}

/**
 * Xử lý sự kiện tin nhắn gửi tới Webhook (Tự động lọc tin nhắn có SĐT hoặc biểu mẫu và lưu vào `leads`)
 */
export async function handleIncomingMessage(event: IncomingMessengerMessage) {
  const supabase = getAdminSupabaseClient();
  const { senderId, recipientId, timestamp, messageId, text = '', attachments = [], referral } = event;

  const pageToken = await getPageAccessToken(recipientId);

  // 1. Tìm hoặc tạo conversation trong `meta_chat_conversations`
  let { data: conversation } = await supabase
    .from('meta_chat_conversations')
    .select('*')
    .eq('page_id', recipientId)
    .eq('psid', senderId)
    .maybeSingle();

  let customerName = conversation?.customer_name;
  let customerAvatar = conversation?.customer_avatar;

  // Nếu là cuộc hội thoại mới, cố gắng lấy tên từ Graph API
  if (!customerName && pageToken) {
    const profile = await fetchMetaUserProfile(senderId, pageToken);
    customerName = profile.name;
    customerAvatar = profile.avatar_url;
  }

  // Tự động nhận diện số điện thoại và email
  const detectedPhone = extractVietnamesePhone(text);
  const detectedEmail = extractEmail(text);

  const phoneToSave = detectedPhone || conversation?.customer_phone || null;
  const emailToSave = detectedEmail || conversation?.customer_email || null;

  // Lấy thông tin quảng cáo nếu có referral
  const adId = referral?.ad_id || conversation?.ad_id || null;
  const utmSource = referral?.source || conversation?.utm_source || 'facebook_messenger';
  const utmCampaign = referral?.ref || conversation?.utm_campaign || null;

  const conversationPayload: Record<string, any> = {
    page_id: recipientId,
    psid: senderId,
    customer_name: customerName || `Khách Meta #${senderId.slice(-4)}`,
    customer_avatar: customerAvatar,
    customer_phone: phoneToSave,
    customer_email: emailToSave,
    ad_id: adId,
    utm_source: utmSource,
    utm_campaign: utmCampaign,
    last_message: text || (attachments.length > 0 ? '[Hình ảnh / Đính kèm]' : ''),
    last_message_at: new Date(timestamp || Date.now()).toISOString(),
    last_sender: 'customer',
    unread_count: (conversation?.unread_count || 0) + 1,
    status: phoneToSave ? 'lead_captured' : (conversation?.status || 'active'),
    updated_at: new Date().toISOString()
  };

  let conversationId = conversation?.id;

  if (conversation) {
    const { data: updated } = await supabase
      .from('meta_chat_conversations')
      .update(conversationPayload)
      .eq('id', conversation.id)
      .select()
      .single();
    if (updated) conversationId = updated.id;
  } else {
    conversationPayload.created_at = new Date().toISOString();
    const { data: inserted, error: insertErr } = await supabase
      .from('meta_chat_conversations')
      .insert([conversationPayload])
      .select()
      .single();
    
    if (insertErr) {
      console.error('[Meta Messenger] Lỗi tạo conversation mới:', insertErr.message);
    } else if (inserted) {
      conversationId = inserted.id;
    }
  }

  // 2. Lưu tin nhắn vào `meta_chat_messages`
  if (conversationId) {
    const messagePayload = {
      conversation_id: conversationId,
      mid: messageId || `mid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sender_type: 'customer',
      sender_id: senderId,
      sender_name: customerName || 'Khách hàng',
      message_text: text,
      attachments: attachments && attachments.length > 0 ? attachments : [],
      is_read: false,
      created_at: new Date(timestamp || Date.now()).toISOString()
    };

    const { error: msgErr } = await supabase
      .from('meta_chat_messages')
      .insert([messagePayload]);

    if (msgErr) {
      console.error('[Meta Messenger] Lỗi lưu message:', msgErr.message);
    }
  }

  // 3. NẾU TIN NHẮN CHỨA SỐ ĐIỆN THOẠI -> TỰ ĐỘNG LƯU TRỰC TIẾP VÀO BẢNG 'leads'
  if (phoneToSave) {
    const leadRecord: LeadRecord = {
      customer_name: customerName || `Khách Meta #${senderId.slice(-4)}`,
      customer_phone: phoneToSave,
      customer_email: emailToSave,
      customer_avatar: customerAvatar,
      source_channel: 'facebook_messenger',
      page_id: recipientId,
      psid: senderId,
      ad_id: adId,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      message_text: text,
      status: 'lead_captured',
      last_message_at: new Date(timestamp || Date.now()).toISOString()
    };

    await saveLeadToDatabase(leadRecord);
  }

  // 4. Nếu phát hiện số điện thoại mới, tự động kích hoạt sự kiện Lead lên Meta Conversions API
  if (detectedPhone && !conversation?.customer_phone) {
    try {
      console.log(`[Meta Messenger] Tự động bắn sự kiện Lead cho SĐT mới phát hiện: ${detectedPhone}`);
      await sendMetaConversionEvent({
        event_name: 'Lead',
        tracking_type: 'PHONE_LEAD',
        customer_name: customerName,
        customer_phone: detectedPhone,
        customer_email: detectedEmail || undefined,
        meta_lead_id: adId || undefined,
        utm_source: utmSource || 'messenger',
        utm_campaign: utmCampaign || undefined
      });
    } catch (e: any) {
      console.warn('[Meta Messenger] Không thể bắn auto lead:', e?.message);
    }
  }

  return { success: true, conversationId };
}

/**
 * Gửi tin nhắn trả lời từ CRM tới khách hàng qua Meta Graph API
 */
export async function sendReplyMessage(conversationId: string, text: string, staffName: string = 'Tư vấn viên Tour CRM') {
  const supabase = getAdminSupabaseClient();

  // 1. Lấy thông tin conversation
  const { data: conv, error: convErr } = await supabase
    .from('meta_chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convErr || !conv) {
    throw new Error('Không tìm thấy cuộc trò chuyện');
  }

  const { page_id: pageId, psid } = conv;
  const pageToken = await getPageAccessToken(pageId);

  // 2. Gửi qua Meta Graph API nếu có pageToken
  let metaMessageId = `crm_out_${Date.now()}`;
  if (pageToken) {
    try {
      const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`;
      const payload = {
        recipient: { id: psid },
        messaging_type: 'RESPONSE',
        message: { text }
      };
      const fbResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const fbData = await fbResponse.json() as any;
      if (!fbResponse.ok) {
        throw new Error(fbData?.error?.message || `HTTP error ${fbResponse.status}`);
      }
      if (fbData?.message_id) {
        metaMessageId = fbData.message_id;
      }
    } catch (fbErr: any) {
      console.error('[Meta Messenger Send] Lỗi Graph API:', fbErr.message);
      throw new Error(`Lỗi gửi tin nhắn qua Facebook: ${fbErr.message}`);
    }
  } else {
    console.warn(`[Meta Messenger Send] Chưa có Page Token cho Page ID ${pageId}, lưu tin nhắn nội bộ.`);
  }

  // 3. Lưu tin nhắn vào bảng `meta_chat_messages`
  const { data: newMsg, error: msgErr } = await supabase
    .from('meta_chat_messages')
    .insert([{
      conversation_id: conversationId,
      mid: metaMessageId,
      sender_type: 'page',
      sender_id: pageId,
      sender_name: staffName,
      message_text: text,
      attachments: [],
      is_read: true,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (msgErr) {
    console.error('[Meta Messenger Send] Lỗi lưu db:', msgErr.message);
  }

  // 4. Cập nhật conversation
  await supabase
    .from('meta_chat_conversations')
    .update({
      last_message: text,
      last_message_at: new Date().toISOString(),
      last_sender: 'page',
      unread_count: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  return { success: true, message: newMsg };
}
