import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Volume2, Package, CheckCircle, 
  Clock, TrendingUp, Cpu, Scissors, 
  Eye, X, Search, Plus, Edit3, Trash2, Calendar, DollarSign, 
  Phone, User, BarChart3, 
  RefreshCw, Filter, Image as ImageIcon, 
  MessageSquare, Sparkles, Zap, MicOff,
  Users, Receipt, CreditCard, ArrowUpRight, ArrowDownRight,
  Loader2, CheckCheck, XCircle, Info
} from 'lucide-react';

// ============================================================================
// TYPES
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
  size_chest?: string;
  size_waist?: string;
  size_length?: string;
  price: number;
  paid: number;
  delivery_date: string;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  order_images?: OrderImage[];
}

interface OrderImage {
  id: string;
  order_id: string;
  image_url: string;
  created_at: string;
}

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

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  ready: number;
  delivered: number;
  cancelled: number;
  totalCash: number;
  totalPaid: number;
  remainingCash: number;
  todayDeliveries: number;
  weekDeliveries: number;
  monthRevenue: number;
  efficiencyRate: number;
  activeAlerts: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'stats' | 'order' | 'error';
  data?: any;
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
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  delivered: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
};

const CATEGORY_LABELS: Record<string, string> = {
  DRESS: 'فستان',
  SUIT: 'بدلة',
  ALTERATION: 'تعديل',
  CUSTOM: 'تفصيل خاص',
  ALL: 'الكل'
};

const ARABIC_NUMBERS: Record<string, number> = {
  'صفر': 0, 'واحد': 1, 'واحدة': 1, 'اتنين': 2, 'تلاتة': 3, 'تلات': 3,
  'اربعة': 4, 'اربع': 4, 'خمسة': 5, 'خمس': 5, 'ستة': 6, 'ست': 6,
  'سبعة': 7, 'سبع': 7, 'تمانية': 8, 'تمان': 8, 'تسعة': 9, 'تسع': 9,
  'عشرة': 10, 'عشر': 10, 'عشرين': 20, 'تلاتين': 30, 'اربعين': 40,
  'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'تسعين': 90,
  'مية': 100, 'ميتين': 200, 'تلاتمية': 300, 'ربعمية': 400, 'خمسمية': 500,
  'ستمية': 600, 'سبعمية': 700, 'تمانمية': 800, 'تسعمية': 900,
  'ألف': 1000, 'الف': 1000, 'ألفين': 2000, 'الفين': 2000, 'اتنين الف': 2000,
  'تلات تلاف': 3000, 'تلاتة آلاف': 3000, 'اربع تلاف': 4000, 'أربعة آلاف': 4000,
  'خمس تلاف': 5000, 'خمسة آلاف': 5000, 'عشر تلاف': 10000, 'عشرة آلاف': 10000,
  'مليون': 1000000
};

const MONTHS_AR: Record<string, number> = {
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'ابريل': 4, 'مايو': 5, 'يونيو': 6,
  'يوليو': 7, 'اغسطس': 8, 'سبتمبر': 9, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  'جانفي': 1, 'فيفري': 2, 'افريل': 4, 'جوان': 6, 'جويلية': 7, 'اوت': 8
};

