import React, { useState, useEffect, useRef } from 'react';
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
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // لعرض الصور حياً
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const ordersRef = useRef<any[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    loadOrders();
    loadHistory();
    return () => {
      stopListening();
      if (synthRef.current) synthRef.current.cancel();
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

  // دالة النطق الإجبارية الفورية لكسر حظر المتصفحات
  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG'; // دقة النطق باللهجة المصرية والعربية المفهومة
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

  // المحرك الأساسي الضخم لتفكيك وتنفيذ أوامرك الحية
  const processCommand = async (text: string): Promise<string> => {
    let lower = text.trim().toLowerCase();
    lower = lower.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    
    const currentOrders = ordersRef.current;

    // 1. أمر إضافة أوردر تلقائي ذكي
    if ((lower.includes('اضف') || lower.includes('سجل')) && (lower.includes('طلب') || lower.includes('اوردر'))) {
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
        return `تم إنشاء طلب جديد بنجاح باسم ${name} وكود الأوردر هو ${code}`;
      }
      return 'علشان أضيف الطلب صح، قولي: أضف طلب جديد باسم أحمد';
    }

    // 2. أمر عرض جلب الصور وعرضها على الشاشة فوراً
    if (lower.includes('صور') || lower.includes('عرض') || lower.includes('شوف') || lower.includes('هات')) {
      // البحث عن كود مكون من 7 أرقام أولاً
      const codeMatch = lower.match(/[0-9]{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          if (order.image_url) {
            setCurrentImageUrl(order.image_url);
            return `تم العثور على الصورة وعرضها للأوردر رقم ${codeMatch[0]}`;
          }
          return `الأوردر رقم ${codeMatch[0]} موجود بس ملوش صور مرفوعة.`;
        }
      }
      
      // البحث باسم العميل
      const nameMatch = lower.match(/(?:طلب|اوردر|لـ|باسم)\s+(.+?)(?:\s|$)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name) {
        const order = currentOrders.find((o: any) => o.customer_name && o.customer_name.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').includes(name));
        if (order) {
          if (order.image_url) {
            setCurrentImageUrl(order.image_url);
            return `أهو يا فنان، دي الصور الخاصة بطلب العميل ${order.customer_name}`;
          }
          return `طلب ${order.customer_name} موجود في السيستم بس ملوش أي صور مسجلة.`;
        }
        return `ملقيتش أي طلب مسجل باسم ${name}`;
      }
    }

    // 3. أمر تسليمات الغد (بكرة)
    if (lower.includes('هيتسلم') && (lower.includes('بكره') || lower.includes('غدا') || lower.includes('بكرا'))) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const dueOrders = currentOrders.filter((o: any) => o.delivery_date === tomorrowStr);
      if (dueOrders.length === 0) return 'مفيش أي طلبات جاهزة للتسليم بكره يا فنان.';
      const names = dueOrders.map((o: any) => o.customer_name).join('، ');
      return `عندك ${dueOrders.length} طلبات تسليم بكره وهما لـ: ${names}`;
    }

    // 4. تغيير حالة الأوردر
    if (lower.includes('غير') && lower.includes('حاله')) {
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
          const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز للتسليم', delivered: 'تم التسليم' };
          return `تم تحديث حالة الطلب رقم ${order.order_code} بنجاح إلى ${statusLabels[newStatus]}`;
        }
        return `ملقيتش الطلب رقم ${codeMatch[0]}`;
      }
      return 'قولي رقم الطلب والحالة الجديدة؛ مثلاً: غير حالة الطلب 1234567 إلى جاهز';
    }

    // 5. أمر حذف الطلب
    if (lower.includes('احذف') || lower.includes('امسح')) {
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          await deleteOrder(order.id);
          await loadOrders();
          return `تم حذف الطلب رقم ${order.order_code} تماماً من حسابك.`;
        }
        return `لم أجد طلب مسجل بالرقم ${codeMatch[0]}`;
      }
    }

    // 6. الإحصائيات الحية العامة (كم طلب عندي)
    if (lower.includes('كم') || lower.includes('عدد') || lower.includes('احصائيات') || lower.includes('اجمالي')) {
      const stats = await fetchOrderStats();
      return `إجمالي الطلبات عندك هو ${stats.total}، المعلق في الانتظار: ${stats.pending}، قيد التنفيذ: ${stats.in_progress}، والطلبات الجاهزة: ${stats.ready}.`;
    }

    // 7. حساب المبالغ والأسعار
    if (lower.includes('سعر') || lower.includes('اسعار') || lower.includes('مبلغ') || lower.includes('فلوس')) {
      const total = currentOrders.reduce((s: number, o: any) => s + Number(o.price || 0), 0);
      const pending = currentOrders.filter((o: any) => o.status === 'pending').reduce((s: number, o: any) => s + Number(o.price || 0), 0);
      return `إجمالي مبالغ الأوردرات المسجلة: ${total.toLocaleString()} جنيه، والمبالغ المعلقة قيد الانتظار: ${pending.toLocaleString()} جنيه.`;
    }

    // 8. سؤال المطور والمصمم
    if (lower.includes('صمم') || lower.includes('طور') || lower.includes('اسلام') || lower.includes('الكومي')) {
      return 'المهندس إسلام الكومي هو المطور والمصمم اللي بناني وبرمجني بالكامل يا فنان.';
    }

    // 9. الساعة والوقت والتاريخ
    if (lower.includes('ساعه') || lower.includes('وقت')) {
      return `الساعة دلوقتي ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}.`;
    }
    if (lower.includes('تاريخ') || lower.includes('النهارده') || lower.includes('يوم')) {
      return `النهارده هو ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }

    return 'مرحباً بك! أنا مساعدك الصوتي الذكي، أطلب مني إحصائيات الأتيليه، أو قل: كم أوردر عندي، الساعة كام، أو اسألني عن صور الأوردرات.';
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    setCurrentImageUrl(null); // ريستارت للصور القديمة
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
      addMessage('assistant', 'عذراً، حدث خطأ أثناء معالجة الطلب الصوتي.');
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
      addMessage('assistant', 'الميزة الصوتية غير مدعومة على متصفحك الحالي، يرجى استخدام متصفح كروم.');
      return;
    }

    stopListening();

    // تشغيل كاش النطق صامتاً لفتح حظر المتصفحات فور لمس الشاشة
    if (synthRef.current) {
      synthRef.current.cancel();
      synthRef.current.speak(new SpeechSynthesisUtterance(''));
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; // لقط فوري دقيق للهجة المصرية والأرقام العربية
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
      console.error(event.error);
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
    setCurrentImageUrl(null);
    if (synthRef.current) synthRef.current.cancel();
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-180px)]" dir="rtl">
      
      {/* تم التخلص من السطر العلوي لاسم إسلام الكومي بناءً على طلبك والواجهة بقت فخمة ونظيفة */}
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
              <Mic className="w-9 h-9 text-black animate-pulse" />
            ) : speaking ? (
              <Volume2 className="w-9 h-9 text-white animate-bounce" />
            ) : (
              <MicOff className="w-9 h-9 text-slate-400" />
            )}
          </button>
        </div>
        
        <p className="text-slate-400 text-xs mt-4 tracking-wide font-medium">
          {listening ? 'جاري الاستماع إليك... تحدث الآن' : speaking ? 'جاري نطق الإجابة صوتياً...' : 'اضغط على المايك وتحدث مباشرة'}
        </p>
      </div>

      {/* شاشة عرض المحادثات والرسائل المتدفقة حياً */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-14 h-14 text-slate-700 mx-auto mb-3 animate-pulse" />
            <p className="text-slate-400 text-sm font-bold">مرحباً بك في المساعد الصوتي الحسي</p>
            <p className="text-slate-500 text-xs mt-1">اضغط المايك واطلب منه أي شيء بخصوص الأتيليه وسيرد عليك</p>
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
                  <span className="text-amber-400 text-xs font-black">المساعد الذكي</span>
                </div>
              )}
              <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* عرض كارت الصورة هنا فوراً إذا عثر عليها المساعد صوتياً */}
        {currentImageUrl && (
          <div className="w-full max-w-sm mx-auto bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-2xl animate-fade-in mt-2">
            <div className="text-xs text-amber-400 font-bold mb-1.5 text-center">🖼️ الصورة المطلوبة للأوردر:</div>
            <img src={currentImageUrl} alt="Order snapshot" className="w-full h-auto max-h-60 object-cover rounded-xl" />
          </div>
        )}

        {processing && (
          <div className="flex justify-end">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* لوحة الإدخال السفلية هجينة (صوت + كتابة) */}
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
          placeholder="اكتب أمرك هنا أو استخدم المايك..."
          className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm px-2 min-w-0"
        />
        
        <button
          onClick={clearHistory}
          className="p-3 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all"
          title="مسح السجل"
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

      <style>{`
        @keyframes wave {
          0% { height: 8px; }
          100% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
