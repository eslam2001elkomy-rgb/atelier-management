import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Package, CheckCircle, Clock, TrendingUp, Scissors, 
  X, Search, Plus, Calendar, DollarSign, Phone, 
  BarChart3, Loader2, MessageSquare, Receipt, CreditCard, ArrowUpRight,
  AlertCircle, ShieldAlert, Check, RefreshCw, User, FileText, Info
} from 'lucide-react';

// ============================================================================
// 1. TYPES, INTERFACES & GLOBAL CONFIGURATIONS
// ============================================================================
export type AssistantState = 
  | 'IDLE' 
  | 'ADDING_NAME' 
  | 'ADDING_PHONE' 
  | 'ADDING_CATEGORY'
  | 'ADDING_PRICE' 
  | 'ADDING_PAID' 
  | 'ADDING_DATE'
  | 'ADDING_NOTES'
  | 'UPDATING_STATUS'
  | 'DELETING_CONFIRM'
  | 'EXPRESS_REVIEW';

export type TailorCategory = 'DRESS' | 'SUIT' | 'ALTERATION' | 'CUSTOM' | 'ALL';
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

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

export interface OrderDraft {
  customer_name: string;
  phone: string;
  category: TailorCategory;
  price: number;
  paid: number;
  delivery_date: string;
  notes: string;
}

export interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  ready: number;
  delivered: number;
  cancelled: number;
  totalCash: number;
  totalPaid: number;
  remainingCash: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  type?: 'text' | 'stats' | 'success' | 'error' | 'express';
}

// ============================================================================
// 2. ARABIC LANGUAGE DICTIONARIES & TRANSLATION MAPS
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

