import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { CommentsSection } from './CommentsSection';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { postWithAuth } from '../utils/api';

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

interface PostCardProps {
  post: Post;
  currentUserId: string;
  accessToken: string;
  onDelete: (postId: string) => void;
  onUpdate: (post: Post) => void;
}

export function PostCard({ post, currentUserId, accessToken, onDelete, onUpdate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [isLoadingLike, setIsLoadingLike] = useState(false);

  // Check if user already liked this post
  useEffect(() => {
    const checkLike = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${post.id}/like/check`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        const data = await response.json();
        setIsLiked(data.liked);
      } catch (error) {
        console.error('Check like error:', error);
      }
    };
    checkLike();
  }, [post.id, accessToken]);

  const handleLike = async () => {
    setIsLoadingLike(true);
    try {
      console.log('Liking post with auto-refresh token...');
      
      const response = await postWithAuth(`/posts/${post.id}/like`);
      
      console.log('Like response status:', response.status);
      
      const data = await response.json();
      console.log('Like response data:', data);
      
      if (!response.ok) {
        console.error('Like failed:', data);
        throw new Error(data.error || 'Gagal menyukai postingan');
      }
      
      setIsLiked(data.liked);
      setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      
      // Update parent
      onUpdate({
        ...post,
        likesCount: data.liked ? likesCount + 1 : likesCount - 1
      });
      
    } catch (error: any) {
      console.error('Like error:', error);
      
      // Check if it's a session error
      if (error.message && error.message.includes('login again')) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        // Will trigger auto-logout via auth state listener
      } else {
        toast.error(error.message || 'Gagal menyukai postingan');
      }
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleCommentAdded = () => {
    setCommentsCount(prev => prev + 1);
    onUpdate({
      ...post,
      commentsCount: commentsCount + 1
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}j`;
    if (diffDays < 7) return `${diffDays}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const isOwnPost = post.userId === currentUserId;

  return (
    <Card className="p-4 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.user?.avatar} />
          <AvatarFallback className="bg-blue-500 text-white">
            {post.user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-900">
                {post.user?.name || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(post.createdAt)}
              </p>
            </div>
            
            {isOwnPost && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(post.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          <p className="text-gray-800 mb-3 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Actions - Always visible for all posts */}
          <div className="flex gap-4 items-center border-t pt-3 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLoadingLike}
              className={`flex items-center gap-2 transition-all ${
                isLiked 
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{likesCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{commentsCount}</span>
            </Button>
            
            {!isOwnPost && (
              <span className="text-xs text-gray-400 ml-auto">
                💬 Klik untuk like & komentar
              </span>
            )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <CommentsSection
              postId={post.id}
              accessToken={accessToken}
              onCommentAdded={handleCommentAdded}
            />
          )}
        </div>
      </div>
    </Card>
  );
}