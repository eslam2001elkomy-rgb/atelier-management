import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Volume2, Activity, Package, CheckCircle, 
  Clock, TrendingUp, Cpu, CornerDownLeft, Scissors, Sliders, Eye, X
} from 'lucide-react';

type AssistantState = 
  | 'IDLE' 
  | 'ADDING_NAME' 
  | 'ADDING_PHONE' 
  | 'ADDING_PRICE' 
  | 'ADDING_PAID' 
  | 'ADDING_DATE' 
  | 'SEARCHING_ORDER';

type TailorCategory = 'ALL' | 'DRESS' | 'SUIT' | 'ALTERATION' | 'CUSTOM';

interface OrderDraft {
  customer_name: string;
  phone: string;
  category: TailorCategory;
  size_chest: string;
  size_waist: string;
  size_length: string;
  price: number;
  paid: number;
  delivery_date: string;
  notes: string;
}

interface SystemLog {
  id: string;
  time: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'SPEECH' | 'CORE';
  message: string;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  
  const [listening, setListening] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  
  const [userSpeech, setUserSpeech] = useState<string>('');
  const [aiSpeech, setAiSpeech] = useState<string>('مرحباً بك في نظام الأتمتة الإذاعي لإدارة الأتيليه. المحرك الذكي مستقر ومستمر في الاستماع إليك الآن.');
  
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: ''
  });

  // حالة عرض الصور المفتوحة حالياً للزبون بناءً على طلب المستخدم الصوتي
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [imagesOwner, setImagesOwner] = useState<string>('');

  const [stats, setStats] = useState({
    total: 0, pending: 0, inProgress: 0, ready: 0, delivered: 0, totalCash: 0, totalPaid: 0, remainingCash: 0, efficiencyRate: 100, activeAlerts: 0
  });

  const [logs, setLogs] = useState<SystemLog[]>([
    { id: '1', time: new Date().toLocaleTimeString(), type: 'CORE', message: 'نواة المساعد الصوتي مستقرة وجاهزة لمعالجة طلبات الأتيليه الذكية.' }
  ]);

  const recognitionRef = useRef<any>(null);
  const isUserTurnRef = useRef<boolean>(true);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>({ customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: '' });
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);

  useEffect(() => {
    fetchComprehensiveStats();
    
    const audioTimer = setTimeout(() => {
      startContinuousListening();
    }, 1200);

    return () => {
      clearTimeout(audioTimer);
      killSpeechEngine();
    };
  }, []);

  const addLog = (type: 'INFO' | 'SUCCESS' | 'ERROR' | 'SPEECH' | 'CORE', message: string) => {
    const newLog: SystemLog = { id: Math.random().toString(), time: new Date().toLocaleTimeString(), type, message };
    setLogs(prev => [newLog, ...prev.slice(0, 5)]);
  };

  const fetchComprehensiveStats = async () => {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      
      if (orders) {
        const total = orders.length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const inProgress = orders.filter(o => o.status === 'in_progress').length;
        const ready = orders.filter(o => o.status === 'ready').length;
        const delivered = orders.filter(o => o.status === 'delivered').length;
        
        const totalCash = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);
        const remainingCash = totalCash - totalPaid;

        setStats({ total, pending, inProgress, ready, delivered, totalCash, totalPaid, remainingCash, efficiencyRate: 100, activeAlerts: 0 });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const executeVocalReply = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    killListeningEngineOnly();
    synth.cancel();

    const filteredText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").replace(/[*\-_#]/g, "");
    const utterance = new SpeechSynthesisUtterance(filteredText);
    utterance.lang = 'ar-EG'; 
    utterance.rate = 1.02;
    activeUtteranceRef.current = utterance;

    utterance.onstart = () => {
      setSpeaking(true);
      isUserTurnRef.current = false;
    };

    utterance.onend = () => {
      setSpeaking(false);
      isUserTurnRef.current = true;
      activeUtteranceRef.current = null;
      setTimeout(() => { if (isUserTurnRef.current) startContinuousListening(); }, 300);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      isUserTurnRef.current = true;
      startContinuousListening();
    };

    synth.speak(utterance);
  };

  const analyzeUserIntent = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setUserSpeech(rawInput);
    setProcessing(true);
    killListeningEngineOnly();

    try {
      const currentGlobalState = stateRef.current;

      // سري المطور لحفظ الحقوق
      if (input.includes('صممك') || input.includes('برمجك') || input.includes('مطورك') || input.includes('مين عملك') || input.includes('صاحب البرنامج')) {
        const msg = 'تم تصميم وتطوير هذا المساعد الصوتي والسيستم بالكامل بواسطة المهندس إسلام الكومي.';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      // ==========================================
      // 1️⃣ إضافة أوردر جديد خطوة بخطوة
      // ==========================================
      if (currentGlobalState === 'IDLE' && (input.includes('ضيف') || input.includes('اعمل اوردر') || input.includes('طلب جديد') || input.includes('سجل اوردر'))) {
        setGlobalState('ADDING_NAME');
        const msg = 'قول اسم العميل';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      if (currentGlobalState === 'ADDING_NAME') {
        setDraftOrder(prev => ({ ...prev, customer_name: rawInput }));
        setGlobalState('ADDING_PHONE');
        const msg = 'قول رقم التليفون';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      if (currentGlobalState === 'ADDING_PHONE') {
        setDraftOrder(prev => ({ ...prev, phone: rawInput }));
        setGlobalState('ADDING_PRICE');
        const msg = 'قول السعر كام';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      if (currentGlobalState === 'ADDING_PRICE') {
        const num = Number(input.match(/\d+/)?.[0] || 0);
        setDraftOrder(prev => ({ ...prev, price: num }));
        setGlobalState('ADDING_PAID');
        const msg = 'العميل دفع كام عربون';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      if (currentGlobalState === 'ADDING_PAID') {
        const num = Number(input.match(/\d+/)?.[0] || 0);
        setDraftOrder(prev => ({ ...prev, paid: num }));
        setGlobalState('ADDING_DATE');
        const msg = 'قول تاريخ أو وقت التسليم';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      if (currentGlobalState === 'ADDING_DATE') {
        const finalOrder = { ...draftRef.current, delivery_date: rawInput };
        const orderCode = Math.floor(1000000 + Math.random() * 9000000).toString();

        const { error } = await supabase.from('orders').insert([{
          order_code: orderCode, customer_name: finalOrder.customer_name, phone: finalOrder.phone, price: finalOrder.price, paid: finalOrder.paid, delivery_date: finalOrder.delivery_date, status: 'pending', notes: 'تم إنشاؤه صوتياً'
        }]);

        if (error) throw error;
        await fetchComprehensiveStats();

        const remain = Number(finalOrder.price) - Number(finalOrder.paid);
        const msg = `تم إضافة الأوردر بنجاح. الكود هو ${orderCode}. المتبقي عليه ${remain} جنيه.`;
        setAiSpeech(msg); executeVocalReply(msg);
        setDraftOrder({ customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: '' });
        setGlobalState('IDLE'); setProcessing(false); return;
      }

      // إلغاء المعالجة الحالية
      if (input.includes('إلغاء') || input.includes('اكنسل') || input.includes('خلاص') || input.includes('امسح')) {
        setGlobalState('IDLE');
        setDraftOrder({ customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: '' });
        const msg = 'تم إلغاء العملية وتصفير الذاكرة المؤقتة.';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      // ==========================================
      // 2️⃣ الاستعلام المتقدم (الذكاء الاصطناعي الشامل)
      // ==========================================
      if (currentGlobalState === 'IDLE') {

        // أ: أول أوردر وآخر أوردر هيتسلم إمتى
        if (input.includes('اول اوردر') || input.includes('أول أوردر') || input.includes('اخر اوردر') || input.includes('آخر أوردر')) {
          const isFirst = input.includes('اول') || input.includes('أول');
          const { data: dateOrders, error: dateErr } = await supabase
            .from('orders')
            .select('*')
            .not('delivery_date', 'is', null);

          if (dateErr) throw dateErr;

          if (!dateOrders || dateOrders.length === 0) {
            const msg = 'لا يوجد أوردرات مسجل لها تواريخ تسليم حالياً.';
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }

          // ترتيب بسيط للتواريخ والتشطيبات
          const sorted = [...dateOrders].sort((a, b) => String(a.delivery_date).localeCompare(String(b.delivery_date)));
          const targetOrder = isFirst ? sorted[0] : sorted[sorted.length - 1];
          const label = isFirst ? 'أول أوردر هيتسلم' : 'آخر أوردر هيتسلم';

          const msg = `${label} هو باسم العميل ${targetOrder.customer_name} وميعاده هو ${targetOrder.delivery_date}.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // ب: الاستعلام عن أوردرات بحالة معينة (قيد التنفيذ / الجاهزة) بدون ذكر اسم شخص
        const hasStatusKeyword = input.includes('تنفيذ') || input.includes('جاهز') || input.includes('انتظار');
        const hasQueryAction = input.includes('اوردرات') || input.includes('الاوردرات') || input.includes('هات') || input.includes('عرض') || input.includes('شوف') || input.includes('ايه هي');
        const hasNoName = !input.includes('باسم') && !input.includes('على') && !input.includes('بتاع');

        if (hasStatusKeyword && (hasQueryAction || hasNoName)) {
          let targetStatus = 'pending';
          let statusLabel = 'قيد الانتظار';
          if (input.includes('تنفيذ')) { targetStatus = 'in_progress'; statusLabel = 'قيد التنفيذ'; }
          if (input.includes('جاهز')) { targetStatus = 'ready'; statusLabel = 'الجاهزة للتسليم'; }

          const { data: statusOrders, error: statusError } = await supabase.from('orders').select('*').eq('status', targetStatus);
          if (statusError) throw statusError;

          if (!statusOrders || statusOrders.length === 0) {
            const msg = `لا يوجد حالياً أي أوردرات في حالة ${statusLabel}.`;
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }

          const namesList = statusOrders.map(o => o.customer_name).join(' و ');
          const msg = `الأوردرات اللي في حالة ${statusLabel} عددها ${statusOrders.length} وهي باسم: ${namesList}`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // ج: الاستعلام عن الأعداد الإجمالية للمحل عند سؤال "كام الاوردرات" بدون أسماء زبائن
        if ((input.includes('كم') || input.includes('كام') || input.includes('عدد')) && !input.includes('باسم') && !input.includes('على') && !input.includes('بتاع') && !input.includes('متبقي') && !input.includes('مبلغ') && !input.includes('فلوس') && !input.includes('صوره') && !input.includes('صورة')) {
          await fetchComprehensiveStats();
          const msg = `إجمالي الأوردرات عندك حالياً هو ${stats.total} أوردر، منها ${stats.inProgress} قيد التنفيذ و ${stats.ready} جاهز للتسليم.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // د: البحث المتقدم والدقيق بالاسم أو الكود (تشمل المتبقي، الصور، التواريخ)
        const isLookingForImage = input.includes('صوره') || input.includes('صورة') || input.includes('الصور') || input.includes('الكلين');
        const isLookingForRemaining = input.includes('متبقي') || input.includes('باقي') || input.includes('فلوس') || input.includes('حساب') || input.includes('كام على');
        const isLookingForDate = input.includes('ميعاد') || input.includes('وقت') || input.includes('تسليم') || input.includes('امتى') || input.includes('إمتى');

        // تنظيف الاسم تماماً من كل الكلمات الدلالية والعامية
        const cleanName = rawInput
          .replace(/ابحث|هات|اوردر|تفاصيل|شوف|عرض|كم|كام|عندي|في|باسم|بتاع|بطاقة|عايز|هاتلي|صاحب|الاوردرات|اللي|صوره|صورة|متبقي|مبلغ|على|ميعاد|وقت|تسليم|هيتسلم|امتى|إمتى/gi, '')
          .trim();

        const code = input.match(/\d{7}/)?.[0];
        let query = supabase.from('orders').select(`*, order_images(*)`);

        if (code) {
          query = query.eq('order_code', code);
        } else {
          if (!cleanName) {
            const msg = 'لم أستطع تحديد اسم العميل بوضوح، أعد المحاولة من فضلك.';
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }
          query = query.ilike('customer_name', `%${cleanName}%`);
        }

        const { data, error } = await query.limit(1);
        if (error) throw error;

        if (!data || data.length === 0) {
          const msg = 'لم أجد أي أوردر مطابق بالاسم أو الكود المذكور.';
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        const order = data[0];
        const remain = Number(order.price || 0) - Number(order.paid || 0);

        // 1. طلب عرض الصورة على الشاشة فوراً
        if (isLookingForImage) {
          if (order.order_images && order.order_images.length > 0) {
            const imageUrls = order.order_images.map((img: any) => img.image_url).filter(Boolean);
            setDisplayedImages(imageUrls);
            setImagesOwner(order.customer_name);
            const msg = `تم عرض صور أوردر العميل ${order.customer_name} على الشاشة قدامك حالياً.`;
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          } else {
            setDisplayedImages([]);
            const msg = `الأوردر الخاص بـ ${order.customer_name} موجود، ولكن لا يوجد له صور مرفوعة في قاعدة البيانات.`;
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }
        }

        // 2. طلب المتبقي أو الحسابات
        if (isLookingForRemaining) {
          const msg = `العميل ${order.customer_name} متبقي عليه مبلغ ${remain} جنيه من إجمالي السعر ${order.price} جنيه.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // 3. طلب تاريخ التسليم والتشطيب
        if (isLookingForDate) {
          const msg = `أوردر العميل ${order.customer_name} ميعاد تسليمه هو يوم ${order.delivery_date || 'غير محدد بعد'}.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // الاستعلام العام العادي عن الشخص
        let statusText = 'قيد الانتظار';
        if (order.status === 'in_progress') statusText = 'قيد التنفيذ';
        if (order.status === 'ready') statusText = 'جاهز للتسليم';
        if (order.status === 'delivered') statusText = 'تم التسليم بالكامل';

        const msg = `لقيت الأوردر. العميل ${order.customer_name}. حالته الحالية ${statusText}. المتبقي ${remain} جنيه.`;
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      // تحديث الحالة يدوياً صوتياً بالكود
      if (currentGlobalState === 'IDLE' && (input.includes('حدث') || input.includes('غير الحالة') || input.includes('اتسلم'))) {
        const code = input.match(/\d{7}/)?.[0];
        if (!code) {
          const msg = 'قول كود الأوردر المكون من 7 أرقام أولاً ليتم التحديث.';
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        let newStatus = 'pending';
        if (input.includes('تنفيذ')) newStatus = 'in_progress';
        if (input.includes('جاهز')) newStatus = 'ready';
        if (input.includes('اتسلم') || input.includes('تسليم')) newStatus = 'delivered';

        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_code', code);
        if (error) throw error;

        await fetchComprehensiveStats();
        const msg = `تم تحديث حالة الأوردر رقم ${code} بنجاح في قاعدة البيانات.`;
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

    } catch (err: any) {
      console.error(err);
      const msg = 'حدث خطأ غير متوقع، أعد محاولة التحدث مرة أخرى.';
      setAiSpeech(msg); executeVocalReply(msg);
    } finally {
      setProcessing(false);
    }
  };

  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; 
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const lastFinalResult = event.results[event.results.length - 1];
      if (lastFinalResult.isFinal) {
        const transcriptText = lastFinalResult[0].transcript.trim();
        if (transcriptText) analyzeUserIntent(transcriptText);
      }
    };

    recognition.onerror = () => setListening(false);

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (isUserTurnRef.current && !processing && !speaking) {
        try {
          recognition.start();
          recognitionRef.current = recognition;
          setListening(true);
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}
  };

  const killListeningEngineOnly = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const killSpeechEngine = () => {
    isUserTurnRef.current = false;
    killListeningEngineOnly();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false); setProcessing(false);
  };

  const toggleSystemMasterPower = () => {
    if (listening || speaking || processing) {
      killSpeechEngine();
      setGlobalState('IDLE');
      setAiSpeech('تم قفل المساعد الصوتي وإيجاف الاستماع مؤقتاً.');
    } else {
      isUserTurnRef.current = true;
      setGlobalState('IDLE');
      startContinuousListening();
      setAiSpeech('المساعد الصوتي نشط وجاهز لسماع طلباتك الذكية للاوردرات.');
      executeVocalReply('المساعد الصوتي مستمر في الاستماع إليك الآن.');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-70px)] flex flex-col justify-between items-center bg-[#020206] text-gray-100 p-5 font-sans select-none overflow-hidden relative">
      
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />

      {/* الرأس العلوي */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-gray-900/50 pb-3.5 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#080810] rounded-xl border border-gray-800/60 shadow-inner">
            <Scissors className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">نظام إدارة الأتيليه الذكي</h1>
            <p className="text-[9px] text-gray-500 font-bold uppercase">المحرك الصوتي المطور والمحدث بالكامل</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#080810] px-3.5 py-1.5 rounded-full border border-gray-800/60">
          <span className="flex h-1.5 w-1.5 relative">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${listening ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${listening ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-[10px] font-black text-gray-400">
            {listening ? 'مستمر في الاستماع' : 'المحرك واقف'}
          </span>
        </div>
      </div>

      {/* المنتصف: المحرك الدائري والزر المركزي */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full">
        {globalState !== 'IDLE' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-400 font-bold shadow-md animate-bounce">
            <Cpu className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            معالج الأتيليه النشط: 
            <span className="text-white underline font-black">
              {globalState === 'ADDING_NAME' && 'اسم الزبون'}
              {globalState === 'ADDING_PHONE' && 'رقم الموبايل'}
              {globalState === 'ADDING_PRICE' && 'السعر الكلي بالجنيه'}
              {globalState === 'ADDING_PAID' && 'العربون المقبوض'}
              {globalState === 'ADDING_DATE' && 'ميعاد التسليم'}
            </span>
          </div>
        )}

        <div className="relative cursor-pointer" onClick={toggleSystemMasterPower}>
          {listening && <div className="absolute inset-0 -m-12 rounded-full bg-emerald-500/5 animate-ping duration-[1300ms]" />}
          {speaking && <div className="absolute inset-0 -m-12 rounded-full bg-blue-500/5 animate-ping duration-[1300ms]" />}

          <button
            className={`w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-700 border-4 shadow-2xl relative z-20 ${
              listening ? 'bg-gradient-to-br from-emerald-600 to-teal-500 border-emerald-300' : speaking ? 'bg-gradient-to-br from-blue-600 to-indigo-500 border-blue-300' : 'bg-[#06060c] border-gray-800'
            }`}
          >
            {listening ? <Mic className="w-14 h-14 text-white animate-bounce" /> : speaking ? <Volume2 className="w-14 h-14 text-white animate-pulse" /> : <Bot className="w-14 h-14 text-gray-500" />}
          </button>
        </div>

        <div className="mt-8 max-w-2xl w-full px-6 text-center">
          {userSpeech && (
            <div className="inline-flex items-center gap-1.5 bg-[#05050a] px-3 py-1.5 rounded-xl border border-gray-900 mb-3 text-[11px] text-gray-500 italic">
              <CornerDownLeft className="w-3 h-3 text-gray-600" />
              المايك لقط: "{userSpeech}"
            </div>
          )}
          <h2 className="text-sm md:text-lg font-bold tracking-wide leading-relaxed text-gray-300">{aiSpeech}</h2>
        </div>

        {/* لوحة عرض ومعرض الصور الذكي المنبثق على الشاشة فوراً عند طلب العميل */}
        {displayedImages.length > 0 && (
          <div className="mt-6 w-full max-w-md bg-[#06060c] border border-gray-800 rounded-2xl p-4 shadow-2xl animate-fadeIn relative">
            <button onClick={() => setDisplayedImages([])} className="absolute top-2 right-2 p-1 bg-gray-900 rounded-full hover:bg-rose-950 text-gray-400 hover:text-rose-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 border-b border-gray-900 pb-2">
              <Eye className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-black text-amber-500">معرض صور أوردر العميل: {imagesOwner}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {displayedImages.map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-800 hover:border-amber-500 transition-all">
                  <img src={url} alt="Order detail" className="w-full h-24 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* لوحة مراقبة العدادات */}
      <div className="w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-3 my-3 z-10">
        <div className="bg-[#040408]/90 border border-gray-900 p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-gray-900 rounded-lg"><Package className="w-4 h-4 text-gray-500" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase">الطلبات الكلية</p>
            <p className="text-xs font-black text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-amber-950/20 rounded-lg"><Clock className="w-4 h-4 text-amber-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase">تحت التنفيذ</p>
            <p className="text-xs font-black text-amber-500">{stats.inProgress}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950/20 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase">الجاهزة للتسليم</p>
            <p className="text-xs font-black text-emerald-500">{stats.ready}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-blue-950/20 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase">باقي السوق</p>
            <p className="text-xs font-black text-blue-400">{stats.remainingCash} ج</p>
          </div>
        </div>
      </div>

      {/* تذييل الصفحة */}
      <div className="w-full text-center border-t border-gray-900/50 pt-3.5 z-10 flex flex-col sm:flex-row items-center justify-between max-w-5xl text-[9px] text-gray-600 font-mono font-bold">
        <p>ATELIER VIRTUAL VOICE CONSOLE v3.0.0 - PRODUCTION FRESH</p>
        <p className="text-gray-500 bg-gradient-to-r from-amber-500/10 to-transparent px-3 py-1 rounded-md font-sans text-[10px]">
          تطوير وتنفيذ بواسطة: <span className="text-amber-500 font-black">إسلام الكومي</span>
        </p>
      </div>

    </div>
  );
}
