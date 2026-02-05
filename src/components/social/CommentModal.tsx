import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
  };
}

interface Post {
  id: string;
  content: string;
  author: {
    name: string;
    username: string;
  };
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  accessToken: string;
}

export function CommentModal({ isOpen, onClose, post, accessToken }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
    }
  }, [isOpen, post]);

  const loadComments = async () => {
    if (!post) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${post.id}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !post) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/${post.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content: newComment }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal menambah komentar');
        setIsSubmitting(false);
        return;
      }

      toast.success('Komentar berhasil ditambahkan!');
      setNewComment('');
      loadComments();
      
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Komentar</DialogTitle>
        </DialogHeader>
        
        <div className="border-b pb-4 mb-4">
          <p className="font-semibold">{post.author.name}</p>
          <p className="text-sm text-gray-500 mb-2">@{post.author.username}</p>
          <p className="text-gray-900">{post.content}</p>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <Textarea
            placeholder="Tulis komentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none mb-2"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? 'Mengirim...' : 'Kirim'}
            </Button>
          </div>
        </form>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Memuat komentar...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Belum ada komentar</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3 border-b pb-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {comment.author.avatar ? (
                        <img src={comment.author.avatar} alt={comment.author.name} />
                      ) : (
                        getInitials(comment.author.name)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-sm">{comment.author.name}</p>
                      <p className="text-xs text-gray-500">@{comment.author.username}</p>
                      <p className="text-xs text-gray-400">· {formatDate(comment.createdAt)}</p>
                    </div>
                    <p className="text-gray-900 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
