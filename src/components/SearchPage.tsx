import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Search, UserPlus, UserCheck, Home, User, LogOut } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { CrowLogo } from './CrowLogo';
import { postWithAuth, getWithAuth } from '../utils/api';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
}

interface SearchPageProps {
  accessToken: string;
  userId: string;
  onLogout: () => void;
  onNavigate: (page: 'feed' | 'search' | 'profile') => void;
  currentPage: 'feed' | 'search' | 'profile';
}

export function SearchPage({ accessToken, userId, onLogout, onNavigate, currentPage }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingStatus, setFollowingStatus] = useState<{ [key: string]: boolean }>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error('Masukkan kata kunci pencarian');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/users/search/query?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mencari pengguna');
      }
      
      setSearchResults(data.users || []);
      
      // Check following status for each user
      for (const user of data.users || []) {
        if (user.id !== userId) {
          checkFollowStatus(user.id);
        }
      }
      
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Gagal mencari pengguna');
    } finally {
      setIsSearching(false);
    }
  };

  const checkFollowStatus = async (targetUserId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/follows/${targetUserId}/check`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: data.following }));
      }
    } catch (error) {
      console.error('Check follow status error:', error);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    try {
      const response = await postWithAuth(`/follows/${targetUserId}`, {});
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengikuti pengguna');
      }
      
      setFollowingStatus(prev => ({ ...prev, [targetUserId]: data.following }));
      toast.success(data.following ? 'Berhasil mengikuti' : 'Berhenti mengikuti');
      
    } catch (error: any) {
      console.error('Toggle follow error:', error);
      
      // Check if it's a session error
      if (error.message && error.message.includes('login again')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        toast.error(error.message || 'Gagal mengikuti pengguna');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ display: currentPage !== 'search' ? 'none' : 'block' }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CrowLogo size={32} className="text-gray-900" />
            Crow
          </h1>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Search Form */}
        <Card className="p-4 mb-6 shadow-md">
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isSearching}
                />
              </div>
              <Button type="submit" disabled={isSearching}>
                {isSearching ? 'Mencari...' : 'Cari'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Search Results */}
        <div className="space-y-3">
          {searchResults.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? 'Tidak ada hasil ditemukan' : 'Cari pengguna untuk diikuti'}
              </p>
            </Card>
          ) : (
            searchResults.map(user => (
              <Card key={user.id} className="p-4 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-blue-500 text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.bio && (
                        <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  {user.id !== userId && (
                    <Button
                      size="sm"
                      variant={followingStatus[user.id] ? "outline" : "default"}
                      onClick={() => handleToggleFollow(user.id)}
                    >
                      {followingStatus[user.id] ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Mengikuti
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Ikuti
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-around">
          <Button
            variant={currentPage === 'feed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('feed')}
          >
            <Home className="h-5 w-5 mr-2" />
            Beranda
          </Button>
          <Button
            variant={currentPage === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('search')}
          >
            <Search className="h-5 w-5 mr-2" />
            Cari
          </Button>
          <Button
            variant={currentPage === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('profile')}
          >
            <User className="h-5 w-5 mr-2" />
            Profil
          </Button>
        </div>
      </nav>
    </div>
  );
}