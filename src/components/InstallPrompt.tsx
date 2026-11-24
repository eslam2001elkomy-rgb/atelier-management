import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const DISMISS_KEY = 'atelier_install_dismissed_at';
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function recentlyDismissed(): boolean {
  const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return !!t && Date.now() - t < DISMISS_DAYS * 86400000;
}

/** دعوة لتثبيت المنصة كتطبيق ويب. أندرويد/كروم: زر تثبيت حقيقي. آيفون: خطوات الإضافة للشاشة الرئيسية. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setHidden(false);
    };
    const onInstalled = () => { setDeferred(null); setHidden(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isIOS()) { setShowIOS(true); setHidden(false); }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* */ }
    setDeferred(null);
    setHidden(true);
  };

  if (hidden || (!deferred && !showIOS)) return null;

  return (
    <div dir="rtl" role="region" aria-label="تثبيت التطبيق" className="w-full bg-[#12121a] border-b border-amber-500/40 px-3 py-1.5 flex items-center gap-2 text-xs">
      <img src="/icon-192.png" alt="" className="w-6 h-6 rounded-md shrink-0" />
      {deferred ? (
        <>
          <span className="flex-1 min-w-0 truncate text-gray-300">ثبّت التطبيق على شاشتك الرئيسية</span>
          <button onClick={install} className="flex items-center gap-1 bg-amber-500 text-black font-bold px-3 py-1 rounded-lg">
            <Download className="w-3.5 h-3.5" /> تثبيت
          </button>
        </>
      ) : (
        <span className="flex-1 min-w-0 text-gray-300 leading-snug">
          آيفون/Safari: <Share className="inline w-3.5 h-3.5 text-amber-500" /> مشاركة ثم <PlusSquare className="inline w-3.5 h-3.5 text-amber-500" /> "إضافة إلى الشاشة الرئيسية"
        </span>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="text-gray-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
    </div>
  );
}
