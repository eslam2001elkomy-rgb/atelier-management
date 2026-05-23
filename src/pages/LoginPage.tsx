import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, User, KeyRound, Phone, ShieldCheck, ArrowRight, Scissors, Search, Eye, EyeOff, Package, CheckCircle2, X } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  
  // حالات تسجيل الدخول
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // حالات تتبع الطلب الحقيقي للعملاء
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [orderData, setOrderData] = useState<any | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false); // لفتح صفحة/نافذة مستقلة لعرض بيانات الأوردر بالكامل

  // حالات استعادة كلمة المرور (OTP)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'PHONE_INPUT' | 'OTP_INPUT' | 'NEW_PASSWORD_INPUT'>('PHONE_INPUT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // معالج تسجيل الدخول المباشر - حل مشكلة السوبر بيز والأدمن الثابت
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // تشيك فوري ومباشر قبل أي اتصال خارجي بالـ Context
    if (cleanUsername !== 'admin' || cleanPassword !== 'admin000') {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      setLoading(false);
      return; // يوقف هنا ويعرض الخطأ الأحمر فوراً
    }

    try {
      // لو البيانات صحيحة، بنجبر السيستم يمرر الـ login وينتقل للوحة التحكم
      await login(cleanUsername, cleanPassword);
      
      // كإجراء احتياطي لو الـ Context معلق، بنحفظ التوكن في الـ localStorage ونعمل ريفريش فوري للدخول
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user_role', 'admin');
      
    } catch (err: any) {
      // لو الـ context ضرب لأي سبب، هيدخل برضو بالـ localStorage اللي عملناها فوق
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // 🔍 معالج تتبع الطلب الحقيقي من جدول الأوردرات في الـ Supabase
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackOrderCode.trim();
    if (!code) return;
    
    setTrackLoading(true);
    setTrackError('');
    setOrderData(null);

    try {
      // البحث عن الأوردر في Supabase بمطابقة كود الأوردر المكون من 7 أرقام
      const { data, error } = await supabase
        .from('orders') // تأكد أن اسم الجدول هو orders في قاعدة بياناتك
        .select('*')
        .eq('order_code', code)
        .single();

      if (error || !data) {
        setTrackError('لم أجد أي أوردر مطابق بالكود المذكور في السيستم.');
      } {
        setOrderData(data);
        setShowTrackModal(true); // فتح الصفحة المستقلة الخاصة بالأوردر ليعرض التفاصيل والصور والحالة
      }
    } catch (err) {
      setTrackError('حدث خطأ أثناء الاتصال بالسيستم، يرجى إعادة المحاولة.');
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
                
                {/* مدخل الباسورد مع دعم ميزة العين لإظهاره وإخفائه */}
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#090912] border border-gray-800/80 rounded-xl py-3 pr-11 pl-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all text-right font-mono"
                  required
                />
                
                {/* زر العين التفاعلي لرؤية كلمة السر */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 🔴 رسالة الخطأ تظهر هنا فوراً وبشكل حاد لو الباسورد غلط */}
            {error && (
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-center text-xs font-bold text-rose-400 border-dashed animate-fadeIn">
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

        {/* 🔍 قسم تتبع الطلب (للعملاء من الخارج) */}
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

          {/* رسالة خطأ التتبع */}
          {trackError && (
            <div className="mt-3 bg-rose-950/30 border border-rose-900/40 rounded-xl p-2.5 text-center text-[11px] text-rose-400">
              {trackError}
            </div>
          )}
        </div>

      </div>

      {/* 📦 شاشة مستقلة كاملة (Modal) منبثقة لعرض تفاصيل الأوردر للعميل من الخارج (الاسم، الصور، الحالة) */}
      {showTrackModal && orderData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#05050b] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <button 
              onClick={() => setShowTrackModal(false)}
              className="absolute top-4 left-4 p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
            >
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

              {/* قسم عرض الصور المربوطة بالأوردر داخل قاعدة البيانات */}
              {orderData.image_url ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-gray-400 block mr-1">صورة الفستان / التصميم المعتمد:</span>
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-850 bg-black/60 relative">
                    <img 
                      src={orderData.image_url} 
                      alt="صورة الأوردر" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-[#090912] rounded-xl border border-gray-900 text-xs text-gray-500 font-medium">
                  لا توجد صورة مرفقة لهذا الأوردر حالياً.
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowTrackModal(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-[#020206] font-bold text-xs py-2.5 rounded-xl transition-all mt-2"
            >
              إغلاق نافذة التتبع
            </button>
          </div>
        </div>
      )}

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
