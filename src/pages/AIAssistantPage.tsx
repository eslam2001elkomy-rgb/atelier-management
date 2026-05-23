import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // استدعاء سوبابيز المباشر للعمليات السريعة
import { 
  Bot, 
  Mic, 
  Volume2, 
  Sparkles, 
  Activity, 
  Package, 
  User, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Layers 
} from 'lucide-react';

// تفتيت أنواع الأوامر وصيغ الذاكرة المؤقتة لضمان القوة البرمجية
type AssistantState = 'IDLE' | 'ADDING_NAME' | 'ADDING_PHONE' | 'ADDING_PRICE' | 'ADDING_PAID' | 'ADDING_DATE';

interface OrderDraft {
  customer_name: string;
  phone: string;
  price: number;
  paid: number;
  delivery_date: string;
}

interface MessageLog {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  
  // States الواجهة والتحكم الصوتي
  const [listening, setListening] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [globalState, setGlobalState] = useState<AssistantState>('IDLE');
  
  // نصوص المحادثة الحالية
  const [userSpeech, setUserSpeech] = useState<string>('');
  const [aiSpeech, setAiSpeech] = useState<string>('مرحباً بك في نظام إدارة أتيليه الكومي الذكي. المساعد الصوتي مستعد الآن لمساعدتك والاستماع إليك بشكل مستمر.');
  
  // مسودات الأوردر الجاري إنشاؤه صوتياً
  const [draftOrder, setDraftOrder] = useState<OrderDraft>({
    customer_name: '',
    phone: '',
    price: 0,
    paid: 0,
    delivery_date: ''
  });

