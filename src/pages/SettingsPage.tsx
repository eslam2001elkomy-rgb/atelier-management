import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUser, changePassword } from '../lib/auth';
import { upsertSetting, fetchSettings } from '../lib/database';
import { User, Phone, MessageCircle, Lock, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const settings = await fetchSettings(user.id);
      const phoneSetting = settings?.find((s: any) => s.key === 'atelier_phone');
      const whatsappSetting = settings?.find((s: any) => s.key === 'whatsapp');
      if (phoneSetting) setPhone(phoneSetting.value);
      if (whatsappSetting) setWhatsapp(whatsappSetting.value);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser(user.id, { username, phone, whatsapp });
      await upsertSetting(user.id, 'atelier_phone', phone);
      await upsertSetting(user.id, 'whatsapp', whatsapp);
      refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      alert('كلمات المرور غير متطابقة');
      return;
    }
    if (newPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSaving(true);
    try {
      await changePassword(user.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile */}
      <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          الملف الشخصي
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">رقم هاتف الأتيليه</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-10 pl-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                dir="ltr"
                placeholder="05xxxxxxxx"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">رقم الواتساب</label>
            <div className="relative">
              <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-10 pl-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                dir="ltr"
                placeholder="05xxxxxxxx"
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-semibold px-6 py-2.5 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'تم الحفظ' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-500" />
          تغيير كلمة المرور
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={saving || !newPassword}
            className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-semibold px-6 py-2.5 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {saved ? 'تم التغيير' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>
    </div>
  );
}
