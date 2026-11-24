import { useState, useEffect } from 'react';

import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';

import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import AIAssistantPage from './pages/AIAssistantPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

import {
  fetchNotifications
} from './lib/database';

function AppContent() {

  const { user, loading, recovery } = useAuth();


  const [currentPage, setCurrentPage] =
    useState('dashboard');

  const [unreadCount, setUnreadCount] =
    useState(0);

  // تحميل الإشعارات
  useEffect(() => {

    if (!user) return;

    loadUnreadCount();

    const interval =
      setInterval(() => {

        loadUnreadCount();

      }, 15000);

    return () => clearInterval(interval);

  }, [user]);

  // تحديث عدد الإشعارات
  const loadUnreadCount = async () => {

    if (!user) return;

    try {

      const data =
        await fetchNotifications(user.id);

      const unread =
        data?.filter(
          (n: any) => !n.is_read
        ).length || 0;

      setUnreadCount(unread);

    } catch (err) {

      console.error(
        'Notification Error:',
        err
      );
    }
  };

  // شاشة التحميل
  if (loading) {

    return (

      <div
        className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"
        dir="rtl"
      >

        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />

      </div>
    );
  }

  // فتح رابط استعادة كلمة المرور من البريد
  if (recovery) return <ResetPasswordPage />;

  // لو المستخدم مش عامل تسجيل دخول
  if (!user) {

    return (
      <LoginPage />
    );
  }

  // التنقل بين الصفحات
  const renderPage = () => {

    switch (currentPage) {

      case 'dashboard':
        return <DashboardPage />;

      case 'orders':
        return <OrdersPage />;

      case 'customers':
        return <CustomersPage />;

      case 'ai-assistant':
        return <AIAssistantPage />;

      case 'notifications':
        return (
          <NotificationsPage />
        );

      case 'reports':
        return <ReportsPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return <DashboardPage />;
    }
  };

  return (

    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      unreadNotifications={unreadCount}
    >

      {renderPage()}

    </Layout>
  );
}

function App() {

  return (

    <AuthProvider>

      <InstallPrompt />
      <AppContent />

    </AuthProvider>
  );
}

export default App;
