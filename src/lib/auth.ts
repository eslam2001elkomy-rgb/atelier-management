import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  phone: string;
  whatsapp: string;
}

export function toEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function userFromSession(session: Session | null): User | null {
  if (!session?.user) return null;
  const email = session.user.email || '';
  return {
    id: session.user.id,
    username: email,
    phone: session.user.phone || '',
    whatsapp: '',
  };
}

/** تسجيل دخول حقيقي عبر Supabase Auth. يرجع null عند الفشل. */
export async function login(username: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password: password.trim(),
    });
    if (error || !data.session) return null;
    return userFromSession(data.session);
  } catch (err) {
    console.error('Login error:', err);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return userFromSession(data.session);
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (!email) return false;
    const check = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (check.error) return false;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  } catch {
    return false;
  }
}
