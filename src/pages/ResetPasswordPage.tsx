import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordPage() {
  const { finishRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 10) return setErr('كلمة المرور لازم تكون 10 حروف على الأقل.');
    if (pw !== pw2) return setErr('كلمتا المرور غير متطابقتين.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr('تعذر تغيير كلمة المرور. اطلب رابطًا جديدًا وحاول مرة أخرى.');
    setMsg('تم تغيير كلمة المرور.');
    setTimeout(finishRecovery, 1200);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#020206] text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#05050b] border border-gray-900 rounded-3xl p-6 space-y-3">
        <h1 className="text-center font-black">كلمة مرور جديدة</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة المرور الجديدة" autoComplete="new-password" className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 px-4 text-sm" />
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="أعد كتابتها" autoComplete="new-password" className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 px-4 text-sm" />
        {err && <p className="text-xs text-rose-400 text-center">{err}</p>}
        {msg && <p className="text-xs text-emerald-400 text-center">{msg}</p>}
        <button disabled={busy} className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50">حفظ</button>
      </form>
    </div>
  );
}