const CATEGORY_LABELS: Record<TailorCategory, string> = {
  DRESS: 'فستان 👗',
  SUIT: 'بدلة 👔',
  ALTERATION: 'تعديل 🪡',
  CUSTOM: 'تفصيل خاص ✨',
  ALL: 'كل التصنيفات'
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

const ARABIC_NUMBERS: Record<string, number> = {
  'صفر': 0, 'واحد': 1, 'اتنين': 2, 'تنين': 2, 'تلاتة': 3, 'تلات': 3, 'ثلاثة': 3, 'اربعة': 4, 'أربعة': 4,
  'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'تمانية': 8, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
  'عشرين': 20, 'تلاتين': 30, 'ثلاثين': 30, 'اربعين': 40, 'أربعين': 40, 'خمسين': 50,
  'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'ثمانين': 80, 'تسعين': 90,
  'مية': 100, 'مائة': 100, 'ميتين shadow': 200, 'الف': 1000, 'ألف': 1000
};

// ============================================================================
// 3. CORE APPLICATION COMPONENT
// ============================================================================
export default function AIAssistantPage() {
  const { user } = useAuth();

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'dashboard'>('chat');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  
  // شاشة المحادثة تعرض فقط آخر مدخل من المستخدم وآخر رد لتوفير المساحة ومنع التشتيت
  const [lastUserMessage, setLastUserMessage] = useState<ConversationMessage | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<ConversationMessage | null>(null);

  // Data State Lists
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'all'>('all');
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Form State / Drafts
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '', phone: '', category: 'DRESS', price: 0, paid: 0, delivery_date: '', notes: ''
  });
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, ready: 0, delivered: 0, cancelled: 0, totalCash: 0, totalPaid: 0, remainingCash: 0
  });

  // Engines References
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>(draftOrder);
  const statsRef = useRef<Stats>(stats);
  const ordersRef = useRef<Order[]>(allOrders);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAutoListeningAllowed = useRef<boolean>(false);

  // Keep references synced to avoid closures in event listeners
  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { ordersRef.current = allOrders; }, [allOrders]);

  // ============================================================================
  // 4. LIFECYCLE INITIALIZATION
  // ============================================================================
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    loadData();
    
    // الترحيب الأولي الذكي
    setLastAssistantMessage({
      role: 'assistant',
      text: 'مرحباً بك يا فنان في نظام إدارة الأتيليه الذكي المتكامل. أنا أسمعك الآن بشكل مستمر وتلقائي، وسأعرض لك هنا دائماً آخر طلب قمت بنطقه لتسهيل القراءة أثناء العمل الذكي.',
      timestamp: new Date(),
      type: 'text'
    });

    initSpeechRecognition();
    return () => { killSpeechEngine(); };
  }, []);

  // Fetch Data from Supabase
  const loadData = async () => {
    if (!user?.id) return;
    try {
      setDbError(null);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (orders) {
        setAllOrders(orders);
        setFilteredOrders(orders);
        calculateStats(orders);
      }
    } catch (e: any) {
      console.error("Database error:", e);
      setDbError(e.message || 'خطأ في جلب البيانات من السيرفر');
    }
  };

  const calculateStats = (orders: Order[]) => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    
    const totalCash = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);

    setStats({
      total, pending, inProgress, ready, delivered, cancelled,
      totalCash, totalPaid, remainingCash: totalCash - totalPaid
    });
  };

  // ============================================================================
  // 5. ADVANCED DATE TEXTUALIZATION ENGINE (نطق التاريخ اللغوي الصحيح بدون ملايين)
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
      else if (year === 2025) yearText = "ألفين وخمسة وعشرين";
      
      return `اليوم ${dayText} من شهر ${monthText} لعام ${yearText}`;
    } catch (e) {
      return dateStr;
    }
  };

  // ============================================================================
  // 6. SPEECH SYSTEMS CONTROL (AUDIO ENGINE)
  // ============================================================================
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser environment.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false; 
    rec.interimResults = false;
    rec.lang = 'ar-EG';

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      // حلقة الاستماع المستمر الذكي لمنع انقطاع المايك أثناء انشغال يدي الصانع
      setTimeout(() => {
        if (isAutoListeningAllowed.current && !window.speechSynthesis.speaking && !processing) {
          try { rec.start(); } catch(e) {}
        }
      }, 400);
    };

    rec.onresult = (event: any) => {
      if (event.results && event.results[0]) {
        const text = event.results[0][0].transcript;
        analyzeUserIntent(text);
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

  const respond = (text: string, type: 'text' | 'error' | 'success' | 'stats' | 'express' = 'text', spokenOverride?: string) => {
    setLastAssistantMessage({ role: 'assistant', text, timestamp: new Date(), type });
    setProcessing(false);
    
    if (!synthRef.current) return;
    killListeningEngineOnly();
    synthRef.current.cancel();

    // إزالة الرموز التعبيرية والنصوص الخاصة لتجنب تهنيج النطق الصوتي للمتصفح
    const cleanRegex = /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g;
    const textToSpeak = spokenOverride || text.replace(cleanRegex, "").replace(/[*\-_#]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.05; // سرعة نطق احترافية متناسقة مع إيقاع العمل السريع

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

  const resetAllStates = () => {
    setGlobalState('IDLE');
    setDraftOrder({ customer_name: '', phone: '', category: 'DRESS', price: 0, paid: 0, delivery_date: '', notes: '' });
    setPendingOrder(null);
  };

  // ============================================================================
  // 7. HEURISTIC DATA EXTRACTION ENGINES (NLP REGEX EXTRACTORS)
  // ============================================================================
  const extractPhone = (text: string): string => {
    const cleanText = text.replace(/\s+/g, '');
    const match = cleanText.match(/(01[0125]\d{8})/);
    return match ? match[0] : '';
  };

  const detectCategory = (text: string): TailorCategory => {
    if (text.includes('فستان') || text.includes('سهرة') || text.includes('فساتين')) return 'DRESS';
    if (text.includes('بدلة') || text.includes('بدله') || text.includes('بِدل')) return 'SUIT';
    if (text.includes('تعديل') || text.includes('تصليح') || text.includes('ظبط')) return 'ALTERATION';
    if (text.includes('تفصيل') || text.includes('عمولة') || text.includes('خاص')) return 'CUSTOM';
    return 'DRESS'; // التصنيف الافتراضي للأتيليه
  };

  const parseArabicNumbers = (text: string): number => {
    const match = text.trim().match(/\d+/);
    if (match) return parseInt(match[0], 10);
    
    let total = 0;
    const words = text.split(/\s+/);
    words.forEach(w => {
      if (ARABIC_NUMBERS[w] !== undefined) total += ARABIC_NUMBERS[w];
    });
    return total;
  };

  // ============================================================================
  // 8. EXPRESS INTENT PARSER (يفهم الجملة الطويلة والكاملة من أول مرة وبدون تكرار)
  // ============================================================================
  const tryExpressParsing = (text: string): boolean => {
    // إذا تضمنت الجملة كلمة "اسم" أو "عميل" مع سعر أو عربون، نقوم بالتحليل الشامل السريع فوراً
    const raw = text.toLowerCase();
    const hasAddKeywords = raw.includes('ضيف') || raw.includes('سجل') || raw.includes('جديد') || raw.includes('أوردر') || raw.includes('اوردر');
    
    if (!hasAddKeywords) return false;

    // استخراج أولي ذكي جداً
    let detectedName = '';
    let detectedPhone = extractPhone(text);
    let detectedCategoryType = detectCategory(text);
    
    // محاولة استخراج الاسم عن طريق فحص الكلمات بعد "اسم" أو "العميل"
    const nameKeywords = ['اسم العميل', 'اسمه', 'للي اسمه', 'للعميل', 'باسم'];
    for (const kw of nameKeywords) {
      if (raw.includes(kw)) {
        const index = raw.indexOf(kw) + kw.length;
        const remainingText = raw.substring(index).trim();
        const parts = remainingText.split(/\s+/);
        if (parts.length >= 2) {
          detectedName = parts.slice(0, 2).join(' '); // استخراج الاسم الثنائي فوراً
          break;
        }
      }
    }

    // إذا لم يجد كلمة مفتاحية، يحاول اعتبار أول كلمتين بعد فعل "ضيف أوردر" هما الاسم
    if (!detectedName) {
      const tokens = text.split(/\s+/);
      if (tokens.length > 2) {
        detectedName = tokens.slice(1, 3).join(' ');
      }
    }

    // استخراج الأرقام (السعر والعربون)
    // نبحث عن أي أرقام في النص الكامل
    const allNumbers = text.match(/\d+/g);
    let price = 0;
    let paid = 0;

    if (allNumbers && allNumbers.length >= 1) {
      price = parseInt(allNumbers[0], 10);
      if (allNumbers.length >= 2) {
        paid = parseInt(allNumbers[1], 10);
      }
    }

    // إذا نجح المحرك في استخراج اسم وسعر على الأقل، يتم اعتماد الأوردر فوري بدون أسئلة مكررة
    if (detectedName && price > 0) {
      const today = new Date();
      today.setDate(today.getDate() + 7); // الميعاد الافتراضي التلقائي أسبوع
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      setDraftOrder({
        customer_name: detectedName,
        phone: detectedPhone || '01000000000',
        category: detectedCategoryType,
        price: price,
        paid: paid,
        delivery_date: dateStr,
        notes: 'تم التسجيل السريع عبر المحرك الصوتي الذكي الفوري'
      });

      setGlobalState('EXPRESS_REVIEW');
      const spokenDate = formatSpeechDate(dateStr);
      
      respond(
        `🚀 فهمتك من أول مرة يا فنان! قمت بملء البيانات تلقائياً:\nالعميل: ${detectedName}\nالموديل: ${CATEGORY_LABELS[detectedCategoryType]}\nالسعر: ${price} ج والمقدم: ${paid} ج\nالاستلام المتوقع: ${dateStr}.\n\nقول (احفظ فوراً) أو (إلغاء الأمر).`,
        'express',
        `فهمتك من أول مرة يا فنان وقمت بملء الأوردر تلقائياً لـ ${detectedName} بمبلغ ${price} جنيه، وتاريخ الاستلام هو ${spokenDate}. هل تريد الحفظ فوراً؟`
      );
      return true;
    }

    return false;
  };

  // ============================================================================
  // 9. ARTIFICIAL INTELLIGENCE DIALOGUE MANAGEMENT & INTENT ENGINE
  // ============================================================================
  const analyzeUserIntent = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setProcessing(true);
    // تحديث وعرض آخر رسالة نطقها المستخدم فقط على الشاشة فوراً
    setLastUserMessage({ role: 'user', text: rawInput, timestamp: new Date() });
    killListeningEngineOnly();

    try {
      const currentState = stateRef.current;

      // أوامر الإلغاء الشاملة السريعة المدعومة من أي مكان بالسيستم
      if (input.includes('إلغاء') || input.includes('تراجع') || input.includes('خلاص') || input.includes('اقفل') || input.includes('ارجع')) {
        resetAllStates();
        respond('تم إلغاء العملية الجارية فوراً والعودة لوضع الاستعداد الرئيسي.');
        return;
      }

      // أوردر المراجعة السريعة والإقرار (Express Confirmation Mode)
      if (currentState === 'EXPRESS_REVIEW') {
        if (input.includes('احفظ') || input.includes('أكيد') || input.includes('نعم') || input.includes('تمام') || input.includes('سجل')) {
          const finalDraft = draftRef.current;
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
          respond(`✨ تم حفظ الأوردر الشامل بنجاح وسرعة بكود ${code}، وتم إضافته لدفتر الحسابات والعمل في الأتيليه.`, 'success');
        } else {
          resetAllStates();
          respond('تم التراجع عن الحفظ السريع بنجاح.');
        }
        return;
      }

      // محاولة معالجة الجملة كاملة دفعة واحدة بذكاء إذا كان السيستم في حالة استعداد
      if (currentState === 'IDLE') {
        const parsedSuccess = tryExpressParsing(rawInput);
        if (parsedSuccess) return; // تم التعامل وإنهاء الخطوات بنجاح من المرة الأولى
      }

      // ----------------------------------------------------------------------
      // أسلوب المعالجة الخطية التتابعية (في حال لم ينطق المستخدم جملة كاملة)
      // ----------------------------------------------------------------------
      if (currentState === 'IDLE' && (input.includes('ضيف') || input.includes('سجل') || input.includes('أوردر') || input.includes('اوردر'))) {
        setGlobalState('ADDING_NAME');
        respond('حاضر يا فنان، نبدأ بتسجيل الأوردر. قولي اسم العميل بالكامل؟');
        return;
      }

      if (currentState === 'ADDING_NAME') {
        setDraftOrder(prev => ({ ...prev, customer_name: rawInput }));
        setGlobalState('ADDING_PHONE');
        respond(`سجلت الاسم: ${rawInput}. ما هو رقم موبايل العميل؟`);
        return;
      }

      if (currentState === 'ADDING_PHONE') {
        const phone = extractPhone(rawInput) || '01000000000';
        setDraftOrder(prev => ({ ...prev, phone }));
        setGlobalState('ADDING_CATEGORY');
        respond('تمام، ما هو تصنيف الموديل؟ (فستان، بدلة، تعديل، تفصيل خاص)؟');
        return;
      }

      if (currentState === 'ADDING_CATEGORY') {
        const cat = detectCategory(rawInput);
        setDraftOrder(prev => ({ ...prev, category: cat }));
        setGlobalState('ADDING_PRICE');
        respond(`تم تعيين الفئة كـ ${CATEGORY_LABELS[cat]}. كام السعر الإجمالي المتفق عليه؟`);
        return;
      }

      if (currentState === 'ADDING_PRICE') {
        const price = parseArabicNumbers(rawInput);
        setDraftOrder(prev => ({ ...prev, price }));
        setGlobalState('ADDING_PAID');
        respond(`الإجمالي ${price} جنيه. كام مبلغ العربون اللي اتدفع؟`);
        return;
      }

      if (currentState === 'ADDING_PAID') {
        const paid = parseArabicNumbers(rawInput);
        const price = draftRef.current.price;
        setDraftOrder(prev => ({ ...prev, paid }));
        setGlobalState('ADDING_DATE');
        respond(`العربون ${paid} جنيه، والمتبقي ${price - paid} جنيه. متى ميعاد الاستلام؟ (قول بكرة، أو بعد أسبوع، أو ميعاد محدد)`);
        return;
      }

      if (currentState === 'ADDING_DATE') {
        const today = new Date();
        if (input.includes('بكرة') || input.includes('بكره')) today.setDate(today.getDate() + 1);
        else if (input.includes('اسبوع') || input.includes('أسبوع')) today.setDate(today.getDate() + 7);
        else if (input.includes('شهر')) today.setMonth(today.getMonth() + 1);
        
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setDraftOrder(prev => ({ ...prev, delivery_date: dateStr }));
        setGlobalState('ADDING_NOTES');

        // النطق اللغوي الفصيح للتاريخ هنا أيضاً لمنع قراءة الملايين العشوائية
        const spokenDate = formatSpeechDate(dateStr);
        respond(
          `تم تحديد موعد التسليم في ${dateStr}. هل هناك مقاسات خاصة أو ملاحظات تود كتابتها؟`,
          'text',
          `تم تحديد موعد التسليم في ${spokenDate}. هل هناك مقاسات خاصة أو ملاحظات تود كتابتها؟`
        );
        return;
      }

      if (currentState === 'ADDING_NOTES') {
        const notes = input.includes('لا') || input.includes('مفيش') || input.includes('خلاص') ? 'بدون ملاحظات إضافية' : rawInput;
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
        respond(`✨ تم بنجاح حفظ أوردر العميل وتوليد الكود ${code}. ومتاح الآن في القائمة الرسمية.`, 'success');
        return;
      }

      // ----------------------------------------------------------------------
      // محرك تعديل وإدارة حالات الأوردرات (Order Status Management Engine)
      // ----------------------------------------------------------------------
      if (currentState === 'IDLE' && (input.includes('حالة') || input.includes('تحديث أوردر') || input.includes('خلص') || input.includes('تغيير وضع'))) {
        setGlobalState('UPDATING_STATUS');
        respond('قولي رقم كود الأوردر اللي محتاج تغير حالته دلوقتي حالا؟');
        return;
      }

      if (currentState === 'UPDATING_STATUS') {
        const match = input.match(/\d+/);
        if (!match) {
          respond('لم أستطع استخراج رقم الكود بوضوح من صوتك، يرجى تكرار الرقم فقط؟');
          return;
        }
        const findOrder = ordersRef.current.find(o => o.order_code.includes(match[0]));
        if (!findOrder) {
          respond(`عذراً، لم أجد أي أوردر مسجل في الأتيليه يحمل الرقم ${match[0]}. تأكد من الرقم ثانية.`);
          return;
        }
        setPendingOrder(findOrder);
        setGlobalState('DELETING_CONFIRM');
        respond(`لقيت أوردر العميل ${findOrder.customer_name}. الحالة الحالية هي ${STATUS_LABELS[findOrder.status]}. تحب تغيرها لـ: قيد التنفيذ، جاهز للتسليم، ولا تم التسليم؟`);
        return;
      }

      if (currentState === 'DELETING_CONFIRM' && pendingOrder) {
        let newStatus: OrderStatus = pendingOrder.status;
        if (input.includes('تنفيذ') || input.includes('شغال')) newStatus = 'in_progress';
        if (input.includes('جاهز') || input.includes('خلص') || input.includes('تجهيز')) newStatus = 'ready';
        if (input.includes('تسليم') || input.includes('اتسلم') || input.includes('خلصت')) newStatus = 'delivered';
        if (input.includes('إلغاء') || input.includes('ملغي') || input.includes('كنسل')) newStatus = 'cancelled';
        
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', pendingOrder.id);
        if (error) throw error;
        await loadData();
        resetAllStates();
        respond(`تم بنجاح تغيير حالة الطلب وتحديثها إلى: ${STATUS_LABELS[newStatus]} وإشعار النظام.`, 'success');
        return;
      }

      // ----------------------------------------------------------------------
      // محرك الاستعلامات اللحظية المباشرة (Instant Analytical Queries Engine)
      // ----------------------------------------------------------------------
      if (input.includes('كم اوردر') || input.includes('كام اوردر') || input.includes('عدد الاوردرات') || input.includes('الطلبات اللي عندي')) {
        const currentStats = statsRef.current;
        respond(`إجمالي الأوردرات المسجلة بالكامل هو ${currentStats.total} أوردر. متقسمين كالتالي يا فنان: فيه ${currentStats.pending} قيد الانتظار، وفيه ${currentStats.inProgress} قيد التنفيذ والمقص، و ${currentStats.ready} جاهزين تماماً ومستنيين أصحابهم يجوا يستلموا.`);
        return;
      }

      if (input.includes('حسابات') || input.includes('تقرير الخزنة') || input.includes('فلوس المحل') || input.includes('معايا كام') || input.includes('الخزنه')) {
        const currentStats = statsRef.current;
        respond(`التقرير المالي الإجمالي للأتيليه: مجموع الاتفاقات الكلي ${currentStats.totalCash} جنيه، اللي دخل الخزنة كاش فعلي هو ${currentStats.totalPaid} جنيه، والمتبقي برة عند الزباين وهيدخل مع الاستلام هو ${currentStats.remainingCash} جنيه.`, 'stats');
        return;
      }

      // الرد التلقائي الاحتياطي لتأكيد الاستماع المستمر وفهم المحتوى
      respond('أنا سامعك وبكامل تركيزي معاك يا فنان. تقدر تقول مباشرة: (ضيف فستان جديد لندى بـ 3000 جنيه) أو تسألني (معايا كام في الخزنة دلوقتي)؟');
    } catch (err: any) {
      resetAllStates();
      respond('عذراً يا فنان، واجهت مشكلة في الاتصال بالإنترنت أو الخادم السحابي. يرجى تكرار الأمر.', 'error');
    }
  };

  // ----------------------------------------------------------------------
  // 10. REALTIME CLIENT FILTERING & SEARCH EFFECT
  // ----------------------------------------------------------------------
  useEffect(() => {
    let filtered = allOrders;
    if (searchQuery) {
      filtered = filtered.filter(o => 
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.order_code.includes(searchQuery) ||
        o.phone.includes(searchQuery)
      );
    }
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(o => o.status === selectedFilter);
    }
    setFilteredOrders(filtered);
  }, [searchQuery, selectedFilter, allOrders]);

  // ============================================================================
  // 11. ADVANCED RESPONSIVE USER INTERFACE (UX TAILORED FOR MOBILE WORKFLOW)
  // ============================================================================
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none antialiased" dir="rtl">
      
      {/* 11.1 UPPER GLASS TOPBAR */}
      <header className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-900/20 transition-all duration-300 ${listening || speaking ? 'scale-110 rotate-3' : ''}`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            {(listening || speaking) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide bg-gradient-to-l from-white to-slate-300 bg-clip-text text-transparent">نظام الأتيليه الصوتي المحترف</h1>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              الذكاء الاصطناعي الفوري نشط | شاشة نظيفة
            </p>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-slate-200 font-bold font-mono">{stats.totalPaid} ج.م</span>
        </div>
      </header>

      {/* 11.2 MAIN DATA VIEWPORTS PORTS */}
      <main className="flex-1 overflow-y-auto p-4 pb-28">
        
        {dbError && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-900/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="font-medium">{dbError}</p>
          </div>
        )}

        {/* VIEW 1: ADVANCED CHAT SCREEN */}
        {activeTab === 'chat' && (
          <div className="flex flex-col space-y-4 min-h-[62vh] justify-end">
            
            {/* Quick Action Macro Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-auto">
              <button onClick={() => analyzeUserIntent('ضيف اوردر جديد')} className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-slate-200 font-medium whitespace-nowrap"><Plus className="w-3.5 h-3.5 text-emerald-400" /> تسجيل يدوي</button>
              <button onClick={() => analyzeUserIntent('كم اوردر عندي')} className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-slate-200 font-medium whitespace-nowrap"><Package className="w-3.5 h-3.5 text-blue-400" /> فحص الكمية</button>
              <button onClick={() => analyzeUserIntent('تقرير الخزنة')} className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-slate-200 font-medium whitespace-nowrap"><BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> جرد الفلوس</button>
              <button onClick={resetAllStates} className="flex items-center gap-1.5 text-xs bg-rose-950/30 border border-rose-900/30 px-3 py-2 rounded-full text-rose-300 font-medium whitespace-nowrap"><X className="w-3.5 h-3.5" /> تصفير</button>
            </div>

            {/* Conversation Core UI (إظهار آخر رسالة وآخر رد فقط لمنع تشتيت وانشغال الشاشة) */}
            <div className="space-y-4">
              
              {/* عرض آخر ما تلفظ به المستخدم */}
              {lastUserMessage && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[88%] rounded-2xl p-4 shadow-md border bg-slate-900/90 border-slate-800 text-slate-100 rounded-br-none">
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-50 text-[10px] font-bold">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>آخر جملة التقطتها منك الصامتة:</span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed tracking-wide text-slate-200">{lastUserMessage.text}</p>
                  </div>
                </div>
              )}

              {/* عرض آخر استجابة وتنفيذ ذكي من المساعد */}
              {lastAssistantMessage && (
                <div className="flex justify-end animate-fade-in">
                  <div className={`max-w-[88%] rounded-2xl p-4 shadow-lg border ${
                    lastAssistantMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-100' :
                    lastAssistantMessage.type === 'stats' ? 'bg-indigo-950/50 border-indigo-800/40 text-indigo-100' :
                    lastAssistantMessage.type === 'express' ? 'bg-teal-950/40 border-teal-800/50 text-teal-100 ring-1 ring-teal-500/30' :
                    'bg-slate-900 border-slate-700/60 text-slate-100'
                  } rounded-bl-none`}>
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-60 text-[10px] font-bold">
                      <Bot className="w-3 h-3 text-emerald-400" />
                      <span>المساعد التنفيذي الذكي:</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{lastAssistantMessage.text}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/40 text-[9px] text-slate-500 font-mono">
                      <span>الوضع الحالي للسيستم: {globalState}</span>
                      <span>{lastAssistantMessage.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loader Spinner */}
              {processing && (
                <div className="flex justify-end pr-2">
                  <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-slate-400 font-mono shadow-md">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>تحليل الجملة الفورية وتحديث الحالات...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: SMART ORDER MANAGER DOCK */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="ابحث بالاسم، الكود، أو رقم الهاتف..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800/80 rounded-xl py-3 pr-10 pl-4 text-sm text-slate-200 focus:outline-none focus:border-slate-600 transition-colors font-medium"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'pending', 'in_progress', 'ready', 'delivered'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap font-bold transition-all ${
                    selectedFilter === filter ? 'bg-white text-slate-950 border-white shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {filter === 'all' ? 'عرض الكل' : STATUS_LABELS[filter]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 font-mono font-bold tracking-wider">{order.order_code}</span>
                        <h3 className="font-bold text-sm mt-1.5 text-white tracking-wide">{order.customer_name}</h3>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/40 py-3 my-2 text-slate-300 font-semibold font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {order.delivery_date}</div>
                      <div className="flex items-center gap-1.5 text-slate-400"><Phone className="w-3.5 h-3.5 text-slate-500" /> {order.phone}</div>
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> اتفاق: {order.price}ج</div>
                      <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-amber-500" /> باقٍ: {order.price - order.paid}ج</div>
                    </div>
                    
                    <div className="text-[11px] pt-1 flex justify-between items-center text-slate-400 font-medium">
                      <span className="truncate max-w-[70%] text-slate-500 italic">📝 {order.notes || 'لا يوجد ملحوظة'}</span>
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-bold text-slate-300">{CATEGORY_LABELS[order.category]}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-xs text-slate-500 font-medium">لا توجد أي أوردرات مطابقة في السجلات حالياً.</div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: TOTAL ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">الوضعية المالية الإجمالية للمحل</h2>
              <div className="text-3xl font-black text-white font-mono tracking-tight mb-1">{stats.totalPaid} <span className="text-xs font-normal text-slate-400">ج.م كاش محصل بالخزنة</span></div>
              <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mb-5"><ArrowUpRight className="w-4 h-4" /> الخزنة الحالية والسيولة المتوفرة</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">إجمالي قيمة الاتفاقات</span>
                  <span className="text-base font-bold text-slate-200">{stats.totalCash} ج.م</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">الديون المتبقية بالخارج</span>
                  <span className="text-base font-bold text-rose-400">{stats.remainingCash} ج.م</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                <Package className="w-4 h-4 text-indigo-400 mb-2" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي الطلبات</span>
                  <span className="text-xl font-black text-white font-mono">{stats.total}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                <Clock className="w-4 h-4 text-amber-400 mb-2" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">تحت التنفيذ والقص</span>
                  <span className="text-xl font-black text-white font-mono">{stats.inProgress}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                <CheckCircle className="w-4 h-4 text-emerald-400 mb-2" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">جاهز للتسليم</span>
                  <span className="text-xl font-black text-white font-mono">{stats.ready}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                <X className="w-4 h-4 text-rose-400 mb-2" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">الملغية</span>
                  <span className="text-xl font-black text-white font-mono">{stats.cancelled}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 11.3 FLOATING VOICE CONTROL HUD CONTROLLER */}
      <div className="fixed bottom-14 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 z-40 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs block font-bold text-slate-300">
              {listening ? '🔴 وضع الاستماع الذكي الفوري نشط...' : speaking ? '🔊 جاري النطق اللغوي الصحيح للتاريخ...' : 'المساعد الصوتي مستمر، اضغط وتكلم مباشرة'}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">تفادي التهنيج وقراءة الأرقام الطويلة</span>
          </div>

          <button
            onClick={toggleListening}
            disabled={processing}
            className={`p-3.5 rounded-full transition-all duration-300 active:scale-90 ${
              listening ? 'bg-gradient-to-tr from-red-600 to-rose-500 ring-4 ring-red-500/20' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20 hover:scale-105'
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 11.4 FOOTER NAVIGATION DOCK NAVIGATION TABS */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800/60 flex items-center justify-around text-slate-400 z-50 shadow-inner">
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center justify-center w-full h-full text-center gap-1 ${activeTab === 'chat' ? 'text-emerald-400 bg-slate-950/40 font-bold' : 'font-medium'}`}>
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">المساعد الذكي</span>
        </button>
        <button onClick={() => { setActiveTab('orders'); loadData(); }} className={`flex flex-col items-center justify-center w-full h-full text-center gap-1 ${activeTab === 'orders' ? 'text-emerald-400 bg-slate-950/40 font-bold' : 'font-medium'}`}>
          <Scissors className="w-4 h-4" />
          <span className="text-[10px]">دفتر الأوردرات</span>
        </button>
        <button onClick={() => { setActiveTab('dashboard'); loadData(); }} className={`flex flex-col items-center justify-center w-full h-full text-center gap-1 ${activeTab === 'dashboard' ? 'text-emerald-400 bg-slate-950/40 font-bold' : 'font-medium'}`}>
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px]">حسابات الخزنة</span>
        </button>
      </nav>

    </div>
  );
}
