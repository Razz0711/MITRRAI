// ============================================
// MitrRAI - Auth Context (Supabase Auth)
// Cookie-based sessions via @supabase/ssr
// ============================================

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseBrowser } from './supabase-browser';

interface User {
  id: string;
  name: string;
  email: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
  dob: string;            // YYYY-MM-DD
  showBirthday: boolean;  // privacy toggle
  createdAt: string;
  // Batch-matching fields
  matchKey: string;
  programType: string;
  batchYear: string;
  deptCode: string;
  rollNo: string;
  deptKnown: boolean;
  profileAutoFilled: boolean;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
  dob: string;
  // Batch-matching fields
  matchKey?: string;
  programType?: string;
  batchYear?: string;
  deptCode?: string;
  rollNo?: string;
  deptKnown?: boolean;
  profileAutoFilled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseUser(supabaseUser: any): User {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name: meta.name || '',
    email: supabaseUser.email || '',
    admissionNumber: meta.admissionNumber || '',
    department: meta.department || '',
    yearLevel: meta.yearLevel || '',
    dob: meta.dob || '',
    showBirthday: meta.showBirthday !== false,
    createdAt: supabaseUser.created_at || '',
    matchKey: meta.matchKey || '',
    programType: meta.programType || '',
    batchYear: meta.batchYear || '',
    deptCode: meta.deptCode || '',
    rollNo: meta.rollNo || '',
    deptKnown: meta.deptKnown !== false,
    profileAutoFilled: meta.profileAutoFilled === true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = mapSupabaseUser(session.user);
        setUser(u);
        // Set localStorage for backward-compat with pages that read it directly
        localStorage.setItem('mitrrai_student_id', u.id);
        localStorage.setItem('mitrrai_student_name', u.name);
        localStorage.setItem('mitrrai_session', JSON.stringify(u));
        
        // Update last_active_at for DAU tracking
        fetch('/api/auth/ping', { method: 'POST' }).catch(() => {});
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const u = mapSupabaseUser(session.user);
          setUser(u);
          localStorage.setItem('mitrrai_student_id', u.id);
          localStorage.setItem('mitrrai_student_name', u.name);
          localStorage.setItem('mitrrai_session', JSON.stringify(u));

          if (_event === 'SIGNED_IN') {
            fetch('/api/auth/ping', { method: 'POST' }).catch(() => {});
          }
        } else {
          setUser(null);
          localStorage.removeItem('mitrrai_student_id');
          localStorage.removeItem('mitrrai_student_name');
          localStorage.removeItem('mitrrai_session');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    // Strategy 1: Server-side proxy (browser→Vercel→Supabase — reliable on mobile)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: trimmedEmail, password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();

      if (!data.success) {
        if (res.status === 401 || data.error?.includes('Invalid')) {
          return { success: false, error: 'Invalid email or password' };
        }
        // Server returned an error but was reachable — don't fallback
        return { success: false, error: data.error || 'Login failed' };
      }

      // Set session from server-returned tokens
      const { error: sessionError } = await supabaseBrowser.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (!sessionError) {
        return { success: true };
      }
      console.warn('[Auth] setSession failed, trying direct login:', sessionError.message);
    } catch (err) {
      console.warn('[Auth] Server proxy login failed, trying direct:', (err as Error).message);
    }

    // Strategy 2: Fallback — direct client→Supabase (in case our API route has issues)
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      console.error('[Auth] Both login strategies failed:', err);
      return { success: false, error: 'Unable to reach our servers. Please check your internet connection and try again.' };
    }
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Step 1: Create the user on the server (uses admin API for auto-confirmation)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
      let res: Response;
      try {
        res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'signup', ...data }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        if ((fetchErr as Error).name === 'AbortError') {
          return { success: false, error: 'Request timed out — please check your connection and try again.' };
        }
        return { success: false, error: 'Network error — please check your connection and try again.' };
      } finally {
        clearTimeout(timeout);
      }
      const result = await res.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to create account' };
      }

      // Step 2: Sign in via server proxy (more reliable on mobile)
      const loginResult = await login(data.email.trim().toLowerCase(), data.password);
      if (!loginResult.success) {
        return { success: false, error: 'Account created! But auto-login failed — please go back and sign in with your email & password.' };
      }

      return { success: true };
    } catch (err) {
      console.error('signup:', err);
      return { success: false, error: 'Signup failed. Please try again.' };
    }
  };

  const logout = () => {
    supabaseBrowser.auth.signOut();
    setUser(null);
    localStorage.removeItem('mitrrai_session');
    localStorage.removeItem('mitrrai_student_id');
    localStorage.removeItem('mitrrai_student_name');
    // Clean up old localStorage auth data
    localStorage.removeItem('mitrrai_users');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
