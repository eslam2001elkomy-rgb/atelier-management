import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';

import {
  User,
  login as authLogin,
  getCurrentUser,
  logout as authLogout
} from '../lib/auth';

interface AuthContextType {

  user: User | null;

  loading: boolean;

  login: (
    username: string,
    password: string
  ) => Promise<boolean>;

  logout: () => void;

  refreshUser: () => void;
}

const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  // تحميل المستخدم عند فتح الموقع
  useEffect(() => {

    try {

      const current =
        getCurrentUser();

      if (current) {
        setUser(current);
      }

    } catch (err) {

      console.error(
        'Auth Load Error:',
        err
      );

      localStorage.removeItem(
        'atelier_user'
      );
    }

    setLoading(false);

  }, []);

  // تسجيل الدخول
  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {

    try {

      const result =
        await authLogin(
          username,
          password
        );

      if (result) {

        setUser(result);

        return true;
      }

      return false;

    } catch (err) {

      console.error(
        'Login Context Error:',
        err
      );

      return false;
    }
  };

  // تسجيل الخروج
  const logout = () => {

    try {

      authLogout();

    } catch (err) {

      console.error(
        'Logout Error:',
        err
      );
    }

    setUser(null);
  };

  // تحديث بيانات المستخدم
  const refreshUser = () => {

    try {

      const current =
        getCurrentUser();

      setUser(current);

    } catch (err) {

      console.error(
        'Refresh User Error:',
        err
      );
    }
  };

  return (

    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser
      }}
    >

      {children}

    </AuthContext.Provider>
  );
}

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
