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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'ar-EG'; // لقط فوري للهجة المصرية والعربية
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setStatusText('أنا سامعك، اتفضل اطلب...');
        setImageUrl(null);
        if (synthRef.current?.speaking) {
          synthRef.current.cancel();
          setIsSpeaking(false);
        }
      };

      rec.onerror = () => {
        setStatusText('اضغط وتحدث مرة أخرى...');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const voiceInput = event.results[0][0].transcript;
        setStatusText(`جاري التفكير...`);
        await handleVoiceCommand(voiceInput);
      };

      recognitionRef.current = rec;
    } else {
      setStatusText('الميزة غير مدعومة في هذا المتصفح.');
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const handleVoiceCommand = async (command: string) => {
    try {
      const { data, error } = await supabase.rpc('get_ai_response', { p_message: command });
      if (error) throw error;

      if (data && data.startsWith('SHOW_IMAGE:')) {
        const url = data.replace('SHOW_IMAGE:', '');
        setImageUrl(url);
        executeVoiceOutput('أهو يا فنان، دي الصورة اللي طلبتها.');
      } else {
        executeVoiceOutput(data || 'لم أسمعك جيداً.');
      }
    } catch (err) {
      executeVoiceOutput('حدث خطأ في السيرفر يا فنان.');
    }
  };

  // دالة نطق إجبارية وقوية تتخطى حجب المتصفحات
  const executeVoiceOutput = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel(); // إلغاء أي كاش صوتي معلق فوراً

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG'; // النطق باللهجة العربية المفهومة
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText(text); // تحديث نص الشاشة للمتابعة فقط
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusText('جاهز لأمرك القادم...');
    };

    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
      setStatusText('حدث خطأ أثناء نطق المساعد للرد.');
    };

    // حيلة إجبارية لتشغيل الصوت في متصفحات الموبايل (Safari & Chrome Mobile)
    setTimeout(() => {
      synthRef.current?.speak(utterance);
    }, 50);
  };

  const toggleListening = () => {
    // تفعيل وتأشير نظام الصوت مع أول ضغطة يد حقيقية للمستخدم
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleStopSpeaking = () => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setStatusText('تم إسكات المساعد. جاهز لأمر جديد...');
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-[calc(100vh-140px)] max-w-xl mx-auto p-6 text-white" dir="rtl">
      
      {/* الواجهة النظيفة: تم إلغاء السطر التعريفي العلوي تماماً */}
      <div className="text-center mt-6">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent tracking-wider">
          AI VOICE ASSISTANT
        </h2>
      </div>

      {/* دائرة التحكم والموجات الحركية للمايك والصوت */}
      <div className="relative flex items-center justify-center my-auto">
        {isListening && (
          <div className="absolute w-44 h-44 rounded-full bg-blue-500/20 animate-ping" />
        )}
        {isSpeaking && (
          <div className="absolute w-40 h-40 rounded-full bg-amber-500/20 animate-pulse scale-110" />
        )}
        
        <button
          onClick={toggleListening}
          className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            isListening 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/50 scale-105' 
              : isSpeaking
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/50'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-black/40'
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

      {/* نصوص المتابعة وزر الإسكات الفوري */}
      <div className="w-full space-y-4 mb-4">
        
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-2xl w-full text-center min-h-[70px] flex items-center justify-center px-6 shadow-inner">
          <p className={`text-sm font-medium leading-relaxed ${isListening ? 'text-blue-400' : isSpeaking ? 'text-amber-400' : 'text-slate-300'}`}>
            {statusText}
          </p>
        </div>

        <div className="flex justify-center min-h-[40px]">
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center gap-2 bg-red-600/90 hover:bg-red-600 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-red-600/30 border border-red-500 animate-fade-in"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h12V5H6v14z" />
              </svg>
              إسكات المساعد
            </button>
          )}
        </div>

        {imageUrl && (
          <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <img src={imageUrl} alt="صورة الأوردر المطلوبة" className="w-full h-auto max-h-52 object-cover rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
