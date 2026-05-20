import { useEffect, useState } from 'react';
import { fetchOrderStats, fetchOrders } from '../lib/database';
import {
  ShoppingBag,
  Clock,
  Loader,
  CheckCircle2,
  Truck,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  ready: number;
  delivered: number;
  due_soon: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        fetchOrderStats(),
        fetchOrders(),
      ]);
      setStats(statsData);
      setRecentOrders(ordersData?.slice(0, 5) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { label: 'إجمالي الطلبات', value: stats.total, icon: ShoppingBag, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'قيد الانتظار', value: stats.pending, icon: Clock, color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'قيد التنفيذ', value: stats.in_progress, icon: Loader, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'جاهز', value: stats.ready, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'تم التسليم', value: stats.delivered, icon: Truck, color: 'from-gray-400 to-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    { label: 'مستحق قريباً', value: stats.due_soon, icon: AlertTriangle, color: 'from-red-500 to-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  ] : [];

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    ready: 'جاهز',
    delivered: 'تم التسليم',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-emerald-500/20 text-emerald-400',
    delivered: 'bg-gray-500/20 text-gray-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`${card.bg} ${card.border} border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
              <p className="text-gray-400 text-xs">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-[#12121a] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              أحدث الطلبات
            </h3>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد طلبات بعد</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{order.customer_name}</p>
                    <p className="text-gray-500 text-sm mt-1">
                      كود: <span className="text-amber-500 font-mono">{order.order_code}</span>
                      {order.delivery_date && (
                        <span className="mr-3 flex items-center gap-1 inline-flex">
                          <Calendar className="w-3 h-3" />
                          {order.delivery_date}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500 font-bold">{Number(order.price).toLocaleString()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Summary */}
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            ملخص سريع
          </h3>
          <div className="space-y-4">
            <div className="bg-[#1a1a2e] rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-amber-500">
                {recentOrders.reduce((sum: number, o: any) => sum + Number(o.price), 0).toLocaleString()}
                <span className="text-sm text-gray-400 mr-1">ر.س</span>
              </p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">نسبة الإنجاز</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${stats ? (stats.delivered / Math.max(stats.total, 1)) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-emerald-400 text-sm font-bold">
                  {stats ? Math.round((stats.delivered / Math.max(stats.total, 1)) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">طلبات نشطة</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats ? stats.pending + stats.in_progress + stats.ready : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
