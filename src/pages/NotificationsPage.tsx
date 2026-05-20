import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/database';
import { Bell, CheckCheck, Clock, AlertTriangle, Info } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const typeBg = (type: string) => {
    switch (type) {
      case 'reminder': return 'border-amber-500/20 bg-amber-500/5';
      case 'warning': return 'border-red-500/20 bg-red-500/5';
      default: return 'border-blue-500/20 bg-blue-500/5';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-400 text-sm">{notifications.filter(n => !n.is_read).length} إشعار غير مقروء</h3>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 text-amber-500 text-sm hover:text-amber-400 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          قراءة الكل
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`border rounded-2xl p-4 transition-all cursor-pointer ${typeBg(n.type)} ${!n.is_read ? 'ring-1 ring-amber-500/20' : 'opacity-60'}`}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm">{n.title}</h4>
                  <p className="text-gray-400 text-sm mt-1">{n.message}</p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(n.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
