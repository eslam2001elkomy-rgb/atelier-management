import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Package, CheckCircle, Clock, TrendingUp, Scissors, 
  X, Search, Plus, Trash2, Calendar, DollarSign, Phone, User, 
  BarChart3, RefreshCw, Filter, MessageSquare, Sparkles, Zap, MicOff,
  Receipt, CreditCard, ArrowUpRight, ArrowDownRight, Loader2, Info
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type AssistantState = 
  | 'IDLE' 
  | 'ADDING_NAME' 
  | 'ADDING_PHONE' 
  | 'ADDING_CATEGORY'
  | 'ADDING_PRICE' 
  | 'ADDING_PAID' 
  | 'ADDING_DATE'
  | 'ADDING_NOTES'
  | 'UPDATING_STATUS'
  | 'DELETING_CONFIRM';

type TailorCategory = 'DRESS' | 'SUIT' | 'ALTERATION' | 'CUSTOM' | 'ALL';
type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  phone: string;
  category: TailorCategory;
  price: number;
  paid: number;
  delivery_date: string;
  status: OrderStatus;
  notes?: string;
  created_at: string;
}

interface OrderDraft {
  customer_name: string;
  phone: string;
  category: TailorCategory;
  price: number;
  paid: number;
  delivery_date: string;
  notes: string;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  ready: number;
  delivered: number;
  totalCash: number;
  totalPaid: number;
  remainingCash: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  type?: 'text' | 'stats' | 'success' | 'error';
}

// ============================================================================
// CONSTANTS
// ============================================================================
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  ready: 'جاهز للتسليم',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  delivered: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const CATEGORY_LABELS: Record<string, string> = {
  DRESS: 'فستان 👗',
  SUIT: 'بدلة 👔',
  ALTERATION: 'تعديل 🪡',
  CUSTOM: 'تفصيل خاص ✨',
  ALL: 'الكل'
};

const ARABIC_NUMBERS: Record<string, number> = {
  'صفر': 0, 'واحد': 1, 'اتنين': 2, 'تلاتة': 3, 'تلات': 3, 'اربعة': 4, 'خمسة': 5,
  'ستة': 6, 'سبعة': 7, 'تمانية': 8, 'تسعة': 9, 'عشرة': 10, 'عشرين': 20,
  'تلاتين': 30, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'تسعين': 90,
  'مية': 100, 'ميتين': 200, 'الف': 1000, 'ألف': 1000
};

