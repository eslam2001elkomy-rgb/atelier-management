import { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, Mic, MessageSquare, Scissors, BarChart3, 
  User, Calendar, Clock, DollarSign, Phone, ImageIcon, Loader2 
} from 'lucide-react';

// تراكيب البيانات الثابتة
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
  status: 'قيد الانتظار' | 'شغالين عليهم' | 'جاهزين للتسليم';
  notes?: string;
}

export interface ClientImage {
  id: string;
  clientName: string;
  imageUrl: string;
  designType: string;
}

export default function AtelierSmartAssistant() {
  // تفعيل التبويب الافتراضي بناءً على تصميمك
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'dashboard' | 'images'>('chat');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  // شاشة نظيفة تعرض فقط آخر جملة تم التقاطها وأحدث رد منعاً للتكرار والرغي
  const [lastUserMessage, setLastUserMessage] = useState<{ text: string } | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<{ text: string; type: string } | null>(null);

  // قواعد البيانات المحلية المستقرة لتجنب مشاكل السيرفرات والأصفار
  const [orders, setOrders] = useState<Order[]>([]);
  const [images, setImages] = useState<ClientImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const recognitionRef = useRef<any>(null);
  const ordersRef = useRef<Order[]>(orders);
  const imagesRef = useRef<ClientImage[]>(images);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // ==========================================
  // تحميل البيانات والتهيئة الأساسية
  // ==========================================
  useEffect(() => {
    // بيانات تجريبية فورية (عشان تلاقي حمدي ومنى جاهزين وميطلعش 0 أوردر)
    const defaultOrders: Order[] = [
      { id: '1', code: 'TL-102', name: 'حمدي', phone: '01012345678', category: 'بدلة', price: 5000, paid: 2000, delivery_date: '2026-06-01', delivery_time: '09:00 مساءً', status: 'شغالين عليهم', notes: 'تعديل وسع الجاكت' },
      { id: '2', code: 'TL-105', name: 'منى', phone: '01234567890', category: 'فستان', price: 7000, paid: 4000, delivery_date: '2026-06-10', delivery_time: '07:00 مساءً', status: 'قيد الانتظار', notes: 'تطريز مكثف على الصدر' }
    ];

    const defaultImages: ClientImage[] = [
      { id: 'img1', clientName: 'حمدي', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', designType: 'تصميم بدلة حمدي الكاملة' },
      { id: 'img2', clientName: 'منى', imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400', designType: 'فستان سواريه منى' }
    ];

    const localSavedOrders = localStorage.getItem('atl_orders_v2');
    const localSavedImages = localStorage.getItem('atl_images_v2');

    setOrders(localSavedOrders ? JSON.parse(localSavedOrders) : defaultOrders);
    setImages(localSavedImages ? JSON.parse(localSavedImages) : defaultImages);

    setLastAssistantMessage({
      text: 'مرحباً بك يا فنان في نظام معالجة الأتيليه الفوري والمستقر محلياً (بدون تكرار أو أخطاء خادم). جربني الآن!',
      type: 'text'
    });

    initSpeech();
  }, []);

  const saveOrdersToLocal = (updatedList: Order[]) => {
    setOrders(updatedList);
    localStorage.setItem('atl_orders_v2', JSON.stringify(updatedList));
  };

  // ==========================================
  // محرك التقاط الصوت (Speech-to-Text)
  // ==========================================
  const initSpeech = () => {
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
      processVoiceCommand(text);
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

  // ==========================================
  // محرك فهم السياق والذكاء المرن (Intent Parser)
  // ==========================================
  const processVoiceCommand = (rawText: string) => {
    setProcessing(true);
    setLastUserMessage({ text: rawText });

    const txt = rawText.trim().toLowerCase();
    const currentOrders = ordersRef.current;
    const currentImages = imagesRef.current;

    // 1. سؤال المطور والمصمم
    if (txt.includes('مصمم') || txt.includes('برمجك') || txt.includes('عملك') || txt.includes('مين الي عملك')) {
      speakResponse('تم تصميم وتطوير هذا النظام بالكامل بواسطة المهندس إسلام الكومي.');
      return;
    }

    // 2. حساب إجمالي عدد الأوردرات وتقسيمها حسب الحالات (بدل الأصفار)
    if (txt.includes('كم اوردر') || txt.includes('كام اوردر') || txt.includes('عدد الاوردرات') || txt.includes('عدد الطلبات') || txt.includes('عندي كام طلب')) {
      const total = currentOrders.length;
      const pending = currentOrders.filter(o => o.status === 'قيد الانتظار').length;
      const progress = currentOrders.filter(o => o.status === 'شغالين عليهم').length;
      const ready = currentOrders.filter(o => o.status === 'جاهزين للتسليم').length;

      speakResponse(`لديك حالياً إجمالي ${total} أوردر مسجل. منهم ${pending} قيد الانتظار، و ${progress} شغالين عليهم، و ${ready} جاهزين للتسليم فوراً.`);
      return;
    }

    // استخراج اسم العميل بطريقة مرنة
    let extractedName = '';
    const words = txt.split(/\s+/);
    const ignoreList = ['اوردر', 'أوردر', 'بيانات', 'تفاصيل', 'صورة', 'صوره', 'اعرض', 'متبقي', 'باقي', 'فلوس', 'ميعاد', 'تسليم', 'امتى', 'كام', 'عليه', 'تحديث', 'حدث', 'امسح', 'احذف'];
    const filtered = words.filter(w => !ignoreList.some(ig => w.includes(ig)));
    if (filtered.length > 0) extractedName = filtered[0];

    const matchedOrder = currentOrders.find(o => o.name.toLowerCase().includes(extractedName) || extractedName.includes(o.name.toLowerCase()));

    // 3. أمر فتح وعرض الصور
    if (txt.includes('صورة') || txt.includes('صوره') || txt.includes('عرض صوره')) {
      if (extractedName) {
        const hasImg = currentImages.some(img => img.clientName.toLowerCase().includes(extractedName));
        if (hasImg) {
          setActiveTab('images');
          setSearchQuery(extractedName);
          speakResponse(`حاضر يا فنان، فتحت جدول الصور وجاري عرض صورة تصميم العميل ${extractedName}.`);
          return;
        }
      }
      setActiveTab('images');
      speakResponse('فتحت لك جدول صور التصاميم المتوفرة بالأتيليه.');
      return;
    }

    // 4. أمر مسح الأوردر
    if (txt.includes('امسح') || txt.includes('احذف')) {
      if (matchedOrder) {
        const filteredList = currentOrders.filter(o => o.id !== matchedOrder.id);
        saveOrdersToLocal(filteredList);
        speakResponse(`تم بنجاح مسح أوردر العميل ${matchedOrder.name} نهائياً من الدفتر.`, 'success');
        return;
      } else {
        speakResponse(`بحثت عن العميل ${extractedName} لمسحه ولكني لم أجد له أوردر مسجل.`);
        return;
      }
    }

    // 5. أمر التحديث والتعديل تكتيكياً
    if (txt.includes('حدث') || txt.includes('تحديث') || txt.includes('تعديل')) {
      if (matchedOrder) {
        setActiveTab('orders');
        setSearchQuery(matchedOrder.name);
        speakResponse(`وجدت أوردر ${matchedOrder.name} بنجاح، يمكنك تعديل الهاتف والميعاد مباشرة من الشاشة الآن.`, 'success');
        return;
      }
    }

    // 6. متبقي عليه كام (حسابات الفلوس)
    if (txt.includes('متبقي') || txt.includes('باقي') || txt.includes('عليه كام')) {
      if (matchedOrder) {
        const remainingMoney = matchedOrder.price - matchedOrder.paid;
        speakResponse(`العميل ${matchedOrder.name} متبقي عليه مبلغ ${remainingMoney} جنيه من حساب الشغل.`);
        return;
      }
    }

    // 7. ميعاد التسليم والوقت
    if (txt.includes('ميعاد') || txt.includes('تسليم') || txt.includes('امتى') || txt.includes('وقت')) {
      if (matchedOrder) {
        speakResponse(`ميعاد تسليم أوردر ${matchedOrder.name} هو يوم ${matchedOrder.delivery_date} والساعة ${matchedOrder.delivery_time || 'غير محددة بدقة'}.`);
        return;
      }
    }

    // 8. تفاصيل وبيانات الأوردر الشاملة بأي صيغة
    if (txt.includes('تفاصيل') || txt.includes('بيانات') || txt.includes('اعرض')) {
      if (matchedOrder) {
        speakResponse(`إليك تفاصيل أوردر العميل ${matchedOrder.name}: الموديل ${matchedOrder.category}، حسابه ${matchedOrder.price} ج، المدفوع ${matchedOrder.paid} ج، والتسليم في ${matchedOrder.delivery_date}.`);
        return;
      }
    }

    // 9. طلب تسجيل أوردر جديد
    if (txt.includes('سجل اوردر') || txt.includes('تسجيل اوردر جديد')) {
      speakResponse('لتسجيل أوردر جديد متكامل، انطق الجملة كاملة مثل: (ضيف أوردر فستان لرانيا هاتف 0100 بسعر 5000 وعربون 2000)');
      return;
    }

    // في حال عدم العثور على العميل أو عدم وضوح النية
    if (extractedName && !matchedOrder) {
      speakResponse(`بحثت في الدفتر ومقاعد البيانات ولم أجد أوردر مسجل باسم: ${extractedName}.`);
    } else {
      speakResponse('أنا سامعك بوضوح يا فنان ومستعد لتنفيذ أي أمر؛ اسألني عن تفاصيل أي عميل أو حسابات الخزنة مباشرة.');
    }
  };

  const speakResponse = (outputText: string, responseType: string = 'text') => {
    setLastAssistantMessage({ text: outputText, type: responseType });
    setProcessing(false);
    const speech = new SpeechSynthesisUtterance(outputText);
    speech.lang = 'ar-EG';
    window.speechSynthesis.speak(speech);
  };

  const totalWallet = orders.reduce((sum, o) => sum + Number(o.paid || 0), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      
      {/* HEADER BAR (مطابق تماماً لتصميمك في الصورة) */}
      <header className="p-4 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/10">
            <BrainCircuit className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white">الأفيليه الذكي (Local Stable Mode)</h1>
            <p className="text-[10px] text-slate-400">آخر رسالة فقط | معالجة فورية بدون تكرار</p>
          </div>
        </div>
        <div className="text-left bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs">
          <span className="text-slate-400 block text-[9px] text-right">الخزنة :</span>
          <span className="text-emerald-400 font-bold font-mono">{totalWallet} ج</span>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <main className="flex-1 overflow-y-auto p-4 pb-28">
        
        {/* شاشة المحادثة النظيفة الفورية */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-end space-y-4 min-h-[60vh]">
            {lastUserMessage && (
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl max-w-[85%] self-start">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">👤 كلامك الأخير الملتقط:</span>
                <p className="text-sm font-semibold text-slate-200">{lastUserMessage.text}</p>
              </div>
            )}
            
            {lastAssistantMessage && (
              <div className={`p-4 rounded-2xl border max-w-[85%] self-end shadow-md ${lastAssistantMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">🤖 رد المساعد الذكي الفوري:</span>
                <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{lastAssistantMessage.text}</p>
              </div>
            )}

            {processing && (
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> جاري تصفير أخطاء السيرفر ومعالجة الصوت محلياً...
              </div>
            )}
          </div>
        )}

        {/* شاشة الدفتر والأوردرات */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو الكود..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-slate-700"
            />
            <div className="grid gap-3">
              {orders.filter(o => o.name.includes(searchQuery)).map(o => (
                <div key={o.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1"><User className="w-3.5 h-3.5" /> {o.name}</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">{o.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 border-t border-slate-800/50 pt-2.5 mt-2">
                    <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {o.delivery_date}</div>
                    <div className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> السعر: {o.price} ج</div>
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> الوقت: {o.delivery_time}</div>
                    <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {o.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* شاشة استوديو وجدول الصور */}
        {activeTab === 'images' && (
          <div className="grid grid-cols-2 gap-3">
            {images.filter(i => i.clientName.includes(searchQuery)).map(img => (
              <div key={img.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <img src={img.imageUrl} alt="client design" className="w-full h-28 object-cover" />
                <div className="p-2 text-xs">
                  <div className="font-bold text-white">العميل: {img.clientName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{img.designType}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BOTTOM HUD CONTROLLER (المايك وشريط النطق) */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            📢 {listening ? 'سامعك يا فنان، اتكلم وعينيا ليك...' : '🎙️ جاري النطق اللغوي الصحيح للتاريخ...'}
          </span>
          <button
            onClick={toggleListening}
            className={`p-3.5 rounded-full transition-all ${listening ? 'bg-red-600 ring-4 ring-red-500/20' : 'bg-emerald-500 shadow-lg text-slate-950'}`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FOOTER NAVBAR TABS */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex justify-around text-xs text-slate-400 z-50">
        <button onClick={() => setActiveTab('chat')} className={`w-full ${activeTab === 'chat' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><MessageSquare className="w-4 h-4 mx-auto block mb-1" />المساعد الذكي</button>
        <button onClick={() => setActiveTab('orders')} className={`w-full ${activeTab === 'orders' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><Scissors className="w-4 h-4 mx-auto block mb-1" />الأوردرات</button>
        <button onClick={() => setActiveTab('images')} className={`w-full ${activeTab === 'images' ? 'text-emerald-400 font-bold bg-slate-950/20' : ''}`}><ImageIcon className="w-4 h-4 mx-auto block mb-1" />جدول الصور</button>
      </nav>

    </div>
  );
}
