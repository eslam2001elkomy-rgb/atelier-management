import { useState } from 'react';
import { Eye, EyeOff, Save, Key, Bell, Phone, User, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase'; // تأكد من استيراد مكتبة supabase

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  // حالة البيانات
  const [profile, setProfile] = useState({ name: '', phone: '', whatsapp: '' });
  const [alertBefore, setAlertBefore] = useState('2');
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);

  // دالة التحقق من رقم الهاتف المصري (11 رقم)
  const validatePhone = (phone: string) => /^\d{11}$/.test(phone);

  // حفظ بيانات الملف الشخصي
  const handleSaveProfile = async () => {
    if (!validatePhone(profile.phone)) return alert('رقم الهاتف يجب أن يكون 11 رقماً');
    // هنا منطق الحفظ لـ Supabase
    alert('تم حفظ البيانات الشخصية');
  };

  // حفظ التنبيهات
  const handleSaveAlert = async () => {
    // هنا منطق حفظ توقيت التنبيه
    alert('تم حفظ توقيت التنبيه');
  };

  return (
    <div className="p-6 space-y-6 bg-[#020206] min-h-screen text-gray-100">
      <h2 className="text-2xl font-black text-amber-500 mb-6">الإعدادات</h2>

      {/* 1. الملف الشخصي */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18}/> بيانات الملف الشخصي</h3>
        <input className="w-full bg-[#090912] p-3 rounded-xl mb-3 border border-gray-800" placeholder="اسم صاحب الأتيليه" onChange={(e) => setProfile({...profile, name: e.target.value})} />
        <div className="grid grid-cols-2 gap-2">
            <input className="bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الهاتف (11 رقم)" onChange={(e) => setProfile({...profile, phone: e.target.value})} />
            <input className="bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الواتساب" onChange={(e) => setProfile({...profile, whatsapp: e.target.value})} />
        </div>
        <button onClick={handleSaveProfile} className="mt-4 w-full bg-amber-600 p-2 rounded-xl text-black font-bold flex justify-center gap-2"><Save size={18}/> حفظ البيانات</button>
      </div>

      {/* 2. التنبيهات */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Bell size={18}/> تنبيهات الأوردرات</h3>
        <input type="number" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" value={alertBefore} onChange={(e) => setAlertBefore(e.target.value)} />
        <button onClick={handleSaveAlert} className="mt-4 w-full bg-amber-600 p-2 rounded-xl text-black font-bold flex justify-center gap-2"><Save size={18}/> حفظ وقت التنبيه</button>
      </div>

      {/* 3. كلمة السر */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Key size={18}/> تغيير كلمة المرور</h3>
        <input type={showPass ? "text" : "password"} className="w-full bg-[#090912] p-3 rounded-xl mb-2 border border-gray-800" placeholder="كلمة السر القديمة" />
        <div className="relative">
            <input type={showPass ? "text" : "password"} className="w-full bg-[#090912] p-3 rounded-xl mb-2 border border-gray-800" placeholder="كلمة السر الجديدة" onChange={(e) => setPassData({...passData, new: e.target.value})} />
            <button onClick={() => setShowPass(!showPass)} className="absolute left-3 top-3 text-gray-500">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
        <input type="password" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="تأكيد كلمة السر" onChange={(e) => setPassData({...passData, confirm: e.target.value})} />
        
        <button 
            onClick={() => passData.new === passData.confirm ? alert('تم تغيير كلمة السر') : alert('كلمات السر غير متطابقة')} 
            className="mt-4 w-full bg-amber-600 p-3 rounded-xl text-black font-black"
        >
            تغيير كلمة المرور
        </button>
      </div>
    </div>
  );
}
