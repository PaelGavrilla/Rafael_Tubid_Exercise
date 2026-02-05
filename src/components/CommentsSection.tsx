import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { postWithAuth } from '../utils/api';

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

interface CommentsSectionProps {
  postId: string;
  accessToken: string;
  onCommentAdded: () => void;
}

export function CommentsSection({ postId, accessToken, onCommentAdded }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${postId}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Komentar tidak boleh kosong');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Adding comment with auto-refresh token...');
      
      const response = await postWithAuth(`/posts/${postId}/comments`, { content: newComment });
      
      console.log('Add comment response status:', response.status);
      
      const data = await response.json();
      console.log('Add comment response data:', data);
      
      if (!response.ok) {
        console.error('Add comment failed:', data);
        throw new Error(data.error || 'Gagal menambahkan komentar');
      }
      
      setComments([...comments, data.comment]);
      setNewComment('');
      onCommentAdded();
      toast.success('Komentar berhasil ditambahkan!');
      
    } catch (error: any) {
      console.error('Add comment error:', error);
      toast.error(error.message || 'Gagal menambahkan komentar');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}j`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="mt-4 pt-4 border-t">
      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Tulis komentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isLoading || !newComment.trim()}>
            {isLoading ? 'Kirim...' : 'Kirim'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {isLoadingComments ? (
          <p className="text-sm text-gray-500 text-center py-2">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">Belum ada komentar</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user?.avatar} />
                <AvatarFallback className="bg-gray-400 text-white text-xs">
                  {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900">
                    {comment.user?.name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-gray-800 break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}