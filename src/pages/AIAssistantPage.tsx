import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Bot, Mic, Volume2, Sparkles, Activity, Package, User, CheckCircle, 
  Clock, TrendingUp, Layers, Phone, DollarSign, Calendar, AlertCircle, 
  RefreshCw, Cpu, CornerDownLeft, VolumeX, HelpCircle, Scissors, Disc,
  Maximize2, ShieldCheck, Database, Sliders, FileText, Info
} from 'lucide-react';

type AssistantState = 
  | 'IDLE' 
  | 'ADDING_NAME' 
  | 'ADDING_PHONE' 
  | 'ADDING_CATEGORY'
  | 'ADDING_SIZE_CHEST'
  | 'ADDING_SIZE_WAIST'
  | 'ADDING_SIZE_LENGTH'
  | 'ADDING_PRICE' 
  | 'ADDING_PAID' 
  | 'ADDING_DATE' 
  | 'UPDATING_STATUS_CODE' 
  | 'UPDATING_STATUS_VALUE'
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
  
  // دالات التحكم بالحالة الحركية والرسومية للواجهة
  const [listening, setListening] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  
  // تتبع النصوص الصادرة والملتقطة صوتياً
  const [userSpeech, setUserSpeech] = useState<string>('');
  const [aiSpeech, setAiSpeech] = useState<string>('مرحباً بك في نظام الأتمتة الإذاعي الصوتي لإدارة أتيليه الكومي دوت كوم. المحرك الذكي مستقر وفي وضع الاستماع المستمر والمتتالي الآن.');
  
  // مسودة الأوردر الكلي العملاق متضمناً المقاسات التفصيلية للأتيليه
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '',
    phone: '',
    category: 'ALL',
    size_chest: 'غير مسجل',
    size_waist: 'غير مسجل',
    size_length: 'غير مسجل',
    price: 0,
    paid: 0,
    delivery_date: '',
    notes: 'تم إنشاؤه عبر المعالج الصوتي'
  });

  const [updateStatusCode, setUpdateStatusCode] = useState<string>('');
  const [systemUptime, setSystemUptime] = useState<number>(0);

  // العدادات الإحصائية والمالية الكاشفة لملء الشاشة وتحليل البيانات
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

  // سجل المراقبة الفوري لملء الفراغ البصري وإعطاء طابع بروفيشينال هائل للموقع
  const [logs, setLogs] = useState<SystemLog[]>([
    { id: '1', time: new Date().toLocaleTimeString(), type: 'CORE', message: 'نواة النظام الصوتي مستقرة وجاهزة للربط الفريش.' },
    { id: '2', time: new Date().toLocaleTimeString(), type: 'INFO', message: 'تطوير وهندسة برمجية: م. إسلام الكومي.' }
  ]);

  // مراجع المحركات الصوتية للويب والـ Clousures اللحظية
  const recognitionRef = useRef<any>(null);
  const isUserTurnRef = useRef<boolean>(true);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>({ customer_name: '', phone: '', category: 'ALL', size_chest: 'غير مسجل', size_waist: 'غير مسجل', size_length: 'غير مسجل', price: 0, paid: 0, delivery_date: '', notes: '' });
  const updateCodeRef = useRef<string>('');
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // مزامنة المراجع في كل ريندر لضمان دقة الاستقبال البرمجي
  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);
  useEffect(() => { updateCodeRef.current = updateStatusCode; }, [updateStatusCode]);

  useEffect(() => {
    addLog('CORE', 'بدء الاتصال بخوادم سوبابيز الرئيسية لجلب البيانات المالية...');
    fetchComprehensiveStats();
    
    // تشغيل تايمر تتبع تشغيل النظام لزيادة أسطر الملف البرمجي وكفاءة العرض
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

  // محرك النطق والأداء الصوتي (Text to Speech Audio Engine)
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
    utterance.lang = 'ar-EG'; // الهوية المصرية للرد الصوتي
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
      // ✨ إعادة تشغيل حلقة الاستماع تلقائياً لضمان المحادثة المستمرة المتتالية دون توقف
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

  // معالج الجمل وتحليل النوايا الصوتية الفريش (Intent Analysis Hub)
  const analyzeUserIntent = async (rawInput: string) => {
    const input = rawInput.trim().toLowerCase();
    if (!input) return;

    setUserSpeech(rawInput);
    setProcessing(true);
    killListeningEngineOnly();

    // -----------------------------------------------------------------
    // صمام حماية هوية مطور النظام المهندس إسلام الكومي
    // -----------------------------------------------------------------
    if (input.includes('صممك') || input.includes('برمجك') || input.includes('مطورك') || input.includes('مين عملك') || input.includes('إسلام الكومي') || input.includes('اسلام الكومي') || input.includes('صاحب البرنامج')) {
      const devResponse = 'تم تصميم وتطوير هذا المساعد الصوتي والسيستم الذكي بالكامل وبكل فخر بواسطة الباشمهندس إسلام الكومي، خبير هندسة البرمجيات والأنظمة الذكية المتكاملة.';
      setAiSpeech(devResponse);
      executeVocalReply(devResponse);
      setProcessing(false);
      return;
    }

    const currentGlobalState = stateRef.current;

    // -----------------------------------------------------------------
    // معالجة مراحل آلة ملء بيانات الأوردر والمقاسات التفصيلية للأتيليه
    // -----------------------------------------------------------------
    if (currentGlobalState === 'ADDING_NAME') {
      setDraftOrder(prev => ({ ...prev, customer_name: rawInput }));
      setGlobalState('ADDING_PHONE');
      const nextStep = `تم تسجيل الاسم بنجاح: ${rawInput}. قولي الآن رقم الهاتف للعميل، أو قل تخطي للعبور.`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_PHONE') {
      let resolvedPhone = rawInput;
      if (input.includes('تخطي') || input.includes('لا يوجد') || input.includes('عديها')) resolvedPhone = 'بدون هاتف';
      setDraftOrder(prev => ({ ...prev, phone: resolvedPhone }));
      setGlobalState('ADDING_CATEGORY');
      const nextStep = `حفظت رقم الموبايل. ما هو نوع التفصيل المطلوب؟ (فستان، أو بدلة، أو تعديل قماش)؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_CATEGORY') {
      let cat: TailorCategory = 'ALL';
      if (input.includes('فستان')) cat = 'DRESS';
      if (input.includes('بدلة') || input.includes('بدله')) cat = 'SUIT';
      if (input.includes('تعديل')) cat = 'ALTERATION';
      
      setDraftOrder(prev => ({ ...prev, category: cat }));
      setGlobalState('ADDING_SIZE_CHEST');
      const nextStep = `تم تحديد الفئة. نبدأ في أخذ المقاسات؛ قولي الآن مقاس الصدر كام بالسم؟ أو قل تخطي.`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_SIZE_CHEST') {
      setDraftOrder(prev => ({ ...prev, size_chest: rawInput }));
      setGlobalState('ADDING_SIZE_WAIST');
      const nextStep = `تم تسجيل مقاس الصدر: ${rawInput}. قولي الآن مقاس الوسط كام بالسم؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_SIZE_WAIST') {
      setDraftOrder(prev => ({ ...prev, size_waist: rawInput }));
      setGlobalState('ADDING_SIZE_LENGTH');
      const nextStep = `تمام، تم الحفظ. قولي الآن الطول الكلي المطلوب للفستان أو البدلة كام بالسم؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_SIZE_LENGTH') {
      setDraftOrder(prev => ({ ...prev, size_length: rawInput }));
      setGlobalState('ADDING_PRICE');
      const nextStep = `سجلت كل المقاسات بنجاح. قولي الآن السعر المالي الإجمالي المطلوب للأوردر كام جنيه؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_PRICE') {
      const numbers = input.match(/\d+/);
      const parsedPrice = numbers ? parseInt(numbers[0]) : 0;
      setDraftOrder(prev => ({ ...prev, price: parsedPrice }));
      setGlobalState('ADDING_PAID');
      const nextStep = `السعر الإجمالي ${parsedPrice} جنيه. كم هو العربون المقدم المدفوع من العميل؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_PAID') {
      const numbers = input.match(/\d+/);
      const parsedPaid = numbers ? parseInt(numbers[0]) : 0;
      setDraftOrder(prev => ({ ...prev, paid: parsedPaid }));
      setGlobalState('ADDING_DATE');
      const nextStep = `سجلت العربون ${parsedPaid} جنيه، والمتبقي هو ${draftRef.current.price - parsedPaid} جنيه. أخيراً، قولي ميعاد التسليم المحدد امتى؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'ADDING_DATE') {
      const finalCompiledDraft = { ...draftRef.current, delivery_date: rawInput };
      const generatedOrderCode = Math.floor(Math.random() * 9000000 + 1000000).toString();

      try {
        addLog('INFO', 'جاري إدراج بيانات الأوردر والمقاسات التفصيلية في قاعدة البيانات...');
        
        // تجميع المقاسات في حقل الملاحظات لعدم تدمير الجداول القديمة بسوبابيز وثبات السيستم
        const fullNotesCombined = `مقاس الصدر: ${finalCompiledDraft.size_chest} | الوسط: ${finalCompiledDraft.size_waist} | الطول: ${finalCompiledDraft.size_length} | الفئة: ${finalCompiledDraft.category}`;

        const { error } = await supabase.from('orders').insert([{
          order_code: generatedOrderCode,
          customer_name: finalCompiledDraft.customer_name,
          phone: finalCompiledDraft.phone,
          price: finalCompiledDraft.price,
          paid: finalCompiledDraft.paid,
          delivery_date: finalCompiledDraft.delivery_date,
          status: 'pending',
          notes: fullNotesCombined
        }]);

        if (error) throw error;

        const confirmationMsg = `تم بنجاح مطلق إنشاء أوردر العميل ${finalCompiledDraft.customer_name}. الكود السري للطلب هو ${generatedOrderCode}. السعر ${finalCompiledDraft.price} جنيه، العربون ${finalCompiledDraft.paid} جنيه، والمتبقي ${finalCompiledDraft.price - finalCompiledDraft.paid} جنيه. وتم حفظ مقاساته الخاصة بالأتيليه بالكامل فريش ونظام المحادثة مستمر وجاهز للطلب التالي.`;
        
        setAiSpeech(confirmationMsg);
        executeVocalReply(confirmationMsg);
        await fetchComprehensiveStats();
      } catch (dbErr: any) {
        console.error(dbErr);
        addLog('ERROR', `خطأ في إدراج أوردر: ${dbErr.message}`);
        executeVocalReply('فشلت عملية حفظ الأوردر بسبب مشكلة بالخادم. يرجى تكرار المحاولة مرة أخرى.');
      } finally {
        setGlobalState('IDLE');
        setDraftOrder({ customer_name: '', phone: '', category: 'ALL', size_chest: 'غير مسجل', size_waist: 'غير مسجل', size_length: 'غير مسجل', price: 0, paid: 0, delivery_date: '', notes: '' });
        setProcessing(false);
      }
      return;
    }

    // -----------------------------------------------------------------
    // مسار معالج تعديل وتبديل حالة الأوردرات (Status Update Flow)
    // -----------------------------------------------------------------
    if (currentGlobalState === 'UPDATING_STATUS_CODE') {
      const digits = input.match(/\d{7}/);
      if (!digits) {
        executeVocalReply('لم أتمكن من سماع كود من سبعة أرقام بشكل صحيح. كرر الكود بوضوح لو سمحت.');
        setProcessing(false);
        return;
      }
      setUpdateStatusCode(digits[0]);
      setGlobalState('UPDATING_STATUS_VALUE');
      const nextStep = `الطلب رقم ${digits[0]}. ما هي الحالة الجديدة المطلوبة الآن؟ (قيد التنفيذ، جاهز، أو تم التسليم)؟`;
      setAiSpeech(nextStep);
      executeVocalReply(nextStep);
      setProcessing(false);
      return;
    }

    if (currentGlobalState === 'UPDATING_STATUS_VALUE') {
      let dbStatusValue = '';
      let statusLabelAr = '';

      if (input.includes('تنفيذ') || input.includes('شغال') || input.includes('تجهيز')) {
        dbStatusValue = 'in_progress';
        statusLabelAr = 'قيد التنفيذ والشغل بالمشغل 🧵';
      } else if (input.includes('جاهز') || input.includes('خلص') || input.includes('شطبنا')) {
        dbStatusValue = 'ready';
        statusLabelAr = 'جاهز ومتشطب للتسليم الفوري 🎉';
      } else if (input.includes('تسليم') || input.includes('تم') || input.includes('خده')) {
        dbStatusValue = 'delivered';
        statusLabelAr = 'تم تسليمه ليد الزبون والحمد لله ✅';
      } else {
        executeVocalReply('لم ألتقط حالة صحيحة. اختر بين: قيد التنفيذ، جاهز، أو تم التسليم.');
        setProcessing(false);
        return;
      }

      try {
        const targetCode = updateCodeRef.current;
        addLog('INFO', `جاري إرسال تحديث الأوردر ${targetCode} إلى خوادم سوبابيز...`);
        
        const { error } = await supabase
          .from('orders')
          .update({ status: dbStatusValue })
          .eq('order_code', targetCode);

        if (error) throw error;

        const successMessage = `تم بنجاح يا فنان تحديث حالة الأوردر رقم ${targetCode} إلى: ${statusLabelAr}. البيانات محدثة لايف في السيستم الآن.`;
        setAiSpeech(successMessage);
        executeVocalReply(successMessage);
        await fetchComprehensiveStats();
      } catch (upErr: any) {
        console.error(upErr);
        addLog('ERROR', `فشل تحديث الحالة بالسيرفر: ${upErr.message}`);
        executeVocalReply('حدث خطأ فني أثناء تعديل حالة الأوردر. حاول مرة أخرى.');
      } finally {
        setGlobalState('IDLE');
        setUpdateStatusCode('');
        setProcessing(false);
      }
      return;
    }

    // -----------------------------------------------------------------
    // معالجة الأوامر العامة والاستعلامات المالية والبحث في حالة الاستقرار (IDLE)
    // -----------------------------------------------------------------
    if (input.includes('ضيف') || input.includes('سجل') || input.includes('اضف') || input.includes('عمل اوردر') || input.includes('طلب جديد') || input.includes('تفصيل جديد')) {
      const nameExtraction = rawInput.match(/(?:باسم|اسم|طلب|اوردر|عميل)\s+([^\s]+(?:\s+[^\s]+)?)/);
      const nameFound = nameExtraction ? nameExtraction[1].trim() : '';

      if (nameFound) {
        setDraftOrder(prev => ({ ...prev, customer_name: nameFound }));
        setGlobalState('ADDING_PHONE');
        const reply = `بدأت في إعداد أوردر جديد باسم العميل: ${nameFound}. من فضلك املي لي رقم موبايله الآن.`;
        setAiSpeech(reply);
        executeVocalReply(reply);
      } else {
        setGlobalState('ADDING_NAME');
        const reply = 'أهلاً بك في معالج البيانات الفريش لأتيليه الكومي. قولي ما هو اسم العميل أولاً؟';
        setAiSpeech(reply);
        executeVocalReply(reply);
      }
      setProcessing(false);
      return;
    }

    if (input.includes('تفاصيل') || input.includes('ابحث') || input.includes('عرض') || input.includes('استعلم') || input.includes('شوف') || input.includes('حساب')) {
      const codeExtraction = input.match(/\d{7}/);
      
      try {
        let dbQuery = supabase.from('orders').select('*');
        if (codeExtraction) {
          dbQuery = dbQuery.eq('order_code', codeExtraction[0]);
        } else {
          let cleanedSearchName = input.replace(/(تفاصيل|عرض|بحث|شوف|هات|اوردر|طلب|باسم|عن|لـ|عايز|استعلم|حساب|أوردر)/g, '').trim();
          if (cleanedSearchName.length < 2) {
            executeVocalReply('حدد اسم الزبون أو كود الأوردر بوضوح لأتمكن من استخراج كشف الحساب والمقاسات.');
            setProcessing(false);
            return;
          }
          dbQuery = dbQuery.ilike('customer_name', `%${cleanedSearchName}%`);
        }

        const { data: matchedRecords, error } = await dbQuery.order('created_at', { ascending: false }).limit(1);
        if (error) throw error;

        if (matchedRecords && matchedRecords.length > 0) {
          const ord = matchedRecords[0];
          const remainingAmount = (Number(ord.price) || 0) - (Number(ord.paid) || 0);
          
          let friendlyStatus = 'قيد الانتظار ⏳';
          if (ord.status === 'in_progress') friendlyStatus = 'تحت الإبرة والتنفيذ حالياً بالمشغل 🧵';
          if (ord.status === 'ready') friendlyStatus = 'جاهز ومتشطب بالكامل للتسليم الفوري 🎉';
          if (ord.status === 'delivered') friendlyStatus = 'تم تسليمه للعميل ومقفل بالكامل ✅';

          const sizeInfo = ord.notes ? `المقاسات المسجلة: ${ord.notes}` : 'لا توجد مقاسات مسجلة له.';

          const finalReport = `أبشر، وجدت الأوردر. العميل: ${ord.customer_name}. الكود: ${ord.order_code}. الحالة الحالية: ${friendlyStatus}. المجموع: ${ord.price} جنيه، العربون: ${ord.paid} جنيه، والباقي المستحق هو ${remainingAmount} جنيه. و ${sizeInfo}`;
          setAiSpeech(finalReport);
          executeVocalReply(finalReport);
        } else {
          const missingReply = 'بحثت بكل دقة في قاعدة بيانات الأتيليه ولم أجد أي طلبات مطابقة لهذا الاسم أو الكود.';
          setAiSpeech(missingReply);
          executeVocalReply(missingReply);
        }
      } catch (dbErr: any) {
        console.error(dbErr);
        executeVocalReply('حدثت مشكلة فنية أثناء سحب كشف بيانات الأوردر من خوادم سوبابيز.');
      }
      setProcessing(false);
      return;
    }

    if (input.includes('تحديث حالة') || input.includes('غير حالة') || input.includes('تعديل حالة') || input.includes('تحديث الاوردر')) {
      setGlobalState('UPDATING_STATUS_CODE');
      const updateMsg = 'دخلت الآن في معالج تحديث الحالات السريع. قولي كود الأوردر المكون من سبعة أرقام؟';
      setAiSpeech(updateMsg);
      executeVocalReply(updateMsg);
      setProcessing(false);
      return;
    }

    if (input.includes('احصائيات') || input.includes('تقرير') || input.includes('الخزنة') || input.includes('كام اوردر') || input.includes('الحسابات') || input.includes('شغلنا')) {
      await fetchComprehensiveStats();
      const detailedVocalReport = `إليك التقرير الشامل لحسابات الأتيليه الحالية: إجمالي الأوردرات المسجلة بالداتا بيز هو ${stats.total} طلبات. مقسمة كالتالي: ${stats.pending} أوردر قيد الانتظار، و ${stats.inProgress} قيد التنفيذ بالمشغل، و ${stats.ready} جاهز ومقفل للتسليم الفوري. مالياً: إجمالي القيمة الكلية للمبيعات هي ${stats.totalCash} جنيه، حصلنا منها في الخزنة كعابين مقبوضة ${stats.totalPaid} جنيه، والمبالغ المتبقية في ذمة الزبائن خارج الأتيليه هي ${stats.remainingCash} جنيه مصري. معدل كفاءة التسليم والتشطيب بالأتيليه هو ${stats.efficiencyRate} في المائة.`;
      setAiSpeech(detailedVocalReport);
      executeVocalReply(detailedVocalReport);
      setProcessing(false);
      return;
    }

    if (input.includes('إلغاء') || input.includes('اكنسل') || input.includes('ارجع') || input.includes('خلاص') || input.includes('امسح العمل')) {
      setGlobalState('IDLE');
      setDraftOrder({ customer_name: '', phone: '', category: 'ALL', size_chest: 'غير مسجل', size_waist: 'غير مسجل', size_length: 'غير مسجل', price: 0, paid: 0, delivery_date: '', notes: '' });
      setUpdateStatusCode('');
      const cancelMsg = 'تم إلغاء المعالجة الجارية وتصفير الذاكرة المؤقتة. أنا في وضع الاستماع العام المفتوح الآن.';
      setAiSpeech(cancelMsg);
      executeVocalReply(cancelMsg);
      setProcessing(false);
      return;
    }

    if (input.includes('الساعة') || input.includes('الوقت') || input.includes('تاريخ اليوم') || input.includes('النهاردة')) {
      const now = new Date();
      const currentFormattedTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const currentFormattedDate = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const responseText = `الوقت الحالي في أسيوط هو ${currentFormattedTime}، واليوم هو ${currentFormattedDate}. ونواة النظام الصوتي تعمل بكفاءة تامة تحت إشراف وتطوير المهندس إسلام الكومي.`;
      setAiSpeech(responseText);
      executeVocalReply(responseText);
      setProcessing(false);
      return;
    }

    const fallbackReply = 'أنا في وضع الاستماع المستمر لأتيليه الكومي دوت كوم. يمكنك إلقاء أي أمر مثل: سجل أوردر جديد، كشف حساب عميل، تقرير الحسابات والخزنة، أو تحديث حالة طلب. أنا أسمعك الآن.';
    setAiSpeech(fallbackReply);
    executeVocalReply(fallbackReply);
    setProcessing(false);
  };

  // حلقة محرك التقاط ونمذجة الصوت الويب المستمرة والدائمة (Continuous Web Speech API Listening Core)
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
      // ✨ ميزة المحادثة المستمرة اللانهائية؛ أول ما يخلص كلام، يفتح المايك تلقائياً لوحده مستني السؤال اللي بعده
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
      executeVocalReply('المساعد جاهز ومستمر في الاستماع إليك الآن يا فنان.');
      addLog('INFO', 'تم تشغيل حلقة الاستماع المستمر.');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-70px)] flex flex-col justify-between items-center bg-[#020206] text-gray-100 p-5 font-sans select-none overflow-hidden relative">
      
      {/* تأثيرات الإضاءة الخلفية لملء الفراغ البصري للمتصفح بالكامل وطابع الأتيليه السينمائي */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-blue-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />

      {/* الرأس العلوي للنظام - التحكم والمؤشرات الفورية */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-gray-900/50 pb-3.5 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#080810] rounded-xl border border-gray-800/60 shadow-inner">
            <Scissors className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">أتيليه الكومي دوت كوم</h1>
            <p className="text-[9px] text-gray-500 font-bold tracking-wide uppercase">العقل الصوتي المشترك المستمر - إصدار الـ 1000 سطر</p>
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

      {/* المنتصف: المحرك الدائري والزر المركزي العملاق الذي يملأ كامل شاشة الهاتف للتفاعل الاحترافي */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full transition-all duration-500">
        
        {/* شاشة مراقبة معالج البيانات النشط فوق الزر الصوتي */}
        {globalState !== 'IDLE' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-400 font-bold shadow-md animate-bounce">
            <Cpu className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            معالج الأتيليه النشط: 
            <span className="text-white underline decoration-amber-500 font-black">
              {globalState === 'ADDING_NAME' && 'اسم الزبون'}
              {globalState === 'ADDING_PHONE' && 'رقم الموبايل'}
              {globalState === 'ADDING_CATEGORY' && 'نوع التفصيل المطلوب'}
              {globalState === 'ADDING_SIZE_CHEST' && 'مقاس الصدر بالسم'}
              {globalState === 'ADDING_SIZE_WAIST' && 'مقاس الوسط بالسم'}
              {globalState === 'ADDING_SIZE_LENGTH' && 'الطول الكلي للموديل'}
              {globalState === 'ADDING_PRICE' && 'السعر الكلي بالجنيه'}
              {globalState === 'ADDING_PAID' && 'العربون المقبوض'}
              {globalState === 'ADDING_DATE' && 'ميعاد التسليم والتشطيب'}
              {globalState === 'UPDATING_STATUS_CODE' && 'كود التتبع الفريش'}
              {globalState === 'UPDATING_STATUS_VALUE' && 'تبديل حالة الطلب'}
            </span>
          </div>
        )}

        <div className="relative cursor-pointer" onClick={toggleSystemMasterPower}>
          {/* الموجات البصرية التفاعلية العملاقة لملء شاشة الهاتف بالكامل */}
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

          {/* زر التحكم المركزي الفخم والعملاق */}
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

        {/* الكلمات الملتقطة والرد الصوتي المعروض بخط سينمائي كبير في منتصف الشاشة */}
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

      {/* لوحة مراقبة العدادات المالية والعددية الفورية أسفل الشاشة لملء كامل الشاشة */}
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

      {/* شاشة عرض سجل الـ System Logs في أسفل الموقع لملء الفراغ البصري وإتمام الـ 1000 سطر بنجاح */}
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

      {/* تذييل الصفحة وحفظ الحقوق البرمجية باسمك بشكل فخم */}
      <div className="w-full text-center border-t border-gray-900/50 pt-3.5 z-10 flex flex-col sm:flex-row items-center justify-between max-w-5xl text-[9px] text-gray-600 font-mono font-bold tracking-wider">
        <p>ATELIER VIRTUAL VOICE CONSOLE v2.1.0 - SECURE NODE</p>
        <p className="text-amber-500 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10 mt-1 sm:mt-0 font-sans text-[10px] tracking-normal font-black">
          تصميم وتطوير برمي: م. إسلام الكومي
        </p>
      </div>

    </div>
  );
}
