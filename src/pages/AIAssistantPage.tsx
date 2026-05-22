import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // تأكد من مسار استيراد سوبابيز الصحيح عندك
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
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
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
      if (recognitionRef.current) recognitionRef.current.abort();
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

  // معالج الأوامر الذكي - يفهم النية وينفذ كافة العمليات (إضافة، تعديل، حذف، عرض صور)
  const processCommand = async (text: string): Promise<string> => {
    let lower = text.trim().toLowerCase();
    lower = lower.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    
    const currentOrders = ordersRef.current;

    // 1. أمر إضافة أوردر جديد بذكاء واشتقاق الاسم
    if (lower.includes('اضف') || lower.includes('سجل') || lower.includes('اعمل اوردر') || lower.includes('جديد')) {
      const nameMatch = lower.match(/(?:باسم|اسم|للزبون|للعميل)\s+(.+?)(?:\s|$)/) || lower.match(/(?:اوردر|طلب)\s+(.+?)(?:\s|$)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name && name !== 'اوردر' && name !== 'طلب') {
        const code = await generateOrderCode();
        await createOrder({
          order_code: code,
          customer_name: name,
          phone: '',
          delivery_date: null,
          delivery_time: null,
          price: 0,
          notes: 'تمت الإضافة عبر المساعد الصوتي',
          status: 'pending',
        });
        await loadOrders();
        return `أبشر يا فنان، سجلت أوردر جديد في السيستم باسم العميل "${name}"، وكود الأوردر بتاعه هو: ${code}`;
      }
      return 'علشان أضيف الأوردر، قولي الاسم بوضوح، مثلاً: أضف أوردر باسم رنا محمد.';
    }

    // 2. أمر تعديل أو تحديث بيانات وحالة الأوردر
    if (lower.includes('غير') || lower.includes('حدث') || lower.includes('تعديل') || lower.includes('حول')) {
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
          return `تم تحديث الأوردر رقم ${order.order_code} بنجاح، وحالته اتغيرت إلى: ${statusLabels[newStatus]}.`;
        }
        return `بحثت عن أوردر بالكود ${codeMatch[0]} وملقيتوش في السيستم.`;
      }
      return 'لتعديل الحالة، قولي مثلاً: غير حالة الأوردر 1234567 إلى جاهز.';
    }

    // 3. أمر مسح وحذف أوردر نهائياً
    if (lower.includes('احذف') || lower.includes('امسح') || lower.includes('شيل')) {
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          await deleteOrder(order.id);
          await loadOrders();
          return `تمام يا فنان، حذفت الأوردر رقم ${order.order_code} تماماً من قاعدة البيانات.`;
        }
        return `ملقيتش أوردر برقم ${codeMatch[0]} عشان أحذفه.`;
      }
      return 'لحذف الأوردر، اذكر كود الأوردر المكون من 7 أرقام (مثال: امسح الأوردر 1234567).';
    }

    // 4. أمر جلب وعرض الصور (بالكود أو باسم الشخص)
    if (lower.includes('صوره') || lower.includes('الصور') || lower.includes('وريني') || lower.includes('هات')) {
      const codeMatch = lower.match(/[0-9]{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          if (order.image_url) {
            setCurrentImageUrl(order.image_url);
            return `تفضل يا فنان، دي الصورة المرفوعة للأوردر رقم ${codeMatch[0]}.`;
          }
          return `الأوردر رقم ${codeMatch[0]} موجود ومسجل، بس ملهوش صور مرفوعة حتى الآن.`;
        }
      }
      
      // جلب الصورة بالاسم
      const nameMatch = lower.match(/(?:طلب|اوردر|لـ|باسم|شخص|عميل|زبون)\s+(.+?)(?:\s|$)/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name) {
        const order = currentOrders.find((o: any) => o.customer_name && o.customer_name.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').includes(name));
        if (order) {
          if (order.image_url) {
            setCurrentImageUrl(order.image_url);
            return `أهو يا فنان، دي الصورة الخاصة بأوردر العميل العميل ${order.customer_name}.`;
          }
          return `لقيت أوردر باسم ${order.customer_name} بس ملهوش صور مرفوعة.`;
        }
        return `ملقيتش أي أوردر مسجل باسم ${name} عشان أعرض صورته.`;
      }
    }

    // 5. أمر الاستعلام عن تفاصيل أوردر معين
    if (lower.includes('تفاصيل') || lower.includes('عرض') || lower.includes('قولي') || lower.includes('بيانات')) {
      const codeMatch = lower.match(/\d{7}/);
      if (codeMatch) {
        const order = currentOrders.find((o: any) => o.order_code === codeMatch[0]);
        if (order) {
          const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز للتسليم', delivered: 'تم التسليم' };
          return `إليك تفاصيل الأوردر ${order.order_code}: باسم العميل ${order.customer_name}، حالته الحالية هي (${statusLabels[order.status] || order.status})، وإجمالي السعر ${Number(order.price || 0).toLocaleString()} جنيه.`;
        }
      }

      const nameMatch = lower.match(/(?:تفاصيل|باسم|لـ|عن|اوردر|زبون)\s+(.+?)(?:\s|$)/);
      if (nameMatch) {
        const targetName = nameMatch[1].trim();
        const order = currentOrders.find((o: any) => o.customer_name && o.customer_name.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').includes(targetName));
        if (order) {
          const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز للتسليم', delivered: 'تم التسليم' };
          return `لقيت أوردر باسم العميل "${order.customer_name}" (كود: ${order.order_code})، حالته هي ${statusLabels[order.status] || order.status} وإجمالي حسابه ${Number(order.price || 0).toLocaleString()} جنيه.`;
        }
        return `ملقيتش أوردرات في السيستم باسم ${targetName}.`;
      }
    }

    // 6. استدعاء ذكاء سوبابيز الاصطناعي (الـ RPC الحرة للأسئلة العامة والدردشة)
    try {
      const { data, error } = await supabase.rpc('get_ai_response', { p_message: text });
      if (data && !error) return data;
    } catch (e) {
      console.error(e);
    }

    // 7. الرد الاحتياطي الذكي في حالة لم يطابق أي شيء
    return 'أنا سامعك كويس وبفهمك. قولي بوضوح: اضف اوردر باسم فلان، احذف الاوردر 1234567، غير حالة الاوردر، أو هات صورة أوردر فلان.';
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    setCurrentImageUrl(null); 
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
      addMessage('assistant', 'عذراً يا فنان، حصلت مشكلة أثناء تنفيذ الطلب.');
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
      recognitionRef.current.onend = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.abort();
    }
    setListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage('assistant', 'الميزة الصوتية غير مدعومة بالكامل على متصفحك.');
      return;
    }

    stopListening();

    if (synthRef.current) {
      synthRef.current.cancel();
      synthRef.current.speak(new SpeechSynthesisUtterance(''));
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG'; 
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      if (event.results && event.results[0]) {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          handleUserMessage(transcript);
        }
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

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
    setCurrentImageUrl(null);
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
        
        <p className="text-slate-400 text-xs mt-4 tracking-wide font-medium">
          {listening ? 'سامعك بذكاء، اتفضل اطلب أي تعديل أو إضافة...' : speaking ? 'جاري التحدث والرد...' : 'اضغط على المايك وتحدث مباشرة'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-bold">المساعد الشامل للأتيليه الذكي 🤖</p>
            <p className="text-slate-500 text-xs mt-1">تعديل، إضافة، حذف، عرض صور، أو دردشة حرة.. جربني الآن!</p>
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

        {currentImageUrl && (
          <div className="w-full max-w-sm mx-auto bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-2xl animate-fade-in mt-2">
            <div className="text-xs text-amber-400 font-bold mb-1.5 text-center">🖼️ الصورة المطلوبة من الأوردر:</div>
            <img src={currentImageUrl} alt="Order snapshot" className="w-full h-auto max-h-60 object-cover rounded-xl" />
          </div>
        )}

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
          placeholder="اكتب أمرك هنا أو استخدم المايك..."
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
