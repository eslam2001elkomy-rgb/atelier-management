import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Edit3, Trash2, X, Image as ImageIcon, Calendar, Clock, Filter, Eye, Upload, Copy, MessageCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ezdirycgbnkxxymmyagh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const fallbackClient = createClient(supabaseUrl, supabaseAnonKey);

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'ready', label: 'جاهز', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customer_name: '', phone: '', whatsapp: '', shoulders: '', waist: '', 
    price: '', deposit: '', delivery_date: '', delivery_time: '', status: 'pending', notes: '', image_url: ''
  });

  // حساب المتبقى تلقائياً
  const remaining = useMemo(() => {
    return (Number(form.price) || 0) - (Number(form.deposit) || 0);
  }, [form.price, form.deposit]);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const { data } = await fallbackClient.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, image_url: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // هنا منطق الحفظ الخاص بيك (تأكد من إضافة الأعمدة الجديدة في جدولك)
    await fallbackClient.from('orders').insert([{ ...form, order_code: Math.floor(1000000 + Math.random() * 9000000).toString() }]);
    setShowForm(false);
    loadOrders();
  };

  return (
    <div className="p-4 space-y-6 bg-[#0f0f12] text-white min-h-screen">
      
      {/* زر إضافة طلب جديد */}
      <button onClick={() => setShowForm(true)} className="w-full bg-gradient-to-l from-amber-500 to-amber-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg">
        <Plus /> طلب جديد
      </button>

      {/* قائمة الطلبات (مستطيلات) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order.id} className="bg-[#12121a] border border-gray-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">{order.customer_name}</h3>
              <button onClick={() => navigator.clipboard.writeText(order.order_code)} className="flex items-center gap-1 text-xs bg-gray-800 px-2 py-1 rounded">
                <Copy size={12} /> {order.order_code}
              </button>
            </div>
            
            {order.whatsapp && (
              <a href={`https://wa.me/2${order.whatsapp}`} target="_blank" className="flex items-center gap-2 text-green-500 text-sm mb-3">
                <MessageCircle size={16} /> واتساب العميل
              </a>
            )}

            <select className="bg-gray-800 w-full p-2 rounded text-sm mb-2" defaultValue={order.status}>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* النافذة المنبثقة (النموذج المقسم) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto flex items-center justify-center">
          <div className="bg-[#12121a] p-6 rounded-3xl w-full max-w-lg space-y-6 border border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">بيانات الطلب</h2>
              <button onClick={() => setShowForm(false)}><X /></button>
            </div>

            {/* 1. بيانات العميل */}
            <div className="space-y-2">
              <h3 className="text-amber-500 font-bold text-sm">بيانات العميل</h3>
              <input placeholder="الاسم" className="w-full bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, customer_name: e.target.value})} />
              <input placeholder="الهاتف" className="w-full bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, phone: e.target.value})} />
              <input placeholder="رقم الواتساب" className="w-full bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, whatsapp: e.target.value})} />
            </div>

            {/* 2. المقاسات */}
            <div className="space-y-2">
              <h3 className="text-amber-500 font-bold text-sm">المقاسات</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="الكتف" className="bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, shoulders: e.target.value})} />
                <input placeholder="الوسط" className="bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, waist: e.target.value})} />
              </div>
            </div>

            {/* 3. الحسابات */}
            <div className="space-y-2">
              <h3 className="text-amber-500 font-bold text-sm">الحسابات</h3>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="السعر" className="bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, price: e.target.value})} />
                <input type="number" placeholder="العربون" className="bg-gray-800 p-3 rounded-xl" onChange={e => setForm({...form, deposit: e.target.value})} />
              </div>
              <div className="bg-amber-500/10 p-4 rounded-xl text-center text-xl font-bold text-amber-500">
                المتبقى: {remaining} ج.م
              </div>
            </div>

            <button onClick={handleSubmit} className="w-full bg-amber-500 py-4 rounded-2xl font-bold text-black">حفظ الطلب</button>
          </div>
        </div>
      )}
    </div>
  );
}
