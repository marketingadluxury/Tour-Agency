import app from './app.js';
import path from 'path';
import express from 'express';
import { startPancakeAutoSyncWorker } from './server/services/pancakeService.js';
import { initSupabaseKeepAlive } from './server/services/keepAliveService.js';

const PORT = 3000;

async function startServer() {
  // Khởi động bộ tự động giữ ấm Supabase (chống auto-pause sau 7 ngày)
  try {
    initSupabaseKeepAlive();
  } catch (e) {
    console.warn('[Server] Không thể khởi động KeepAlive Supabase:', e);
  }

  // Tạm thời dừng bộ tự động quét ngầm Pancake (Polling) theo yêu cầu
  // try {
  //   startPancakeAutoSyncWorker(30000);
  // } catch (e) {
  //   console.warn('[Server] Không thể khởi động worker Pancake:', e);
  // }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Khởi động thành công tại http://localhost:${PORT}`);
      console.log(`[Server] Đang sử dụng Google Drive làm kho lưu trữ chính`);
    });
  }
}

startServer();
