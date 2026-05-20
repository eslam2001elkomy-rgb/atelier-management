import { useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Bot,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Scissors,
  ChevronLeft,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  unreadNotifications: number;
}

const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'ai-assistant', label: 'المساعد الذكي', icon: Bot },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export default function Layout({ children, currentPage, onNavigate, unreadNotifications }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNav = (id: string) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 bg-[#0d0d14] border-l border-gray-800 transition-all duration-300 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-white font-bold text-lg whitespace-nowrap">إدارة الأتيليه</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {item.id === 'notifications' && unreadNotifications > 0 && (
                  <span className={`${sidebarCollapsed ? 'absolute -top-1 -left-1' : 'mr-auto'} bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center`}>
                    {unreadNotifications}
                  </span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:block p-3 border-t border-gray-800">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="text-sm">طي القائمة</span>}
          </button>
        </div>

        {/* User & Logout */}
        <div className="p-3 border-t border-gray-800">
          <div className={`flex items-center gap-3 mb-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase() || 'A'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.username || 'مدير'}</p>
                <p className="text-gray-500 text-xs">مدير</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300
          ${sidebarCollapsed ? 'lg:pr-20' : 'lg:pr-64'}
        `}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-white font-semibold text-lg">
            {navItems.find(i => i.id === currentPage)?.label || ''}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNav('notifications')}
              className="relative text-gray-400 hover:text-amber-500 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 pb-24">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0d0d14]/90 backdrop-blur-xl border-t border-gray-800 py-2 text-center z-20">
        <p className="text-gray-500 text-sm">تصميم وتنفيذ بواسطة: <span className="text-amber-500 font-medium">إسلام الكومي</span></p>
      </footer>
    </div>
  );
}