export default function AIAssistantPage() {
  const { user } = useAuth();

  // UX & Flow States
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'dashboard'>('chat');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  
  // Data States
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'all'>('all');
  
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '', phone: '', category: 'DRESS', price: 0, paid: 0, delivery_date: '', notes: ''
  });
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, ready: 0, delivered: 0,
    totalCash: 0, totalPaid: 0, remainingCash: 0
  });

  // Refs for Speech Engines
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>(draftOrder);
  const statsRef = useRef<Stats>(stats);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isAutoListeningAllowed = useRef<boolean>(false);

  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation, processing]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    loadData();
    addToConversation('assistant', 'مرحباً بك في نظام الأتيليه الذكي والمطور. المايك الذكي مستعد الآن للاستماع التلقائي المتواصل، تفضل بالتحدث دون الحاجة لضغط المايك في كل مرة.', 'text');
    initSpeechRecognition();
    return () => { killSpeechEngine(); };
  }, []);

  const addToConversation = useCallback((role: 'user' | 'assistant' | 'system', text: string, type: 'text' | 'stats' | 'success' | 'error' = 'text') => {
    setConversation(prev => [...prev, { role, text, timestamp: new Date(), type }]);
  }, []);

  const loadData = async () => {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (orders) {
        setAllOrders(orders);
        setFilteredOrders(orders);
        calculateStats(orders);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateStats = (orders: Order[]) => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const totalCash = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);

    setStats({
      total, pending, inProgress, ready, delivered,
      totalCash, totalPaid, remainingCash: totalCash - totalPaid
    });
  };

  // Web Speech API Configuration (Continuous Integration)
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false; // نعتمد على الإغلاق والفتح اليدوي الذكي لتجنب تهنيج السيرفرات الصوتية بالهواتف
    rec.interimResults = false;
    rec.lang = 'ar-EG';

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      // ميزة التحدث المستمر: إعادة تشغيل المايك تلقائياً إذا كان مسموحاً له ولم يكن هناك صوت يعمل حالياً
      setTimeout(() => {
        if (isAutoListeningAllowed.current && !window.speechSynthesis.speaking && !processing) {
          try { rec.start(); } catch(e) {}
        }
      }, 300);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      analyzeUserIntent(text);
    };

    recognitionRef.current = rec;
  };

  const toggleListening = () => {
    if (listening) {
      isAutoListeningAllowed.current = false;
      recognitionRef.current?.stop();
    } else {
      isAutoListeningAllowed.current = true;
      if (synthRef.current?.speaking) synthRef.current.cancel();
      try {
        recognitionRef.current?.start();
      } catch (e) { console.error(e); }
    }
  };

  const killListeningEngineOnly = () => { 
    recognitionRef.current?.stop(); 
  };

  const killSpeechEngine = () => {
    isAutoListeningAllowed.current = false;
    killListeningEngineOnly();
    synthRef.current?.cancel();
  };

  const respond = (text: string, type: 'text' | 'error' | 'success' | 'stats' = 'text') => {
    addToConversation('assistant', text, type);
    setProcessing(false);
    
    if (!synthRef.current) return;
    killListeningEngineOnly();
    synthRef.current.cancel();

    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").replace(/[*\-_#]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      // عند انتهاء الذكاء الاصطناعي من الكلام، نفتح المايك تلقائياً دون تدخل منك
      if (isAutoListeningAllowed.current) {
        try { recognitionRef.current?.start(); } catch(e) {}
      }
    };
    utterance.onerror = () => {
      setSpeaking(false);
      if (isAutoListeningAllowed.current) {
        try { recognitionRef.current?.start(); } catch(e) {}
      }
    };
    synthRef.current.speak(utterance);
  };

  const resetAllStates = () => {
    setGlobalState('IDLE');
    setDraftOrder({ customer_name: '', phone: '', category: 'DRESS', price: 0, paid: 0, delivery_date: '', notes: '' });
    setPendingOrder(null);
  };

  // Helper Parsing functions
  const extractPhone = (text: string): string => {
    const match = text.replace(/\s+/g, '').match(/(01[0125]\d{8})/);
    return match ? match[0] : 'لا يوجد رقم';
  };

  const detectCategory = (text: string): TailorCategory => {
    if (text.includes('فستان') || text.includes('سهرة')) return 'DRESS';
    if (text.includes('بدلة') || text.includes('بدله')) return 'SUIT';
    if (text.includes('تعديل') || text.includes('تصليح')) return 'ALTERATION';
    return 'CUSTOM';
  };

  const parseArabicNumbers = (text: string): number => {
    const match = text.trim().match(/\d+/);
    if (match) return parseInt(match[0], 10);
    let total = 0;
    text.split(/\s+/).forEach(w => {
      if (ARABIC_NUMBERS[w] !== undefined) total += ARABIC_NUMBERS[w];
    });
    return total;
  };

  // ============================================================================
  // INTENT ENGINE (RE-BUILT AND WIDENED FOR SMART UNDERSTANDING)
  // ============================================================================
  const analyzeUserIntent = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setProcessing(true);
    addToConversation('user', rawInput);
    killListeningEngineOnly();

    try {
      const currentState = stateRef.current;

      if (input.includes('إلغاء') || input.includes('تراجع') || input.includes('خلاص')) {
        resetAllStates();
        respond('تم إلغاء الأمر الحالي والعودة للوضع الرئيسي.');
        return;
      }

      // 1. تدفق طلب إضافة أوردر جديد
      if (currentState === 'IDLE' && (input.includes('ضيف') || input.includes('تسجيل') || input.includes('أوردر جديد') || input.includes('اوردر جديد'))) {
        setGlobalState('ADDING_NAME');
        respond('حاضر، نبدأ بإضافة أوردر جديد. ما هو اسم العميل بالكامل؟');
        return;
      }

      if (currentState === 'ADDING_NAME') {
        setDraftOrder(prev => ({ ...prev, customer_name: rawInput }));
        setGlobalState('ADDING_PHONE');
        respond('جميل جداً. ما هو رقم تليفون العميل؟');
        return;
      }

      if (currentState === 'ADDING_PHONE') {
        const phone = extractPhone(rawInput);
        setDraftOrder(prev => ({ ...prev, phone }));
        setGlobalState('ADDING_CATEGORY');
        respond('تمام. ما هو نوع الموديل؟ فستان، بدلة، تعديل، ولا تفصيل خاص؟');
        return;
      }

      if (currentState === 'ADDING_CATEGORY') {
        const cat = detectCategory(rawInput);
        setDraftOrder(prev => ({ ...prev, category: cat }));
        setGlobalState('ADDING_PRICE');
        respond(`تم تحديد التصنيف كـ ${CATEGORY_LABELS[cat]}. ما هو السعر الإجمالي المتفق عليه؟`);
        return;
      }

      if (currentState === 'ADDING_PRICE') {
        const price = parseArabicNumbers(rawInput);
        setDraftOrder(prev => ({ ...prev, price }));
        setGlobalState('ADDING_PAID');
        respond(`السعر هو ${price} جنيه، ما هو مبلغ العربون المدفوع؟`);
        return;
      }

      if (currentState === 'ADDING_PAID') {
        const paid = parseArabicNumbers(rawInput);
        const price = draftRef.current.price;
        setDraftOrder(prev => ({ ...prev, paid }));
        setGlobalState('ADDING_DATE');
        respond(`العربون ${paid} جنيه والمتبقي ${price - paid} جنيه. متى ميعاد الاستلام؟`);
        return;
      }

      if (currentState === 'ADDING_DATE') {
        const today = new Date();
        if (input.includes('بكرة') || input.includes('بكره')) today.setDate(today.getDate() + 1);
        else if (input.includes('اسبوع')) today.setDate(today.getDate() + 7);
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        setDraftOrder(prev => ({ ...prev, delivery_date: dateStr }));
        setGlobalState('ADDING_NOTES');
        respond(`تاريخ التسليم المتوقع هو ${dateStr}. هل ترغب في تسجيل أي ملاحظات أو مقاسات خاصة؟`);
        return;
      }

      if (currentState === 'ADDING_NOTES') {
        const notes = input.includes('لا') || input.includes('مفيش') ? 'بدون ملاحظات' : rawInput;
        const finalDraft = { ...draftRef.current, notes };
        const code = `TL-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error } = await supabase.from('orders').insert([{
          order_code: code,
          customer_name: finalDraft.customer_name,
          phone: finalDraft.phone,
          category: finalDraft.category,
          price: finalDraft.price,
          paid: finalDraft.paid,
          delivery_date: finalDraft.delivery_date,
          status: 'pending',
          notes: finalDraft.notes,
          user_id: user?.id
        }]);

        if (error) throw error;
        await loadData();
        resetAllStates();
        respond(`✨ تم حفظ الأوردر بنجاح يا فنان بكود ${code}، وهو الآن مسجل في القائمة.`, 'success');
        return;
      }

      // 2. تحديث حالة أوردر موجود
      if (currentState === 'IDLE' && (input.includes('حالة') || input.includes('تعديل أوردر') || input.includes('تغير وضع'))) {
        setGlobalState('UPDATING_STATUS');
        respond('يرجى قول رقم كود الأوردر لتعديله فوراً؟');
        return;
      }

      if (currentState === 'UPDATING_STATUS') {
        const match = input.match(/\d+/);
        if (!match) {
          respond('لم أتعرف على رقم الكود، يرجى تكراره بوضوح.');
          return;
        }
        const findOrder = allOrders.find(o => o.order_code.includes(match[0]));
        if (!findOrder) {
          respond('عذراً، لم أجد أوردر مسجل بهذا الرقم.');
          return;
        }
        setPendingOrder(findOrder);
        setGlobalState('DELETING_CONFIRM');
        respond(`وجدت أوردر العميل ${findOrder.customer_name}. ما هي الحالة الجديدة؟ قيد التنفيذ، جاهز، أم تم التسليم؟`);
        return;
      }

      if (currentState === 'DELETING_CONFIRM' && pendingOrder) {
        let newStatus: OrderStatus = pendingOrder.status;
        if (input.includes('تنفيذ') || input.includes('شغال')) newStatus = 'in_progress';
        if (input.includes('جاهز') || input.includes('خلص')) newStatus = 'ready';
        if (input.includes('تسليم') || input.includes('اتسلم')) newStatus = 'delivered';
        
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', pendingOrder.id);
        if (error) throw error;
        await loadData();
        resetAllStates();
        respond(`تم بنجاح تحديث حالة الأوردر إلى ${STATUS_LABELS[newStatus]}.`, 'success');
        return;
      }

      // 3. الفهم الذكي للأسئلة العامة (كم أوردر عندي / إحصائيات الأتيليه)
      if (input.includes('كم اوردر') || input.includes('كام اوردر') || input.includes('عدد الاوردرات') || input.includes('عدد الأوردرات') || input.includes('الطلبات اللي عندي')) {
        const currentStats = statsRef.current;
        respond(`لديك حالياً إجمالي ${currentStats.total} أوردر مسجل في الأتيليه. من بينهم ${currentStats.pending} قيد الانتظار، و ${currentStats.inProgress} قيد التنفيذ، و ${currentStats.ready} جاهزين تماماً للتسليم.`);
        return;
      }

      // 4. التقارير المالية والفلوس
      if (input.includes('حساب') || input.includes('تقرير') || input.includes('الخزنة') || input.includes('فلوس') || input.includes('معايا كام')) {
        const currentStats = statsRef.current;
        respond(`التقرير المالي الفوري: إجمالي الاتفاقات ${currentStats.totalCash} جنيه، تم تحصيل كاش بقيمة ${currentStats.totalPaid} جنيه، ومتبقي بالخارج في ذمة العملاء ${currentStats.remainingCash} جنيه.`, 'stats');
        return;
      }

      respond('أنا معك وسامعك جيداً. قولي: (ضيف أوردر)، (تحديث حالة)، أو اسألني مباشرة (عندي كام أوردر اليوم)؟');
    } catch (err) {
      resetAllStates();
      respond('عذراً يا فنان، حدث خطأ أثناء المعالجة السريعة. يرجى تكرار الجملة ثانية.', 'error');
    }
  };

  // Search & Filters for Orders Tab
  useEffect(() => {
    let filtered = allOrders;
    if (searchQuery) {
      filtered = filtered.filter(o => o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || o.order_code.includes(searchQuery));
    }
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(o => o.status === selectedFilter);
    }
    setFilteredOrders(filtered);
  }, [searchQuery, selectedFilter, allOrders]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none antialiased" dir="rtl">
      
      {/* UPPER APP GLASS BAR */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md ${listening || speaking ? 'scale-105 transition-all' : ''}`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            {(listening || speaking) && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide bg-gradient-to-l from-white to-slate-300 bg-clip-text text-transparent">الأتيليه الذكي PRO</h1>
            <p className="text-[10px] text-emerald-400 font-mono">وضع الاستماع التلقائي والمستمر فعال والآن يفهم أسئلتك الكلية</p>
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-300 font-mono">الخزنة: {stats.totalPaid} ج.م</span>
        </div>
      </header>

      {/* CORE VIEWPORT PORTS */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        
        {/* TAB 1: CHAT INTERACTION VIEW */}
        {activeTab === 'chat' && (
          <div className="flex flex-col space-y-4 min-h-[50vh]">
            
            {/* Quick Helper Pill Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button onClick={() => analyzeUserIntent('ضيف اوردر جديد')} className="flex items-center gap-1 text-xs whitespace-nowrap bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-800"><Plus className="w-3.5 h-3.5 text-emerald-400" /> إضافة أوردر</button>
              <button onClick={() => analyzeUserIntent('كم اوردر عندي')} className="flex items-center gap-1 text-xs whitespace-nowrap bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-800"><Package className="w-3.5 h-3.5 text-blue-400" /> عدد الأوردرات</button>
              <button onClick={() => analyzeUserIntent('تقرير الخزنة')} className="flex items-center gap-1 text-xs whitespace-nowrap bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-800"><Receipt className="w-3.5 h-3.5 text-indigo-400" /> الحسابات والمالية</button>
              <button onClick={resetAllStates} className="flex items-center gap-1 text-xs whitespace-nowrap bg-rose-950/40 border border-rose-900/30 px-3 py-1.5 rounded-full text-rose-300"><X className="w-3.5 h-3.5" /> إلغاء الأمر</button>
            </div>

            {/* Conversation Core */}
            <div className="space-y-4 flex-1">
              {conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 border-slate-800 text-slate-100 rounded-br-none' 
                      : msg.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-100 rounded-bl-none'
                      : msg.type === 'stats'
                      ? 'bg-indigo-950/60 border-indigo-800/40 text-indigo-100 rounded-bl-none'
                      : 'bg-slate-850 border-slate-700/50 text-slate-100 rounded-bl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 opacity-60 text-[10px]">
                      <span>{msg.role === 'user' ? '👤 المالك والعميل' : '✨ المساعد الذكي'}</span>
                    </div>
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-line">{msg.text}</p>
                    <span className="text-[9px] block text-left mt-2 text-slate-500 font-mono">
                      {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loader */}
              {processing && (
                <div className="flex justify-end animate-pulse">
                  <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs text-slate-400 shadow-md">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>جاري التفكير والمعالجة السريعة...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="ابحث باسم العميل أو كود الأوردر..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-medium"
              />
            </div>

            {/* Filter Badges Horizontal */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'pending', 'in_progress', 'ready', 'delivered'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap font-medium transition-all ${
                    selectedFilter === filter 
                      ? 'bg-slate-100 text-slate-950 border-white' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {filter === 'all' ? 'الكل' : STATUS_LABELS[filter]}
                </button>
              ))}
            </div>

            {/* Orders List / Cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] bg-slate-800 font-mono text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">{order.order_code}</span>
                        <h3 className="font-bold text-sm mt-1 text-white">{order.customer_name}</h3>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/50 py-2.5 my-1.5 text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {order.delivery_date}</div>
                      <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {order.phone}</div>
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> سعر: {order.price}ج</div>
                      <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-amber-500" /> باقي: {order.price - order.paid}ج</div>
                    </div>
                    
                    <div className="text-[11px] text-slate-400 pt-1.5 flex justify-between items-center">
                      <span className="truncate max-w-[80%] text-slate-500 italic">🧵 {order.notes || 'لا يوجد ملحوظة'}</span>
                      <span className="text-xs">{CATEGORY_LABELS[order.category]}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-slate-500">لا توجد أوردرات تطابق البحث الحالي.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SMART DASHBOARD STATS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Financial Ledger Glass Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-8 opacity-5"><Receipt className="w-32 h-32 text-indigo-400" /></div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">ملخص خزنة المحل الكلي</h2>
              <div className="text-3xl font-black text-white font-mono mb-1">{stats.totalPaid} <span className="text-xs font-normal text-slate-400">ج.م كاش محصل</span></div>
              <p className="text-xs text-emerald-400 flex items-center gap-1 mb-4"><ArrowUpRight className="w-3.5 h-3.5" /> الأرباح والسيولة المحققة والمدفوعة</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">إجمالي الاتفاقات</span>
                  <span className="text-sm font-bold text-slate-300">{stats.totalCash} ج</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">المتبقي بالخارج</span>
                  <span className="text-sm font-bold text-rose-400">{stats.remainingCash} ج</span>
                </div>
              </div>
            </div>

            {/* Grid Operational Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <Package className="w-4 h-4 text-indigo-400 mb-2" />
                <span className="text-[11px] text-slate-400 block font-medium">كل الطلبات</span>
                <span className="text-lg font-black text-white font-mono">{stats.total}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <Clock className="w-4 h-4 text-amber-400 mb-2" />
                <span className="text-[11px] text-slate-400 block font-medium">قيد الانتظار</span>
                <span className="text-lg font-black text-white font-mono">{stats.pending}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <TrendingUp className="w-4 h-4 text-indigo-400 mb-2" />
                <span className="text-[11px] text-slate-400 block font-medium">شغالين فيها</span>
                <span className="text-lg font-black text-white font-mono">{stats.inProgress}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400 mb-2" />
                <span className="text-[11px] text-slate-400 block font-medium">جاهز للتسليم</span>
                <span className="text-lg font-black text-white font-mono">{stats.ready}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING HUD DOCK VOICE PANEL (FIXED BOTTOM) */}
      <div className="fixed bottom-14 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          
          {/* Live Dynamic Status Voice Subtext & Waveform Indicator */}
          <div className="flex-1">
            <span className="text-[11px] block font-medium text-slate-400">
              {listening ? '🔴 وضع التحدث الحر فعال... تحدث مباشرة' : speaking ? '🔊 جاري الرد صوتياً الآن...' : 'المساعد الصوتي في وضع الاستعداد المستمر'}
            </span>
            
            {/* Visualizer Wave simulation */}
            {(listening || speaking) ? (
              <div className="flex gap-0.5 items-center mt-1 h-3">
                <div className="w-0.5 bg-emerald-400 h-2 animate-pulse" />
                <div className="w-0.5 bg-emerald-400 h-3 animate-ping" />
                <div className="w-0.5 bg-emerald-400 h-1" />
                <div className="w-0.5 bg-emerald-400 h-2.5 animate-pulse" />
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 block font-mono">المايك سيفتح تلقائياً بمجرد تشغيله أول مرة</span>
            )}
          </div>

          {/* MAIN RADIAL MIC TRIGGER BUTTON */}
          <button
            onClick={toggleListening}
            disabled={processing}
            className={`p-4 rounded-full transition-all duration-300 relative ${
              listening 
                ? 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-600/40 ring-4 ring-red-500/20' 
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/40 hover:scale-105'
            } disabled:opacity-30`}
          >
            {listening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* BOTTOM PRIMARY NAVIGATION DOCK TABS */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-around text-slate-400 z-50">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex flex-col items-center justify-center w-full h-full text-center gap-0.5 ${activeTab === 'chat' ? 'text-emerald-400' : 'hover:text-slate-200'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px] font-bold">المساعد</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`flex flex-col items-center justify-center w-full h-full text-center gap-0.5 ${activeTab === 'orders' ? 'text-emerald-400' : 'hover:text-slate-200'}`}
        >
          <Scissors className="w-4 h-4" />
          <span className="text-[10px] font-bold">الأوردرات</span>
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center w-full h-full text-center gap-0.5 ${activeTab === 'dashboard' ? 'text-emerald-400' : 'hover:text-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] font-bold">الخزنة والتقارير</span>
        </button>
      </nav>

    </div>
  );
}
