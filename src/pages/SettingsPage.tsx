import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. تغيير كلمة السر
  const handleChangePassword = async () => {
    setLoading(true);
    setMessage('');
    try {
      // أولاً: التأكد من كلمة السر القديمة عن طريق تسجيل دخول مؤقت
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email, // أو رقم الهاتف حسب إعداداتك
        password: oldPassword,
      });

      if (signInError) throw new Error('كلمة السر القديمة غير صحيحة');

      // ثانياً: تغيير كلمة السر
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      setMessage('تم تغيير كلمة السر بنجاح!');
    } catch (err: any) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-xl font-bold mb-6">الإعدادات</h2>
      
      {/* قسم تغيير كلمة المرور */}
      <div className="bg-[#05050b] p-6 rounded-2xl border border-gray-900">
        <h3 className="mb-4 font-bold">تغيير كلمة المرور</h3>
        <input 
          type="password" 
          placeholder="كلمة السر القديمة"
          className="w-full bg-[#090912] p-3 rounded-xl mb-3"
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="كلمة السر الجديدة"
          className="w-full bg-[#090912] p-3 rounded-xl mb-3"
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button 
          onClick={handleChangePassword}
          disabled={loading}
          className="bg-amber-600 px-6 py-2 rounded-xl"
        >
          {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
        </button>
        {message && <p className="mt-3 text-sm">{message}</p>}
      </div>
    </div>
  );
}
