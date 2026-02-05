import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { PostCard } from './PostCard';
import { putWithAuth } from '../../utils/api';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  followers?: string[];
  following?: string[];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  accessToken: string;
  currentUserId: string;
  isOwnProfile: boolean;
}

export function ProfileModal({ isOpen, onClose, userId, accessToken, currentUserId, isOwnProfile }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
      loadUserPosts();
    }
  }, [isOpen, userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setProfile(data);
        setEditName(data.name);
        setEditBio(data.bio || '');
        setEditAvatar(data.avatar || '');
        setIsFollowing(data.followers?.includes(currentUserId) || false);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/posts/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Load user posts error:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await putWithAuth(
        `/user/profile`,
        {
          name: editName,
          bio: editBio,
          avatar: editAvatar,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal update profile');
        setIsLoading(false);
        return;
      }

      toast.success('Profile berhasil diupdate!');
      setIsEditing(false);
      loadProfile();
      
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/users/${userId}/follow`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal memproses follow');
        setFollowLoading(false);
        return;
      }

      setIsFollowing(data.isFollowing);
      toast.success(data.message);
      loadProfile();
      
    } catch (error) {
      console.error('Follow error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setFollowLoading(false);
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

  if (!profile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Memuat profile...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-blue-500 text-white text-2xl">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} />
                  ) : (
                    getInitials(profile.name)
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-gray-500">@{profile.username}</p>
                <p className="text-sm text-gray-600 mt-2">{profile.bio || 'Belum ada bio'}</p>
              </div>
            </div>
            
            {isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Batal Edit' : 'Edit Profile'}
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                disabled={followLoading}
                variant={isFollowing ? 'outline' : 'default'}
              >
                {followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex space-x-6 py-4 border-y">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.postsCount}</p>
              <p className="text-sm text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.followersCount}</p>
              <p className="text-sm text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.followingCount}</p>
              <p className="text-sm text-gray-500">Following</p>
            </div>
          </div>

          {/* Edit Form or Posts */}
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan tentang dirimu..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">Avatar URL (opsional)</Label>
                <Input
                  id="edit-avatar"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </form>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">Posts</h3>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Belum ada post</div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      accessToken={accessToken}
                      currentUserId={currentUserId}
                      onDelete={loadUserPosts}
                      onComment={() => {}}
                      onUserClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}