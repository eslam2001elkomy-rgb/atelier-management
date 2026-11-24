import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  generateOrderCode,
  saveConversation,
  fetchConversations,
} from '../lib/database';
import { handle, type Pending, type Action } from '../lib/assistantEngine';
import { STATUS_LABELS } from '../lib/assistant';
import { Bot, Mic, Send, Volume2, VolumeX } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WELCOME = 'أهلاً بك! اسألني عن الطلبات أو قولي أضيف أو أعدل طلب. اكتب "مساعدة" للأمثلة.';

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const ordersRef = useRef<any[]>([]);
  const pendingRef = useRef<Pending | null>(null);
  const voiceOnRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(() => { const el = chatBoxRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      ordersRef.current = data || [];
      setOrdersLoaded(true);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      const ok = await loadOrders();
      let history: Message[] = [];
      if (user && UUID_RE.test(user.id)) {
        try {
          const data = await fetchConversations(user.id);
          (data || []).slice(0, 10).reverse().forEach((c: any) => {
            history.push({ role: 'user', content: c.user_message, timestamp: new Date(c.created_at) });
            history.push({ role: 'assistant', content: c.assistant_response, timestamp: new Date(c.created_at) });
          });
        } catch (err) { console.error(err); }
      }
      setMessages([
        ...history,
        { role: 'assistant', content: ok ? WELCOME : 'تعذر تحميل الطلبات حاليًا. تأكد من الاتصال ثم أعد فتح الصفحة.', timestamp: new Date() },
      ]);
    })();
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth || !voiceOnRef.current) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\n/g, '. '));
    u.lang = 'ar-SA';
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) =>
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);

  const runAction = async (a: Action): Promise<string> => {
    try {
      if (a.kind === 'add') {
        const code = await generateOrderCode();
        await createOrder({
          order_code: code,
          customer_name: a.data.name,
          phone: a.data.phone,
          delivery_date: a.data.date,
          delivery_time: a.data.time,
          price: a.data.price,
          notes: a.data.notes,
          status: 'pending',
        });
        await loadOrders();
        return `تمت إضافة الطلب باسم ${a.data.name}، الكود ${code}.`;
      }
      if (a.kind === 'status') {
        await updateOrder(a.id, { status: a.status });
        await loadOrders();
        return `تم تغيير حالة الطلب #${a.code} (${a.name}) إلى ${STATUS_LABELS[a.status]}.`;
      }
      await deleteOrder(a.id);
      await loadOrders();
      return `تم حذف الطلب #${a.code} (${a.name}).`;
    } catch (err) {
      console.error(err);
      return 'حصل خطأ ولم تتم العملية. لم يتغير شيء. حاول مرة أخرى.';
    }
  };

  const handleUserMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    addMessage('user', text);
    setProcessing(true);
    try {
      await loadOrders();
      const res = handle(text, ordersRef.current, pendingRef.current, new Date());
      pendingRef.current = res.pending;
      let reply = res.reply;
      if (res.action) reply = await runAction(res.action);
      addMessage('assistant', reply);
      speak(reply);
      if (user && UUID_RE.test(user.id)) {
        try { await saveConversation({ user_id: user.id, user_message: text, assistant_response: reply }); }
        catch (err) { console.error(err); }
      }
    } finally {
      busyRef.current = false;
      setProcessing(false);
    }
  };

  const send = () => {
    const t = input;
    setInput('');
    handleUserMessage(t);
  };

  const stopListening = () => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* */ } }
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      addMessage('assistant', 'المتصفح ده مش بيدعم الكتابة بالصوت. اكتب الأمر في الخانة تحت.');
      return;
    }
    const r = new SR();
    r.lang = 'ar-EG';
    r.continuous = false; // جملة واحدة في كل مرة
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[e.results.length - 1][0].transcript;
      handleUserMessage(t);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  const toggleVoice = () => {
    if (voiceOn) window.speechSynthesis?.cancel();
    setVoiceOn(!voiceOn);
    setSpeaking(false);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-9rem)] min-h-[320px] bg-[#0f0f12] text-white">
      {/* رأس صغير */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#12121a]">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full bg-[#1a1a2e] border border-amber-500/30 flex items-center justify-center ${processing || speaking ? 'animate-pulse' : ''}`}>
            <Bot className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">المساعد</p>
            <p className="text-xs text-gray-500">{processing ? 'بفكر...' : listening ? 'أنا أسمعك...' : ordersLoaded ? 'جاهز' : 'جاري التحميل'}</p>
          </div>
        </div>
        <button onClick={toggleVoice} aria-label="قراءة الردود بصوت عالٍ" className={`p-2 rounded-lg border ${voiceOn ? 'border-amber-500/50 text-amber-500' : 'border-gray-700 text-gray-500'}`}>
          {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* المحادثة */}
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-2xl max-w-[88%] whitespace-pre-line text-sm leading-relaxed ${m.role === 'user' ? 'bg-amber-500/15 mr-0 ml-auto' : 'bg-gray-800 ml-0 mr-auto'}`}>
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* الإدخال */}
      <div className="p-3 border-t border-gray-800 bg-[#12121a] flex items-center gap-2">
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          aria-label="تحدث"
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border ${listening ? 'bg-amber-500 text-black border-amber-500 animate-pulse' : 'border-amber-500/40 text-amber-500'}`}
        >
          <Mic className="w-5 h-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="اكتب أمرك هنا..."
          className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
        />
        <button onClick={send} disabled={processing || !input.trim()} aria-label="إرسال" className="w-11 h-11 shrink-0 rounded-full bg-amber-500 text-black flex items-center justify-center disabled:opacity-40">
          <Send className="w-5 h-5 -scale-x-100" />
        </button>
      </div>
    </div>
  );
}
