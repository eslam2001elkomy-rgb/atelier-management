import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Key, Bell, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchSettings, upsertSetting } from '../lib/database';
import { changePassword } from '../lib/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '', whatsapp: '' });
  const [alertBefore, setAlertBefore] = useState('2');
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id)
      .then((rows: any[]) => {
        const get = (k: string) => rows.find((r) => r.key === k)?.value;
        setProfile({ name: get('owner_name') || '', phone: get('owner_phone') || '', whatsapp: get('owner_whatsapp') || '' });
        if (get('alert_before_hours')) setAlertBefore(get('alert_before_hours'));
      })
      .catch((e) => console.error(e));
  }, [user]);

  const validatePhone = (phone: string) => /^\d{11}$/.test(phone);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (profile.phone && !validatePhone(profile.phone)) return setNote('رقم الهاتف يجب أن يكون 11 رقماً');
    try {
      await upsertSetting(user.id, 'owner_name', profile.name);
      await upsertSetting(user.id, 'owner_phone', profile.phone);
      await upsertSetting(user.id, 'owner_whatsapp', profile.whatsapp);
      setNote('تم حفظ البيانات الشخصية');
    } catch {
      setNote('تعذر الحفظ. حاول مرة أخرى.');
    }
  };

  const handleSaveAlert = async () => {
    if (!user) return;
    const n = Number(alertBefore);
    if (!Number.isFinite(n) || n < 0 || n > 168) return setNote('اكتب عدد ساعات بين 0 و168');
    try {
      await upsertSetting(user.id, 'alert_before_hours', String(n));
      setNote('تم حفظ توقيت التنبيه');
    } catch {
      setNote('تعذر الحفظ. حاول مرة أخرى.');
    }
  };

  const handleChangePassword = async () => {
    if (passData.new.length < 10) return setNote('كلمة المرور الجديدة لازم تكون 10 حروف على الأقل');
    if (passData.new !== passData.confirm) return setNote('كلمات السر غير متطابقة');
    const ok = await changePassword(passData.old, passData.new);
    setNote(ok ? 'تم تغيير كلمة المرور' : 'كلمة السر القديمة غير صحيحة أو تعذر التغيير');
    if (ok) setPassData({ old: '', new: '', confirm: '' });
  };

  return (
    <div className="p-6 space-y-6 bg-[#020206] min-h-screen text-gray-100">
      <h2 className="text-2xl font-black text-amber-500 mb-6">الإعدادات</h2>
      {note && <div className="bg-[#05050b] border border-amber-500/30 rounded-xl p-3 text-sm text-amber-400">{note}</div>}

      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18} /> بيانات الملف الشخصي</h3>
        <input className="w-full bg-[#090912] p-3 rounded-xl mb-3 border border-gray-800" placeholder="اسم صاحب الأتيليه" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الهاتف (11 رقم)" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <input className="bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="رقم الواتساب" value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} />
        </div>
        <button onClick={handleSaveProfile} className="mt-4 w-full bg-amber-600 p-2 rounded-xl text-black font-bold flex justify-center gap-2"><Save size={18} /> حفظ البيانات</button>
      </div>

      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Bell size={18} /> تنبيهات الأوردرات (قبل التسليم بكم ساعة)</h3>
        <input type="number" className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" value={alertBefore} onChange={(e) => setAlertBefore(e.target.value)} />
        <button onClick={handleSaveAlert} className="mt-4 w-full bg-amber-600 p-2 rounded-xl text-black font-bold flex justify-center gap-2"><Save size={18} /> حفظ وقت التنبيه</button>
      </div>

      <div className="bg-[#05050b] p-6 rounded-3xl border border-gray-900">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Key size={18} /> تغيير كلمة المرور</h3>
        <input type={showPass ? 'text' : 'password'} autoComplete="current-password" value={passData.old} className="w-full bg-[#090912] p-3 rounded-xl mb-2 border border-gray-800" placeholder="كلمة السر القديمة" onChange={(e) => setPassData({ ...passData, old: e.target.value })} />
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} autoComplete="new-password" value={passData.new} className="w-full bg-[#090912] p-3 rounded-xl mb-2 border border-gray-800" placeholder="كلمة السر الجديدة (10 حروف على الأقل)" onChange={(e) => setPassData({ ...passData, new: e.target.value })} />
          <button onClick={() => setShowPass(!showPass)} className="absolute left-3 top-3 text-gray-500">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        <input type="password" autoComplete="new-password" value={passData.confirm} className="w-full bg-[#090912] p-3 rounded-xl border border-gray-800" placeholder="تأكيد كلمة السر" onChange={(e) => setPassData({ ...passData, confirm: e.target.value })} />
        <button onClick={handleChangePassword} className="mt-4 w-full bg-amber-600 p-3 rounded-xl text-black font-black">تغيير كلمة المرور</button>
      </div>
    </div>
  );
}
