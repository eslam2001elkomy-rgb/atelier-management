import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, User, Scissors, Search, Eye, EyeOff, Package, CheckCircle2, X } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  
  // حالات تسجيل الدخول
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // حالات تتبع الطلب
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [orderData, setOrderData] = useState<any | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);

  // استعادة كلمة المرور عبر البريد الإلكتروني (Supabase Auth)
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      const ok = await login(cleanUsername, cleanPassword);
      if (!ok) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } catch {
      setError('تعذر الاتصال. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackOrderCode.trim();
    if (!code) return;
    
    setTrackLoading(true);
    setTrackError('');
    setOrderData(null);

    try {
      // دالة آمنة تُرجع الاسم والحالة والصورة فقط لهذا الكود (لا قراءة مباشرة لجدول الطلبات)
      const { data: rows, error } = await supabase.rpc('track_order', { p_code: code });
      const data = Array.isArray(rows) ? rows[0] : rows;

      if (error || !data) {
        setTrackError('لم أجد أي أوردر مطابق بالكود المذكور في السيستم.');
      } else {
        setOrderData(data);
        setShowTrackModal(true); 
      }
    } catch (err) {
      setTrackError('حدث خطأ أثناء الاتصال بالسيستم، يرجى إعادة المحاولة.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr('');
    setResetMsg('');
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      // رسالة واحدة دائمًا حتى لا نكشف هل البريد مسجل أم لا
      setResetMsg('لو البريد ده مسجل، هتوصلك رسالة فيها رابط لتغيير كلمة المرور.');
    } catch {
      setResetErr('تعذر إرسال الرسالة الآن. حاول بعد قليل.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-[#020206] text-gray-100 p-4 font-sans relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* الكارت الرئيسي */}
      <div className="w-full max-w-md bg-[#05050b] border border-gray-900 rounded-3xl p-6 shadow-2xl relative z-10 space-y-5">
        
        {/* اللوجو */}
        <div className="flex flex-col items-center">
          <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/10 mb-3">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">إدارة الأتيليه</h1>
          <p className="text-xs text-gray-500 font-bold mt-1">نظام إدارة الطلبات والعملاء الذكي</p>
        </div>

        {/* قسم تسجيل الدخول */}
        <div className="bg-[#070710]/50 border border-gray-900/60 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-center mb-4 text-gray-300">تسجيل الدخول للمسؤول</h2>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1.5 mr-1">البريد الإلكتروني</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full bg-[#090912] border border-gray-800/80 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1.5 mr-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#090912] border border-gray-800/80 rounded-xl py-3 pr-11 pl-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right font-mono"
                  required
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-center text-xs font-bold text-rose-400 border-dashed">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-[#020206] font-black text-sm py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'جاري توجيهك الآن...' : 'دخول'}
            </button>
          </form>

          <div className="text-center mt-3">
            <button 
              type="button"
              onClick={() => { setShowReset(true); setResetErr(''); setResetMsg(''); }}
              className="text-[11px] font-bold text-amber-500/70 hover:text-amber-400 transition-colors underline decoration-dotted"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </div>

        {/* قسم تتبع الطلب */}
        <div className="border-t border-gray-900/80 pt-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Search className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-gray-300">تتبع الطلب (للعملاء)</h3>
          </div>
          
          <form onSubmit={handleTrackOrder} className="space-y-3">
            <div className="relative">
              <input 
                type="text" 
                value={trackOrderCode}
                onChange={(e) => setTrackOrderCode(e.target.value)}
                placeholder="أدخل كود الطلب المكون من 7 أرقام" 
                className="w-full bg-[#090912] border border-gray-800 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-center font-mono"
              />
            </div>
            <button 
              type="submit"
              disabled={trackLoading}
              className="w-full bg-[#0d0d1a] hover:bg-[#121225] border border-gray-800 text-gray-300 font-bold text-xs py-2 rounded-xl transition-all"
            >
              {trackLoading ? 'جاري البحث في الأوردرات...' : 'استعلام عن حالة الأوردر'}
            </button>
          </form>

          {trackError && (
            <div className="mt-3 bg-rose-950/30 border border-rose-900/40 rounded-xl p-2.5 text-center text-[11px] text-rose-400">
              {trackError}
            </div>
          )}
        </div>

      </div>

      {/* شاشة منبثقة لعرض تفاصيل الأوردر */}
      {showTrackModal && orderData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#05050b] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <button onClick={() => setShowTrackModal(false)} className="absolute top-4 left-4 p-1.5 bg-gray-900 text-gray-400 rounded-full">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
              <Package className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-white">تفاصيل وحالة الطلب الخاص بك</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-[#090912] p-3 rounded-xl border border-gray-900">
                <span className="text-xs text-gray-400">كود الطلب:</span>
                <span className="text-xs font-mono font-bold text-amber-500">{orderData.order_code}</span>
              </div>

              <div className="flex justify-between items-center bg-[#090912] p-3 rounded-xl border border-gray-900">
                <span className="text-xs text-gray-400">اسم العميل:</span>
                <span className="text-xs font-bold text-white">{orderData.customer_name}</span>
              </div>

              <div className="flex justify-between items-center bg-[#090912] p-3 rounded-xl border border-gray-900">
                <span className="text-xs text-gray-400">حالة الأوردر الحالية:</span>
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{orderData.status || 'قيد التنفيذ'}</span>
                </div>
              </div>

              {orderData.image_url ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-gray-400 block mr-1">صورة الفستان / التصميم المعتمد:</span>
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-850 bg-black/60 relative">
                    <img src={orderData.image_url} alt="صورة الأوردر" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-[#090912] rounded-xl border border-gray-900 text-xs text-gray-500">
                  لا توجد صورة مرفقة لهذا الأوردر حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة الـ OTP المنبثقة */}
      {showReset && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-sm bg-[#05050b] border border-gray-900 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-gray-200 text-center">استعادة كلمة المرور</h3>
            <form onSubmit={handleSendReset} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="البريد الإلكتروني المسجل"
                className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-left"
                dir="ltr"
              />
              {resetMsg && <p className="text-xs text-emerald-400 text-center">{resetMsg}</p>}
              {resetErr && <p className="text-xs text-rose-400 text-center">{resetErr}</p>}
              <button type="submit" disabled={resetBusy} className="w-full bg-amber-500 text-black font-bold text-sm py-3 rounded-xl disabled:opacity-50">
                {resetBusy ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
              </button>
            </form>
            <button onClick={() => setShowReset(false)} className="w-full text-[11px] font-bold text-gray-500 pt-2 border-t border-gray-900">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
