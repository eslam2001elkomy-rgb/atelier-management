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

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadOrders();
    loadHistory();
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    }
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const processCommand = async (text: string): Promise<string> => {
    const lower = text.trim();
    const currentOrders = ordersRef.current;

    // Add order
    if (lower.includes('أضف') && (lower.includes('طلب') || lower.includes('اوردر') || lower.includes('أوردر'))) {
      const nameMatch = lower.match(/باسم\s+(.+?)(?:\s|$)/) || lower.match(/اسم\s+(.+?)(?:\s|$)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name) {
        const code = await generateOrderCode();
        await createOrder({
          order_code: code,
          customer_name: name,
          phone: '',
          delivery_date: null,
          delivery_time: null,
          price: 0,
          notes: '',
          status: 'pending',
        });
        await loadOrders();
        return `تم إنشاء طلب جديد باسم ${name} بكود ${code}`;
      }
      return 'يرجى تحديد اسم العميل، مثال: أضف طلب جديد باسم أحمد';
    }

    // Show images
    if (lower.includes('صور') && (lower.includes('طلب') || lower.includes('اوردر'))) {
      const nameMatch = lower.match(/(?:طلب|اوردر)\s+(.+?)(?:\s|$)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name) {
        const order = currentOrders.find((o: any) => o.customer_name.includes(name));
        if (order) {
          const imgCount = order.order_images?.length || 0;
          return imgCount > 0
            ? `يوجد ${imgCount} صورة لطلب ${order.customer_name}`
            : `لا توجد صور لطلب ${order.customer_name}`;
        }
        return `لم أجد طلباً باسم ${name}`;
      }
    }

    // Delivery tomorrow
    if (lower.includes('هيتسلم') && (lower.includes('بكرة') || lower.includes('غداً') || lower.includes('بكرا'))) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const dueOrders = currentOrders.filter((o: any) => o.delivery_date === tomorrowStr);
      if (dueOrders.length === 0) return 'لا توجد طلبات مستلمة غداً';
      const names = dueOrders.map((o: any) => o.customer_name).join('، ');
      return `يوجد ${dueOrders.length} طلب مستلم غداً: ${names}`;
    }

    // Change status
    if (lower.includes('غير') && lower.includes('حالة')) {
      const statusMap: Record<string, string> = {
        'انتظار': 'pending',
        'تنفيذ': 'in_progress',
        'جاهز': 'ready',
        'تسليم': 'delivered',
      };
      let newStatus = '';
      for (const [key, val] of Object.entries(statusMap)) {
        if (lower.includes(key)) { newStatus = val; break; }
      }
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch && newStatus) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          await updateOrder(order.id, { status: newStatus });
          await loadOrders();
          const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز', delivered: 'تم التسليم' };
          return `تم تغيير حالة الطلب ${order.order_code} إلى ${statusLabels[newStatus]}`;
        }
        return `لم أجد الطلب رقم ${codeMatch[0]}`;
      }
      return 'يرجى تحديد رقم الطلب والحالة الجديدة';
    }

    // Delete order
    if (lower.includes('احذف') && lower.includes('طلب')) {
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          await deleteOrder(order.id);
          await loadOrders();
          return `تم حذف الطلب ${order.order_code}`;
        }
        return `لم أجد الطلب رقم ${codeMatch[0]}`;
      }
      return 'يرجى تحديد رقم الطلب المكون من 7 أرقام';
    }

    // Statistics
    if ((lower.includes('كم') && lower.includes('طلب')) || lower.includes('إحصائ') || lower.includes('احصائ') || lower.includes('عدد')) {
      const stats = await fetchOrderStats();
      return `إجمالي الطلبات: ${stats.total}، قيد الانتظار: ${stats.pending}، قيد التنفيذ: ${stats.in_progress}، جاهز: ${stats.ready}، تم التسليم: ${stats.delivered}`;
    }

    // Prices
    if (lower.includes('سعر') || lower.includes('أسعار') || lower.includes('مبلغ') || lower.includes('إجمالي')) {
      const total = currentOrders.reduce((s: number, o: any) => s + Number(o.price), 0);
      const pending = currentOrders.filter((o: any) => o.status === 'pending').reduce((s: number, o: any) => s + Number(o.price), 0);
      return `إجمالي المبالغ: ${total.toLocaleString()} ر.س، المبالغ المعلقة: ${pending.toLocaleString()} ر.س`;
    }

    // Current time
    if (lower.includes('الساعة') || lower.includes('الوقت')) {
      const now = new Date();
      return `الساعة الآن ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Current date
    if (lower.includes('التاريخ') || lower.includes('اليوم') || lower.includes('تاريخ')) {
      const now = new Date();
      return `اليوم ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    // Search order
    if (lower.includes('ابحث') || lower.includes('بحث') || (lower.includes('عرض') && lower.includes('طلب'))) {
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز', delivered: 'تم التسليم' };
          return `طلب ${order.customer_name}، الحالة: ${statusLabels[order.status] || order.status}، السعر: ${Number(order.price).toLocaleString()} ر.س`;
        }
        return `لم أجد الطلب رقم ${codeMatch[0]}`;
      }
      const nameMatch = lower.match(/(?:عن|لـ)\s+(.+?)(?:\s|$)/);
      if (nameMatch) {
        const found = currentOrders.filter((o: any) => o.customer_name.includes(nameMatch[1].trim()));
        if (found.length > 0) {
          const names = found.map((o: any) => `${o.customer_name} (${o.order_code})`).join('، ');
          return `وجدت ${found.length} طلب: ${names}`;
        }
        return `لم أجد طلبات باسم ${nameMatch[1]}`;
      }
    }

    return 'مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في إدارة الطلبات والبحث والإحصائيات. قل "أضف طلب جديد" أو "كم طلب" أو "الوقت الآن"';
  };

  const handleUserMessage = async (text: string) => {
    addMessage('user', text);
    setProcessing(true);

    try {
      const response = await processCommand(text);
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
      addMessage('assistant', 'عذراً، حدث خطأ أثناء المعالجة');
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
      addMessage('assistant', 'عذراً، متصفحك لا يدعم التعرف على الصوت. يمكنك الكتابة بدلاً من ذلك.');
      return;
    }

    stopListening();

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
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

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setListening(false);
        listeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
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
    window.speechSynthesis?.cancel();
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-180px)]">
      {/* Voice Interface */}
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
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              listening
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/40 scale-110'
                : speaking
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40'
                : 'bg-[#1a1a2e] border-2 border-gray-700 hover:border-amber-500/50'
            }`}
          >
            {listening ? (
              <Mic className="w-8 h-8 text-black" />
            ) : speaking ? (
              <Volume2 className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <MicOff className="w-8 h-8 text-gray-400" />
            )}
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          {listening ? 'جاري الاستماع... تحدث الآن' : speaking ? 'جاري التحدث...' : 'اضغط للبدء في الاستماع'}
        </p>

        {(listening || speaking) && (
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  listening ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{
                  height: `${8 + Math.random() * 20}px`,
                  animation: `wave 0.5s ease-in-out ${i * 0.05}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">مرحباً! أنا مساعدك الذكي</p>
            <p className="text-gray-500 text-sm mt-1">تحدث معي أو اكتب أوامرك</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#1a1a2e] border border-gray-700 text-white'
                  : 'bg-gradient-to-l from-amber-500/10 to-amber-600/10 border border-amber-500/20 text-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-500 text-xs font-medium">المساعد</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className="text-gray-600 text-xs mt-1.5">
                {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {processing && (
          <div className="flex justify-end">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-500" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 bg-[#12121a] border border-gray-800 rounded-2xl p-2">
        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
            listening
              ? 'bg-amber-500 text-black'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'
          }`}
        >
          {listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm min-w-0"
        />
        <button
          onClick={clearHistory}
          className="p-2.5 text-gray-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all flex-shrink-0"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || processing}
          className="p-2.5 bg-gradient-to-l from-amber-500 to-amber-600 text-black rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      <style>{`
        @keyframes wave {
          0% { height: 8px; }
          100% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
