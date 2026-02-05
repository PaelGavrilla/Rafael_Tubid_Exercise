import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface SearchUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar: string;
  followersCount: number;
}

interface SearchPageProps {
  accessToken: string;
  onUserClick: (userId: string) => void;
}

export function SearchPage({ accessToken, onUserClick }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Masukkan kata kunci pencarian');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal mencari user');
        setIsLoading(false);
        return;
      }

      setUsers(data.users || []);
      
      if (data.users.length === 0) {
        toast.info('Tidak ada user yang ditemukan');
      }
      
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Terjadi kesalahan saat mencari');
    } finally {
      setIsLoading(false);
    }
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-6 w-6" />
            <span>Cari User</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              type="text"
              placeholder="Cari berdasarkan nama atau username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Mencari...' : 'Cari'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {users.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Hasil Pencarian ({users.length})</h2>
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          getInitials(user.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {user.followersCount} followers
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onUserClick(user.id)}
                    variant="outline"
                  >
                    Lihat Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
