import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, User, KeyRound, Phone, ShieldCheck, ArrowRight, Scissors, Search, Eye, EyeOff, Package, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  
  // حالات تسجيل الدخول
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ميزة رؤية كلمة السر
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // حالات تتبع الطلب الحقيقي للعملاء
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [orderData, setOrderData] = useState<any | null>(null); // لحفظ بيانات الأوردر المسترجع

  // حالات استعادة كلمة المرور (OTP)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'PHONE_INPUT' | 'OTP_INPUT' | 'NEW_PASSWORD_INPUT'>('PHONE_INPUT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // معالج تسجيل الدخول المباشر والحقيقي
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      if (cleanUsername === 'admin' && cleanPassword === 'admin000') {
        // تمرير البيانات للدالة وعمل لوجن حقيقي في الكونتكست وتحديث الحالة لتفتح الصفحة الرئيسية
        await login(cleanUsername, cleanPassword);
      } else {
        // إظهار الخطأ فوراً في الواجهة لو الباسورد مش مظبوط
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الدخول، برجاء التحقق من إعدادات الـ AuthContext');
    } finally {
      setLoading(false);
    }
  };

  // 🔍 معالج تتبع الطلب الحقيقي من قاعدة البيانات (Supabase)
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackOrderCode.trim();
    if (!code) return;
    
    setTrackLoading(true);
    setTrackError('');
    setOrderData(null);

    try {
      // جلب بيانات الأوردر الحقيقي عن طريق الكود المكون من 7 أرقام
      const { data, error } = await supabase
        .from('orders') // اسم جدول الأوردرات عندك
        .select('*')
        .eq('order_code', code) // عمود كود الطلب
        .single();

      if (error || !data) {
        setTrackError('لم أجد أي أوردر مطابق بالكود المذكور في السيستم.');
      } else {
        setOrderData(data); // تخزين البيانات لعرض الاسم والحالة والصورة
      }
    } catch (err) {
      setTrackError('حدث خطأ أثناء الاتصال بالسيرفر، حاول مجدداً.');
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
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) throw error;
      setResetMessage('تم إرسال كود التأكيد المكون من 6 أرقام إلى هاتفك بنجاح.');
      setResetStep('OTP_INPUT');
    } catch (err: any) {
      setResetError(err.message || 'فشل إرسال الرسالة، تأكد من تفعيل خدمة الـ SMS');
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
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) throw error;
      setResetMessage('تم تحديث كلمة المرور بنجاح!');
      setTimeout(() => { setShowResetModal(false); setResetStep('PHONE_INPUT'); }, 2500);
    } catch (err: any) {
      setResetError(err.message || 'حدث خطأ أثناء حفظ كلمة المرور الجديدة.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-[#020206] text-gray-100 p-4 font-sans relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* الكارت الرئيسي */}
      <div className="w-full max-w-md bg-[#05050b] border border-gray-900 rounded-3xl p-6 shadow-2xl relative z-10 space-y-5">
        
        {/* اللوجو الخاص بالأتيليه */}
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
                
                {/* مدخل الباسورد مع زر الرؤية */}
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#090912] border border-gray-800/80 rounded-xl py-3 pr-11 pl-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right font-mono"
                  required
                />
                
                {/* زر إظهار وإخفاء كلمة السر */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 🔴 رسالة الخطأ تظهر هنا فوراً لو كلمة السر غلط */}
            {error && (
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-center text-xs font-bold text-rose-400 animate-pulse">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-800 disabled:to-gray-900 text-[#020206] font-black text-sm py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>

          <div className="text-center mt-3">
            <button 
              onClick={() => { setShowResetModal(true); setResetError(''); setResetMessage(''); }}
              className="text-[11px] font-bold text-amber-500/70 hover:text-amber-400 transition-colors underline decoration-dotted"
            >
              نسيت كلمة المرور؟ استعادة عبر الموبايل
            </button>
          </div>
        </div>

        {/* 🔍 قسم تتبع الأوردرات المطور والمربوط بقاعدة البيانات داخل الكارد */}
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
              {trackLoading ? 'جاري البحث...' : 'استعلام عن حالة الأوردر'}
            </button>
          </form>

          {/* 🔴 عرض رسالة الخطأ للتتبع */}
          {trackError && (
            <div className="mt-3 bg-rose-950/30 border border-rose-900/40 rounded-xl p-2.5 text-center text-[11px] text-rose-400">
              {trackError}
            </div>
          )}

          {/* 📦 شاشة عرض تفاصيل الأوردر المكتشف (الاسم، الحالة، والصور حقيقية) */}
          {orderData && (
            <div className="mt-3 bg-[#09091c] border border-amber-500/20 rounded-xl p-3 space-y-3 transition-all animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                <span className="text-[11px] text-gray-400">اسم العميل:</span>
                <span className="text-xs font-bold text-white">{orderData.customer_name}</span>
              </div>
              
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                <span className="text-[11px] text-gray-400">حالة الأوردر الحالية:</span>
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{orderData.status || 'تحت التنفيذ'}</span>
                </div>
              </div>

              {/* عرض صورة الأوردر المرفوعة في السيستم إن وجدت */}
              {orderData.image_url && (
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-400 block">صورة التصميم / المقاسات:</span>
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-800 bg-black/40">
                    <img 
                      src={orderData.image_url} 
                      alt="Order Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* النافذة المنبثقة لإرسال الـ OTP */}
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
                <p className="text-xs text-gray-400">أدخل رقم الهاتف المسجل لإرسال كود الـ OTP المكون من 6 أرقام حقيقي:</p>
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
                <button type="submit" disabled={resetLoading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-800 text-black font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1">
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
                <button type="submit" disabled={resetLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-800 text-white font-black text-xs py-3 rounded-xl transition-all">
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
                    className="w-full bg-[#090912] border border-gray-800 rounded-xl py-3 pr-11 pl-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all text-right"
                    required
                  />
                </div>
                <button type="submit" disabled={resetLoading} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs py-3 rounded-xl transition-all">
                  {resetLoading ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </form>
            )}

            <button onClick={() => setShowResetModal(false)} className="w-full mt-4 text-[11px] font-bold text-gray-600 hover:text-gray-400 transition-colors text-center block pt-2 border-t border-gray-900">
              إلغاء والعودة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
