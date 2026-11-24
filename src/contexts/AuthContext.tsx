import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login as authLogin, logout as authLogout, userFromSession } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    // الجلسة تأتي من Supabase Auth فقط (لا يوجد تخزين محلي لمستخدم وهمي)
    supabase.auth.getSession().then(({ data }) => {
      setUser(userFromSession(data.session));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setUser(userFromSession(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const result = await authLogin(username, password);
    if (result) {
      setUser(result);
      return true;
    }
    return false;
  };

  const logout = () => {
    authLogout().finally(() => setUser(null));
  };

  const refreshUser = () => {
    supabase.auth.getSession().then(({ data }) => setUser(userFromSession(data.session)));
  };

  return (
    <AuthContext.Provider value={{ user, loading, recovery, finishRecovery: () => setRecovery(false), login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
