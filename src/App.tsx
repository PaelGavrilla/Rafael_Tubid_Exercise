import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { AuthPage } from './components/AuthPage';
import { MainFeed } from './components/MainFeed';
import { SearchPage } from './components/SearchPage';
import { ProfilePage } from './components/ProfilePage';
import { getSupabaseClient } from './utils/supabase/client';

const supabase = getSupabaseClient();

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentPage, setCurrentPage] = useState<'feed' | 'search' | 'profile'>('feed');

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
    
    // Listen for auth state changes (token refresh, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          console.log('Updating token from auth state change');
          setAccessToken(session.access_token);
          setUserId(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setAccessToken(null);
        setUserId(null);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        setIsCheckingSession(false);
        return;
      }
      
      if (data.session) {
        setAccessToken(data.session.access_token);
        setUserId(data.session.user.id);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleAuthSuccess = (token: string, id: string) => {
    setAccessToken(token);
    setUserId(id);
    setCurrentPage('feed');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setUserId(null);
    setCurrentPage('feed');
  };

  const refreshAccessToken = async () => {
    try {
      console.log('Refreshing access token...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh token:', error);
        // If refresh fails, logout user
        handleLogout();
        return null;
      }
      
      if (data.session) {
        console.log('Token refreshed successfully');
        setAccessToken(data.session.access_token);
        setUserId(data.session.user.id);
        return data.session.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('Refresh token error:', error);
      handleLogout();
      return null;
    }
  };

  const handleNavigate = (page: 'feed' | 'search' | 'profile') => {
    setCurrentPage(page);
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!accessToken || !userId) {
    return (
      <>
        <AuthPage onAuthSuccess={handleAuthSuccess} />
        <Toaster />
      </>
    );
  }

  // Show main app
  return (
    <>
      <div className="size-full">
        <MainFeed
          accessToken={accessToken}
          userId={userId}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
        <SearchPage
          accessToken={accessToken}
          userId={userId}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
        <ProfilePage
          accessToken={accessToken}
          userId={userId}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
      </div>
      <Toaster />
    </>
  );
}