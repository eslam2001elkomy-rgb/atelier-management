import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrderByCode } from '../lib/database';
import { Lock, User, Search, Scissors } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<{ customer_name: string; status: string } | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(username, password);
    if (!success) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    setLoading(false);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    if (trackCode.length !== 7) {
      setTrackError('يجب إدخال كود مكون من 7 أرقام');
      return;
    }
    setTrackLoading(true);
    const result = await fetchOrderByCode(trackCode);
    if (result) {
      setTrackResult(result);
    } else {
      setTrackError('لم يتم العثور على طلب بهذا الكود');
    }
    setTrackLoading(false);
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    ready: 'جاهز',
    delivered: 'تم التسليم',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    delivered: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mb-4 shadow-lg shadow-amber-500/20">
            <Scissors className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">إدارة الأتيليه</h1>
          <p className="text-gray-400">نظام إدارة الطلبات والعملاء</p>
        </div>

        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 shadow-2xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">تسجيل الدخول</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-11 pl-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-11 pl-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        </div>

        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            تتبع الطلب
          </h2>
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">كود الطلب (7 أرقام)</label>
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all text-center text-xl tracking-[0.5em] font-mono"
                placeholder="0000000"
                maxLength={7}
                dir="ltr"
              />
            </div>
            {trackError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                {trackError}
              </div>
            )}
            {trackResult && (
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">اسم العميل</span>
                  <span className="text-white font-medium">{trackResult.customer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">حالة الطلب</span>
                  <span className={`px-3 py-1 rounded-full text-sm border ${statusColors[trackResult.status] || ''}`}>
                    {statusLabels[trackResult.status] || trackResult.status}
                  </span>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={trackLoading}
              className="w-full bg-[#1a1a2e] border border-amber-500/30 hover:border-amber-500/50 text-amber-500 font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {trackLoading ? 'جاري البحث...' : 'بحث'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
