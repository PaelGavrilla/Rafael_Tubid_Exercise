import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface CreatePostProps {
  accessToken: string;
  onPostCreated: () => void;
}

export function CreatePost({ accessToken, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Konten post tidak boleh kosong');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal membuat post');
        setIsLoading(false);
        return;
      }

      toast.success(data.message || 'Post berhasil dibuat!');
      setContent('');
      onPostCreated();
      
    } catch (error) {
      console.error('Create post error:', error);
      toast.error('Terjadi kesalahan saat membuat post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Apa yang sedang kamu pikirkan?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={280}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {content.length}/280 karakter
            </span>
            <Button type="submit" disabled={isLoading || !content.trim()}>
              {isLoading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
