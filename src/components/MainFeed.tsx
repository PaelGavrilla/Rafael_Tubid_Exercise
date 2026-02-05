import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Home, Search, User, LogOut, PlusCircle, RefreshCw } from 'lucide-react';
import { PostCard } from './PostCard';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { postWithAuth, deleteWithAuth } from '../utils/api';
import { CrowLogo } from './CrowLogo';

interface Post {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  likesCount: number;
  commentsCount: number;
}

interface MainFeedProps {
  accessToken: string;
  userId: string;
  onLogout: () => void;
  onNavigate: (page: 'feed' | 'search' | 'profile') => void;
  currentPage: 'feed' | 'search' | 'profile';
}

export function MainFeed({ accessToken, userId, onLogout, onNavigate, currentPage }: MainFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [hasSeeded, setHasSeeded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Seed random Indonesian users
  const seedUsers = async () => {
    if (hasSeeded) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/seed-users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      if (response.ok) {
        setHasSeeded(true);
      }
    } catch (error) {
      console.error('Seed users error:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat postingan');
      }
      
      setPosts(data.posts || []);
    } catch (error: any) {
      console.error('Fetch posts error:', error);
      toast.error('Gagal memuat postingan');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Handle scroll to bottom - auto refresh
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 200;
    
    if (isAtBottom && !isLoadingPosts && posts.length > 0) {
      // Refresh and scroll to top
      toast.info('Memuat ulang postingan...');
      setIsLoadingPosts(true);
      fetchPosts().then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [isLoadingPosts, posts.length]);

  useEffect(() => {
    if (currentPage === 'feed') {
      seedUsers();
      fetchPosts();
    }
  }, [currentPage]);

  // Add scroll listener
  useEffect(() => {
    if (currentPage === 'feed') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage, handleScroll]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.trim()) {
      toast.error('Postingan tidak boleh kosong');
      return;
    }
    
    if (newPost.length > 280) {
      toast.error('Postingan maksimal 280 karakter');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Creating post with auto-refresh token...');
      
      const response = await postWithAuth('/posts', { content: newPost });
      
      console.log('Create post response status:', response.status);
      
      const data = await response.json();
      console.log('Create post response data:', data);
      
      if (!response.ok) {
        console.error('Create post failed:', data);
        throw new Error(data.error || 'Gagal membuat postingan');
      }
      
      toast.success(data.message || 'Postingan berhasil dibuat!');
      setNewPost('');
      setPosts([data.post, ...posts]);
      
    } catch (error: any) {
      console.error('Create post error:', error);
      
      // Check if it's a session error
      if (error.message && error.message.includes('login again')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        // Will trigger auto-logout via auth state listener
      } else {
        toast.error(error.message || 'Gagal membuat postingan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Yakin ingin menghapus postingan ini?')) {
      return;
    }
    
    try {
      const response = await deleteWithAuth(`/posts/${postId}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus postingan');
      }
      
      toast.success(data.message || 'Postingan berhasil dihapus!');
      setPosts(posts.filter(p => p.id !== postId));
      
    } catch (error: any) {
      console.error('Delete post error:', error);
      toast.error(error.message || 'Gagal menghapus postingan');
    }
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  if (currentPage !== 'feed') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={feedRef}>
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
        {/* Create Post */}
        <Card className="p-4 mb-6 shadow-md">
          <form onSubmit={handleCreatePost}>
            <Textarea
              placeholder="Apa yang sedang terjadi?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="mb-3 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {newPost.length}/280
              </span>
              <Button type="submit" disabled={isLoading || !newPost.trim()}>
                {isLoading ? 'Memposting...' : 'Post'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          {isLoadingPosts ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Memuat postingan...</p>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Belum ada postingan. Buat postingan pertama!</p>
            </Card>
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={userId}
                  accessToken={accessToken}
                  onDelete={handleDeletePost}
                  onUpdate={handlePostUpdate}
                />
              ))}
              <Card className="p-4 text-center bg-gray-100 border-dashed">
                <p className="text-sm text-gray-500">
                  ⬇️ Scroll ke bawah untuk refresh feed
                </p>
              </Card>
            </>
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
            onClick={() => onNavigate('profile')} className="font-bold"
          >
            <User className="h-5 w-5 mr-2" />
            Profil
          </Button>
        </div>
      </nav>
    </div>
  );
}