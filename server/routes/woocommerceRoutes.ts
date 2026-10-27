import { Router } from 'express';
import {
  getWooCommerceConfig,
  saveWooCommerceConfig,
  testWooCommerceConnection,
  getWooCommerceProducts,
  syncTourToWooCommerce,
  syncAllToursToWooCommerce
} from '../services/woocommerceService.js';

const router = Router();

/**
 * GET /api/woocommerce/products
 * Lấy danh sách sản phẩm Tour hiện có trên website WordPress WooCommerce
 */
router.get(['/api/woocommerce/products', '/woocommerce/products'], async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const perPage = req.query.per_page ? parseInt(req.query.per_page as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    const result = await getWooCommerceProducts(search, perPage, page);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách sản phẩm WooCommerce'
    });
  }
});

/**
 * GET /api/woocommerce/config
 * Lấy cấu hình kết nối WooCommerce (ẩn bớt secret key)
 */
router.get('/api/woocommerce/config', async (req, res) => {
  try {
    const config = await getWooCommerceConfig();
    // Ẩn secret key khi trả về cho client
    const maskedSecret = config.consumer_secret 
      ? config.consumer_secret.slice(0, 7) + '****************' 
      : '';

    res.json({
      success: true,
      data: {
        ...config,
        has_secret: !!config.consumer_secret,
        consumer_secret: maskedSecret
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy cấu hình WooCommerce'
    });
  }
});

/**
 * POST /api/woocommerce/config
 * Lưu cấu hình kết nối WooCommerce
 */
router.post('/api/woocommerce/config', async (req, res) => {
  try {
    const { site_url, consumer_key, consumer_secret, is_active, auto_sync_on_save, auto_sync_on_booking, field_mappings } = req.body;
    
    // Nếu consumer_secret bị masked (chứa dấu *) thì giữ nguyên giá trị cũ
    const updateData: any = {
      site_url,
      consumer_key,
      is_active: is_active ?? true,
      auto_sync_on_save: auto_sync_on_save ?? false,
      auto_sync_on_booking: auto_sync_on_booking ?? false,
      field_mappings
    };

    if (consumer_secret && !consumer_secret.includes('***')) {
      updateData.consumer_secret = consumer_secret;
    }

    const saved = await saveWooCommerceConfig(updateData);

    res.json({
      success: true,
      message: 'Đã lưu cấu hình kết nối WooCommerce thành công!',
      data: {
        ...saved,
        has_secret: !!saved.consumer_secret,
        consumer_secret: saved.consumer_secret ? saved.consumer_secret.slice(0, 7) + '****************' : ''
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lưu cấu hình WooCommerce'
    });
  }
});

/**
 * POST /api/woocommerce/test-connection
 * Kiểm tra kết nối tới WordPress WooCommerce
 */
router.post('/api/woocommerce/test-connection', async (req, res) => {
  try {
    const { site_url, consumer_key, consumer_secret } = req.body;
    const customConfig = (site_url && consumer_key && consumer_secret && !consumer_secret.includes('***'))
      ? { site_url, consumer_key, consumer_secret }
      : undefined;

    const result = await testWooCommerceConnection(customConfig);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi kiểm tra kết nối'
    });
  }
});

/**
 * POST /api/woocommerce/sync-tour/:id
 * Đồng bộ 1 tour cụ thể sang WooCommerce (hỗ trợ chọn sản phẩm cha hoặc tạo mới)
 */
router.post(['/api/woocommerce/sync-tour/:id', '/woocommerce/sync-tour/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID Tour' });
    }

    const { target_product_id, force_new, update_prices, update_departures, group_tour_ids } = req.body || {};
    const result = await syncTourToWooCommerce(id, { target_product_id, force_new, update_prices, update_departures, group_tour_ids });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi đồng bộ Tour sang WooCommerce'
    });
  }
});

/**
 * POST /api/woocommerce/sync-all-tours
 * Đồng bộ hàng loạt toàn bộ tour sang WooCommerce
 */
router.post('/api/woocommerce/sync-all-tours', async (req, res) => {
  try {
    const result = await syncAllToursToWooCommerce();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi đồng bộ hàng loạt Tour'
    });
  }
});

export default router;
