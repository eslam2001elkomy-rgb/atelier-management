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
  const [aiSpeech, setAiSpeech] = useState<string>('مرحباً بك في نظام الأتمتة لإدارة الأتيليه. المحرك الذكي مستقر ومستمر في الاستماع إليك الآن.');
  
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: ''
  });

  // لوحة الصور المنبثقة للعميل الحالي
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

      // حفظ الحقوق البرمجية
      if (input.includes('صممك') || input.includes('برمجك') || input.includes('مطورك') || input.includes('مين عملك')) {
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

      if (input.includes('إلغاء') || input.includes('اكنسل') || input.includes('خلاص') || input.includes('امسح')) {
        setGlobalState('IDLE');
        setDraftOrder({ customer_name: '', phone: '', category: 'ALL', size_chest: '', size_waist: '', size_length: '', price: 0, paid: 0, delivery_date: '', notes: '' });
        const msg = 'تم إلغاء العملية وتصفير الذاكرة المؤقتة.';
        setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
      }

      // ==========================================
      // 2️⃣ الاستعلامات الذكية والمطورة (حل المشاكل)
      // ==========================================
      if (currentGlobalState === 'IDLE') {

        // أ: حل مشكلة "اسماء الاوردرات اللي عندي"
        if (input.includes('اسماء') || input.includes('أسماء') || input.includes('اسم العندى') || input.includes('كل الاوردرات')) {
          const { data: allOrders, error: allErr } = await supabase.from('orders').select('customer_name');
          if (allErr) throw allErr;

          if (!allOrders || allOrders.length === 0) {
            const msg = 'لا توجد أي أوردرات مسجلة في النظام حالياً.';
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }

          const names = allOrders.map(o => o.customer_name).join(' ، و ');
          const msg = `الاوردرات المسجلة عندك هي باسم: ${names}`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // ب: أول وأخر أوردر هيتسلم إمتى
        if (input.includes('اول اوردر') || input.includes('أول أوردر') || input.includes('اخر اوردر') || input.includes('آخر أوردر')) {
          const isFirst = input.includes('اول') || input.includes('أول');
          const { data: dateOrders, error: dateErr } = await supabase.from('orders').select('*').not('delivery_date', 'is', null);
          if (dateErr) throw dateErr;

          if (!dateOrders || dateOrders.length === 0) {
            const msg = 'لا يوجد أوردرات مسجل لها تواريخ تسليم.';
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }

          const sorted = [...dateOrders].sort((a, b) => String(a.delivery_date).localeCompare(String(b.delivery_date)));
          const targetOrder = isFirst ? sorted[0] : sorted[sorted.length - 1];
          const label = isFirst ? 'أول أوردر هيتسلم' : 'آخر أوردر هيتسلم';

          const msg = `${label} هو للعميل ${targetOrder.customer_name} وميعاده ${targetOrder.delivery_date}.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // ج: الاستعلام عن الحالات (قيد التنفيذ / الجاهزة)
        const hasStatusKeyword = input.includes('تنفيذ') || input.includes('جاهز') || input.includes('انتظار');
        const hasQueryAction = input.includes('اوردرات') || input.includes('الاوردرات') || input.includes('هات') || input.includes('عرض') || input.includes('شوف');
        const hasNoName = !input.includes('باسم') && !input.includes('على') && !input.includes('بتاع');

        if (hasStatusKeyword && (hasQueryAction || hasNoName)) {
          let targetStatus = 'pending';
          let statusLabel = 'قيد الانتظار';
          if (input.includes('تنفيذ')) { targetStatus = 'in_progress'; statusLabel = 'قيد التنفيذ'; }
          if (input.includes('جاهز')) { targetStatus = 'ready'; statusLabel = 'الجاهزة للتسليم'; }

          const { data: statusOrders, error: statusError } = await supabase.from('orders').select('*').eq('status', targetStatus);
          if (statusError) throw statusError;

          if (!statusOrders || statusOrders.length === 0) {
            const msg = `لا يوجد أوردرات حالياً في حالة ${statusLabel}.`;
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }

          const namesList = statusOrders.map(o => o.customer_name).join(' و ');
          const msg = `الأوردرات ${statusLabel} عددها ${statusOrders.length} وهي لكل من: ${namesList}`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // د: الاستعلام الإجمالي (كام الاوردرات) دون تدخل مع المتبقي
        if ((input.includes('كم') || input.includes('كام') || input.includes('عدد')) && !input.includes('باسم') && !input.includes('على') && !input.includes('بتاع') && !input.includes('متبقي') && !input.includes('مبلغ') && !input.includes('فلوس') && !input.includes('صوره') && !input.includes('صورة')) {
          await fetchComprehensiveStats();
          const msg = `إجمالي الأوردرات عندك حالياً هو ${stats.total} أوردر، منها ${stats.inProgress} قيد التنفيذ و ${stats.ready} جاهز.`;
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        // هـ: الفرز والبحث الدقيق جداً بالاسم أو الكود
        const isLookingForImage = input.includes('صوره') || input.includes('صورة') || input.includes('الصور') || input.includes('عرض صوره');
        const isLookingForRemaining = input.includes('متبقي') || input.includes('باقي') || input.includes('فلوس') || input.includes('حساب') || input.includes('كام على');
        const isLookingForDate = input.includes('ميعاد') || input.includes('وقت') || input.includes('تسليم') || input.includes('امتى') || input.includes('إمتى');

        // تنظيف الكلمات المساعدة للحصول على اسم العميل الصافي
        const cleanName = rawInput
          .replace(/ابحث|هات|اوردر|تفاصيل|شوف|عرض|كم|كام|عندي|في|باسم|بتاع|بطاقة|عايز|هاتلي|صاحب|الاوردرات|اللي|صوره|صورة|متبقي|مبلغ|على|ميعاد|وقت|تسليم|هيتسلم|امتى|إمتى/gi, '')
          .trim();

        const code = input.match(/\d{7}/)?.[0];
        let query = supabase.from('orders').select(`*, order_images(*)`);

        if (code) {
          query = query.eq('order_code', code);
        } else {
          if (!cleanName) {
            const msg = 'لم أستطع تحديد اسم العميل، أعد صياغة الطلب بوضوح.';
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          }
          query = query.ilike('customer_name', `%${cleanName}%`);
        }

        const { data, error } = await query.limit(1);
        if (error) throw error;

        if (!data || data.length === 0) {
          const msg = 'لم أجد أي أوردر مطابق بالاسم المذكور في السيستم.';
          setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
        }

        const order = data[0];
        const remain = Number(order.price || 0) - Number(order.paid || 0);

        // 1. ميزة عرض الصور الفورية على الشاشة
        if (isLookingForImage) {
          if (order.order_images && order.order_images.length > 0) {
            const imageUrls = order.order_images.map((img: any) => img.image_url).filter(Boolean);
            setDisplayedImages(imageUrls);
            setImagesOwner(order.customer_name);
            const msg = `تم فتح وعرض صور أوردر العميل ${order.customer_name} أمامك على الشاشة الآن.`;
            setAiSpeech(msg); executeVocalReply(msg); setProcessing(false); return;
          } else {
            setDisplayedImages([]);
            const msg = `الأوردر الخاص بـ ${order.customer_name} موجود، ولكن لا توجد صور مرفوعة له.`;
            setAi