export default function AIAssistantPage() {
  const { user } = useAuth();

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  const [isActive, setIsActive] = useState(false);

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [userSpeech, setUserSpeech] = useState('');
  const [aiSpeech, setAiSpeech] = useState('مرحباً بك في نظام الأتيليه الذكي. أنا جاهز لمساعدتك في إدارة جميع طلباتك. اضغط على الزر الأخضر للبدء.');

  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '', phone: '', category: 'DRESS', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: ''
  });
  const [pendingUpdateUser, setPendingUpdateUser] = useState<Order | null>(null);
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [imagesOwner, setImagesOwner] = useState('');
  const [lastFoundOrders, setLastFoundOrders] = useState<Order[]>([]);

  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, ready: 0, delivered: 0, cancelled: 0,
    totalCash: 0, totalPaid: 0, remainingCash: 0, todayDeliveries: 0,
    weekDeliveries: 0, monthRevenue: 0, efficiencyRate: 100, activeAlerts: 0
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'stats'>('chat');
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

  const recognitionRef = useRef<any>(null);
  const isUserTurnRef = useRef(true);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>(draftOrder);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    fetchComprehensiveStats();
    addToConversation('assistant', aiSpeech, 'text');
    return () => { killSpeechEngine(); };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const addToConversation = useCallback((role: 'user' | 'assistant' | 'system', text: string, type: 'text' | 'image' | 'stats' | 'order' | 'error' = 'text', data?: any) => {
    setConversation(prev => [...prev, { role, text, timestamp: new Date(), type, data }]);
  }, []);

  const fetchComprehensiveStats = async () => {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*, order_images(*)');
      if (error) throw error;

      if (orders) {
        const today = new Date();
        const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const total = orders.length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const inProgress = orders.filter(o => o.status === 'in_progress').length;
        const ready = orders.filter(o => o.status === 'ready').length;
        const delivered = orders.filter(o => o.status === 'delivered').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;

        const totalCash = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);
        const remainingCash = totalCash - totalPaid;

        const todayDeliveries = orders.filter(o => {
          if (!o.delivery_date) return false;
          const d = new Date(o.delivery_date);
          return d.toDateString() === today.toDateString();
        }).length;

        const weekDeliveries = orders.filter(o => {
          if (!o.delivery_date) return false;
          const d = new Date(o.delivery_date);
          return d >= today && d <= weekLater;
        }).length;

        const monthRevenue = orders
          .filter(o => {
            if (!o.created_at) return false;
            const d = new Date(o.created_at);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          })
          .reduce((sum, o) => sum + (Number(o.paid) || 0), 0);

        const efficiencyRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
        const activeAlerts = ready + pending;

        setStats({
          total, pending, inProgress, ready, delivered, cancelled,
          totalCash, totalPaid, remainingCash, todayDeliveries,
          weekDeliveries, monthRevenue, efficiencyRate, activeAlerts
        });
      }
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const fetchOrdersByStatus = async (status: OrderStatus) => {
    try {
      const { data, error } = await supabase.from('orders').select('*, order_images(*)').eq('status', status).order('created_at', { ascending: false });
      if (error) throw error;
      setCurrentOrders(data || []);
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const fetchAllOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*, order_images(*)').order('created_at', { ascending: false });
      if (error) throw error;
      setCurrentOrders(data || []);
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const searchOrders = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_images(*)')
        .or(`customer_name.ilike.%${query}%,order_code.eq.${query},phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCurrentOrders(data || []);
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const executeVocalReply = (text: string, lang: string = 'ar-EG') => {
    const synth = synthRef.current;
    if (!synth) return;

    killListeningEngineOnly();
    synth.cancel();

    const filteredText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .replace(/[*\-_#]/g, "");

    const utterance = new SpeechSynthesisUtterance(filteredText);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    activeUtteranceRef.current = utterance;

    utterance.onstart = () => { setSpeaking(true); isUserTurnRef.current = false; };
    utterance.onend = () => {
      setSpeaking(false); isUserTurnRef.current = true; activeUtteranceRef.current = null;
      setTimeout(() => { if (isUserTurnRef.current && isActive) startContinuousListening(); }, 400);
    };
    utterance.onerror = (e) => { 
      console.error('Speech error:', e);
      setSpeaking(false); isUserTurnRef.current = true; 
      if (isActive) startContinuousListening(); 
    };

    synth.speak(utterance);
  };

  const parseArabicNumbers = (text: string): number => {
    const cleanText = text.trim().toLowerCase();
    const match = cleanText.match(/\d+/);
    if (match) return parseInt(match[0], 10);

    let total = 0;
    const words = cleanText.split(/\s+/);

    for (const word of words) {
      for (const [key, value] of Object.entries(ARABIC_NUMBERS)) {
        if (word.includes(key)) {
          total += value;
        }
      }
    }

    if (total > 0) return total;

    if (cleanText.includes('ألف ونص') || cleanText.includes('الف ونص')) return 1500;
    if (cleanText.includes('ألف وربع') || cleanText.includes('الف وربع')) return 1250;
    if (cleanText.includes('ألف وثلاثة') || cleanText.includes('الف وثلاثه')) return 1300;
    if (cleanText.includes('ألفين ونص') || cleanText.includes('الفين ونص')) return 2500;

    return 0;
  };

  const parseArabicSpeechToDate = (speech: string): string => {
    let cleanSpeech = speech
      .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

    const today = new Date();

    if (cleanSpeech.includes('بكرة') || cleanSpeech.includes('بكره') || cleanSpeech.includes('غدا')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    }

    if (cleanSpeech.includes('بعد بكرة') || cleanSpeech.includes('بعد بكره')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return formatDate(dayAfter);
    }

    if (cleanSpeech.includes('اسبوع')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return formatDate(nextWeek);
    }

    if (cleanSpeech.includes('شهر')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return formatDate(nextMonth);
    }

    let spaceIsolated = cleanSpeech
      .replace(/[\/\-\.\\]/g, ' ')
      .replace(/شهر|سنة|عام|يوم|من|في|سنه|ميعاد|التسليم|تاريخ|لحد|لغاية/gi, ' ')
      .trim();

    const numbers = spaceIsolated.match(/\d+/g);

    if (numbers && numbers.length >= 2) {
      let day = parseInt(numbers[0], 10);
      let month = parseInt(numbers[1], 10);
      let year = numbers[2] ? parseInt(numbers[2], 10) : today.getFullYear();

      if (day > 2000) { 
        const temp = day; 
        day = month; 
        month = temp > 12 ? today.getMonth() + 1 : temp;
        year = temp > 2000 ? temp : year;
      }

      if (month > 12 && month <= 31 && day <= 12) {
        const temp = month;
        month = day;
        day = temp;
      }

      if (day > 0 && day <= 31 && month > 0 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    for (const [monthName, monthNum] of Object.entries(MONTHS_AR)) {
      if (cleanSpeech.includes(monthName)) {
        const dayMatch = cleanSpeech.match(/\d{1,2}/);
        if (dayMatch) {
          const day = parseInt(dayMatch[0]);
          const year = today.getFullYear();
          return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    const fallbackParsed = Date.parse(speech);
    if (!isNaN(fallbackParsed)) {
      const d = new Date(fallbackParsed);
      return formatDate(d);
    }

    return formatDate(today);
  };

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const analyzeUserIntent = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setUserSpeech(rawInput);
    setProcessing(true);
    addToConversation('user', rawInput);
    killListeningEngineOnly();

    try {
      const currentGlobalState = stateRef.current;

      // Developer info
      if (input.includes('صممك') || input.includes('برمجك') || input.includes('مطورك') || input.includes('مين عملك')) {
        const msg = 'تم تصميم وتطوير هذا المساعد الذكي بواسطة المهندس إسلام الكومي. النظام يستخدم أحدث تقنيات الذكاء الاصطناعي والمعالجة الصوتية.';
        respond(msg);
        return;
      }

      // Cancel operation
      if (input.includes('إلغاء') || input.includes('اكنسل') || input.includes('خلاص') || input.includes('امسح') || input.includes('لغي')) {
        resetAllStates();
        const msg = 'تم إلغاء العملية الحالية وتصفير جميع البيانات المؤقتة.';
        respond(msg);
        return;
      }

      // ==========================================
      // ORDER CREATION FLOW
      // ==========================================
      if (currentGlobalState === 'IDLE' && (
        input.includes('ضيف') || input.includes('اعمل اوردر') || input.includes('طلب جديد') || 
        input.includes('سجل اوردر') || input.includes('جديد') || input.includes('اضافة')
      )) {
        setGlobalState('ADDING_NAME');
        const msg = 'تمام، هنضيف أوردر جديد. قولي اسم العميل بالكامل.';
        respond(msg);
        return;
      }

      if (currentGlobalState === 'ADDING_NAME') {
        setDraftOrder(prev => ({ ...prev, customer_name: rawInput.trim() }));
        setGlobalState('ADDING_PHONE');
        respond('ممتاز. دلوقتي قولي رقم التليفون.');
        return;
      }

      if (currentGlobalState === 'ADDING_PHONE') {
        const phone = extractPhone(rawInput);
        setDraftOrder(prev => ({ ...prev, phone }));
        setGlobalState('ADDING_CATEGORY');
        respond('كويس جداً. نوع القطعة إيه؟ (فستان، بدلة، تعديل، ولا تفصيل خاص؟)');
        return;
      }

      if (currentGlobalState === 'ADDING_CATEGORY') {
        const category = detectCategory(rawInput);
        setDraftOrder(prev => ({ ...prev, category }));
        setGlobalState('ADDING_PRICE');
        respond(`تمام، سجلت النوع: ${CATEGORY_LABELS[category]}. قولي السعر كام؟`);
        return;
      }

      if (currentGlobalState === 'ADDING_PRICE') {
        const num = parseArabicNumbers(rawInput);
        setDraftOrder(prev => ({ ...prev, price: num }));
        setGlobalState('ADDING_PAID');
        respond(`سجلت السعر ${num} جنيه. العميل دفع كام عربون؟ (لو مفيش قول صفر)`);
        return;
      }

      if (currentGlobalState === 'ADDING_PAID') {
        const num = parseArabicNumbers(rawInput);
        setDraftOrder(prev => ({ ...prev, paid: num }));
        setGlobalState('ADDING_DATE');
        respond('ممتاز. قولي تاريخ التسليم امتى؟ (ممكن تقول: بكرة، بعد أسبوع، 15 يونيو، إلخ)');
        return;
      }

      if (currentGlobalState === 'ADDING_DATE') {
        const processedDate = parseArabicSpeechToDate(rawInput);
        setDraftOrder(prev => ({ ...prev, delivery_date: processedDate }));
        setGlobalState('ADDING_NOTES');
        respond(`تمام، ميعاد التسليم: ${processedDate}. عايز تضيف أي ملاحظات؟ (لو مفيش قول لا)`);
        return;
      }

      if (currentGlobalState === 'ADDING_NOTES') {
        const notes = rawInput.toLowerCase().includes('لا') || rawInput.toLowerCase().includes('مفيش') ? '' : rawInput;
        const finalOrder = { ...draftRef.current, notes };
        const orderCode = generateOrderCode();

        const { error } = await supabase.from('orders').insert([{
          order_code: orderCode,
          customer_name: finalOrder.customer_name,
          phone: finalOrder.phone,
          category: finalOrder.category,
          price: finalOrder.price,
          paid: finalOrder.paid,
          delivery_date: finalOrder.delivery_date,
          status: 'pending',
          notes: finalOrder.notes || 'تم الإنشاء صوتياً',
          user_id: user?.id
        }]);

        if (error) throw error;
        await fetchComprehensiveStats();

        const remain = finalOrder.price - finalOrder.paid;
        const msg = `🎉 تمام يا فنان! ضفت الأوردر بنجاح.\n\n📋 **كود الأوردر:** ${orderCode}\n👤 **العميل:** ${finalOrder.customer_name}\n📱 **التليفون:** ${finalOrder.phone}\n👔 **النوع:** ${CATEGORY_LABELS[finalOrder.category]}\n💰 **السعر:** ${finalOrder.price} جنيه\n💳 **المدفوع:** ${finalOrder.paid} جنيه\n📅 **ميعاد التسليم:** ${finalOrder.delivery_date}\n💵 **المتبقي:** ${remain} جنيه\n\nعايز تعمل حاجة تانية؟`;

        respond(msg);
        resetDraft();
        setGlobalState('IDLE');
        return;
      }

      // ==========================================
      // STATUS UPDATE FLOW
      // ==========================================
      if (currentGlobalState === 'UPDATING_STATUS' && pendingUpdateUser) {
        const newStatus = detectStatus(input);

        if (newStatus) {
          const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', pendingUpdateUser.id);
          if (error) throw error;
          await fetchComprehensiveStats();
          const msg = `✅ تمام! غيّرت حالة أوردر **${pendingUpdateUser.customer_name}** إلى: **${STATUS_LABELS[newStatus]}**.`;
          respond(msg);
          setPendingUpdateUser(null);
          setGlobalState('IDLE');
          return;
        } else {
          respond('لم أفهم الحالة الجديدة. قول: جاهز، قيد التنفيذ، تم التسليم، أو قيد الانتظار.');
          return;
        }
      }

      // Update status by name or code
      if (currentGlobalState === 'IDLE' && (
        input.includes('حدث') || input.includes('تحديث') || input.includes('غير الحالة') || 
        input.includes('تعديل حالة') || input.includes('اتسلم') || input.includes('خلص') ||
        input.includes('ابدا') || input.includes('ابدأ') || input.includes('جهز')
      )) {
        const code = input.match(/\d{7}/)?.[0];

        if (code) {
          const newStatus = detectStatus(input) || 'in_progress';
          const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('order_code', code).select();
          if (error) throw error;

          if (data && data.length > 0) {
            await fetchComprehensiveStats();
            respond(`✅ تم تحديث حالة الأوردر رقم **${code}** إلى **${STATUS_LABELS[newStatus]}**.`);
          } else {
            respond(`❌ مالقيتش أوردر بالكود **${code}** في السيستم.`);
          }
          return;
        } else {
          const cleanName = extractNameFromQuery(rawInput);
          if (!cleanName) {
            respond('❌ اذكر اسم العميل أو كود الأوردر لتحديث الحالة.');
            return;
          }

          const { data, error } = await supabase.from('orders').select('*').ilike('customer_name', `%${cleanName}%`).limit(5);
          if (error) throw error;

          if (!data || data.length === 0) {
            respond(`❌ مالقيتش أي أوردر باسم **${cleanName}** في السيستم.`);
            return;
          }

          if (data.length === 1) {
            const targetOrder = data[0];
            const quickStatus = detectStatus(input);

            if (quickStatus) {
              await supabase.from('orders').update({ status: quickStatus }).eq('id', targetOrder.id);
              await fetchComprehensiveStats();
              respond(`✅ غيّرت حالة أوردر **${targetOrder.customer_name}** فوراً إلى **${STATUS_LABELS[quickStatus]}**.`);
              return;
            }

            setPendingUpdateUser(targetOrder);
            setGlobalState('UPDATING_STATUS');
            respond(`لقيت أوردر **${targetOrder.customer_name}**. تحب تحول الحالة لإيه؟ (جاهز، قيد التنفيذ، تم التسليم، ولا انتظار؟)`);
            return;
          } else {
            setLastFoundOrders(data);
            const namesList = data.map(o => `${o.customer_name} (كود: ${o.order_code})`).join('، ');
            respond(`لقيت ${data.length} أوردرات بنفس الاسم: ${namesList}. قولي الكود بالظبط عشان أحدثه.`);
            return;
          }
        }
      }

      // ==========================================
      // DELETE ORDER
      // ==========================================
      if (currentGlobalState === 'IDLE' && (
        input.includes('امسح') || input.includes('احذف') || input.includes('شيل') || input.includes('حذف')
      )) {
        const code = input.match(/\d{7}/)?.[0];
        const cleanName = extractNameFromQuery(rawInput);

        if (code) {
          const { data } = await supabase.from('orders').select('*').eq('order_code', code).single();
          if (data) {
            setPendingUpdateUser(data);
            setGlobalState('DELETING_CONFIRM');
            respond(`⚠️ متأكد إنك عايز تمسح أوردر **${data.customer_name}** (كود: ${code})؟ قولي "أيوه" عشان أتمسح نهائياً.`);
            return;
          }
        } else if (cleanName) {
          const { data } = await supabase.from('orders').select('*').ilike('customer_name', `%${cleanName}%`).limit(1);
          if (data && data.length > 0) {
            setPendingUpdateUser(data[0]);
            setGlobalState('DELETING_CONFIRM');
            respond(`⚠️ متأكد إنك عايز تمسح أوردر **${data[0].customer_name}**؟ قولي "أيوه" عشان أتمسح.`);
            return;
          }
        }
        respond('❌ مالقيتش الأوردر اللي عايز تمسحه. قولي الكود أو الاسم.');
        return;
      }

      if (currentGlobalState === 'DELETING_CONFIRM' && pendingUpdateUser) {
        if (input.includes('أيوه') || input.includes('اه') || input.includes('نعم') || input.includes('اوك')) {
          const { error } = await supabase.from('orders').delete().eq('id', pendingUpdateUser.id);
          if (error) throw error;
          await fetchComprehensiveStats();
          respond(`🗑️ تم حذف أوردر **${pendingUpdateUser.customer_name}** نهائياً من السيستم.`);
          setPendingUpdateUser(null);
          setGlobalState('IDLE');
          return;
        } else {
          respond('تم إلغاء عملية الحذف.');
          setPendingUpdateUser(null);
          setGlobalState('IDLE');
          return;
        }
      }

      // ==========================================
      // QUERIES & SEARCH
      // ==========================================
      if (currentGlobalState === 'IDLE') {

        // Show all names
        if (input.includes('اسماء') || input.includes('أسماء') || input.includes('كل الاوردرات') || input.includes('كل العملا')) {
          const orders = await fetchAllOrders();
          if (orders.length === 0) {
            respond('📭 مفيش أي أوردرات مسجلة في النظام حالياً.');
          } else {
            const names = orders.map(o => `**${o.customer_name}** (${STATUS_LABELS[o.status as OrderStatus]})`).join('، ');
            respond(`📋 **الأوردرات المسجلة (${orders.length}):**\n${names}`);
          }
          return;
        }

        // Statistics
        if (input.includes('احصائيات') || input.includes('إحصائيات') || input.includes('احصا') || 
            input.includes('الارقام') || input.includes('كام اوردر') || input.includes('عدد الاوردرات')) {
          await fetchComprehensiveStats();
          const msg = `📊 **إحصائيات النظام:**\n\n📦 **إجمالي الأوردرات:** ${stats.total}\n⏳ **قيد الانتظار:** ${stats.pending}\n🔧 **قيد التنفيذ:** ${stats.inProgress}\n✅ **جاهز للتسليم:** ${stats.ready}\n📬 **تم التسليم:** ${stats.delivered}\n❌ **ملغي:** ${stats.cancelled}\n\n💰 **إجمالي السوق:** ${stats.totalCash} جنيه\n💳 **المدفوع:** ${stats.totalPaid} جنيه\n💵 **المتبقي:** ${stats.remainingCash} جنيه\n📅 **تسليمات اليوم:** ${stats.todayDeliveries}\n📆 **تسليمات الأسبوع:** ${stats.weekDeliveries}\n📈 **إيرادات الشهر:** ${stats.monthRevenue} جنيه\n\n🎯 **معدل الكفاءة:** ${stats.efficiencyRate}%`;

          respond(msg);
          setActiveTab('stats');
          return;
        }

        // Financial queries
        if (input.includes('فلوس') || input.includes('فلوسي') || input.includes('الفلوس') || 
            input.includes('الدخل') || input.includes('الربح') || input.includes('المبيعات')) {
          await fetchComprehensiveStats();
          respond(`💰 **التقرير المالي:**\n\n💵 **إجمالي السوق:** ${stats.totalCash} جنيه\n💳 **المدفوع:** ${stats.totalPaid} جنيه\n📉 **المتبقي:** ${stats.remainingCash} جنيه\n📈 **إيرادات الشهر:** ${stats.monthRevenue} جنيه\n\n**الأوردرات اللي لسه فلوسها متأخرة:** ${stats.remainingCash > 0 ? 'في متأخرات' : 'مفيش متأخرات'}`);
          return;
        }

        // First/Last delivery
        if (input.includes('اول اوردر') || input.includes('أول أوردر') || 
            input.includes('اخر اوردر') || input.includes('آخر أوردر') ||
            input.includes('اقرب تسليم') || input.includes('ابعد تسليم')) {
          const { data: dateOrders } = await supabase.from('orders').select('*').not('delivery_date', 'is', null).not('status', 'eq', 'delivered');

          if (!dateOrders || dateOrders.length === 0) {
            respond('📭 مفيش أوردرات لسه متسلمتش ومعاها تاريخ تسليم.');
            return;
          }

          const sorted = [...dateOrders].sort((a, b) => 
            new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
          );

          const isFirst = input.includes('اول') || input.includes('أول') || input.includes('اقرب');
          const target = isFirst ? sorted[0] : sorted[sorted.length - 1];
          const label = isFirst ? '⏰ **أقرب تسليم:**' : '📅 **آخر تسليم:**';

          respond(`${label}\n👤 **العميل:** ${target.customer_name}\n📅 **التاريخ:** ${target.delivery_date}\n📱 **التليفون:** ${target.phone || 'غير مسجل'}`);
          return;
        }

        // Status filtering
        const statusQuery = detectStatusQuery(input);
        if (statusQuery && (input.includes('اوردرات') || input.includes('الاوردرات') || input.includes('هات') || input.includes('عرض') || input.includes('شوف'))) {
          const orders = await fetchOrdersByStatus(statusQuery);

          if (orders.length === 0) {
            respond(`📭 مفيش أوردرات في حالة **${STATUS_LABELS[statusQuery]}** حالياً.`);
          } else {
            const namesList = orders.map(o => `**${o.customer_name}** (كود: ${o.order_code})`).join('، ');
            respond(`📋 **أوردرات ${STATUS_LABELS[statusQuery]} (${orders.length}):**\n${namesList}`);
          }
          return;
        }

        // Search by name or code
        const isSearch = input.includes('ابحث') || input.includes('هات') || input.includes('شوف') || 
                        input.includes('اوردر') || input.includes('تفاصيل') || input.includes('بيانات') ||
                        input.includes('صور') || input.includes('متبقي') || input.includes('ميعاد') ||
                        input.includes('كام على') || input.includes('فلوس');

        if (isSearch) {
          const code = input.match(/\d{7}/)?.[0];
          const cleanName = extractNameFromQuery(rawInput);

          let query = supabase.from('orders').select(`*, order_images(*)`);

          if (code) {
            query = query.eq('order_code', code);
          } else if (cleanName) {
            query = query.ilike('customer_name', `%${cleanName}%`);
          } else {
            respond('❌ قولي اسم العميل أو كود الأوردر عشان أبحث.');
            return;
          }

          const { data, error } = await query.limit(5);
          if (error) throw error;

          if (!data || data.length === 0) {
            respond(`❌ مالقيتش أي أوردر مطابق في السيستم.`);
            return;
          }

          // Handle multiple results
          if (data.length > 1 && !code) {
            setLastFoundOrders(data);
            const list = data.map(o => `**${o.customer_name}** - كود: ${o.order_code} - ${STATUS_LABELS[o.status as OrderStatus]}`).join('\n');
            respond(`لقيت ${data.length} نتائج:\n${list}\n\nقولي الكود بالظبط عشان أعرض التفاصيل.`);
            return;
          }

          const order = data[0];
          const remain = Number(order.price || 0) - Number(order.paid || 0);

          // Image query
          if (input.includes('صور') || input.includes('صورة') || input.includes('الصور')) {
            if (order.order_images && order.order_images.length > 0) {
              const imageUrls = order.order_images.map((img: any) => img.image_url).filter(Boolean);
              setDisplayedImages(imageUrls);
              setImagesOwner(order.customer_name);
              respond(`🖼️ تم عرض ${imageUrls.length} صورة لأوردر **${order.customer_name}**.`);
            } else {
              setDisplayedImages([]);
              respond(`📷 مفيش صور مرفوعة لأوردر **${order.customer_name}** (كود: ${order.order_code}).`);
            }
            return;
          }

          // Remaining payment query
          if (input.includes('متبقي') || input.includes('باقي') || input.includes('فلوس') || input.includes('حساب') || input.includes('كام على')) {
            respond(`💰 **حساب ${order.customer_name}:**\n💵 **السعر الكلي:** ${order.price} جنيه\n💳 **المدفوع:** ${order.paid} جنيه\n📉 **المتبقي:** ${remain} جنيه`);
            return;
          }

          // Date query
          if (input.includes('ميعاد') || input.includes('وقت') || input.includes('تسليم') || input.includes('امتى') || input.includes('إمتى')) {
            respond(`📅 **ميعاد تسليم أوردر ${order.customer_name}:**\n${order.delivery_date || 'غير محدد بعد'}\n📱 **للتواصل:** ${order.phone || 'غير مسجل'}`);
            return;
          }

          // Full details
          const statusText = STATUS_LABELS[order.status as OrderStatus] || 'غير معروف';
          const msg = `📋 **تفاصيل الأوردر:**\n\n🔢 **الكود:** ${order.order_code}\n👤 **العميل:** ${order.customer_name}\n📱 **التليفون:** ${order.phone || 'غير مسجل'}\n👔 **النوع:** ${CATEGORY_LABELS[order.category] || 'غير محدد'}\n💰 **السعر:** ${order.price} جنيه\n💳 **المدفوع:** ${order.paid} جنيه\n📉 **المتبقي:** ${remain} جنيه\n📅 **ميعاد التسليم:** ${order.delivery_date || 'غير محدد'}\n📊 **الحالة:** ${statusText}\n📝 **ملاحظات:** ${order.notes || 'مفيش'}\n\nعايز تعمل حاجة تانية على الأوردر ده؟ (حدث الحالة، شوف الصور، إلخ)`;

          respond(msg);
          setPendingUpdateUser(order);
          return;
        }

        // Help
        if (input.includes('مساعدة') || input.includes('help') || input.includes('اعمل ايه') || input.includes('عايز اعمل')) {
          const helpMsg = `🤖 **أنا أقدر أساعدك في:**\n\n📋 **إدارة الأوردرات:**\n   • "ضيف أوردر جديد" - إضافة أوردر\n   • "حدث حالة أحمد" - تحديث الحالة\n   • "امسح أوردر 1234567" - حذف أوردر\n   • "هاتلي أوردر أحمد" - بحث عن أوردر\n\n📊 **الاستعلامات:**\n   • "كام أوردر عندي" - إحصائيات\n   • "أوردرات قيد التنفيذ" - تصفية بالحالة\n   • "متبقي على أحمد كام" - حساب مالي\n   • "صور أوردر أحمد" - عرض الصور\n\n💰 **المالية:**\n   • "فلوسي كام" - التقرير المالي\n   • "اقرب تسليم امتى" - مواعيد\n\n🗣️ **تقدر تتكلم معايا بأي لغة أو صيغة!**`;

          respond(helpMsg);
          return;
        }

        // Default fallback
        respond('🤔 مفهمتش طلبك بالظبط. قولي "مساعدة" عشان أوريك كل اللي أقدر أعمله، أو حاول تشرح أكتر.');
      }

    } catch (err) {
      console.error('Intent analysis error:', err);
      respond('❌ حصل خطأ في المعالجة. يرجى إعادة المحاولة بصوت واضح.');
    } finally {
      setProcessing(false);
    }
  };

  const respond = (msg: string) => {
    setAiSpeech(msg);
    addToConversation('assistant', msg);
    if (isActive) executeVocalReply(msg);
  };

  const resetAllStates = () => {
    setGlobalState('IDLE');
    setPendingUpdateUser(null);
    resetDraft();
    setDisplayedImages([]);
    setImagesOwner('');
    setLastFoundOrders([]);
  };

  const resetDraft = () => {
    setDraftOrder({
      customer_name: '', phone: '', category: 'DRESS', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: ''
    });
  };

  const extractPhone = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    return numbers.length >= 10 ? numbers.slice(-11) : text;
  };

  const detectCategory = (text: string): TailorCategory => {
    const t = text.toLowerCase();
    if (t.includes('بدلة') || t.includes('بدله') || t.includes('suit')) return 'SUIT';
    if (t.includes('تعديل') || t.includes('alteration')) return 'ALTERATION';
    if (t.includes('تفصيل') || t.includes('custom') || t.includes('خاص')) return 'CUSTOM';
    return 'DRESS';
  };

  const detectStatus = (text: string): OrderStatus | null => {
    const t = text.toLowerCase();
    if (t.includes('تنفيذ') || t.includes('شغال') || t.includes('ابدأ') || t.includes('ابدا')) return 'in_progress';
    if (t.includes('جاهز') || t.includes('خلص') || t.includes('جهز')) return 'ready';
    if (t.includes('اتسلم') || t.includes('سلمت') || t.includes('تسليم') || t.includes('توصيل')) return 'delivered';
    if (t.includes('انتظار') || t.includes('معلق')) return 'pending';
    if (t.includes('الغي') || t.includes('كنسل') || t.includes('cancel')) return 'cancelled';
    return null;
  };

  const detectStatusQuery = (text: string): OrderStatus | null => {
    const t = text.toLowerCase();
    if (t.includes('تنفيذ') || t.includes('شغال')) return 'in_progress';
    if (t.includes('جاهز') || t.includes('خلص')) return 'ready';
    if (t.includes('اتسلم') || t.includes('سلمت') || t.includes('تسليم')) return 'delivered';
    if (t.includes('انتظار') || t.includes('معلق')) return 'pending';
    if (t.includes('الغي') || t.includes('ملغي')) return 'cancelled';
    return null;
  };

  const extractNameFromQuery = (text: string): string => {
    return text
      .replace(/ابحث|هات|اوردر|تفاصيل|شوف|عرض|كم|كام|عندي|في|باسم|بتاع|بطاقة|عايز|هاتلي|صاحب|الاوردرات|اللي|صوره|صورة|متبقي|مبلغ|على|ميعاد|وقت|تسليم|هيتسلم|امتى|إمتى|حدث|بيانات|تعديل|حالة|غير|اكنسل|امسح|احذف|شيل|حذف|جاهز|تنفيذ|اتسلم|سلمت|خلص|ابدا|ابدأ|جهز|الغي|كنسل/gi, '')
      .trim();
  };

  const generateOrderCode = (): string => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  };

  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiSpeech('❌ المتصفح مش بيدعم التعرف على الصوت. جرب Chrome أو Edge.');
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const lastFinalResult = event.results[event.results.length - 1];
      if (lastFinalResult.isFinal) {
        const transcriptText = lastFinalResult[0].transcript.trim();
        if (transcriptText) analyzeUserIntent(transcriptText);
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Recognition error:', e.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (isUserTurnRef.current && !processing && !speaking && isActive) {
        setTimeout(() => {
          try {
            const newRecognition = new SpeechRecognition();
            newRecognition.lang = 'ar-EG';
            newRecognition.continuous = false;
            newRecognition.interimResults = false;
            newRecognition.onstart = () => setListening(true);
            newRecognition.onresult = recognition.onresult;
            newRecognition.onerror = recognition.onerror;
            newRecognition.onend = recognition.onend;
            newRecognition.start();
            recognitionRef.current = newRecognition;
          } catch (e) {}
        }, 300);
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
    if (synthRef.current) synthRef.current.cancel();
    setSpeaking(false);
    setProcessing(false);
  };

  const toggleSystemMasterPower = () => {
    if (isActive) {
      killSpeechEngine();
      setIsActive(false);
      setGlobalState('IDLE');
      setAiSpeech('🔴 تم إيقاف المساعد الصوتي. اضغط على الزر تاني عشان تفعله.');
      addToConversation('system', 'المساعد الصوتي توقف.');
    } else {
      setIsActive(true);
      isUserTurnRef.current = true;
      setGlobalState('IDLE');
      setAiSpeech('🟢 المساعد الصوتي نشط! أنا جاهز لسماع طلباتك.');
      addToConversation('system', 'المساعد الصوتي تم تفعيله.');
      executeVocalReply('المساعد الصوتي نشط وجاهز لمساعدتك!');
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    const colors = {
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      delivered: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <div className="w-full h-[calc(100vh-70px)] flex flex-col bg-[#020206] text-gray-100 font-sans overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-gray-800/50 px-6 py-3 z-10 bg-[#020206]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#080810] rounded-xl border border-gray-800/60 shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">المساعد الذكي للأتيليه</h1>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">نظام إدارة متكامل بالذكاء الاصطناعي</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center bg-[#080810] rounded-lg border border-gray-800/60 p-0.5">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'chat' ? 'bg-amber-500/10 text-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
              المحادثة
            </button>
            <button 
              onClick={() => { setActiveTab('orders'); fetchAllOrders(); }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'orders' ? 'bg-amber-500/10 text-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Package className="w-3.5 h-3.5 inline mr-1" />
              الأوردرات
            </button>
            <button 
              onClick={() => { setActiveTab('stats'); fetchComprehensiveStats(); }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'stats' ? 'bg-amber-500/10 text-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
              الإحصائيات
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 bg-[#080810] px-3 py-1.5 rounded-full border border-gray-800/60">
            <span className="flex h-2 w-2 relative">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isActive ? (listening ? 'bg-emerald-400' : speaking ? 'bg-blue-400' : 'bg-amber-400') : 'bg-rose-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? (listening ? 'bg-emerald-500' : speaking ? 'bg-blue-500' : 'bg-amber-500') : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-[10px] font-black text-gray-400">
              {isActive ? (listening ? 'بيسمع' : speaking ? 'بيتكلم' : 'جاهز') : 'متوقف'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden z-10">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100' 
                      : msg.role === 'system'
                      ? 'bg-gray-800/30 border border-gray-700/30 text-gray-400 italic'
                      : 'bg-[#080810] border border-gray-800/60 text-gray-200'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500/70 uppercase">المساعد</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div className={`text-[8px] mt-1.5 ${msg.role === 'user' ? 'text-amber-500/40' : 'text-gray-600'}`}>
                      {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {processing && (
                <div className="flex justify-start">
                  <div className="bg-[#080810] border border-gray-800/60 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                      <span className="text-[10px] text-gray-500">بيفكر...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={conversationEndRef} />
            </div>

            {/* Voice Control Center */}
            <div className="flex flex-col items-center py-6 border-t border-gray-800/50">
              {/* Active State Display */}
              {globalState !== 'IDLE' && (
                <div className="mb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-2 text-xs">
                  <Cpu className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-amber-400 font-bold">المعالج النشط:</span>
                  <span className="text-white font-black">
                    {globalState === 'ADDING_NAME' && '👤 اسم الزبون'}
                    {globalState === 'ADDING_PHONE' && '📱 رقم الموبايل'}
                    {globalState === 'ADDING_CATEGORY' && '👔 نوع القطعة'}
                    {globalState === 'ADDING_PRICE' && '💰 السعر الكلي'}
                    {globalState === 'ADDING_PAID' && '💳 العربون المقبوض'}
                    {globalState === 'ADDING_DATE' && '📅 ميعاد التسليم'}
                    {globalState === 'ADDING_NOTES' && '📝 الملاحظات'}
                    {globalState === 'CONFIRM_ORDER' && '✅ تأكيد الأوردر'}
                    {globalState === 'UPDATING_STATUS' && `🔄 تعديل حالة (${pendingUpdateUser?.customer_name})`}
                    {globalState === 'DELETING_CONFIRM' && `🗑️ تأكيد الحذف (${pendingUpdateUser?.customer_name})`}
                  </span>
                </div>
              )}

              {/* Main Voice Button */}
              <div className="relative">
                {listening && (
                  <div className="absolute inset-0 -m-8 rounded-full bg-emerald-500/10 animate-ping" />
                )}
                {speaking && (
                  <div className="absolute inset-0 -m-8 rounded-full bg-blue-500/10 animate-ping" />
                )}

                <button 
                  onClick={toggleSystemMasterPower}
                  className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-2 shadow-2xl relative z-20 ${
                    isActive 
                      ? listening 
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-500 border-emerald-400 shadow-emerald-500/20' 
                        : speaking 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-500 border-blue-400 shadow-blue-500/20'
                          : 'bg-gradient-to-br from-amber-600 to-orange-500 border-amber-400 shadow-amber-500/20'
                      : 'bg-[#0a0a12] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {isActive ? (
                    listening ? <Mic className="w-8 h-8 text-white animate-bounce" /> : 
                    speaking ? <Volume2 className="w-8 h-8 text-white animate-pulse" /> : 
                    <Zap className="w-8 h-8 text-amber-300" />
                  ) : (
                    <MicOff className="w-8 h-8 text-gray-600" />
                  )}
                </button>

                {/* Ripple effects */}
                {isActive && (
                  <>
                    <div className="absolute inset-0 -m-4 rounded-full border border-amber-500/20 animate-ping duration-1000" />
                    <div className="absolute inset-0 -m-6 rounded-full border border-amber-500/10 animate-ping duration-1500 delay-300" />
                  </>
                )}
              </div>

              <p className="mt-3 text-[10px] text-gray-500 font-bold">
                {isActive 
                  ? listening ? 'بيسمعك دلوقتي... قولي اللي في بالك' 
                    : speaking ? 'بيتكلم... استنى شوية' 
                    : 'اضغط على الزر أو قول "مساعدة"'
                  : 'اضغط على الزر عشان تفعل المساعد'}
              </p>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-5 gap-2 px-6 py-3 border-t border-gray-800/30 bg-[#020206]/50">
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold">الكل</p>
                <p className="text-xs font-black text-white">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold">انتظار</p>
                <p className="text-xs font-black text-amber-500">{stats.pending}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold">تنفيذ</p>
                <p className="text-xs font-black text-blue-500">{stats.inProgress}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold">جاهز</p>
                <p className="text-xs font-black text-emerald-500">{stats.ready}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold">متبقي</p>
                <p className="text-xs font-black text-rose-400">{stats.remainingCash} ج</p>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Search and Filter */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="ابحث باسم العميل، الكود، أو التليفون..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrders(searchQuery)}
                  className="w-full bg-[#080810] border border-gray-800/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
              <button 
                onClick={() => searchOrders(searchQuery)}
                className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
              >
                بحث
              </button>
              <select 
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as OrderStatus | 'all');
                  if (e.target.value !== 'all') {
                    fetchOrdersByStatus(e.target.value as OrderStatus);
                  } else {
                    fetchAllOrders();
                  }
                }}
                className="bg-[#080810] border border-gray-800/60 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="ready">جاهز للتسليم</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغي</option>
              </select>
              <button 
                onClick={fetchAllOrders}
                className="p-2.5 bg-[#080810] border border-gray-800/60 rounded-xl text-gray-500 hover:text-amber-500 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Orders Table */}
            <div className="flex-1 overflow-y-auto">
              <div className="bg-[#080810] border border-gray-800/60 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">الكود</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">العميل</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">التليفون</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">النوع</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">السعر</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">المدفوع</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">المتبقي</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">الحالة</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">ميعاد التسليم</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => {
                      const remain = Number(order.price || 0) - Number(order.paid || 0);
                      return (
                        <tr key={order.id} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-amber-500">{order.order_code}</td>
                          <td className="px-4 py-3 text-xs font-bold text-white">{order.customer_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{order.phone || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{CATEGORY_LABELS[order.category] || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-300">{order.price} ج</td>
                          <td className="px-4 py-3 text-xs text-emerald-400">{order.paid} ج</td>
                          <td className="px-4 py-3 text-xs text-rose-400">{remain} ج</td>
                          <td className="px-4 py-3">{renderStatusBadge(order.status as OrderStatus)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{order.delivery_date || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setPendingUpdateUser(order);
                                  setGlobalState('UPDATING_STATUS');
                                  setActiveTab('chat');
                                  respond(`تحديث حالة أوردر ${order.customer_name}. قولي الحالة الجديدة.`);
                                }}
                                className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 hover:bg-blue-500/20 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => {
                                  setPendingUpdateUser(order);
                                  setGlobalState('DELETING_CONFIRM');
                                  setActiveTab('chat');
                                  respond(`متأكد إنك عايز تمسح أوردر ${order.customer_name}؟ قولي "أيوه" عشان أتمسح.`);
                                }}
                                className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              {order.order_images && order.order_images.length > 0 && (
                                <button 
                                  onClick={() => {
                                    const imageUrls = order.order_images?.map((img: any) => img.image_url).filter(Boolean) || [];
                                    setDisplayedImages(imageUrls);
                                    setImagesOwner(order.customer_name);
                                    setActiveTab('chat');
                                  }}
                                  className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 hover:bg-amber-500/20 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {currentOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">مفيش أوردرات مسجلة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold">إجمالي الأوردرات</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.total}</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-[10px] text-gray-500 font-bold">قيد الانتظار</span>
                </div>
                <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Scissors className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] text-gray-500 font-bold">قيد التنفيذ</span>
                </div>
                <p className="text-2xl font-black text-blue-500">{stats.inProgress}</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] text-gray-500 font-bold">جاهز للتسليم</span>
                </div>
                <p className="text-2xl font-black text-emerald-500">{stats.ready}</p>
              </div>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-500 font-bold">إجمالي السوق</span>
                </div>
                <p className="text-2xl font-black text-gray-300">{stats.totalCash.toLocaleString()} ج</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] text-gray-500 font-bold">المدفوع</span>
                </div>
                <p className="text-2xl font-black text-emerald-400">{stats.totalPaid.toLocaleString()} ج</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                  <span className="text-[10px] text-gray-500 font-bold">المتبقي</span>
                </div>
                <p className="text-2xl font-black text-rose-400">{stats.remainingCash.toLocaleString()} ج</p>
              </div>
            </div>

            {/* Delivery Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] text-gray-500 font-bold">تسليمات اليوم</span>
                </div>
                <p className="text-2xl font-black text-blue-400">{stats.todayDeliveries}</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] text-gray-500 font-bold">تسليمات الأسبوع</span>
                </div>
                <p className="text-2xl font-black text-amber-400">{stats.weekDeliveries}</p>
              </div>

              <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] text-gray-500 font-bold">إيرادات الشهر</span>
                </div>
                <p className="text-2xl font-black text-emerald-400">{stats.monthRevenue.toLocaleString()} ج</p>
              </div>
            </div>

            {/* Efficiency */}
            <div className="bg-[#080810] border border-gray-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-bold text-white">معدل الكفاءة</span>
                </div>
                <span className="text-2xl font-black text-amber-500">{stats.efficiencyRate}%</span>
              </div>
              <div className="w-full bg-gray-800/60 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.efficiencyRate}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Gallery Modal */}
      {displayedImages.length > 0 && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#080810] border border-gray-800/60 rounded-2xl p-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">صور أوردر: {imagesOwner}</span>
              </div>
              <button 
                onClick={() => setDisplayedImages([])}
                className="p-2 bg-gray-900 rounded-full hover:bg-rose-950 text-gray-400 hover:text-rose-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {displayedImages.map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-800 hover:border-amber-500 transition-all">
                  <img src={url} alt={`Order ${index + 1}`} className="w-full h-40 object-cover" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full text-center border-t border-gray-900/50 pt-3 pb-2 z-10 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto text-[9px] text-gray-600 font-mono font-bold px-6">
        <p>ATELIER AI ASSISTANT v4.0 - PRO EDITION</p>
        <p className="text-gray-500 bg-gradient-to-r from-amber-500/10 to-transparent px-3 py-1 rounded-md font-sans text-[10px]">
          تطوير وتنفيذ بواسطة: <span className="text-amber-500 font-black">إسلام الكومي</span>
        </p>
      </div>
    </div>
  );
}
