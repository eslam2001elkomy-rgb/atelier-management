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
      rec.lang = 'ar-EG'; // لقط دقيق للهجة المصرية الحية
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
        setIsListening(false);
        setStatusText('لم أسمعك بوضوح، اضغط وجرب تاني...');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const voiceInput = event.results[0][0].transcript;
        setStatusText('جاري الفحص والرد...');
        await handleVoiceCommand(voiceInput);
      };

      recognitionRef.current = rec;
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
        forceVoiceOutput('أهو يا فنان، دي الصورة اللي طلبتها للأوردر.');
      } else {
        forceVoiceOutput(data || 'لم أتمكن من العثور على إجابة.');
      }
    } catch (err) {
      forceVoiceOutput('حدث خطأ في السيرفر أثناء جلب البيانات.');
    }
  };

  // دالة النطق الصارمة لكسر حماية المتصفحات على الموبايل
  const forceVoiceOutput = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel(); // تنظيف فوري ومستمر لنهش الكاش الصوتى

    const utterance = new SpeechSynthesisUtterance(text);
    
    // اختيار أفضل صوت عربي متاح في جهازك (موبايل أندرويد أو آيفون)
    const voices = synthRef.current.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.lang = 'ar-EG';
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText(text); // التحديث هنا عشان تشوف الرد بعينك وتسمعه بودنك
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusText('جاهز لأمرك القادم...');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    // إجبار المتصفح على تشغيل الصوت فوراً
    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    // الحركة السحرية: تفعيل وحجز الـ Audio Context بصوت صامت مع أول ضغطة صباع حقيقية
    if (synthRef.current) {
      synthRef.current.cancel();
      const silentUtterance = new SpeechSynthesisUtterance('');
      silentUtterance.lang = 'ar-EG';
      synthRef.current.speak(silentUtterance);
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
      setStatusText('تم إسكات المساعد. جاهز لأمر جديد...');
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-[calc(100vh-140px)] max-w-xl mx-auto p-6 text-white" dir="rtl">
      
      {/* اسم المساعد فقط بدون تكرار أو كلمات إضافية */}
      <div className="text-center mt-6">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent tracking-wider">
          AI VOICE ASSISTANT
        </h2>
      </div>

      {/* الأنيميشن الحركي للمايك والصوت */}
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

      {/* صندوق مراقبة الرد وزر الإسكات الفوري */}
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
