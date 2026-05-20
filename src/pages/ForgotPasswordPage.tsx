import { useState } from 'react';
import { Phone, ArrowRight, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    setSent(true);
    setStep('verify');
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 4) {
      setError('يرجى إدخال كود التحقق المكون من 4 أرقام');
      return;
    }
    // Demo: accept any 4-digit code
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mb-4 shadow-lg shadow-amber-500/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">استعادة كلمة المرور</h1>
          <p className="text-gray-400">سنرسل كود تحقق لرقم هاتفك</p>
        </div>

        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-11 pl-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
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
                className="w-full bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20"
              >
                إرسال كود التحقق
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {sent && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm text-center mb-4">
                  تم إرسال كود التحقق لرقمك
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">كود التحقق</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all text-center text-2xl tracking-[1em] font-mono"
                  placeholder="0000"
                  maxLength={4}
                  dir="ltr"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20"
              >
                تحقق
              </button>
            </form>
          )}

          <button
            onClick={onBack}
            className="w-full mt-4 flex items-center justify-center gap-2 text-gray-400 hover:text-amber-500 transition-colors py-2"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
}
