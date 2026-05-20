import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
  phone: string;
  whatsapp: string;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(username: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) return null;

    const hashHex = await sha256(password);
    if (hashHex !== data.password_hash) return null;

    const user: User = {
      id: data.id,
      username: data.username,
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
    };

    localStorage.setItem('atelier_user', JSON.stringify(user));
    return user;
  } catch (err) {
    console.error('Login error:', err);
    return null;
  }
}

export async function registerUser(username: string, password: string): Promise<User | null> {
  try {
    const hashHex = await sha256(password);

    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash: hashHex })
      .select()
      .maybeSingle();

    if (error || !data) return null;

    const user: User = {
      id: data.id,
      username: data.username,
      phone: '',
      whatsapp: '',
    };

    localStorage.setItem('atelier_user', JSON.stringify(user));
    return user;
  } catch (err) {
    console.error('Register error:', err);
    return null;
  }
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('atelier_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('atelier_user');
}

export async function updateUser(id: string, updates: Partial<User>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) return false;

    const current = getCurrentUser();
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem('atelier_user', JSON.stringify(updated));
    }
    return true;
  } catch {
    return false;
  }
}

export async function changePassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const hashHex = await sha256(newPassword);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashHex })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}
