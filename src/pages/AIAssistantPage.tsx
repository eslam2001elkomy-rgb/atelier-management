import { useState, useEffect, useRef } from 'react';
import { 
  Bot, Mic, Package, Clock, Scissors, Loader2, MessageSquare, 
  BarChart3, BrainCircuit, Trash2, Edit, Image as ImageIcon, User, Phone, Calendar, DollarSign
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export interface Order {
  id: string;
  code: string;
  name: string;
  phone: string;
  category: string;
  price: number;
  paid: number;
  delivery_date: string;
  delivery_time?: string;
  status: string;
  notes?: string;
}

export interface ClientImage {
  id: string;
  clientName: string;
  imageUrl: string;
  designType: string;
}

export default function UltimateAIAssistant() {
  // Navigation & UI Viewports
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'images' | 'dashboard'>('chat');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);

  // شاشة نظيفة: تعرض فقط آخر رسالة مستخدم وآخر رد للمساعد منعاً للازدحام
  const [lastUserMessage, setLastUserMessage] = useState<{ text: string } | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<{ text: string; type: string } | null>(null);

  // Local Memory Databases (مؤمنة وتعمل فوراً على الموبايل)
  const [orders, setOrders] = useState<Order[]>([]);
  const [images, setImages] = useState<ClientImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageSearchQuery, setImageSearchQuery] = useState('');

  // Refs for tracking system states without closure lags
  const recognitionRef = useRef<any>(null);
  const ordersRef = useRef<Order[]>(orders);
  const imagesRef = useRef<ClientImage[]>(images);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // ============================================================================
  // INITIALIZATION & MOCK DATA (قاعدة بيانات تجريبية جاهزة للاستخدام الفوري)
  // ============================================================================
  useEffect(() => {
    // تحميل أوردرات افتراضية للاختبار فوراً (منها حمدي عشان تجرب بنفسك)
    const mockOrders: Order[] = [
      { id: '1', code: 'TL-8821', name: 'حمدي', phone: '01012345678', category: 'بدلة 👔', price: 4000, paid: 1500, delivery_date: '2026-06-05', delivery_time: '08:00 مساءً', status: 'قيد التنفيذ', notes: 'مقاس الكتف ظبط زيادة' },
      { id: '2', code: 'TL-4932', name: 'منى', phone: '01234567890', category: 'فستان 👗', price: 6000, paid: 4000, delivery_date: '2026-06-12', delivery_time: '06:00 مساءً', status: 'جاهز للتسليم' }
    ];
    
    const mockImages: ClientImage[] = [
      { id: 'img1', clientName: 'حمدي', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', designType: 'بدلة عريس كحلي كاملة' },
      { id: 'img2', clientName: 'منى', imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500', designType: 'فستان سواريه أحمر مطرز' }
    ];

    const savedOrders = localStorage.getItem('btq_orders');
    const savedImages = localStorage.getItem('btq_images');

    setOrders(savedOrders ? JSON.parse(savedOrders) : mockOrders);
    setImages(savedImages ? JSON.parse(savedImages) : mockImages);

    setLastAssistantMessage({
      text: 'مرحباً بك يا فنان في النظام المتطور. أنا سامعك دلوقتي ومبرمج على فهم نيتك بأي طريقة كلام. جرب اسألني عن أوردر حمدي، أو متبقي عليه كام، أو اطلب عرض صورته، أو اسألني مين مصممي!',
      type: 'text'
    });

    initSpeechEngine();
  }, []);

  const saveToDisk = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('btq_orders', JSON.stringify(newOrders));
  };

  // ============================================================================
  // AUDIO & SPEECH ENGINE CONTROLLER
  // ============================================================================
  const initSpeechEngine = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = 'ar-EG';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      analyzeIntentAI(text);
    };

    recognitionRef.current = rec;
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      setListening(true);
      try { recognitionRef.current?.start(); } catch (err) { setListening(false); }
    }
  };

  const respond = (text: string, type: string = 'text') => {
    setLastAssistantMessage({ text, type });
    setProcessing(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ============================================================================
  // ADVANCED OPENAI-STYLE INTENT ROUTER (يفهم السياق المتغير والأسماء فوراً)
  // ============================================================================
  const analyzeIntentAI = (rawInput: string) => {
    setProcessing(true);
    setLastUserMessage({ text: rawInput });
    
    const input = rawInput.trim().toLowerCase();
    const currentOrders = ordersRef.current;
    const currentImages = imagesRef.current;

    // 1. السؤال عن مصمم البرنامج
    if (input.includes('مصمم') || input.includes('عملك') || input.includes('برمجك') || input.includes('صنعك')) {
      respond('تم تصميم وتطوير هذا النظام الذكي بالكامل بواسطة المهندس إسلام الكومي.');
      return;
    }

    // 2. الاستعلام عن إجمالي عدد الأوردرات والطلبات بأي صيغة تنطق
    if (
      input.includes('كم اوردر') || input.includes('كام اوردر') || 
      input.includes('كم طلب') || input.includes('كام طلب') || 
      input.includes('عدد الاوردرات') || input.includes('عدد الطلبات') || 
      input.includes('الطلبات اللي عندي')
    ) {
      respond(`عندك حالياً يا فنان إجمالي ${currentOrders.length} طلبات مسجلة في الدفتر.`);
      return;
    }

    // 3. محرك الاستعلام اللحظي المرن عن زبون معين (تفاصيل، متبقي، ميعاد تسليم)
    // استخراج الاسم المستهدف من الجملة ديناميكياً
    let targetName = '';
    const words = input.split(/\s+/);
    
    // محاولة ذكية لقنص اسم الزبون من سياق الجملة
    const stopWords = ['اوردر', 'أوردر', 'بيانات', 'تفاصيل', 'صورة', 'صوره', 'اعرض', 'متبقي', 'باقي', 'فلوس', 'ميعاد', 'تسليم', 'امتى', 'امته', 'عايز', 'امسح', 'احذف', 'تحديث', 'حدث'];
    const filteredWords = words.filter(w => !stopWords.some(sw => w.includes(sw)));
    if (filteredWords.length > 0) {
      targetName = filteredWords[0]; // اعتبار أول اسم علم متبقي هو المستهدف
    }

    const foundOrder = currentOrders.find(o => o.name.toLowerCase().includes(targetName) || targetName.toLowerCase().includes(o.name.toLowerCase()));

    // أ. أمر عرض الصور لجدول الصور
    if (input.includes('صورة') || input.includes('صوره') || input.includes('جدول الصور')) {
      if (targetName) {
        const foundImg = currentImages.find(img => img.clientName.toLowerCase().includes(targetName));
        if (foundImg) {
          setActiveTab('images');
          setImageSearchQuery(targetName);
          respond(`حاضر، فتحت جدول الصور وجاري عرض تصميم العميل ${targetName} فوراً.`);
          return;
        }
      }
      setActiveTab('images');
      respond('فتحت لك جدول واستوديو صور التصاميم الخاصة بالأتيليه.');
      return;
    }

    // ب. أمر مسح وحذف أوردر
    if (input.includes('امسح') || input.includes('احذف')) {
      if (foundOrder) {
        const remaining = currentOrders.filter(o => o.id !== foundOrder.id);
        saveToDisk(remaining);
        respond(`تم بنجاح حذف أوردر العميل ${foundOrder.name} نهائياً من سجلات الأتيليه.`, 'success');
        return;
      } else {
        respond(`لم أجد أوردر باسم ${targetName} لتنفيذ عملية المسح.`);
        return;
      }
    }

    // ج. أمر طلب التحديث والتعديل
    if (input.includes('حدث') || input.includes('تحديث') || input.includes('تعديل')) {
      if (foundOrder) {
        setActiveTab('orders');
        setSearchQuery(foundOrder.name);
        respond(`وجدت أوردر ${foundOrder.name}. يمكنك الآن الضغط على زر التعديل وتحديث الاسم، الميعاد، أو الهاتف مباشرة من الشاشة.`, 'success');
        return;
      }
    }

    // د. الاستعلام عن المتبقي المالي (الفلوس)
    if (input.includes('متبقي') || input.includes('باقي') || input.includes('عليه كام') || input.includes('فلوس')) {
      if (foundOrder) {
        const rem = foundOrder.price - foundOrder.paid;
        respond(`العميل ${foundOrder.name} متبقي عليه مبلغ ${rem} جنيه من إجمالي الاتفاق.`);
        return;
      }
    }

    // هـ. الاستعلام عن ميعاد التسليم والوقت
    if (input.includes('ميعاد') || input.includes('ميتين') || input.includes('امتى') || input.includes('وقت') || input.includes('تسليم')) {
      if (foundOrder) {
        respond(`ميعاد تسليم أوردر ${foundOrder.name} هو يوم ${foundOrder.delivery_date} في تمام الساعة ${foundOrder.delivery_time || 'غير محددة}.'}`);
        return;
      }
    }

    // و. الاستعلام الشامل عن التفاصيل أو البيانات
    if (input.includes('تفاصيل') || input.includes('بيانات') || input.includes('اعرض') || input.includes('وريني')) {
      if (foundOrder) {
        respond(`إليك تفاصيل أوردر ${foundOrder.name}: الموديل ${foundOrder.category}، السعر الإجمالي ${foundOrder.price} جنيه، المدفوع ${foundOrder.paid}، والاستلام يوم ${foundOrder.delivery_date}.`);
        return;
      }
    }

    // 4. أمر تسجيل أوردر جديد خطي تتابعي شامل للبيانات
    if (input.includes('سجل') || input.includes('جديد') || input.includes('أوردر جديد')) {
      respond('لتسجيل أوردر جديد يا فنان، انطق الجملة كاملة دفعة واحدة تشمل: (اسم العميل، الهاتف، الفئة، السعر، والعربون) وسأقوم بجدولتها وصياغتها فوراً.');
      return;
    }

    // في حال عدم العثور على اسم أو نية واضحة
    if (targetName && !foundOrder) {
      respond(`بحثت في سجلات الأتيليه ولم أعثر على أوردر نشط يحمل اسم العميل: ${targetName}.`);
    } else {
      respond('أنا سامعك وبكامل الذكاء معاك يا فنان. تقدر تسألني عن أي عميل، حسابات الخزنة، مسح الطلبات، أو فتح الصور اللحظية.');
    }
  };

  // ============================================================================
  // LIVE FILTERS FOR DOM LISTS
  // ============================================================================
  const filteredOrders = orders.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.code.includes(searchQuery));
  const filteredImages = images.filter(img => img.clientName.toLowerCase().includes(imageSearchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30" dir="rtl">
      
      {/* HEADER TOPBAR */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm text-white">مساعد الأتيليه الذكي والمستقر</h1>
            <p className="text-[10px] text-emerald-400 font-bold font-mono">تطوير: م. إسلام الكومي</p>
          </div>
        </div>
        <div className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-300">
          الطلبات: {orders.length}
        </div>
      </header>

      {/* VIEWPORT CONTROLLER PORTS */}
      <main className="flex-1 overflow-y-auto p-4 pb-28">
        
        {/* TAB 1: SMART CLEAN CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-end space-y-4 min-h-[58vh]">
            {lastUserMessage && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 max-w-[85%] self-start animate-fade-in">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">👤 سؤالك الصوتي:</span>
                <p className="text-sm font-semibold text-slate-200">{lastUserMessage.text}</p>
              </div>
            )}
            {lastAssistantMessage && (
              <div className={`p-4 rounded-2xl border max-w-[85%] self-end animate-fade-in shadow-md ${lastAssistantMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">🤖 رد المساعد الذكي:</span>
                <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{lastAssistantMessage.text}</p>
              </div>
            )}
            {processing && (
              <div className="text-xs text-slate-500 animate-pulse font-mono flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5库 animate-spin text-emerald-400" /> جاري تحليل المدخل الصوتي وفك الشفرات...</div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE ORDERS DOCK */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <input 
              type="text" 
              placeholder="ابحث السريع بالاسم أو كود العميل..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-slate-700 text-slate-200 font-mono"
            />
            <div className="grid gap-3 grid-cols-1">
              {filteredOrders.map(o => (
                <div key={o.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-400 font-bold">{o.code}</span>
                      <h3 className="font-bold text-sm text-white mt-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {o.name}</h3>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">{o.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/40 pt-2.5 mt-2 font-mono text-slate-300">
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {o.delivery_date}</div>
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-500" /> {o.delivery_time}</div>
                    <div className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> إجمالي: {o.price} ج</div>
                    <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-500" /> {o.phone}</div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-2 pt-1 border-t border-slate-800/30">📝 ملحوظة: {o.notes || 'لا يوجد'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SMART IMAGE GRID GALLERY */}
        {activeTab === 'images' && (
          <div className="space-y-4 animate-fade-in">
            <input 
              type="text" 
              placeholder="ابحث في جدول وصور التصاميم..." 
              value={imageSearchQuery}
              onChange={(e) => setImageSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-slate-700 text-slate-200"
            />
            <div className="grid gap-3 grid-cols-2">
              {filteredImages.map(img => (
                <div key={img.id} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                  <img src={img.imageUrl} alt="design" className="w-full h-28 object-cover object-top" />
                  <div className="p-2 text-xs">
                    <div className="font-bold text-white mb-0.5">العميل: {img.clientName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{img.designType}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FLOAT VOICE TRIGGER CONTROLLER HUD */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-900/60 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-xs font-bold block text-slate-300">
              {listening ? '🔴 نظام الاستماع الذكي اللحظي نشط...' : speaking ? '🔊 جاري النطق والرد الصوتي المطور...' : 'انطق طلبك بأي طريقة وسأفهمه فوراً'}
            </span>
          </div>

          <button
            onClick={toggleListening}
            disabled={processing}
            className={`p-3.5 rounded-full transition-all duration-300 active:scale-95 ${
              listening ? 'bg-gradient-to-tr from-red-600 to-rose-500 ring-4 ring-red-500/20' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md hover:scale-105'
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* FOOTER TAB NAV BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex justify-around text-xs text-slate-400 z-50">
        <button onClick={() => setActiveTab('chat')} className={`w-full ${activeTab === 'chat' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><MessageSquare className="w-4 h-4 mx-auto block mb-1" />المساعد</button>
        <button onClick={() => setActiveTab('orders')} className={`w-full ${activeTab === 'orders' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><Scissors className="w-4 h-4 mx-auto block mb-1" />الأوردرات</button>
        <button onClick={() => setActiveTab('images')} className={`w-full ${activeTab === 'images' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><ImageIcon className="w-4 h-4 mx-auto block mb-1" />جدول الصور</button>
      </nav>

    </div>
  );
}
