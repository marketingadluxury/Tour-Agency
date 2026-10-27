import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { updateSupabaseClient } from './lib/supabase';

async function bootstrap() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.supabaseUrl && data.supabaseAnonKey) {
          updateSupabaseClient(data.supabaseUrl, data.supabaseAnonKey);
        }
      } else {
        console.warn('Backend trả về cấu hình không phải định dạng JSON (có thể do server đang khởi động).');
      }
    }
  } catch (err) {
    console.error('Không thể nạp cấu hình động Supabase từ backend:', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW registered: ', registration);
      }).catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
}

bootstrap();
