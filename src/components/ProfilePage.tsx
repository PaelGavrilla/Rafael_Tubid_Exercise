import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Home, Search, User, LogOut, Edit2, Save, X } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { CrowLogo } from './CrowLogo';
import { putWithAuth } from '../utils/api';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatar: string;
  createdAt: string;
}

interface ProfilePageProps {
  accessToken: string;
  userId: string;
  onLogout: () => void;
  onNavigate: (page: 'feed' | 'search' | 'profile') => void;
  currentPage: 'feed' | 'search' | 'profile';
}

export function ProfilePage({ accessToken, userId, onLogout, onNavigate, currentPage }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (currentPage === 'profile') {
      fetchProfile();
    }
  }, [currentPage, userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat profil');
      }
      
      setProfile(data.user);
      setEditName(data.user.name);
      setEditBio(data.user.bio || '');
      setEditAvatar(data.user.avatar || '');
      setFollowersCount(data.stats.followers);
      setFollowingCount(data.stats.following);
      
    } catch (error: any) {
      console.error('Fetch profile error:', error);
      toast.error(error.message || 'Gagal memuat profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await putWithAuth(`/users/${userId}`, {
        name: editName,
        bio: editBio,
        avatar: editAvatar
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil');
      }
      
      setProfile(data.user);
      setIsEditing(false);
      toast.success('Profil berhasil diperbarui!');
      
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      // Check if it's a session error
      if (error.message && error.message.includes('login again')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        // Will trigger auto-logout via auth state listener
      } else {
        toast.error(error.message || 'Gagal memperbarui profil');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditName(profile.name);
      setEditBio(profile.bio || '');
      setEditAvatar(profile.avatar || '');
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ display: currentPage !== 'profile' ? 'none' : 'block' }}>
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
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Memuat profil...</p>
          </Card>
        ) : profile ? (
          <Card className="shadow-lg">
            {/* Cover */}
            <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            
            {/* Profile Info */}
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="flex justify-between items-start -mt-16 mb-4">
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                  <AvatarImage src={editAvatar} />
                  <AvatarFallback className="bg-blue-500 text-white text-4xl">
                    {editName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="mt-16"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profil
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-16">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Batal
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Details */}
              {!isEditing ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-gray-500">{profile.email}</p>
                  </div>
                  
                  {profile.bio && (
                    <p className="text-gray-700">{profile.bio}</p>
                  )}
                  
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="font-bold text-gray-900">{followingCount}</span>
                      <span className="text-gray-500 ml-1">Mengikuti</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">{followersCount}</span>
                      <span className="text-gray-500 ml-1">Pengikut</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Bergabung {formatDate(profile.createdAt)}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Nama
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama lengkap"
                      disabled={isSaving}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Bio
                    </label>
                    <Textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Ceritakan tentang diri Anda..."
                      rows={3}
                      disabled={isSaving}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      URL Avatar (opsional)
                    </label>
                    <Input
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Masukkan URL gambar untuk foto profil
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Profil tidak ditemukan</p>
          </Card>
        )}
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