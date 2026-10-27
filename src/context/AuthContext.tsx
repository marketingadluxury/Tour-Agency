import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { Role, EmploymentStatus } from '../types';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  company_name: string;
  role: Role;
  employment_status?: EmploymentStatus;
  resigned_at?: string | null;
  resigned_note?: string | null;
  join_date?: string | null;
  official_start_date?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  leader_id?: string | null;
  leader_name?: string | null;
  email?: string;
  address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  tier?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  updateProfile: async () => {},
  updatePassword: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let profileData = data as UserProfile | null;

      // Fallback if profile doesn't exist (e.g., registered before trigger)
      if (error && error.code === 'PGRST116') {
        const isDefaultAdmin = email === 'admin@yourcompany.com';
        const newProfile = {
          id: userId,
          full_name: email || 'Người dùng',
          phone: '',
          company_name: '',
          role: (isDefaultAdmin ? 'admin' : 'agent') as Role
        };
        await supabase.from('profiles').insert([newProfile]);
        profileData = newProfile as UserProfile;
      }

      if (profileData) {
        // Auto-assign admin role to admin@yourcompany.com
        const isDefaultAdmin = email === 'admin@yourcompany.com';
        if (isDefaultAdmin) {
          if (profileData.role !== 'admin') {
             await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          }
          profileData.role = 'admin';
        }
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Offline mode: Simulate a default admin user session so they can play around easily
      const mockUser = {
        id: 'offline-admin-id',
        email: 'admin@yourcompany.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      setSession({
        access_token: 'offline-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'offline-refresh',
        user: mockUser as any
      });
      setUser(mockUser as any);
      setProfile({
        id: 'offline-admin-id',
        full_name: 'Quản trị viên (Offline)',
        phone: '0987654321',
        company_name: 'Tour CRM',
        role: 'admin'
      });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email);
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    if (!user) return;
    const isRealUUID = (idStr: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);

    if (!isSupabaseConfigured() || !isRealUUID(user.id)) {
      setProfile(prev => prev ? { ...prev, ...newProfile } : null);
      return;
    }
    let currentPayload: Record<string, any> = { ...newProfile };
    let retryCount = 0;
    let success = false;
    let lastError: any = null;

    while (retryCount < 5 && !success) {
      const { error } = await supabase
        .from('profiles')
        .update(currentPayload)
        .eq('id', user.id);

      if (!error) {
        success = true;
        break;
      }
      lastError = error;
      const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));

      if (error.code === '42703' || error.code === 'PGRST204' || (errorMsg && errorMsg.includes('Could not find the'))) {
        const match = errorMsg.match(/'([^']+)' column/) || errorMsg.match(/column "([^"]+)"/);
        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(`[Self-Healing] Cột '${missingCol}' không tồn tại trong bảng profiles, loại bỏ và thử lại...`);
          delete currentPayload[missingCol];
          retryCount++;
          continue;
        }
      }
      break;
    }

    if (!success && lastError) {
      console.warn('Không thể đồng bộ profile lên Supabase (chỉ lưu local state):', lastError);
    }
    setProfile(prev => prev ? { ...prev, ...newProfile } : null);
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured()) {
      console.log('Mật khẩu mới (Offline Mock):', password);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, updateProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
