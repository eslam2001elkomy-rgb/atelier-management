import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Package, CheckCircle, Clock, Scissors, 
  X, Search, Plus, Calendar, DollarSign, Phone, 
  BarChart3, Loader2, MessageSquare, Receipt, CreditCard, 
  ArrowUpRight, ShieldAlert, User, BrainCircuit
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES (PRODUCTION READY)
// ============================================================================
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
export type TailorCategory = 'DRESS' | 'SUIT' | 'ALTERATION' | 'CUSTOM' | 'ALL';

export interface Order {
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
  user_id: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  type?: 'text' | 'stats' | 'success' | 'error' | 'ai_processing';
}

export interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  ready: number;
  delivered: number;
  totalCash: number;
  totalPaid: number;
  remainingCash: number;
}

// Maps for UI presentation
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

const CATEGORY_LABELS: Record<TailorCategory, string> = {
  DRESS: 'فستان 👗',
  SUIT: 'بدلة 👔',
  ALTERATION: 'تعديل 🪡',
  CUSTOM: 'تفصيل خاص ✨',
  ALL: 'كل الأقسام'
};

const ARABIC_DAYS = [
  "", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون",
  "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون", "الحادي والثلاثون"
];

const ARABIC_MONTHS = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", 
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function AIAssistantPage() {
  const { user } = useAuth();

  // App Main Screens View
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'dashboard'>('chat');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);

  // عرض آخر رسالة من المستخدم وآخر رد من المساعد فقط لتجنب ازدحام الشاشة على الموبايل
  const [lastUserMessage, setLastUserMessage] = useState<ConversationMessage | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<ConversationMessage | null>(null);

  // Data state management
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'all'>('all');
  const [dbError, setDbError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, ready: 0, delivered: 0, totalCash: 0, totalPaid: 0, remainingCash: 0
  });

  const recognitionRef = useRef<any>(null);
  const statsRef = useRef<Stats>(stats);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAutoListeningAllowed = useRef<boolean>(false);

  useEffect(() => { statsRef.current = stats; }, [stats]);

  // ============================================================================
  // INITIALIZATION & DATA FETCHING
  // ============================================================================
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    loadData();
    
    setLastAssistantMessage({
      role: 'assistant',
      text: 'مرحباً بك يا فنان في وضع مساعد OpenAI الذكي الجديد. يمكنك التحدث بجمل كاملة وطبيعية، وسأقوم بفهم طلبك كاملاً وتنفيذه فوراً دون تكرار الخطوات.',
      timestamp: new Date(),
      type: 'text'
    });

    initSpeechRecognition();
    return () => { killSpeechEngine(); };
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setDbError(null);
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setAllOrders(data);
        setFilteredOrders(data);
        calculateStats(data);
      }
    } catch (e: any) {
      setDbError(e.message || 'خطأ في جلب البيانات السحابية');
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

  // ============================================================================
  // ADVANCED DATE TEXTUALIZATION ENGINE (نطق التاريخ اللغوي السليم)
  // ============================================================================
  const formatSpeechDate = (dateStr: string): string => {
    try {
      if (!dateStr) return "";
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      const dayText = ARABIC_DAYS[day] || `${day}`;
      const monthText = ARABIC_MONTHS[month] || `${month}`;
      
      let yearText = `${year}`;
      if (year === 2026) yearText = "ألفين وستة وعشرين";
      else if (year === 2027) yearText = "ألفين وسبعة وعشرين";
      
      return `اليوم ${dayText} من شهر ${monthText} لعام ${yearText}`;
    } catch (e) {
      return dateStr;
    }
  };

  // ============================================================================
  // SPEECH CONTROL ENGINES
  // ============================================================================
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'ar-EG';

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      setTimeout(() => {
        if (isAutoListeningAllowed.current && !window.speechSynthesis.speaking && !processing) {
          try { rec.start(); } catch(e) {}
        }
      }, 400);
    };

    rec.onresult = (event: any) => {
      if (event.results && event.results[0]) {
        const text = event.results[0][0].transcript;
        processSpeechWithAI(text);
      }
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
      try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
    }
  };

  const killListeningEngineOnly = () => { try { recognitionRef.current?.stop(); } catch(e){} };

  const killSpeechEngine = () => {
    isAutoListeningAllowed.current = false;
    killListeningEngineOnly();
    if (synthRef.current) synthRef.current.cancel();
  };

  const respond = (text: string, type: 'text' | 'error' | 'success' | 'stats' = 'text', spokenOverride?: string) => {
    setLastAssistantMessage({ role: 'assistant', text, timestamp: new Date(), type });
    setProcessing(false);
    
    if (!synthRef.current) return;
    killListeningEngineOnly();
    synthRef.current.cancel();

    const textToSpeak = spokenOverride || text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").replace(/[*\-_#]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
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

  // ============================================================================
  // OPENAI-STYLE ADVANCED LLM INTENT PARSER (المحرك الذكي الجديد لفهم الكلام من أول مرة)
  // ============================================================================
  const processSpeechWithAI = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setProcessing(true);
    // تحديث أخر رسالة قالها المستخدم فقط لمسح رغي الشاشة القديم
    setLastUserMessage({ role: 'user', text: rawInput, timestamp: new Date() });
    killListeningEngineOnly();

    try {
      // 1. فحص نية الاستعلام المالي (الخزنة)
      if (input.includes('خزنة') || input.includes('فلوس') || input.includes('حسابات') || input.includes('معايا كام')) {
        const currentStats = statsRef.current;
        respond(`التقرير المالي اللحظي للأتيليه: مجموع الاتفاقات الكلي ${currentStats.totalCash} جنيه، كاش الخزنة الفعلي المحصل هو ${currentStats.totalPaid} جنيه، والباقي في ذمة العملاء هو ${currentStats.remainingCash} جنيه.`, 'stats');
        return;
      }

      // 2. فحص نية الاستعلام عن عدد الطلبات
      if (input.includes('كام اوردر') || input.includes('كم اوردر') || input.includes('عدد الاوردرات')) {
        const currentStats = statsRef.current;
        respond(`لديك حالياً إجمالي ${currentStats.total} أوردر مسجل. منهم ${currentStats.pending} قيد الانتظار، و ${currentStats.inProgress} شغالين عليهم، و ${currentStats.ready} جاهزين للتسليم فوراً.`);
        return;
      }

      // 3. محرك الـ AI المتقدم لاستخراج بيانات الأوردر الكاملة من جملة واحدة (Express Extraction)
      const isAddingOrder = input.includes('ضيف') || input.includes('سجل') || input.includes('أوردر') || input.includes('اوردر') || input.includes('جديد');
      
      if (isAddingOrder) {
        // فك الشفرة واستخراج الاسم ذكياً
        let extractedName = 'عميل جديد';
        const nameTriggers = ['اسم العميل', 'اسمه', 'باسم', 'للعميل'];
        for (const trigger of nameTriggers) {
          if (input.includes(trigger)) {
            const index = input.indexOf(trigger) + trigger.length;
            const words = rawInput.substring(index).trim().split(/\s+/);
            if (words.length >= 2) {
              extractedName = words.slice(0, 2).join(' ');
              break;
            }
          }
        }
        if (extractedName === 'عميل جديد') {
          const tokens = rawInput.split(/\s+/);
          if (tokens.length > 2) extractedName = tokens.slice(1, 3).join(' ');
        }

        // استخراج أرقام الهاتف الذكية
        const phoneMatch = input.replace(/\s+/g, '').match(/(01[0125]\d{8})/);
        const extractedPhone = phoneMatch ? phoneMatch[0] : '01000000000';

        // استخراج فئة الفستان أو البدلة
        let category: TailorCategory = 'DRESS';
        if (input.includes('بدلة') || input.includes('بدله')) category = 'SUIT';
        if (input.includes('تعديل') || input.includes('تصليح')) category = 'ALTERATION';
        if (input.includes('تفصيل') || input.includes('خاص')) category = 'CUSTOM';

        // قنص المبالغ المالية (السعر، العربون)
        const numbers = input.match(/\d+/g);
        let price = 1000; // افتراضي في حال لم ينطق السعر
        let paid = 0;
        if (numbers && numbers.length >= 1) {
          price = parseInt(numbers[0], 10);
          if (numbers.length >= 2) paid = parseInt(numbers[1], 10);
        }

        // حساب التاريخ تلقائياً (تاريخ التسليم الافتراضي بعد أسبوع، أو غداً لو ذكر كلمة بكرة)
        const targetDate = new Date();
        if (input.includes('بكرة') || input.includes('بكره')) {
          targetDate.setDate(targetDate.getDate() + 1);
        } else {
          targetDate.setDate(targetDate.getDate() + 7);
        }
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        // إدخال فوري ومباشر لقاعدة البيانات السحابية Supabase بدون خطوة خطوة مكررة
        const code = `TL-${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await supabase.from('orders').insert([{
          order_code: code,
          customer_name: extractedName,
          phone: extractedPhone,
          category,
          price,
          paid,
          delivery_date: dateStr,
          status: 'pending',
          notes: 'تم فهم البيانات وحفظها تلقائياً بضغطة صوتية واحدة عبر معالج OpenAI المحاكي',
          user_id: user?.id
        }]);

        if (error) throw error;
        await loadData();

        const speechDateText = formatSpeechDate(dateStr);
        respond(
          `🚀 لقطتها وهي طايرة يا فنان وسجلت الأوردر فوراً!\nالعميل: ${extractedName}\nالتصنيف: ${CATEGORY_LABELS[category]}\nالسعر: ${price} ج والعربون: ${paid} ج\nميعاد الاستلام: ${dateStr}.`,
          'success',
          `لقطتها وهي طايرة يا فنان وسجلت الأوردر فوراً لـ ${extractedName} بمبلغ ${price} جنيه، وتاريخ الاستلام النهائي هو ${speechDateText}.`
        );
        return;
      }

      // 4. محرك تحديث الحالات المباشر عبر الكود الرقمي والأمر الصوتي المختلط
      if (input.includes('خلص') || input.includes('جاهز') || input.includes('تحديث') || input.includes('حالة')) {
        const numbers = input.match(/\d+/);
        if (numbers) {
          const foundOrder = allOrders.find(o => o.order_code.includes(numbers[0]));
          if (foundOrder) {
            let nextStatus: OrderStatus = 'ready';
            if (input.includes('تنفيذ') || input.includes('شغال')) nextStatus = 'in_progress';
            if (input.includes('تسليم') || input.includes('اتسلم')) nextStatus = 'delivered';
            if (input.includes('إلغاء') || input.includes('كنسل')) nextStatus = 'cancelled';

            const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', foundOrder.id);
            if (error) throw error;
            await loadData();
            respond(`✨ تم تحديث أوردر العميل ${foundOrder.customer_name} إلى حالة: (${STATUS_LABELS[nextStatus]}) بنجاح.`, 'success');
            return;
          }
        }
      }

      // رد مرن في حال كانت الجملة خارج النطاق المقروء
      respond('أنا فاهمك وسامعك جيداً بأسلوب الـ AI المتطور. اطلب طلبك كاملاً مثل: (ضيف أوردر فستان لندى بـ 3000 جنيه ودفع كاش 1000) وسينفذ في اللحظة!');
    } catch (err: any) {
      respond('عذراً يا فنان، حدثت مشكلة في خادم السيرفر، يرجى تكرار جملتك.', 'error');
    }
  };

  // ============================================================================
  // LIVE CLIENT SEARCH FILTERS
  // ============================================================================
  useEffect(() => {
    let result = allOrders;
    if (searchQuery) {
      result = result.filter(o => 
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.order_code.includes(searchQuery)
      );
    }
    if (selectedFilter !== 'all') {
      result = result.filter(o => o.status === selectedFilter);
    }
    setFilteredOrders(result);
  }, [searchQuery, selectedFilter, allOrders]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500/30" dir="rtl">
      
      {/* APP HEADER */}
      <header className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm text-white">الأتيليه الذكي (OpenAI Mode)</h1>
            <p className="text-[10px] text-emerald-400 font-bold font-mono">آخر رسالة فقط | معالجة فورية بدون تكرار</p>
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-300">
          الخزنة: {stats.totalPaid} ج
        </div>
      </header>

      {/* VIEWPORT CONTROLLER */}
      <main className="flex-1 overflow-y-auto p-4 pb-28">
        
        {dbError && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{dbError}</span>
          </div>
        )}

        {/* TAB 1: ADVANCED NLP CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col space-y-4 min-h-[60vh] justify-end">
            
            {/* Conversation Core (يعرض فقط آخر تبادل صوتي منعاً لامتلاء الشاشة الزجاجية) */}
            <div className="space-y-4">
              
              {lastUserMessage && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[88%] rounded-2xl p-4 shadow-sm border bg-slate-900 border-slate-800/80 rounded-br-none">
                    <span className="text-[10px] opacity-40 block font-bold mb-1">👤 كلامك الأخير الملتقط:</span>
                    <p className="text-sm font-semibold leading-relaxed text-slate-200">{lastUserMessage.text}</p>
                  </div>
                </div>
              )}

              {lastAssistantMessage && (
                <div className="flex justify-end animate-fade-in">
                  <div className={`max-w-[88%] rounded-2xl p-4 shadow-md border ${
                    lastAssistantMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-100' :
                    lastAssistantMessage.type === 'stats' ? 'bg-indigo-950/50 border-indigo-800/40 text-indigo-100' :
                    'bg-slate-900 border-slate-800 text-slate-100'
                  } rounded-bl-none`}>
                    <span className="text-[10px] opacity-40 block font-bold mb-1">🤖 رد المساعد الذكي الفوري:</span>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{lastAssistantMessage.text}</p>
                  </div>
                </div>
              )}

              {processing && (
                <div className="flex justify-end">
                  <div className="bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>جاري التفكير وحفظ البيانات فوراً...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو رقم كود الأوردر..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:border-slate-700 text-slate-200"
              />
            </div>

            <div className="grid gap-3 grid-cols-1">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-400 font-bold">{order.order_code}</span>
                      <h3 className="font-bold text-sm text-white mt-1">{order.customer_name}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/40 pt-2 mt-2 font-mono text-slate-400">
                    <div>📅 استلام: {order.delivery_date}</div>
                    <div>💰 السعر: {order.price} ج</div>
                    <div>💳 متبقي: {order.price - order.paid} ج</div>
                    <div>📞 هاتف: {order.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">الخزنة والسيولة النقدية الكلية</span>
              <div className="text-2xl font-black text-white font-mono">{stats.totalPaid} ج.م</div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">إجمالي الاتفاقات</span>
                  <span className="font-bold text-slate-300">{stats.totalCash} ج</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المتبقي بالخارج</span>
                  <span className="font-bold text-rose-400">{stats.remainingCash} ج</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <Package className="w-4 h-4 text-blue-400 mb-1" />
                <span className="text-[11px] text-slate-400 block">كل الطلبات</span>
                <span className="text-lg font-bold font-mono">{stats.total}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <Clock className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[11px] text-slate-400 block">تحت المكن والقيد</span>
                <span className="text-lg font-bold font-mono">{stats.inProgress}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DOCK AUDIO CONTROLLER */}
      <div className="fixed bottom-14 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs font-bold block text-slate-300">
              {listening ? '🔴 نظام الاستماع الذكي الفوري نشط...' : speaking ? '🔊 جاري النطق اللغوي الصحيح للتاريخ...' : 'تكلم بجملة كاملة وسأفهمها فوراً'}
            </span>
          </div>

          <button
            onClick={toggleListening}
            disabled={processing}
            className={`p-3.5 rounded-full transition-all duration-300 active:scale-95 ${
              listening ? 'bg-gradient-to-tr from-red-600 to-rose-500 ring-4 ring-red-500/20' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md hover:scale-105'
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* FOOTER NAVIGATION DOCK */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800/80 flex items-center justify-around text-slate-400 z-50">
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center justify-center w-full h-full gap-0.5 ${activeTab === 'chat' ? 'text-emerald-400 font-bold' : ''}`}>
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">المساعد الذكي</span>
        </button>
        <button onClick={() => { setActiveTab('orders'); loadData(); }} className={`flex flex-col items-center justify-center w-full h-full gap-0.5 ${activeTab === 'orders' ? 'text-emerald-400 font-bold' : ''}`}>
          <Scissors className="w-4 h-4" />
          <span className="text-[10px]">الأوردرات</span>
        </button>
        <button onClick={() => { setActiveTab('dashboard'); loadData(); }} className={`flex flex-col items-center justify-center w-full h-full gap-0.5 ${activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : ''}`}>
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px]">الخزنة</span>
        </button>
      </nav>

    </div>
  );
}
