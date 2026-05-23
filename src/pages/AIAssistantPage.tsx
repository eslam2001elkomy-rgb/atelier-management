import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchOrders,
  saveConversation,
  fetchConversations,
  askAI, // استدعاء الدالة الذكية المربوطة بقاعدة البيانات فوراُ
} from '../lib/database';
import { Bot, Mic, MicOff, Send, Trash2, Volume2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadHistory();
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const data = await fetchConversations(user.id);
      if (data && data.length > 0) {
        const historyMsgs: Message[] = [];
        data.slice(0, 10).reverse().forEach((c: any) => {
          historyMsgs.push({ role: 'user', content: c.user_message, timestamp: new Date(c.created_at) });
          historyMsgs.push({ role: 'assistant', content: c.assistant_response, timestamp: new Date(c.created_at) });
        });
        setMessages(historyMsgs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    // تنظيف النص من الإيموجي والرموز عشان النطق المساعد يكون طبيعي ومفهوم
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG'; // نطق باللهجة المصرية الجميلة
    utterance.rate = 1.1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setProcessing(true);

    try {
      // إرسال السؤال مباشرة لدالة سوبابيز الذكية لتوليد الإجابة الحية من قاعدة البيانات
      const response = await askAI(text);
      addMessage('assistant', response);
      speak(response);

      if (user) {
        await saveConversation({
          user_id: user.id,
          user_message: text,
          assistant_response: response,
        });
      }
    } catch (err) {
      console.error(err);
      addMessage('assistant', 'معلش يا فنان، حصلت مشكلة سريعة في الاتصال بالسيرفر. جرب تاني كدة.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    handleUserMessage(text);
  };

  const stopListening = () => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage('assistant', 'المتصفح ده مش بيدعم الصوت، اكتبلي هنا عل طول وعينيا ليك.');
      return;
    }

    stopListening();
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          handleUserMessage(transcript);
        }
      }
    };

    recognition.onerror = () => {
      setListening(false);
      listeningRef.current = false;
    };

    recognition.onend = () => {
      setListening(false);
      listeningRef.current = false;
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    recognition.start();
    setListening(true);
  };

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  const clearHistory = () => {
    setMessages([]);
    window.speechSynthesis?.cancel();
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] bg-[#0a0a12] text-gray-100 font-sans">
      
      {/* الواجهة الصوتية السيمبل البديهية */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative">
          {listening && <div className="absolute inset-0 -m-4 rounded-full bg-amber-500/20 animate-ping" />}
          {speaking && <div className="absolute inset-0 -m-4 rounded-full bg-blue-500/20 animate-pulse" />}
          <button
            onClick={toggleListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
              listening
                ? 'bg-amber-500 text-black scale-105'
                : speaking
                ? 'bg-blue-600 text-white'
                : 'bg-[#16162a] border border-gray-800 hover:border-amber-500/40'
            }`}
          >
            {listening ? <Mic className="w-6 h-6 animate-pulse" /> : speaking ? <Volume2 className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-gray-400" />}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 font-medium">
          {listening ? 'سامعك.. اتفضل اتكلم' : speaking ? 'جاري الرد صوتياً...' : 'اضغط واتكلم معايا فوري'}
        </p>
      </div>

      {/* منطقة الرسائل النظيفة المريحة للعين */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Bot className="w-10 h-10 text-amber-500/70 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">مرحباً بك في أتيليه الكومي دوت كوم ✨</p>
            <p className="text-gray-600 text-xs mt-1">اطلب إضافة أوردر، تعديل حالة، أو استعلم عن حسابات أي عميل.</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#16162a] text-white border border-gray-800'
                : 'bg-gradient-to-r from-amber-600/10 to-amber-500/5 border border-amber-500/20 text-amber-100'
            }`}>
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}

        {processing && (
          <div className="flex justify-end">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* شريط الإدخال السيمبل والذكي */}
      <div className="flex items-center gap-2 bg-[#111122] border border-gray-800/80 rounded-xl p-1.5 shadow-xl">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="اكتب طلبك هنا (مثال: ضيف أوردر جديد باسم إسلام)..."
          className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none text-xs px-2"
        />
        <button
          onClick={clearHistory}
          title="مسح المحادثة"
          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || processing}
          className="p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-600 transition-all disabled:opacity-30 font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
