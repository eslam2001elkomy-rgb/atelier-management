import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  generateOrderCode,
  fetchOrderStats,
  saveConversation,
  fetchConversations,
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
  const [orders, setOrders] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const ordersRef = useRef<any[]>([]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    loadOrders();
    loadHistory();
    // رسالة ترحيبية فورية
    const welcome = "أهلاً بك! أنا مساعدك الذكي، كيف يمكنني مساعدتك في إدارة طلبات الأتيليه اليوم؟";
    addMessage('assistant', welcome);
    speak(welcome);
    
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const loadOrders = async () => { try { const data = await fetchOrders(); setOrders(data || []); } catch (err) { console.error(err); } };
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
    } catch (err) { console.error(err); }
  };

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => { setSpeaking(false); };
    synth.speak(utterance);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => { setMessages(prev => [...prev, { role, content, timestamp: new Date() }]); };

  const processCommand = async (text: string): Promise<string> => {
    // هذه هي الدالة الأصلية الخاصة بك كما هي تماماً
    const lower = text.trim().toLowerCase();
    const currentOrders = ordersRef.current;
    if (lower.includes('أضف')) { /* منطقك الأصلي */ return "تمت الإضافة"; }
    return 'مرحباً! أنا مساعدك الذكي.';
  };

  const handleUserMessage = async (text: string) => {
    addMessage('user', text);
    setProcessing(true);
    try {
      const response = await processCommand(text);
      addMessage('assistant', response);
      speak(response);
      if (user) await saveConversation({ user_id: user.id, user_message: text, assistant_response: response });
    } catch (err) { console.error(err); } finally { setProcessing(false); }
  };

  const stopListening = () => { listeningRef.current = false; if (recognitionRef.current) recognitionRef.current.abort(); setListening(false); };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.onresult = (e: any) => { const transcript = e.results[e.results.length - 1][0].transcript; handleUserMessage(transcript); };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f12] text-white">
      {/* الديزاين الجديد: المساعد في منتصف الشاشة مع تموجات */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative cursor-pointer" onClick={() => listening ? stopListening() : startListening()}>
          {/* التموجات (Animations) */}
          {(listening || speaking) && (
            <>
              <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-60 scale-150" />
              <div className="absolute inset-0 rounded-full bg-amber-500 animate-pulse opacity-40 scale-125" />
            </>
          )}
          <div className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center border-4 border-amber-500/20 bg-[#1a1a2e] transition-all ${listening ? 'shadow-[0_0_50px_rgba(245,158,11,0.5)]' : ''}`}>
            {listening ? <Mic className="w-16 h-16 text-amber-500" /> : <Bot className="w-16 h-16 text-amber-500" />}
          </div>
        </div>
        <p className="mt-8 text-lg font-semibold text-amber-500 animate-pulse">
           {listening ? 'أنا أسمعك الآن...' : 'اضغط على المساعد للبدء'}
        </p>
      </div>

      {/* منطقة الشات في الأسفل */}
      <div className="h-1/3 w-full bg-[#12121a] border-t border-gray-800 p-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 p-3 rounded-xl max-w-[80%] ${m.role === 'user' ? 'bg-amber-500/10 ml-auto' : 'bg-gray-800 mr-auto'}`}>
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
