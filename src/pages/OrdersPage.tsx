import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { Plus, Search, CreditCard as Edit3, Trash2, X, Upload, Image as ImageIcon, Calendar, Clock, Filter, Eye } from 'lucide-react';

// تم دمج مفاتيح الربط الحقيقية والخاصة بمشروعك مباشرة لحل مشكلة Invalid API key نهائياً
const supabaseUrl = "https://ezdirycgbnkxxymmyagh.supabase.co";
const supabaseAnonKey = "sb..publishable..Ajt92WZJfBoNKEn..."; // الكود الحقيقي الخاص بك والمستخرج من قائمة العميل

const fallbackClient = createClient(supabaseUrl, supabaseAnonKey);

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'ready', label: 'جاهز', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

interface OrderForm {
  customer_name: string;
  phone: string;
  delivery_date: string;
  delivery_time: string;
  price: string;
  notes: string;
  status: string;
}

const emptyForm: OrderForm = {
  customer_name: '',
  phone: '',
  delivery_date: '',
  delivery_time: '',
  price: '',
  notes: '',
  status: 'pending',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await fallbackClient
        .from('orders')
        .select(`*`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.includes(search) ||
      o.phone?.includes(search) ||
      o.order_code?.includes(search);
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await fallbackClient
          .from('orders')
          .update({
            customer_name: form.customer_name,
            phone: form.phone,
            delivery_date: form.delivery_date || null,
            delivery_time: form.delivery_time || null,
            price: parseFloat(form.price) || 0,
            notes: form.notes,
            status: form.status,
          })
          .eq('id', editingId);

        if (error) throw error;
        alert("تم تحديث الطلب بنجاح!");
      } else {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const code = `ORD-${Date.now().toString().slice(-4)}-${randomNum}`;

        const { error } = await fallbackClient
          .from('orders')
          .insert([{
            order_code: code,
            customer_name: form.customer_name,
            phone: form.phone,
            delivery_date: form.delivery_date || null,
            delivery_time: form.delivery_time || null,
            price: parseFloat(form.price) || 0,
            notes: form.notes,
            status: form.status,
          }]);

        if (error) throw error;
        alert("تم حفظ الأوردر بنجاح في قاعدة البيانات!");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      alert("عفواً، حدث خطأ أثناء الحفظ: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (order: any) => {
    setEditingId(order.id);
    setForm({
      customer_name: order.customer_name,
      phone: order.phone || '',
      delivery_date: order.delivery_date || '',
      delivery_time: order.delivery_time || '',
      price: order.price?.toString() || '',
      notes: order.notes || '',
      status: order.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const { error } = await fallbackClient.from('orders').delete().eq('id', id);
      if (error) throw error;
      await loadOrders();
      if (viewOrder?.id === id) setViewOrder(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const statusLabel = (s: string) => statusOptions.find(o => o.value === s)?.label || s;
  const statusColor = (s: string) => statusOptions.find(o => o.value === s)?.color || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو الكود..."
              className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#1a1a2e] border border-gray-700 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none min-w-[140px]"
            >
              <option value="">كل الحالات</option>
              {statusOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-semibold px-4 py-2.5 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          طلب جديد
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-[#12121a] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold truncate">{order.customer_name}</h3>
                  <p className="text-gray-500 text-sm mt-0.5 font-mono">{order.order_code}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs border ${statusColor(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-gray-400 mb-3">
                {order.phone && <p>{order.phone}</p>}
                {order.delivery_date && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {order.delivery_date}
                    {order.delivery_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{order.delivery_time}</span>}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-amber-500 font-bold">{order.price ? Number(order.price).toLocaleString() : 0} <span className="text-xs text-gray-500">ر.س</span></span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewOrder(order)} className="p-2 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(order)} className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingId ? 'تعديل الطلب' : 'طلب جديد'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">اسم العميل *</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  required
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">تاريخ التسليم</label>
                  <input
                    type="date"
                    value={form.delivery_date}
                    onChange={e => setForm({ ...form, delivery_date: e.target.value })}
                    className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">وقت التسليم</label>
                  <input
                    type="time"
                    value={form.delivery_time}
                    onChange={e => setForm({ ...form, delivery_time: e.target.value })}
                    className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">السعر</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                >
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-l from-amber-500 to-amber-600 text-black font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إنشاء'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewOrder(null)}>
          <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">تفاصيل الطلب</h2>
              <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">كود الطلب</p>
                  <p className="text-amber-500 font-mono font-bold">{viewOrder.order_code}</p>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">الحالة</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs border ${statusColor(viewOrder.status)}`}>
                    {statusLabel(viewOrder.status)}
                  </span>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">اسم العميل</p>
                  <p className="text-white">{viewOrder.customer_name}</p>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">الهاتف</p>
                  <p className="text-white" dir="ltr">{viewOrder.phone || '-'}</p>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">التسليم</p>
                  <p className="text-white text-sm">{viewOrder.delivery_date || '-'} {viewOrder.delivery_time || ''}</p>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">السعر</p>
                  <p className="text-amber-500 font-bold">{viewOrder.price ? Number(viewOrder.price).toLocaleString() : 0} ر.س</p>
                </div>
              </div>

              {viewOrder.notes && (
                <div className="bg-[#1a1a2e] rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">ملاحظات</p>
                  <p className="text-white text-sm">{viewOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
