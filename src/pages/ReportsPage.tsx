import { useEffect, useState } from 'react';
import { fetchOrders } from '../lib/database';
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (period === 'all') return true;
    const d = new Date(o.created_at);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return period === 'week' ? days <= 7 : days <= 30;
  });

  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.price), 0);
  const avgPrice = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
  const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
  const pending = filteredOrders.filter(o => o.status === 'pending').length;

  const statusBreakdown = [
    { label: 'قيد الانتظار', count: filteredOrders.filter(o => o.status === 'pending').length, color: 'bg-yellow-500' },
    { label: 'قيد التنفيذ', count: filteredOrders.filter(o => o.status === 'in_progress').length, color: 'bg-blue-500' },
    { label: 'جاهز', count: filteredOrders.filter(o => o.status === 'ready').length, color: 'bg-emerald-500' },
    { label: 'تم التسليم', count: filteredOrders.filter(o => o.status === 'delivered').length, color: 'bg-gray-500' },
  ];

  const maxCount = Math.max(...statusBreakdown.map(s => s.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        {(['week', 'month', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              period === p
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'bg-[#1a1a2e] text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            {p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : 'الكل'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            <span className="text-gray-400 text-sm">إجمالي الإيرادات</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()} <span className="text-sm text-gray-500">ر.س</span></p>
        </div>
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">متوسط السعر</span>
          </div>
          <p className="text-2xl font-bold text-white">{avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-gray-500">ر.س</span></p>
        </div>
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span className="text-gray-400 text-sm">تم التسليم</span>
          </div>
          <p className="text-2xl font-bold text-white">{delivered}</p>
        </div>
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">قيد الانتظار</span>
          </div>
          <p className="text-2xl font-bold text-white">{pending}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          توزيع الحالات
        </h3>
        <div className="space-y-4">
          {statusBreakdown.map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 text-sm">{s.label}</span>
                <span className="text-white font-bold">{s.count}</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${s.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
