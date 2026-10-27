import { createClient, SupabaseClient } from '@supabase/supabase-js';
import express from 'express';

const DEFAULT_SUPABASE_URL = 'https://nryzcsyaryjgoyoagygz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXpjc3lhcnlqZ295b2FneWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODU4MzAsImV4cCI6MjA5ODQ2MTgzMH0.Z9YJMDCg5ivN6tYVdYP1VUD_AHj7PDehsI-SprEByk8';

export function getResolvedSupabaseConfig() {
  const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const rawAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  const isValidUrl = rawUrl && !rawUrl.includes('your-supabase') && !rawUrl.includes('placeholder');
  const isValidServiceKey = rawServiceKey && !rawServiceKey.includes('your-supabase') && !rawServiceKey.includes('placeholder');
  const isValidAnonKey = rawAnonKey && !rawAnonKey.includes('your-supabase') && !rawAnonKey.includes('placeholder');

  const supabaseUrl = isValidUrl ? rawUrl : DEFAULT_SUPABASE_URL;
  const serviceRoleKey = isValidServiceKey ? rawServiceKey : '';
  const anonKey = isValidAnonKey ? rawAnonKey : DEFAULT_SUPABASE_ANON_KEY;

  return {
    supabaseUrl,
    serviceRoleKey,
    anonKey,
    activeKey: serviceRoleKey || anonKey
  };
}

export const getSupabaseClient = (req?: express.Request): SupabaseClient => {
  const { supabaseUrl, activeKey } = getResolvedSupabaseConfig();

  if (!supabaseUrl || !activeKey) {
    throw new Error('Supabase configuration is missing in environment variables.');
  }

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  };

  const authHeader = req?.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    options.global = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  return createClient(supabaseUrl, activeKey, options);
};

export const getAdminSupabaseClient = (req?: express.Request): SupabaseClient => {
  const { supabaseUrl, serviceRoleKey, activeKey } = getResolvedSupabaseConfig();

  if (!supabaseUrl || !activeKey) {
    throw new Error('Supabase configuration is missing in environment variables.');
  }

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  };

  if (!serviceRoleKey && req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      options.global = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
    }
  }

  return createClient(supabaseUrl, activeKey, options);
};

export async function ensureSupabaseBucketExists(bucketName: string, supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true
    });
    if (error) {
      const msg = error.message || '';
      if (!msg.toLowerCase().includes('already exists') && !msg.toLowerCase().includes('duplicate')) {
        console.warn(`[Supabase] Bucket creation notice for "${bucketName}":`, msg);
      }
    } else {
      console.log(`[Supabase] Created public bucket "${bucketName}"`);
    }
  } catch (err) {
    console.warn(`[Supabase] Could not create bucket "${bucketName}":`, err);
  }
}

export async function uploadFileToSupabase(
  bucketName: string,
  filePath: string,
  buffer: Buffer,
  mimeType: string,
  supabase: SupabaseClient
): Promise<string> {
  await ensureSupabaseBucketExists(bucketName, supabase);
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });
  if (error) {
    throw new Error(`[Supabase] Upload failed: ${error.message}`);
  }
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
  return publicUrl;
}

export function getPathFromPublicUrl(url: string): string | null {
  if (!url) return null;
  const prefixes = [
    '/storage/v1/object/public/crm-attachments/'
  ];
  
  const decodedUrl = decodeURIComponent(url);
  for (const prefix of prefixes) {
    const index = decodedUrl.indexOf(prefix);
    if (index !== -1) {
      return decodedUrl.substring(index + prefix.length);
    }
  }
  return null;
}

export async function getAuthenticatedUserEmail(req?: express.Request): Promise<string | undefined> {
  if (!req) return undefined;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { supabaseUrl, anonKey } = getResolvedSupabaseConfig();
      if (supabaseUrl && anonKey) {
        const client = createClient(supabaseUrl, anonKey);
        const { data: { user } } = await client.auth.getUser(token);
        return user?.email;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to get user email from token:', err);
  }
  return undefined;
}
