import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { saveConversation, fetchConversations } from '../lib/database';
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
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    loadHistory();
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (synthRef.current) synthRef.current.cancel();
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
      console.error('Error loading history:', err);
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG'; 
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setProcessing(true);

    try {
      // إرسال النص مباشرة إلى الـ RPC في سوبابيز بدون أي فلاتر في الـ Frontend
      const { data, error } = await supabase.rpc('get_ai_response', { 
        p_message: text 
      });

      if (error) throw error;

      const aiResponse = data || 'أنا سامعك كويس، بس مش قادر أوصل للرد حالياً.';
      
      addMessage('assistant', aiResponse);
      speak(aiResponse);

      if (user) {
        await saveConversation({
          user_id: user.id,
          user_message: text,
          assistant_response: aiResponse,
        });
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      addMessage('assistant', 'عذراً، حدث خطأ أثناء الاتصال بالخادم.');
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
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage('assistant', 'الميزة الصوتية غير مدعومة على متصفحك الحالي.');
      return;
    }

    if (synthRef.current) {
      synthRef.current.cancel();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        handleUserMessage(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    if (synthRef.current) synthRef.current.cancel();
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-180px)]" dir="rtl">
      
      <div className="flex flex-col items-center justify-center py-8 mb-4">
        <div className="relative">
          {listening && (
            <>
              <div className="absolute inset-0 -m-6 rounded-full bg-amber-500/10 animate-ping" />
              <div className="absolute inset-0 -m-4 rounded-full bg-amber-500/20 animate-pulse" />
            </>
          )}
          {speaking && (
            <>
              <div className="absolute inset-0 -m-6 rounded-full bg-blue-500/10 animate-ping" />
              <div className="absolute inset-0 -m-4 rounded-full bg-blue-500/20 animate-pulse" />
            </>
          )}
          <button
            onClick={toggleListening}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              listening
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 scale-110 shadow-amber-500/30'
                : speaking
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                : 'bg-slate-800 border-2 border-slate-700 hover:border-amber-500/40'
            }`}
          >
            {listening ? (
              <Mic className="w-9 h-9 text-black" />
            ) : speaking ? (
              <Volume2 className="w-9 h-9 text-white animate-pulse" />
            ) : (
              <MicOff className="w-9 h-9 text-slate-400" />
            )}
          </button>
        </div>
        
        <p className="text-slate-400 text-xs mt-4 font-medium">
          {listening ? 'جاري الاستماع...' : speaking ? 'جاري التحدث...' : 'اضغط للتحدث مع المساعد الاصطناعي'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-bold">المساعد الصوتي الأصلي</p>
            <p className="text-slate-500 text-xs mt-1">تحدث مباشرة وسيتم معالجة طلبك عبر السيرفر</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
              msg.role === 'user'
                ? 'bg-slate-800 border border-slate-700 text-white'
                : 'bg-gradient-to-l from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-slate-100'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Bot className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-400 text-xs font-black">المساعد الأصلي</span>
                </div>
              )}
              <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
            </div>
          </div>
        ))}

        {processing && (
          <div className="flex justify-end">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-inner">
        <button
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all ${
            listening ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-800'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>
        
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="اكتب أمرك هنا..."
          className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm px-2 min-w-0"
        />
        
        <button
          onClick={clearHistory}
          className="p-3 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleSend}
          disabled={!input.trim() || processing}
          className="p-3 bg-gradient-to-l from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