  // إحصائيات سريعة للذاكرة المحلية
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    totalCash: 0,
    totalPaid: 0
  });

  // مراجع المحركات الصوتية والمتصفح
  const recognitionRef = useRef<any>(null);
  const isUserTurnRef = useRef<boolean>(true);
  const stateRef = useRef<AssistantState>('IDLE');
  const draftRef = useRef<OrderDraft>({ customer_name: '', phone: '', price: 0, paid: 0, delivery_date: '' });

  // ربط الـ Refs بالـ States لضمان قراءة البيانات اللحظية داخل الـ Closures الخاصة بالـ Event Listeners
  useEffect(() => { stateRef.current = globalState; }, [globalState]);
  useEffect(() => { draftRef.current = draftOrder; }, [draftOrder]);

  useEffect(() => {
    fetchQuickStats();
    // تشغيل المساعد تلقائياً عند فتح الصفحة
    setTimeout(() => {
      startListeningLoop();
    }, 1000);

    return () => {
      killListeningLoop();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // جلب إحصائيات سريعة لتغذية ردود الذكاء الاصطناعي بالأرقام الحقيقية فوراً
  const fetchQuickStats = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*');
      
      if (error) throw error;
      if (orders) {
        let total = orders.length;
        let pending = orders.filter(o => o.status === 'pending').length;
        let inProgress = orders.filter(o => o.status === 'in_progress').length;
        let ready = orders.filter(o => o.status === 'ready').length;
        let delivered = orders.filter(o => o.status === 'delivered').length;
        
        let totalCash = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        let totalPaid = orders.reduce((sum, o) => sum + (Number(o.paid) || 0), 0);

        setStats({ total, pending, inProgress, ready, delivered, totalCash, totalPaid });
      }
    } catch (e) {
      console.error('Error fetching stats for AI engine:', e);
    }
  };

  // محرك النطق الاحترافي (Text to Speech)
  const speakOut = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    killListeningLoop(); // إيقاف الاستماع لحين انتهاء الكلام منعا للـ Feedback
    synth.cancel();

    // فلترة النص من الإيموجي والرموز التعبيرية لضمان نطق سليم وطبيعي
    const speechReadyText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(speechReadyText);
    utterance.lang = 'ar-EG'; // اللهجة المصرية الفصيحة المناسبة لبيئة العمل المحلية
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setSpeaking(true);
      isUserTurnRef.current = false;
    };

    utterance.onend = () => {
      setSpeaking(false);
      isUserTurnRef.current = true;
      // إعادة تشغيل المايك فوراً وبشكل مستمر بعد انتهاء الرد
      setTimeout(() => {
        if (isUserTurnRef.current) {
          startListeningLoop();
        }
      }, 300);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      isUserTurnRef.current = true;
      startListeningLoop();
    };

    synth.speak(utterance);
  };

  // العقل المفكر ومحلل الكلمات المدخلة (The Rule-Based & Contextual AI Brain)
  const processSpeechInput = async (rawText: string) => {
    const text = rawText.trim().toLowerCase();
    if (!text) return;

    setUserSpeech(rawText);
    setProcessing(true);
    killListeningLoop();

    // ----------------------------------------------------
    // أولاً: التحقق من سؤال الهوية وحفظ حقوق المطور إسلام الكومي
    // ----------------------------------------------------
    if (text.includes('صممك') || text.includes('برمجك') || text.includes('مطورك') || text.includes('مين عملك') || text.includes('إسلام الكومي') || text.includes('اسلام الكومي')) {
      const devReply = 'تم تصميم وتطوير هذا النظام المساعد الذكي بالكامل بواسطة المهندس إسلام الكومي، خبير البرمجيات وأنظمة الأتمتة الذكية.';
      setAiSpeech(devReply);
      speakOut(devReply);
      setProcessing(false);
      return;
    }

    // ----------------------------------------------------
    // ثانياً: إدارة الآلة الحالية ومراحل ملء بيانات الأوردر خطوة بخطوة صوتياً
    // ----------------------------------------------------
    const currentState = stateRef.current;

    if (currentState === 'ADDING_NAME') {
      setDraftOrder(prev => ({ ...prev, customer_name: rawText }));
      setGlobalState('ADDING_PHONE');
      const nextMsg = `تم تسجيل الاسم: ${rawText}. من فضلك املي لي الآن رقم هاتف العميل، أو قل تخطي.`;
      setAiSpeech(nextMsg);
      speakOut(nextMsg);
      setProcessing(false);
      return;
    }

    if (currentState === 'ADDING_PHONE') {
      let phoneVal = rawText;
      if (text.includes('تخطي') || text.includes('لا يوجد')) phoneVal = 'بدون رقم';
      setDraftOrder(prev => ({ ...prev, phone: phoneVal }));
      setGlobalState('ADDING_PRICE');
      const nextMsg = `تم الحفظ. كم هو السعر الإجمالي المطلوب لهذا الأوردر بالجنيه؟`;
      setAiSpeech(nextMsg);
      speakOut(nextMsg);
      setProcessing(false);
      return;
    }

    if (currentState === 'ADDING_PRICE') {
      const numMatch = text.match(/\d+/);
      const priceVal = numMatch ? parseInt(numMatch[0]) : 0;
      setDraftOrder(prev => ({ ...prev, price: priceVal }));
      setGlobalState('ADDING_PAID');
      const nextMsg = `تمام، السعر ${priceVal} جنيه. كم هو العربون المدفوع مقدمًا؟`;
      setAiSpeech(nextMsg);
      speakOut(nextMsg);
      setProcessing(false);
      return;
    }

    if (currentState === 'ADDING_PAID') {
      const numMatch = text.match(/\d+/);
      const paidVal = numMatch ? parseInt(numMatch[0]) : 0;
      const currentPrice = draftRef.current.price;
      const remaining = currentPrice - paidVal;
      
      setDraftOrder(prev => ({ ...prev, paid: paidVal }));
      setGlobalState('ADDING_DATE');
      const nextMsg = `تم تسجيل العربون ${paidVal} جنيه، والمتبقي هو ${remaining} جنيه عند الاستلام. أخيراً، ما هو تاريخ الاستلام المحدد؟ مثلاً غداً أو اكتب تاريخ.`;
      setAiSpeech(nextMsg);
      speakOut(nextMsg);
      setProcessing(false);
      return;
    }

    if (currentState === 'ADDING_DATE') {
      const finalDraft = { ...draftRef.current, delivery_date: rawText };
      
      // توليد كود عشوائي فريد مكون من 7 أرقام للأوردر
      const generatedCode = floor(random() * 9000000 + 1000000)::text;
      const codeStr = Math.floor(Math.random() * 9000000 + 1000000).toString();

      try {
        // الحفظ الفعلي الفريش المباشر في جدول الأوردرات بسوبابيز
        const { error } = await supabase.from('orders').insert([{
          order_code: codeStr,
          customer_name: finalDraft.customer_name,
          phone: finalDraft.phone,
          price: finalDraft.price,
          paid: finalDraft.paid,
          delivery_date: finalDraft.delivery_date,
          status: 'pending'
        }]);

        if (error) throw error;

        const successMsg = `تم بنجاح وبشكل فريش إنشاء الأوردر الكامل باسم العميل ${finalDraft.customer_name}. كود التتبع الخاص به هو ${codeStr}. السعر ${finalDraft.price}، العربون ${finalDraft.paid}، الباقي ${finalDraft.price - finalDraft.paid} جنيه، والتسليم في ${finalDraft.delivery_date}. النظام عاد للحالة العامة وجاهز لسماع طلبك القادم.`;
        
        setAiSpeech(successMsg);
        speakOut(successMsg);
        await fetchQuickStats(); // تحديث الإحصائيات الفورية
      } catch (dbErr) {
        console.error(dbErr);
        speakOut('عذراً، حدث خطأ أثناء الاتصال بقاعدة البيانات وحفظ الأوردر. يرجى المحاولة مرة أخرى.');
      } finally {
        // تصفيير الحالة للعودة للوضع الطبيعي
        setGlobalState('IDLE');
        setDraftOrder({ customer_name: '', phone: '', price: 0, paid: 0, delivery_date: '' });
        setProcessing(false);
      }
      return;
    }

    // ----------------------------------------------------
    // ثالثاً: أوامر الحالة الطبيعية (IDLE) - معالجة الاستعلامات العامة
    // ----------------------------------------------------
    
    // 1. أمر إضافة أوردر جديد والبدء في تشغيل آلة ملء البيانات
    if (text.includes('ضيف') || text.includes('سجل') || text.includes('اضف') || text.includes('عمل اوردر') || text.includes('طلب جديد')) {
      // محاولة سحب الاسم لو قاله مباشرة في أول جملة
      const nameMatch = rawText.match(/(?:باسم|اسم|طلب|اوردر)\s+([^\s]+(?:\s+[^\s]+)?)/);
      const extractedName = nameMatch ? nameMatch[1].trim() : '';

      if (extractedName) {
        setDraftOrder(prev => ({ ...prev, customer_name: extractedName }));
        setGlobalState('ADDING_PHONE');
        const reply = `أبشر، بدأت في تسجيل أوردر جديد باسم العميل: ${extractedName}. من فضلك املي لي الآن رقم هاتف العميل.`;
        setAiSpeech(reply);
        speakOut(reply);
      } else {
        setGlobalState('ADDING_NAME');
        const reply = 'أهلاً بك. بدأت في إعداد أوردر جديد فريش في السيستم. قولي ما هو اسم العميل أولاً؟';
        setAiSpeech(reply);
        speakOut(reply);
      }
      setProcessing(false);
      return;
    }

    // 2. أمر البحث التفصيلي الفوري عن أوردر (بالاسم أو الكود)
    if (text.includes('تفاصيل') || text.includes('ابحث') || text.includes('عرض') || text.includes('استعلم') || text.includes('شوف') || text.includes('حساب')) {
      const codeMatch = text.match(/\d{7}/);
      
      try {
        let query = supabase.from('orders').select('*');
        if (codeMatch) {
          query = query.eq('order_code', codeMatch[0]);
        } else {
          // تنظيف اسم العميل المستهدف للبحث
          let searchName = text.replace(/(تفاصيل|عرض|بحث|شوف|هات|اوردر|طلب|باسم|عن|لـ|عايز|استعلم|حساب)/g, '').trim();
          if (searchName.length < 2) {
            speakOut('من فضلك حدد اسم العميل أو كود الأوردر بوضوح حتى أتمكن من البحث.');
            setProcessing(false);
            return;
          }
          query = query.ilike('customer_name', `%${searchName}%`);
        }

        const { data: foundOrders, error } = await query.order('created_at', { ascending: false }).limit(1);

        if (error) throw error;

        if (foundOrders && foundOrders.length > 0) {
          const ord = foundOrders[0];
          const rem = (Number(ord.price) || 0) - (Number(ord.paid) || 0);
          let statusAr = 'قيد الانتظار ⏳';
          if (ord.status === 'in_progress') statusAr = 'قيد الشغل والتنفيذ حالياً 🧵';
          if (ord.status === 'ready') statusAr = 'جاهز تماماً للتسليم الفوري في الأتيليه 🎉';
          if (ord.status === 'delivered') statusAr = 'تم تسليمه للعميل والحمد لله ✅';

          const reply = `وجدت الأوردر المطلوب في السيستم. العميل: ${ord.customer_name}. الكود: ${ord.order_code}. الحالة الحالية: ${statusAr}. الحساب الإجمالي: ${ord.price} جنيه، المدفوع: ${ord.paid} جنيه، والمتبقي المراد تحصيله عند الاستلام هو ${rem} جنيه.`;
          setAiSpeech(reply);
          speakOut(reply);
        } else {
          const failReply = 'بحثت في قاعدة البيانات ولم أجد أي أوردر مطابق لهذا الاسم أو الكود في السجلات الحالية.';
          setAiSpeech(failReply);
          speakOut(failReply);
        }
      } catch (dbErr) {
        console.error(dbErr);
        speakOut('حصل خطأ مفاجئ أثناء جلب تفاصيل الأوردر من خادم سوبابيز.');
      }
      setProcessing(false);
      return;
    }

    // 3. أمر جلب الخزنة والإحصائيات والتحليلات المالية والعددية صوتياً
    if (text.includes('احصائيات') || text.includes('تقرير') || text.includes('الخزنة') || text.includes('كام اوردر') || text.includes('الحسابات')) {
      await fetchQuickStats();
      const reportReply = `إليك تقرير الأتيليه الحالي يا فنان: إجمالي الأوردرات المسجلة هو ${stats.total} أوردر. منهم ${stats.pending} في الانتظار، و ${stats.inProgress} قيد التنفيذ بالشغل، و ${stats.ready} جاهز للتسليم. مالياً: إجمالي مبيعات الأتيليه المتوقعة هي ${stats.totalCash} جنيه، حصلنا منها كعابين ${stats.totalPaid} جنيه، والمبالغ المتبقية في السوق ومطلوب تحصيلها هي ${stats.totalCash - stats.totalPaid} جنيه مصري.`;
      setAiSpeech(reportReply);
      speakOut(reportReply);
      setProcessing(false);
      return;
    }

    // 4. الغاء العملية والعودة للحالة الافتراضية عند طلب المستخدم
    if (text.includes('إلغاء') || text.includes('اكنسل') || text.includes('ارجع') || text.includes('خلاص')) {
      setGlobalState('IDLE');
      setDraftOrder({ customer_name: '', phone: '', price: 0, paid: 0, delivery_date: '' });
      const cancelReply = 'تم إلغاء العملية الحالية وتصفير الذاكرة المؤقتة. أنا في وضع الاستعداد العام الآن.';
      setAiSpeech(cancelReply);
      speakOut(cancelReply);
      setProcessing(false);
      return;
    }

    // 5. الاستعلام عن الوقت والتاريخ الحالي
    if (text.includes('الساعة') || text.includes('الوقت') || text.includes('تاريخ اليوم') || text.includes('النهاردة')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeReply = `الوقت الآن هو ${timeStr}، واليوم هو ${dateStr}. والسيستم يعمل بكفاءة تامة تحت إشراف وتصميم الباشمهندس إسلام الكومي.`;
      setAiSpeech(timeReply);
      speakOut(timeReply);
      setProcessing(false);
      return;
    }

    // 6. رد ترحيبي ذكي شامل في حالة عدم فهم الكلمة أو التحدث بعبارات ترحيبية
    const defaultReply = 'مرحباً بك! أنا مساعدك الصوتي الذكي الخاص بالأتيليه. يمكنك أن تطلب مني: "إضافة أوردر جديد"، "عرض تفاصيل أوردر عميل"، "تقرير الحسابات والخزنة"، أو تسألني "من قام بتصميمك؟". أنا أستمع إليك الآن.';
    setAiSpeech(defaultReply);
    speakOut(defaultReply);
    setProcessing(false);
  };

  // حلقة الاستماع المستمر والدائم (The Continuous Web Speech Recognition Engine)
  const startListeningLoop = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; // التقاط الكلام بالعامية المصرية بامتياز
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        if (transcript) {
          processSpeechInput(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // تجاهل الأخطاء العادية مثل السكوت التام للحفاظ على الحلقة مستمرة
      if (event.error === 'no-speech') {
        // سيتم إعادة التشغيل تلقائياً في onend
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      // ✨ الـ Magic Engine: طالما الدور على العميل والمساعد ساكت، افتح المايك عل طول للأسئلة المتتالية
      if (isUserTurnRef.current && !processing && !speaking) {
        try {
          recognition.start();
          recognitionRef.current = recognition;
          setListening(true);
        } catch (err) {
          // محاولة تعافي صامتة في حالة حدوث تداخل للمحركات
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  };

  // إيقاف المحرك الصوتي قسرياً عند الطوارئ
  const killListeningLoop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  // دالة زر التحكم المركزي الكبير لقفل وفتح المساعد بالكامل بنقرة واحدة
  const handleCentralPowerToggle = () => {
    if (listening || speaking || processing) {
      isUserTurnRef.current = false;
      killListeningLoop();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
      setProcessing(false);
      setGlobalState('IDLE');
      setAiSpeech('تم إيقاف المساعد الصوتي مؤقتاً وتصفير العمليات الدائرة.');
    } else {
      isUserTurnRef.current = true;
      setGlobalState('IDLE');
      startListeningLoop();
      setAiSpeech('تم تشغيل الاستماع المستمر. أنا في وضع الاستعداد وجاهز لسماع أوامرك الآن يا فنان.');
      speakOut('أهلاً بك، المساعد الصوتي جاهز ومستمر في الاستماع إليك الآن.');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-70px)] flex flex-col justify-between items-center bg-[#040409] text-gray-100 p-6 font-sans select-none overflow-hidden relative">
      
      {/* خلفية جمالية متموجة خفيفة لتعكس طابع الأتيليه الراقي */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* الرأس: شريط تتبع حالة النظام الصوتي والذكاء الحركي */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-gray-900/60 pb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0e0e1a] rounded-xl border border-gray-800">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">أتيليه الكومي دوت كوم</h1>
            <p className="text-[10px] text-gray-500 font-medium">الجيل الثاني من أنظمة التحكم الصوتي الفريش</p>
          </div>
        </div>

        {/* مؤشر الحالة واللمبة المضيئة ذات الحركة السينمائية */}
        <div className="flex items-center gap-2 bg-[#0e0e1a] px-3 py-1.5 rounded-full border border-gray-800/80">
          <span className="flex h-2 w-2 relative">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
              listening ? 'bg-emerald-400' : speaking ? 'bg-blue-400' : processing ? 'bg-amber-400' : 'bg-gray-600'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              listening ? 'bg-emerald-500' : speaking ? 'bg-blue-500' : processing ? 'bg-amber-500' : 'bg-gray-600'
            }`}></span>
          </span>
          <span className="text-[11px] font-bold text-gray-400">
            {listening ? 'مستمر في الاستماع...' : speaking ? 'جاري التحدث...' : processing ? 'جاري المعالجة الرقمية...' : 'مغلق مؤقتاً'}
          </span>
        </div>
      </div>

      {/* المنتصف: المحرك الدائري العملاق الممتد الذي يشغل كامل الشاشة بتأثير التموج العالي */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full transition-all duration-500">
        
        {/* شاشة مراقبة العمليات الحية المصغرة فوق الزر لإضفاء طابع احترافي هائل */}
        {globalState !== 'IDLE' && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-1.5 flex items-center gap-2 text-xs text-amber-400 font-medium animate-bounce">
            <Layers className="w-3.5 h-3.5" />
            وضع ملء البيانات الصوتي النشط: 
            <span className="font-bold underline">
              {globalState === 'ADDING_NAME' && 'اسم العميل'}
              {globalState === 'ADDING_PHONE' && 'رقم الهاتف'}
              {globalState === 'ADDING_PRICE' && 'السعر الإجمالي'}
              {globalState === 'ADDING_PAID' && 'العربون المدفوع'}
              {globalState === 'ADDING_DATE' && 'تاريخ الاستلام'}
            </span>
          </div>
        )}

        <div className="relative cursor-pointer" onClick={handleCentralPowerToggle}>
          {/* تأثيرات الهالات الضوئية الكبيرة جداً لملء الفراغ البصري للمتصفح */}
          {listening && (
            <>
              <div className="absolute inset-0 -m-16 rounded-full bg-emerald-500/5 animate-ping duration-[1200ms]" />
              <div className="absolute inset-0 -m-10 rounded-full bg-emerald-400/10 animate-pulse duration-700" />
              <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/5 rounded-full blur-xl animate-pulse" />
            </>
          )}
          {speaking && (
            <>
              <div className="absolute inset-0 -m-20 rounded-full bg-blue-500/5 animate-ping duration-[1200ms]" />
              <div className="absolute inset-0 -m-12 rounded-full bg-blue-400/10 animate-pulse duration-700" />
              <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/5 rounded-full blur-xl animate-pulse" />
            </>
          )}
          {processing && (
            <div className="absolute inset-0 -m-8 rounded-full bg-amber-500/5 animate-spin border-4 border-dashed border-amber-500/30 duration-[3000ms]" />
          )}

          {/* الزر الكوني المركزي الكبير - واجهة التصميم المحترفة */}
          <button
            className={`w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl border-4 ${
              listening
                ? 'bg-gradient-to-br from-emerald-600 to-teal-500 border-emerald-400 shadow-emerald-500/40 scale-105 ring-8 ring-emerald-500/5'
                : speaking
                ? 'bg-gradient-to-br from-blue-600 to-indigo-500 border-blue-400 shadow-blue-500/40 scale-102 ring-8 ring-blue-500/5'
                : processing
                ? 'bg-[#121222] border-amber-500 shadow-amber-500/20 animate-pulse'
                : 'bg-[#0d0d18] border-gray-800 hover:border-amber-500/40 shadow-black/80 hover:scale-102'
            }`}
          >
            {listening ? (
              <Mic className="w-18 h-18 text-white animate-bounce duration-500" />
            ) : speaking ? (
              <Volume2 className="w-18 h-18 text-white animate-pulse" />
            ) : processing ? (
              <Activity className="w-16 h-16 text-amber-500 animate-pulse" />
            ) : (
              <Bot className="w-18 h-18 text-gray-500 group-hover:text-amber-500" />
            )}
          </button>
        </div>

        {/* الكلمة المنطوقة وعرض رد المساعد بشكل خطي وسينمائي رائع في منتصف الشاشة */}
        <div className="mt-14 max-w-2xl w-full px-8 text-center transition-all duration-300">
          {userSpeech && (
            <div className="inline-block bg-[#0a0a14] px-4 py-2 rounded-2xl border border-gray-900 mb-4 text-xs text-gray-500 italic">
              الكلمات الملتقطة: "{userSpeech}"
            </div>
          )}
          
          <h2 className={`text-base md:text-xl font-medium tracking-wide leading-relaxed transition-all duration-500 ${
            speaking ? 'text-amber-200 drop-shadow' : 'text-gray-400'
          }`}>
            {aiSpeech}
          </h2>
        </div>
      </div>

      {/* المكون السيمبل الإضافي: لوحة مراقبة العدادات الفورية أسفل الشاشة لملء الفراغ بشكل إبداعي */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 my-4 z-10 opacity-40 hover:opacity-100 transition-opacity duration-300">
        <div className="bg-[#090912] border border-gray-900/60 p-3 rounded-xl flex items-center gap-3">
          <Package className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">الطلبات الكلية</p>
            <p className="text-sm font-black text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-[#090912] border border-gray-900/60 p-3 rounded-xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600/70" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">قيد التنفيذ</p>
            <p className="text-sm font-black text-amber-500">{stats.inProgress}</p>
          </div>
        </div>
        <div className="bg-[#090912] border border-gray-900/60 p-3 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600/70" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">الجاهزة للتسليم</p>
            <p className="text-sm font-black text-emerald-500">{stats.ready}</p>
          </div>
        </div>
        <div className="bg-[#090912] border border-gray-900/60 p-3 rounded-xl flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600/70" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">المتبقي في السوق</p>
            <p className="text-sm font-black text-blue-400">{stats.totalCash - stats.totalPaid} ج.م</p>
          </div>
        </div>
      </div>

      {/* التذييل: شريط التوقيع الاحترافي الصغير لحقوق ملكيتك البرمجية للموقع */}
      <div className="w-full text-center border-t border-gray-900/40 pt-4 z-10 flex flex-col md:flex-row items-center justify-between max-w-4xl text-[10px] text-gray-600 font-mono tracking-wider">
        <p>نظام أتمتة الأتيليه الصوتي - الإصدار المستقر 2026</p>
        <p className="text-amber-500/80 font-bold bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10 mt-1 md:mt-0">
          هندسة وتطوير م. إسلام الكومي
        </p>
      </div>

    </div>
  );
}
