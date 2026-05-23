import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Bot,
  Mic,
  Volume2,
  Activity,
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  Scissors,
  Eye
} from 'lucide-react';

export default function AIAssistantPage() {

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [aiSpeech, setAiSpeech] = useState(
    'المساعد الذكي جاهز لإدارة الأتيليه'
  );

  const [userSpeech, setUserSpeech] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    inProgress: 0,
    remainingCash: 0
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchStats();
    startListening();
  }, []);

  async function fetchStats() {
    const { data } = await supabase.from('orders').select('*');

    if (!data) return;

    const total = data.length;

    const ready = data.filter(
      (o) => o.status === 'ready'
    ).length;

    const inProgress = data.filter(
      (o) => o.status === 'in_progress'
    ).length;

    const remainingCash = data.reduce((sum, o) => {
      return sum + ((o.price || 0) - (o.paid || 0));
    }, 0);

    setStats({
      total,
      ready,
      inProgress,
      remainingCash
    });
  }

  function speak(text: string) {

    setAiSpeech(text);

    const synth = window.speechSynthesis;

    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    utter.lang = 'ar-EG';

    utter.onstart = () => {
      setSpeaking(true);
    };

    utter.onend = () => {
      setSpeaking(false);
      startListening();
    };

    synth.speak(utter);
  }

  function startListening() {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();

    recognition.lang = 'ar-EG';

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (event: any) => {

      const text =
        event.results[0][0].transcript;

      setUserSpeech(text);

      await analyze(text);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      if (!speaking) {
        startListening();
      }
    };

    recognition.start();

    recognitionRef.current = recognition;
  }

  async function analyze(rawInput: string) {

    const input = rawInput.toLowerCase();

    setProcessing(true);

    // =========================
    // إضافة أوردر
    // =========================

    if (
      input.includes('ضيف اوردر') ||
      input.includes('اعمل اوردر')
    ) {

      speak(
        'قول البيانات بالشكل التالي. اسم العميل ثم رقم الهاتف ثم السعر'
      );

      setProcessing(false);

      return;
    }

    // =========================
    // عرض أوردر
    // =========================

    if (
      input.includes('عرض') ||
      input.includes('هات') ||
      input.includes('تفاصيل')
    ) {

      try {

        const codeMatch =
          input.match(/\d{7}/);

        let query = supabase
          .from('orders')
          .select('*, order_images(*)');

        if (codeMatch) {

          query = query.eq(
            'order_code',
            codeMatch[0]
          );

        } else {

          const cleaned = input
            .replace('عرض', '')
            .replace('تفاصيل', '')
            .replace('هات', '')
            .trim();

          query = query.ilike(
            'customer_name',
            `%${cleaned}%`
          );
        }

        const {
          data,
          error
        } = await query.limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {

          speak('لم أجد أي أوردر');

          setProcessing(false);

          return;
        }

        const ord = data[0];

        const remaining =
          (Number(ord.price) || 0) -
          (Number(ord.paid) || 0);

        let status = 'قيد الانتظار';

        if (ord.status === 'in_progress')
          status = 'تحت التنفيذ';

        if (ord.status === 'ready')
          status = 'جاهز';

        if (ord.status === 'delivered')
          status = 'تم التسليم';

        let imagesText = '';

        if (
          ord.order_images &&
          ord.order_images.length > 0
        ) {
          imagesText =
            `يوجد ${ord.order_images.length} صورة`;
        } else {
          imagesText = 'لا توجد صور';
        }

        const report = `
        العميل ${ord.customer_name}
        كود الطلب ${ord.order_code}
        الحالة ${status}
        السعر ${ord.price} جنيه
        المدفوع ${ord.paid || 0}
        المتبقي ${remaining}
        ${imagesText}
        `;

        speak(report);

      } catch (e) {

        console.error(e);

        speak('حدث خطأ أثناء جلب الأوردر');
      }

      setProcessing(false);

      return;
    }

    // =========================
    // تحديث حالة
    // =========================

    if (
      input.includes('جاهز') ||
      input.includes('تم التسليم') ||
      input.includes('تحت التنفيذ')
    ) {

      try {

        const code =
          input.match(/\d{7}/);

        if (!code) {

          speak('قول كود الأوردر');

          setProcessing(false);

          return;
        }

        let newStatus = 'pending';

        if (input.includes('جاهز'))
          newStatus = 'ready';

        if (input.includes('تحت التنفيذ'))
          newStatus = 'in_progress';

        if (input.includes('تم التسليم'))
          newStatus = 'delivered';

        const { error } = await supabase
          .from('orders')
          .update({
            status: newStatus
          })
          .eq('order_code', code[0]);

        if (error) throw error;

        speak('تم تحديث الحالة بنجاح');

      } catch (e) {

        console.error(e);

        speak('فشل تحديث الحالة');
      }

      setProcessing(false);

      return;
    }

    // =========================
    // احصائيات
    // =========================

    if (
      input.includes('احصائيات') ||
      input.includes('الخزنة')
    ) {

      await fetchStats();

      speak(`
      إجمالي الطلبات ${stats.total}
      الطلبات الجاهزة ${stats.ready}
      تحت التنفيذ ${stats.inProgress}
      المتبقي ${stats.remainingCash} جنيه
      `);

      setProcessing(false);

      return;
    }

    speak(
      'لم أفهم الطلب'
    );

    setProcessing(false);
  }

  return (

    <div className="w-full min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center p-5">

      <div className="absolute top-20 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center">

        <button
          className={`w-48 h-48 rounded-full border-4 transition-all duration-500 flex items-center justify-center
          ${
            listening
              ? 'bg-emerald-500 border-emerald-300'
              : speaking
              ? 'bg-blue-500 border-blue-300'
              : processing
              ? 'bg-amber-500 border-amber-300'
              : 'bg-[#111827] border-gray-700'
          }
          `}
        >

          {
            listening ? (
              <Mic className="w-20 h-20" />
            ) : speaking ? (
              <Volume2 className="w-20 h-20" />
            ) : processing ? (
              <Activity className="w-20 h-20" />
            ) : (
              <Bot className="w-20 h-20" />
            )
          }

        </button>

        <div className="mt-10 text-center max-w-2xl">

          <p className="text-gray-400 text-sm mb-3">
            {userSpeech}
          </p>

          <h2 className="text-2xl font-bold leading-loose">
            {aiSpeech}
          </h2>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 w-full max-w-4xl">

          <div className="bg-[#111827] p-5 rounded-2xl border border-gray-800">
            <Package className="mb-2 text-amber-500" />
            <p className="text-sm text-gray-400">
              الطلبات
            </p>
            <h3 className="text-2xl font-bold">
              {stats.total}
            </h3>
          </div>

          <div className="bg-[#111827] p-5 rounded-2xl border border-gray-800">
            <Clock className="mb-2 text-blue-500" />
            <p className="text-sm text-gray-400">
              تحت التنفيذ
            </p>
            <h3 className="text-2xl font-bold">
              {stats.inProgress}
            </h3>
          </div>

          <div className="bg-[#111827] p-5 rounded-2xl border border-gray-800">
            <CheckCircle className="mb-2 text-emerald-500" />
            <p className="text-sm text-gray-400">
              الجاهزة
            </p>
            <h3 className="text-2xl font-bold">
              {stats.ready}
            </h3>
          </div>

          <div className="bg-[#111827] p-5 rounded-2xl border border-gray-800">
            <TrendingUp className="mb-2 text-orange-500" />
            <p className="text-sm text-gray-400">
              المتبقي
            </p>
            <h3 className="text-2xl font-bold">
              {stats.remainingCash}
            </h3>
          </div>

        </div>

      </div>

    </div>
  );
}
