import { useState } from 'react';
import { Eye, EyeOff, Save, Key, Bell, Phone, User, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  // حالات بيانات الأتيليه
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [alertBefore, setAlertBefore] = useState('2'); // بالساعات

  // حالات تغيير كلمة السر
  const [showPass, setShowPass] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [status, setStatus] = useState('');

  // دالة تغيير كلمة السر
  const handlePasswordChange = async () => {
    if (passData.new !== passData.confirm) {
      setStatus('خطأ: كلمات السر غير متطابقة!');
      return;
    }
    
    // هنا يتم ربطها بـ Supabase للتحقق وتغيير الباسورد
    setStatus('جاري التغيير...');
    // قم بإضافة منطق supabase.auth.updateUser هنا
  };

  return (
    <div className="p-6 space-y-8 bg-[#020206] min-h-screen text-gray-100">
      <h2 className="text-2xl font-black text-amber-500">الإعدادات</h2>

      {/* 1. بيانات صاحب الأتيليه */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="text-amber-500" />
          <h3 className="font-bold">بيانات الملف الشخصي</h3>
        </div>
        <input className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="اسم صاحب الأتيليه" onChange={(e) => setOwnerName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 text-gray-600 w-4" />
            <input className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الموبايل للتنبيهات" onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3.5 text-gray-600 w-4" />
            <input className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الواتساب" onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 2. إعدادات التنبيهات */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-amber-500" />
          <h3 className="font-bold">نظام التنبيه التلقائي</h3>
        </div>
        <label className="text-xs text-gray-400">إرسال تنبيه قبل موعد استلام الأوردر بـ (ساعة):</label>
        <input type="number" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800 mt-2" value={alertBefore} onChange={(e) => setAlertBefore(e.target.value)} />
      </div>

      {/* 3. تغيير كلمة السر */}
      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Key className="text-amber-500" />
          <h3 className="font-bold">تغيير كلمة المرور</h3>
        </div>
        <div className="relative">
          <input type={showPass ? "text" : "password"} placeholder="كلمة السر القديمة" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" onChange={(e) => setPassData({...passData, old: e.target.value})} />
        </div>
        <div className="relative">
          <input type={showPass ? "text" : "password"} placeholder="كلمة السر الجديدة" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" onChange={(e) => setPassData({...passData, new: e.target.value})} />
          <button onClick={() => setShowPass(!showPass)} className="absolute left-3 top-3 text-gray-500">
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <input type="password" placeholder="تأكيد كلمة السر الجديدة" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" onChange={(e) => setPassData({...passData, confirm: e.target.value})} />
        
        <button onClick={handlePasswordChange} className="w-full bg-amber-600 text-black font-black py-3 rounded-xl mt-4 hover:bg-amber-500 transition-all flex items-center justify-center gap-2">
          <Save size={18} /> حفظ التغييرات
        </button>
        {status && <p className="text-center text-xs text-amber-500">{status}</p>}
      </div>
    </div>
  );
}
