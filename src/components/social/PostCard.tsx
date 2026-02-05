import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Heart, MessageCircle, Trash2, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface Post {
  id: string;
  userId: string;
  content: string;
  likes: string[];
  comments: string[];
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
  };
}

interface PostCardProps {
  post: Post;
  accessToken: string;
  currentUserId: string;
  onDelete: () => void;
  onComment: (post: Post) => void;
  onUserClick: (userId: string) => void;
}

export function PostCard({ post, accessToken, currentUserId, onDelete, onComment, onUserClick }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUserId));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${post.id}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal memproses like');
        return;
      }

      setIsLiked(data.isLiked);
      setLikesCount(data.likes);
      
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus post ini?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal menghapus post');
        setIsDeleting(false);
        return;
      }

      toast.success(data.message || 'Post berhasil dihapus');
      onDelete();
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}d`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}h`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => onUserClick(post.author.id)}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar>
                <AvatarFallback className="bg-blue-500 text-white">
                  {post.author.avatar ? (
                    <img src={post.author.avatar} alt={post.author.name} />
                  ) : (
                    getInitials(post.author.name)
                  )}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button 
                onClick={() => onUserClick(post.author.id)}
                className="hover:underline"
              >
                <p className="font-semibold text-gray-900">{post.author.name}</p>
                <p className="text-sm text-gray-500">@{post.author.username} · {formatDate(post.createdAt)}</p>
              </button>
            </div>
          </div>
          
          {post.userId === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-900 mb-4 whitespace-pre-wrap">{post.content}</p>
        
        <div className="flex items-center space-x-6 text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center space-x-2 ${isLiked ? 'text-red-500' : ''}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onComment(post)}
            className="flex items-center space-x-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments?.length || 0}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
