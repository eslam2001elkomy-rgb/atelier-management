import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, User, KeyRound, Phone, ShieldCheck, ArrowRight, Scissors, Search } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  
  // حالات تسجيل الدخول
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // حالات تتبع الطلب (خارج تسجيل الدخول)
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // حالات استعادة كلمة المرور (OTP)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'PHONE_INPUT' | 'OTP_INPUT' | 'NEW_PASSWORD_INPUT'>('PHONE_INPUT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // معالج تسجيل الدخول بالبيانات الثابتة (admin / admin000)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      if (cleanUsername === 'admin' && cleanPassword === 'admin000') {
        await login(cleanUsername, cleanPassword);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالسيستم، برجاء المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  // معالج تتبع الطلب للعملاء من الخارج
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrderCode.trim()) return;
    
    setTrackLoading(true);
    try {
      // هنا تضع منطق البحث عن الأوردر في قاعدة البيانات وعرضه للمستخدم
      console.log('جاري تتبع الطلب ذو الكود:', trackOrderCode.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setTrackLoading(false);
    }
  };

  // إرسال كود الـ 6 أرقام الحقيقي إلى الهاتف عبر Supabase
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('01')) {
      formattedPhone = '+20' + formattedPhone.substring(1);
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setResetMessage('تم إرسال كود التأكيد المكون من 6 أرقام إلى هاتفك بنجاح.');
      setResetStep('OTP_INPUT');
    } catch (err: any) {
      setResetError(err.message || 'فشل إرسال الرسالة، تأكد من تفعيل خدمة الـ SMS في Supabase');
    } finally {
      setResetLoading(false);
    }
  };

  // التحقق من كود الـ 6 أرقام المستلم
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('01')) {
      formattedPhone = '+20' + formattedPhone.substring(1);
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms',
      });

      if (error) throw error;

      setResetMessage('تم التحقق بنجاح! اكتب الباسورد الجديد للاستبدال.');
      setResetStep('NEW_PASSWORD_INPUT');
    } catch (err: any) {
      setResetError('الكود غير صحيح أو انتهت صلاحيته.');
    } finally {
      setResetLoading(false);
    }
  };

  // تعيين كلمة المرور الجديدة في قاعدة البيانات
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      });

      if (error) throw error;

      setResetMessage('تم تحديث كلمة المرور بنجاح! يمكنك الدخول بالبيانات الجديدة.');
      setTimeout(() => {
        setShowResetModal(false);
        setResetStep('PHONE_INPUT');
        setPhoneNumber('');
        setOtpCode('');
        setNewPassword('');
      }, 2500);
    } catch (err: any) {
      setResetError(err.message || 'حدث خطأ أثناء حفظ كلمة المرور الجديدة.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-[#020206] text-gray-100 p-4 font-sans relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* الكارت الرئيسي الذي يحتوي على الدخول والتتبع */}
      <div className="w-full max-w-md bg-[#05050b] border border-gray-900 rounded-3xl p-6 shadow-2xl relative z-10 space-y-6">
        
        {/* اللوجو الخاص بالأتيليه */}
        <div className="flex flex-col items-center">
          <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/10 mb-3">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">إدارة الأتيليه</h1>
          <p className="text-xs text-gray-500 font-bold mt-1">نظام إدارة الطلبات والعملاء الذكي</p>
        </div>

        {/* قسم تسجيل الدخول الداخلي */}
        <div className="bg-[#070710]/50 border border-gray-900 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-center mb-4 text-gray-300">تسجيل الدخول</h2>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1.5 mr-1">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin" 
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
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#090912] border border-gray-800/80 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                  required
                />
              </div>
            </div>

            {/* رسالة الخطأ للمسؤول */}
            {error && (
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-center text-xs font-bold text-rose-400">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-800 disabled:to-gray-900 text-[#020206] font-black text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/5 flex items-center justify-center gap-2"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>

          {/* خيار استعادة الحساب بالموبايل */}
          <div className="text-center mt-4">
            <button 
              onClick={() => { setShowResetModal(true); setResetError(''); setResetMessage(''); }}
              className="text-xs font-bold text-amber-500/80 hover:text-amber-400 transition-colors underline decoration-dotted"
            >
              نسيت كلمة المرور؟ استعادة عبر الموبايل
            </button>
          </div>
        </div>

        {/* 🔍 قسم تتبع الأوردرات (رجعناه بالكامل ومنور في مكانه!) */}
        <div className="border-t border-gray-900 pt-5">
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
                className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-center font-mono"
              />
            </div>
            <button 
              type="submit"
              disabled={trackLoading}
              className="w-full bg-[#0d0d1a] hover:bg-[#121225] border border-gray-800 text-gray-300 font-bold text-xs py-2.5 rounded-xl transition-all"
            >
              {trackLoading ? 'جاري البحث عن الطلب...' : 'استعلام عن حالة الأوردر'}
            </button>
          </form>
        </div>

      </div>

      {/* النافذة المنبثقة لإرسال الـ OTP المكون من 6 أرقام */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#05050b] border border-gray-800 rounded-3xl p-6 shadow-2xl relative">
            
            <div className="flex items-center gap-2 mb-4 border-b border-gray-900 pb-3">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-white">استعادة الحساب برقم هاتف صاحب الأتيليه</h3>
            </div>

            {resetError && <div className="mb-4 bg-rose-950/40 border border-rose-900/50 rounded-xl p-3 text-xs font-bold text-rose-400 text-center">{resetError}</div>}
            {resetMessage && <div className="mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-3 text-xs font-bold text-emerald-400 text-center">{resetMessage}</div>}

            {resetStep === 'PHONE_INPUT' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">أدخل رقم الهاتف المسجل لإرسال كود مكون من 6 أرقام حقيقي في رسالة SMS:</p>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="tel"
                    placeholder="0123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-left font-mono"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-800 text-black font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  {resetLoading ? 'جاري الإرسال...' : 'إرسال كود الـ 6 أرقام'}
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </form>
            )}

            {resetStep === 'OTP_INPUT' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-gray-400">أدخل الرمز المكون من 6 أرقام المستلم على الهاتف:</p>
                <div className="relative">
                  <ShieldCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 pr-11 pl-4 text-center tracking-[1em] text-sm text-amber-500 font-mono focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-800 text-white font-black text-xs py-3 rounded-xl transition-all"
                >
                  {resetLoading ? 'جاري التحقق...' : 'تأكيد الرمز وبدء التغيير'}
                </button>
              </form>
            )}

            {resetStep === 'NEW_PASSWORD_INPUT' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <p className="text-xs text-gray-400">اكتب كلمة المرور الجديدة:</p>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password"
                    placeholder="اكتب الباسورد الجديد"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs py-3 rounded-xl transition-all"
                >
                  {resetLoading ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </form>
            )}

            <button 
              onClick={() => setShowResetModal(false)}
              className="w-full mt-4 text-[11px] font-bold text-gray-600 hover:text-gray-400 transition-colors text-center block pt-2 border-t border-gray-900"
            >
              إلغاء والعودة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
