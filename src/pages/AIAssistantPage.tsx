import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function AIAssistantPage() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('اضغط على المايك وتحدث مباشرة...');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'ar-EG'; // دعم كامل للهجة المصرية والعربية العامية والفصحى
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setStatusText('أنا سامعك كويس، اتفضل اطلب...');
        setImageUrl(null);
        if (synthRef.current?.speaking) {
          synthRef.current.cancel();
          setIsSpeaking(false);
        }
      };

      rec.onerror = (e: any) => {
        console.error(e);
        setIsListening(false);
        setStatusText('لم أسمعك بوضوح، اضغط وجرب تاني...');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const voiceInput = event.results[0][0].transcript;
        if (!voiceInput.trim()) return;
        setStatusText(`جاري تفكيك وفهم: "${voiceInput}"...`);
        await parseAndExecuteCommand(voiceInput);
      };

      recognitionRef.current = rec;
    } else {
      setStatusText('الميزة غير مدعومة في هذا المتصفح، يرجى استخدام كروم.');
    }
    
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // المحرك الذكي الكامل لترجمة الأوامر الصادرة من المايك مباشرة قبل السيرفر
  const parseAndExecuteCommand = async (input: string) => {
    // تنظيف الحروف والهمزات لضمان دقة الفهم بنسبة 100%
    let cleanText = input.toLowerCase().trim();
    cleanText = cleanText.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

    try {
      // 1. أمر عرض أو جلب صورة أوردر
      if (cleanText.includes('صوره') || cleanText.includes('عرض') || cleanText.includes('شوف') || cleanText.includes('هات')) {
        const codeMatch = input.match(/[0-9]{7}/); // استخراج الكود المكون من 7 أرقام
        if (!codeMatch) {
          speakResponse('قولي رقم كود الأوردر المكون من سبعة أرقام علشان أعرضلك صورته.');
          return;
        }
        const orderCode = codeMatch[0];
        setStatusText(`جاري جلب صورة الأوردر رقم ${orderCode}...`);
        
        const { data, error } = await supabase
          .from('orders')
          .select('image_url, id')
          .eq('order_code', orderCode)
          .maybeSingle();

        if (error || !data) {
          speakResponse(`الأوردر رقم ${orderCode} مش موجود في السيستم يا فنان.`);
          return;
        }

        let finalImg = data.image_url;
        if (!finalImg) {
          // البحث في جدول الصور الفرعي لو مش موجود في الجدول الرئيسي
          const { data: subImg } = await supabase
            .from('order_images')
            .select('image_url')
            .eq('order_id', data.id)
            .limit(1)
            .maybeSingle();
          if (subImg) finalImg = subImg.image_url;
        }

        if (!finalImg) {
          speakResponse(`الأوردر رقم ${orderCode} موجود بس ملوش أي صور مرفوعة.`);
        } else {
          setImageUrl(finalImg);
          speakResponse('أهو يا فنان، دي الصورة اللي طلبتها للأوردر وعرضتها لك على الشاشة.');
        }
        return;
      }

      // 2. أمر سؤال المصمم والمطور
      if (cleanText.includes('صمم') || cleanText.includes('طور') || cleanText.includes('عملك') || cleanText.includes('المصمم') || cleanText.includes('اسلام')) {
        speakResponse('المهندس إسلام الكومي هو اللي صممني وطور السيستم ده بالكامل يا فنان.');
        return;
      }

      // 3. أمر الإحصائيات (كم أوردر / كام طلب / كم عميل)
      if (cleanText.includes('كام') || cleanText.includes('عدد') || cleanText.includes('احصائيات') || cleanText.includes('اجمالي') || cleanText.includes('وردر') || cleanText.includes('طلب')) {
        const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        speakResponse(`عندك حالياً ${ordersCount || 0} أوردرات مسجلة في السيستم، وإجمالي عدد العملاء هو ${custCount || 0} عملاء في الأتيليه.`);
        return;
      }

      // 4. أمر الساعة والوقت والنهارده كام
      if (cleanText.includes('ساعه') || cleanText.includes('وقت') || cleanText.includes('تاريخ') || cleanText.includes('النهارده')) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateString = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        speakResponse(`الساعة دلوقتي ${timeString}، والتاريخ هو ${dateString}.`);
        return;
      }

      // 5. إذا لم يطابق أي أمر - نرسله لـ RPC كاحتياط أخير لعدم تجميد المساعد
      const { data: rpcData } = await supabase.rpc('get_ai_response', { p_message: input });
      speakResponse(rpcData || 'أنا سامعك كويس، تقدر تسألني عن عدد الأوردرات أو تقولي هات صورة أوردر واذكر رقمه.');

    } catch (err) {
      console.error(err);
      speakResponse('حصلت مشكلة أثناء الاتصال بقاعدة البيانات يا فنان.');
    }
  };

  // دالة النطق الاحترافية الفورية والمجبرة للمتصفح
  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    // كسر الحظر الفوري للمتصفحات
    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    // تفعيل قنوات الصوت مع أول تفاعل بشري مع الشاشة
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsSpeaking(false);
      recognitionRef.current?.start();
    }
  };

  const handleStopSpeaking = () => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setStatusText('جاهز لأمر جديد...');
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-[calc(100vh-140px)] max-w-xl mx-auto p-6 text-white" dir="rtl">
      <div className="text-center mt-6">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent tracking-wider">
          AI VOICE ASSISTANT
        </h2>
      </div>

      {/* الموجات الدائرية المتفاعلة مع الصوت */}
      <div className="relative flex items-center justify-center my-auto">
        {isListening && <div className="absolute w-44 h-44 rounded-full bg-blue-500/20 animate-ping" />}
        {isSpeaking && <div className="absolute w-40 h-40 rounded-full bg-amber-500/20 animate-pulse scale-110" />}
        
        <button
          onClick={toggleListening}
          className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            isListening 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/50' 
              : isSpeaking
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/50'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {isListening ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-8 bg-white rounded-full animate-bounce delay-75" />
              <span className="w-2 h-12 bg-white rounded-full animate-bounce delay-150" />
              <span className="w-2 h-8 bg-white rounded-full animate-bounce delay-75" />
            </div>
          ) : (
            <svg className={`w-16 h-16 ${isSpeaking ? 'text-amber-100 animate-pulse' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      <div className="w-full space-y-4 mb-4">
        {/* شاشة عرض النص المقروء أو المسموع حياً */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-2xl w-full text-center min-h-[70px] flex items-center justify-center px-6">
          <p className={`text-sm font-medium leading-relaxed ${isListening ? 'text-blue-400' : isSpeaking ? 'text-amber-400' : 'text-slate-300'}`}>
            {statusText}
          </p>
        </div>

        {/* زر التوقف الفوري في حال أطال الكلام */}
        <div className="flex justify-center min-h-[40px]">
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center gap-2 bg-red-600/90 hover:bg-red-600 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-red-600/30 border border-red-500"
            >
              إسكات المساعد
            </button>
          )}
        </div>

        {/* عرض كارت صورة الأوردر فوراً إذا تم طلبها صوتياً */}
        {imageUrl && (
          <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <img src={imageUrl} alt="صورة الأوردر المطلوبة" className="w-full h-auto max-h-52 object-cover rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
