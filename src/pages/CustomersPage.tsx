import { useEffect, useState } from 'react';
import { fetchCustomers, deleteCustomer, fetchOrders } from '../lib/database';
import { Search, Trash2, Phone, ShoppingBag, User } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custData, orderData] = await Promise.all([fetchCustomers(), fetchOrders()]);
      setCustomers(custData || []);
      setOrders(orderData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      await deleteCustomer(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search)
  );

  const getOrderCount = (customerId: string) =>
    orders.filter(o => o.customer_id === customerId).length;

  const getTotalSpent = (customerId: string) =>
    orders.filter(o => o.customer_id === customerId).reduce((sum, o) => sum + Number(o.price), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-12 text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(customer => (
            <div
              key={customer.id}
              className="bg-[#12121a] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{customer.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{customer.name}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" />
                      {customer.phone || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>{getOrderCount(customer.id)} طلب</span>
                </div>
                <div className="text-amber-500 text-sm font-bold">
                  {getTotalSpent(customer.id).toLocaleString()} ر.س
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
