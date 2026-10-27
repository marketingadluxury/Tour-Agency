import express from 'express';
import { getAdminSupabaseClient } from '../services/supabaseService.js';

const router = express.Router();

export const DEFAULT_MCP_ENDPOINT = process.env.TAX_MCP_ENDPOINT || '';
const CURRENT_LOCAL_VERSION = 'v2.2.0';
const CURRENT_LOCAL_DATE = '06/09/2026';

/**
 * Lấy URL MCP Endpoint đang kích hoạt (Ưu tiên: Body request > Cấu hình Supabase > Mặc định)
 */
async function getActiveMcpEndpoint(req: express.Request): Promise<{ endpoint: string; source: 'request' | 'database' | 'default' }> {
  // 1. Ưu tiên endpoint gửi kèm trong request body (Dùng khi test thử nghiệm hoặc override từ client)
  if (req.body?.endpoint && typeof req.body.endpoint === 'string' && req.body.endpoint.trim().startsWith('http')) {
    return { endpoint: req.body.endpoint.trim(), source: 'request' };
  }

  // 2. Kiểm tra trong Supabase app_settings
  try {
    const supabase = getAdminSupabaseClient(req);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tax_mcp_config')
      .maybeSingle();

    if (data?.value?.endpoint && typeof data.value.endpoint === 'string' && data.value.endpoint.trim().startsWith('http')) {
      return { endpoint: data.value.endpoint.trim(), source: 'database' };
    }
  } catch (err) {
    // Supabase chưa kết nối hoặc lỗi, chuyển sang fallback mặc định
  }

  return { endpoint: DEFAULT_MCP_ENDPOINT, source: 'default' };
}

// 1. Lấy cấu hình MCP Endpoint hiện tại
router.get(['/api/tax/mcp-config', '/tax/mcp-config'], async (req, res) => {
  try {
    const { endpoint, source } = await getActiveMcpEndpoint(req);
    res.json({
      success: true,
      endpoint,
      defaultEndpoint: DEFAULT_MCP_ENDPOINT,
      isDefault: source === 'default',
      source
    });
  } catch (err: any) {
    res.json({
      success: true,
      endpoint: DEFAULT_MCP_ENDPOINT,
      defaultEndpoint: DEFAULT_MCP_ENDPOINT,
      isDefault: true,
      source: 'default'
    });
  }
});

// 2. Cập nhật cấu hình MCP Endpoint từ Frontend
router.post(['/api/tax/mcp-config', '/tax/mcp-config'], async (req, res) => {
  try {
    const newEndpoint = req.body?.endpoint ? String(req.body.endpoint).trim() : '';

    if (newEndpoint && !newEndpoint.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'Địa chỉ Endpoint MCP phải là một URL hợp lệ bắt đầu bằng http:// hoặc https://'
      });
    }

    const supabase = getAdminSupabaseClient(req);
    const targetEndpoint = newEndpoint || DEFAULT_MCP_ENDPOINT;

    await supabase.from('app_settings').upsert({
      key: 'tax_mcp_config',
      value: {
        endpoint: targetEndpoint,
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Đã lưu cấu hình Endpoint MCP Server thành công.',
      endpoint: targetEndpoint,
      isDefault: targetEndpoint === DEFAULT_MCP_ENDPOINT
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Không thể lưu cấu hình MCP: ${err?.message || 'Lỗi server'}`
    });
  }
});

// 3. Check MCP Skill Update (Có hỗ trợ nhận endpoint động từ frontend)
router.all(['/api/tax/check-mcp-update', '/tax/check-mcp-update'], async (req, res) => {
  try {
    const { endpoint: targetEndpoint, source } = await getActiveMcpEndpoint(req);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const mcpResponse = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'list_skills',
          arguments: {}
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!mcpResponse.ok) {
      res.status(502).json({
        success: false,
        error: `Máy chủ MCP phản hồi mã lỗi HTTP ${mcpResponse.status}`,
        currentVersion: CURRENT_LOCAL_VERSION,
        currentDate: CURRENT_LOCAL_DATE,
        endpointUsed: targetEndpoint
      });
      return;
    }

    const mcpData = await mcpResponse.json();
    const isMcpError = Boolean(mcpData?.result?.isError);
    const content = mcpData?.result?.content?.[0]?.text;
    let skillInfo = null;

    if (!isMcpError && content && typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const skillsList = JSON.parse(trimmed);
          skillInfo = Array.isArray(skillsList) ? skillsList.find((s: any) => s.name === 'thue-vietnam') : null;
        } catch {
          skillInfo = null;
        }
      }
    }

    if (isMcpError || !skillInfo) {
      // Khi MCP Server trả về thông báo lỗi hoặc không có skill
      const errorMessage = typeof content === 'string' && content.length < 200 
        ? content 
        : 'Khóa MCP đã bị thu hồi hoặc máy chủ phản hồi lỗi.';

      res.json({
        success: true,
        serverStatus: 'cached',
        currentVersion: CURRENT_LOCAL_VERSION,
        latestVersion: CURRENT_LOCAL_VERSION,
        updatedAt: CURRENT_LOCAL_DATE,
        hasUpdate: false,
        endpointUsed: targetEndpoint,
        endpointSource: source,
        message: `Đang sử dụng quy chuẩn thuế đóng gói sẵn (v2.2.0). (${errorMessage})`,
        skillName: 'thue-vietnam',
        description: 'Quy chuẩn thuế Việt Nam 2025 - 2026',
        mcpNotice: errorMessage
      });
      return;
    }

    const updatedAt = skillInfo?.updatedAt ? new Date(skillInfo.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : CURRENT_LOCAL_DATE;

    res.json({
      success: true,
      serverStatus: 'online',
      currentVersion: CURRENT_LOCAL_VERSION,
      latestVersion: CURRENT_LOCAL_VERSION,
      updatedAt: updatedAt,
      rawUpdatedAt: skillInfo?.updatedAt || null,
      hasUpdate: false,
      endpointUsed: targetEndpoint,
      endpointSource: source,
      message: 'Hệ thống đang sử dụng phiên bản quy chuẩn thuế mới nhất từ MCP Server.',
      skillName: 'thue-vietnam',
      description: skillInfo?.description || 'Quy chuẩn thuế Việt Nam 2025 - 2026'
    });
  } catch (error: any) {
    res.json({
      success: true,
      serverStatus: 'cached',
      currentVersion: CURRENT_LOCAL_VERSION,
      latestVersion: CURRENT_LOCAL_VERSION,
      updatedAt: CURRENT_LOCAL_DATE,
      hasUpdate: false,
      message: 'Đang sử dụng dữ liệu quy chuẩn cục bộ (v2.2.0) đảm bảo tính ổn định.',
      error: error?.message
    });
  }
});

export default router;
