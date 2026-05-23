import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Volume2, Activity, Package, CheckCircle, 
  Clock, TrendingUp, Cpu, CornerDownLeft, Scissors, Sliders
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
  const [aiSpeech, setAiSpeech] = useState<string>('مرحباً بك في نظام الأتمتة الإذاعي الصوتي لإدارة الأتيليه. المحرك الذكي مستقر وفي وضع الاستماع المستمر الآن.');
  
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '',
    phone: '',
    category: 'ALL',
    size_chest: '',
    size_waist: '',
    size_length: '',
    price: 0,
    paid: 0,
    delivery_date: '',
    notes: ''
  });

  const [systemUptime, setSystemUptime] = useState<number>(0);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    totalCash: 0,
    totalPaid: 0,
    remainingCash: 0,
    efficiencyRate: 100,
    activeAlerts: 0
  });

  const [logs, setLogs] = useState<SystemLog[]>([
    { id: '1', time: new Date().toLocaleTimeString(), type: 'CORE', message: 'نواة النظام الصوتي مستقرة وجاهزة للربط الفريش.' },
    { id: '2', time: new Date().toLocaleTimeString(), type: 'INFO', message: 'تطوير وهندسة برمجية متكاملة الذكاء.' }
  ]);

  const recognitionRef = useRef<any>(null);
  const isUserTurnRef = useRef<boolean>(true);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>({ customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: '' });
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);

  useEffect(() => {
    addLog('CORE', 'بدء الاتصال بخوادم سوبابيز الرئيسية لجلب البيانات المالية...');
    fetchComprehensiveStats();
    
    const uptimeInterval = setInterval(() => {
      setSystemUptime(prev => prev + 1);
    }, 1000);

    const audioTimer = setTimeout(() => {
      startContinuousListening();
    }, 1500);

    return () => {
      clearInterval(uptimeInterval);
      clearTimeout(audioTimer);
      killSpeechEngine();
    };
  }, []);

  const addLog = (type: 'INFO' | 'SUCCESS' | 'ERROR' | 'SPEECH' | 'CORE', message: string) => {
    const newLog: SystemLog = {
      id: Math.random().toString(),
      time: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 8)]);
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
        const efficiencyRate = total > 0 ? Math.round(((ready + delivered) / total) * 100) : 100;
        const activeAlerts = pending + inProgress;

        setStats({ total, pending, inProgress, ready, delivered, totalCash, totalPaid, remainingCash, efficiencyRate, activeAlerts });
        addLog('SUCCESS', `تم مزامنة سوبابيز فريش. المبيعات المحققة: ${totalCash} ج.م.`);
      }
    } catch (e: any) {
      console.error(e);
      addLog('ERROR', `خطأ في جلب بيانات الـ Core: ${e.message}`);
    }
  };

  const executeVocalReply = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      addLog('ERROR', 'محرك المخرجات الصوتية غير مدعوم بالمتصفح حالياً.');
      return;
    }

    killListeningEngineOnly();
    synth.cancel();

    const filteredText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .replace(/[*\-_#]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(filteredText);
    utterance.lang = 'ar-EG'; 
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    activeUtteranceRef.current = utterance;

    utterance.onstart = () => {
      setSpeaking(true);
      isUserTurnRef.current = false;
      addLog('SPEECH', `المساعد يتحدث الآن بصوت فريش.`);
    };

    utterance.onend = () => {
      setSpeaking(false);
      isUserTurnRef.current = true;
      activeUtteranceRef.current = null;
      setTimeout(() => {
        if (isUserTurnRef.current) {
          startContinuousListening();
        }
      }, 350);
    };

    utterance.onerror = (err) => {
      console.error(err);
      setSpeaking(false);
      isUserTurnRef.current = true;
      activeUtteranceRef.current = null;
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

      // ==========================================
      // 0️⃣ التحقق السري من المطور (حفظ الحقوق البرمجية صوتياً فقط)
      // ==========================================
      if (input.includes('صممك') || input.includes('برمجك') || input.includes('مطورك') || input.includes('مين عملك') || input.includes('صاحب البرنامج')) {
        const devResponse = 'تم تصميم وتطوير هذا المساعد الصوتي والسيستم الذكي بالكامل وبكل فخر بواسطة المهندس إسلام الكومي.';
        setAiSpeech(devResponse);
        executeVocalReply(devResponse);
        setProcessing(false);
        return;
      }

      // ==========================================
      // 1️⃣ مرحلة إضافة الأوردر (خطوة بخطوة لمنع التداخل)
      // ==========================================

      // البدء
      if (currentGlobalState === 'IDLE' && (input.includes('ضيف') || input.includes('اعمل اوردر') || input.includes('طلب جديد') || input.includes('سجل اوردر'))) {
        setGlobalState('ADDING_NAME');
        const msg = 'قول اسم العميل';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // الاسم
      if (currentGlobalState === 'ADDING_NAME') {
        setDraftOrder(prev => ({ ...prev, customer_name: rawInput }));
        setGlobalState('ADDING_PHONE');
        const msg = 'قول رقم التليفون';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // التليفون
      if (currentGlobalState === 'ADDING_PHONE') {
        setDraftOrder(prev => ({ ...prev, phone: rawInput }));
        setGlobalState('ADDING_PRICE');
        const msg = 'قول السعر كام';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // السعر
      if (currentGlobalState === 'ADDING_PRICE') {
        const num = Number(input.match(/\d+/)?.[0] || 0);
        setDraftOrder(prev => ({ ...prev, price: num }));
        setGlobalState('ADDING_PAID');
        const msg = 'العميل دفع كام';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // المدفوع
      if (currentGlobalState === 'ADDING_PAID') {
        const num = Number(input.match(/\d+/)?.[0] || 0);
        setDraftOrder(prev => ({ ...prev, paid: num }));
        setGlobalState('ADDING_DATE');
        const msg = 'قول تاريخ التسليم';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // التاريخ والحفظ في قاعدة البيانات
      if (currentGlobalState === 'ADDING_DATE') {
        const finalOrder = { ...draftRef.current, delivery_date: rawInput };
        const orderCode = Math.floor(1000000 + Math.random() * 9000000).toString();

        const { error } = await supabase
          .from('orders')
          .insert([{
            order_code: orderCode,
            customer_name: finalOrder.customer_name,
            phone: finalOrder.phone,
            price: finalOrder.price,
            paid: finalOrder.paid,
            delivery_date: finalOrder.delivery_date,
            status: 'pending',
            notes: 'تم إنشاؤه بواسطة المساعد الذكي'
          }]);

        if (error) throw error;

        await fetchComprehensiveStats();

        const remain = Number(finalOrder.price) - Number(finalOrder.paid);
        const msg = `تم إضافة الأوردر بنجاح. الكود ${orderCode}. المتبقي ${remain} جنيه`;

        setAiSpeech(msg);
        executeVocalReply(msg);

        setDraftOrder({
          customer_name: '', phone: '', category: 'ALL',
          size_chest: '', size_waist: '', size_length: '',
          price: 0, paid: 0, delivery_date: '', notes: ''
        });

        setGlobalState('IDLE');
        setProcessing(false);
        return;
      }

      // ==========================================
      // 2️⃣ مرحلة الإلغاء وتصفير المعالجة الجارية
      // ==========================================
      if (input.includes('إلغاء') || input.includes('اكنسل') || input.includes('خلاص') || input.includes('امسح')) {
        setGlobalState('IDLE');
        setDraftOrder({
          customer_name: '', phone: '', category: 'ALL',
          size_chest: '', size_waist: '', size_length: '',
          price: 0, paid: 0, delivery_date: '', notes: ''
        });
        const msg = 'تم إلغاء العملية وتصفير الذاكرة المؤقتة.';
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // ==========================================
      // 3️⃣ مرحلة البحث والاستعلام المتقدم (حل مشكلة "كم أوردر")
      // ==========================================
      if (currentGlobalState === 'IDLE' && (input.includes('ابحث') || input.includes('شوف') || input.includes('هات') || input.includes('تفاصيل') || input.includes('اوردر') || input.includes('كم') || input.includes('كام'))) {
        
        // التحقق مما إذا كان الطلب استعلاماً عن أعداد الأوردرات الإجمالية
        if (input.includes('كم') || input.includes('كام') || input.includes('عدد')) {
          await fetchComprehensiveStats();
          const msg = `إجمالي الأوردرات المسجلة عندك حالياً هو ${stats.total} أوردر، منها ${stats.inProgress} قيد التنفيذ و ${stats.ready} جاهز للتسليم.`;
          setAiSpeech(msg);
          executeVocalReply(msg);
          setProcessing(false);
          return;
        }

        // البحث الطبيعي بكود الأوردر أو اسم العميل
        const code = input.match(/\d{7}/)?.[0];
        let query = supabase.from('orders').select(`*, order_images(*)`);

        if (code) {
          query = query.eq('order_code', code);
        } else {
          const cleanName = rawInput.replace(/ابحث|هات|اوردر|تفاصيل|شوف|عرض|كم|كام|عندي/gi, '').trim();
          query = query.ilike('customer_name', `%${cleanName}%`);
        }

        const { data, error } = await query.limit(1);
        if (error) throw error;

        if (!data || data.length === 0) {
          const msg = 'لم أجد أي أوردر مطابق بالاسم أو الكود المذكور.';
          setAiSpeech(msg);
          executeVocalReply(msg);
          setProcessing(false);
          return;
        }

        const order = data[0];
        const remain = Number(order.price || 0) - Number(order.paid || 0);

        let statusText = 'قيد الانتظار';
        if (order.status === 'in_progress') statusText = 'قيد التنفيذ';
        if (order.status === 'ready') statusText = 'جاهز';
        if (order.status === 'delivered') statusText = 'تم التسليم';

        let imageText = '';
        if (order.order_images && order.order_images.length > 0) {
          imageText = ` ويوجد له ${order.order_images.length} صورة`;
        }

        const msg = `العميل ${order.customer_name}. الحالة ${statusText}. السعر ${order.price} جنيه. المتبقي ${remain} جنيه.${imageText}`;
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // ==========================================
      // 4️⃣ مرحلة تحديث الحالة
      // ==========================================
      if (currentGlobalState === 'IDLE' && (input.includes('حدث') || input.includes('غير الحالة') || input.includes('جاهز') || input.includes('تم التسليم') || input.includes('اتسلم'))) {
        const code = input.match(/\d{7}/)?.[0];

        if (!code) {
          const msg = 'قول كود الأوردر';
          setAiSpeech(msg);
          executeVocalReply(msg);
          setProcessing(false);
          return;
        }

        let newStatus = 'pending';
        if (input.includes('تنفيذ')) newStatus = 'in_progress';
        if (input.includes('جاهز')) newStatus = 'ready';
        if (input.includes('تم التسليم') || input.includes('اتسلم')) newStatus = 'delivered';

        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_code', code);
        if (error) throw error;

        await fetchComprehensiveStats();
        const msg = `تم تحديث حالة الأوردر ${code}`;
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // ==========================================
      // 5️⃣ مرحلة الإحصائيات والتقارير
      // ==========================================
      if (currentGlobalState === 'IDLE' && (input.includes('احصائيات') || input.includes('تقرير') || input.includes('الخزنة'))) {
        await fetchComprehensiveStats();
        const msg = `إجمالي الأوردرات ${stats.total}. قيد التنفيذ ${stats.inProgress}. الجاهزة ${stats.ready}. إجمالي المبيعات ${stats.totalCash} جنيه`;
        setAiSpeech(msg);
        executeVocalReply(msg);
        setProcessing(false);
        return;
      }

      // ==========================================
      // 6️⃣ الوضع الافتراضي
      // ==========================================
      if (currentGlobalState === 'IDLE') {
        const defaultMsg = 'أنا جاهز لإدارة الأتيليه بالصوت';
        setAiSpeech(defaultMsg);
        executeVocalReply(defaultMsg);
      }

    } catch (err: any) {
      console.error(err);
      const msg = 'حدث خطأ أثناء تنفيذ الطلب';
      setAiSpeech(msg);
      executeVocalReply(msg);
    } finally {
      setProcessing(false);
    }
  };

  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('ERROR', 'محرك التقاط الصوت غير مدعوم في هذا المتصفح حالياً.');
      return;
    }

    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; 
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const lastFinalResult = event.results[event.results.length - 1];
      if (lastFinalResult.isFinal) {
        const transcriptText = lastFinalResult[0].transcript.trim();
        if (transcriptText) {
          analyzeUserIntent(transcriptText);
        }
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === 'not-allowed') {
        addLog('ERROR', 'صلاحية الوصول للمايكروفون مرفوضة.');
        setListening(false);
      }
    };

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
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
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
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setProcessing(false);
  };

  const toggleSystemMasterPower = () => {
    if (listening || speaking || processing) {
      killSpeechEngine();
      setGlobalState('IDLE');
      setAiSpeech('تم قفل المساعد الصوتي وإيقاف المايكروفون المستمر مؤقتاً.');
      addLog('INFO', 'تم إيقاف المساعد الصوتي يدوياً.');
    } else {
      isUserTurnRef.current = true;
      setGlobalState('IDLE');
      startContinuousListening();
      setAiSpeech('تم تشغيل المساعد الصوتي والمحادثة المتتالية اللانهائية نشطة وجاهزة الآن.');
      executeVocalReply('المساعد جاهز ومستمر في الاستماع إليك الآن.');
      addLog('INFO', 'تم تشغيل حلقة الاستماع المستمر.');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-70px)] flex flex-col justify-between items-center bg-[#020206] text-gray-100 p-5 font-sans select-none overflow-hidden relative">
      
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-blue-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />

      {/* الرأس العلوي للنظام */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-gray-900/50 pb-3.5 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#080810] rounded-xl border border-gray-800/60 shadow-inner">
            <Scissors className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">نظام إدارة الأتيليه الذكي</h1>
            <p className="text-[9px] text-gray-500 font-bold tracking-wide uppercase">العقل الصوتي المشترك المستمر - إصدار نقي ومقفل</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#080810] px-3.5 py-1.5 rounded-full border border-gray-800/60 shadow-md">
          <span className="flex h-1.5 w-1.5 relative">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
              listening ? 'bg-emerald-400' : speaking ? 'bg-blue-400' : processing ? 'bg-amber-400' : 'bg-rose-500'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              listening ? 'bg-emerald-500' : speaking ? 'bg-blue-500' : processing ? 'bg-amber-500' : 'bg-rose-500'
            }`}></span>
          </span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            {listening ? 'مستمر في الاستماع' : speaking ? 'المساعد يتحدث' : processing ? 'معالجة النواة' : 'المحرك واقف'}
          </span>
        </div>
      </div>

      {/* المنتصف: المحرك الدائري والزر المركزي */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full transition-all duration-500">
        
        {globalState !== 'IDLE' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-400 font-bold shadow-md animate-bounce">
            <Cpu className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            معالج الأتيليه النشط: 
            <span className="text-white underline decoration-amber-500 font-black">
              {globalState === 'ADDING_NAME' && 'اسم الزبون'}
              {globalState === 'ADDING_PHONE' && 'رقم الموبايل'}
              {globalState === 'ADDING_PRICE' && 'السعر الكلي بالجنيه'}
              {globalState === 'ADDING_PAID' && 'العربون المقبوض'}
              {globalState === 'ADDING_DATE' && 'ميعاد التسليم والتشطيب'}
            </span>
          </div>
        )}

        <div className="relative cursor-pointer" onClick={toggleSystemMasterPower}>
          {listening && (
            <>
              <div className="absolute inset-0 -m-16 rounded-full bg-emerald-500/5 animate-ping duration-[1300ms]" />
              <div className="absolute inset-0 -m-10 rounded-full bg-emerald-400/10 animate-pulse duration-700" />
              <div className="absolute inset-0 -m-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-xl" />
            </>
          )}
          {speaking && (
            <>
              <div className="absolute inset-0 -m-20 rounded-full bg-blue-500/5 animate-ping duration-[1300ms]" />
              <div className="absolute inset-0 -m-12 rounded-full bg-blue-400/10 animate-pulse duration-700" />
              <div className="absolute inset-0 -m-5 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent blur-xl" />
            </>
          )}
          {processing && (
            <div className="absolute inset-0 -m-8 rounded-full bg-transparent border-4 border-dashed border-amber-500/30 animate-spin duration-[3500ms]" />
          )}

          <button
            className={`w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-700 border-4 shadow-2xl relative z-20 ${
              listening
                ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 border-emerald-300 shadow-emerald-500/30 scale-105 ring-4 ring-emerald-500/5'
                : speaking
                ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 border-blue-300 shadow-blue-500/30 scale-102 ring-4 ring-blue-500/5'
                : processing
                ? 'bg-[#0b0b14] border-amber-500 shadow-amber-500/10'
                : 'bg-[#06060c] border-gray-800/80 hover:border-amber-500/40 shadow-black/90'
            }`}
          >
            {listening ? (
              <Mic className="w-16 h-16 text-white animate-bounce" />
            ) : speaking ? (
              <Volume2 className="w-16 h-16 text-white animate-pulse" />
            ) : processing ? (
              <Activity className="w-14 h-14 text-amber-500 animate-pulse" />
            ) : (
              <Bot className="w-16 h-16 text-gray-500" />
            )}
          </button>
        </div>

        <div className="mt-12 max-w-2xl w-full px-6 text-center transition-all duration-500">
          {userSpeech && (
            <div className="inline-flex items-center gap-1.5 bg-[#05050a] px-3 py-1.5 rounded-xl border border-gray-900 mb-4 text-[11px] text-gray-500 font-medium italic">
              <CornerDownLeft className="w-3 h-3 text-gray-600" />
              المايك التقط: "{userSpeech}"
            </div>
          )}
          
          <h2 className={`text-sm md:text-xl font-bold tracking-wide leading-relaxed transition-all duration-500 ${
            speaking ? 'text-amber-100 drop-shadow-md' : 'text-gray-400'
          }`}>
            {aiSpeech}
          </h2>
        </div>
      </div>

      {/* لوحة مراقبة العدادات */}
      <div className="w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-3 my-3 z-10 transition-all duration-300">
        <div className="bg-[#040408]/90 border border-gray-900 shadow p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-gray-900 rounded-lg"><Package className="w-4 h-4 text-gray-500" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">الطلبات الكلية</p>
            <p className="text-xs font-black text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 shadow p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-amber-950/20 rounded-lg"><Clock className="w-4 h-4 text-amber-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">تحت التنفيذ</p>
            <p className="text-xs font-black text-amber-500">{stats.inProgress}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 shadow p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950/20 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">الجاهزة للتسليم</p>
            <p className="text-xs font-black text-emerald-500">{stats.ready}</p>
          </div>
        </div>
        <div className="bg-[#040408]/90 border border-gray-900 shadow p-3 rounded-xl flex items-center gap-3">
          <div className="p-1.5 bg-blue-950/20 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-500/80" /></div>
          <div>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">باقي السوق</p>
            <p className="text-xs font-black text-blue-400">{stats.remainingCash} ج</p>
          </div>
        </div>
      </div>

      {/* سجل الـ System Logs */}
      <div className="w-full max-w-5xl bg-[#030307] border border-gray-900/60 rounded-xl p-3 z-10 hidden md:block">
        <div className="flex items-center gap-2 mb-2 text-gray-500 text-[10px] uppercase font-black tracking-wider border-b border-gray-900 pb-1.5">
          <Sliders className="w-3 h-3 text-amber-500" />
          شاشة مراقبة نواة النظام الصوتي (Vocal Core System Logs)
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono">
          {logs.slice(0, 4).map((log) => (
            <div key={log.id} className="flex items-center justify-between text-gray-500 border-b border-gray-950 py-0.5">
              <span className="text-gray-600">[{log.time}]</span>
              <span className={`font-bold ${
                log.type === 'ERROR' ? 'text-rose-500' : log.type === 'SUCCESS' ? 'text-emerald-500' : log.type === 'SPEECH' ? 'text-blue-400' : 'text-amber-500'
              }`}>{log.type}</span>
              <span className="text-gray-400 text-left truncate max-w-[240px]">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* تذييل الصفحة النظيف والمحايد */}
      <div className="w-full text-center border-t border-gray-900/50 pt-3.5 z-10 flex flex-col sm:flex-row items-center justify-between max-w-5xl text-[9px] text-gray-600 font-mono font-bold tracking-wider">
        <p>ATELIER VIRTUAL VOICE CONSOLE v2.1.0 - SECURE NODE</p>
        <p className="text-gray-500 px-3 py-1 mt-1 sm:mt-0 font-sans text-[10px]">
          نظام إدارة الأتيليه الذكي المتكامل
        </p>
      </div>

    </div>
  );
}
