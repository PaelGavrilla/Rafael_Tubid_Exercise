import React from 'react';
import { Button } from '../ui/button';
import { Twitter, Home, Search, User, LogOut, PenSquare } from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onLogout: () => void;
  onNavigate: (page: 'home' | 'search' | 'profile') => void;
  currentPage: string;
  onCreatePost: () => void;
}

export function Navbar({ currentUser, onLogout, onNavigate, currentPage, onCreatePost }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500 p-2 rounded-full">
                <Twitter className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SocialApp</span>
            </div>
            
            <div className="hidden md:flex space-x-4">
              <Button
                variant={currentPage === 'home' ? 'default' : 'ghost'}
                onClick={() => onNavigate('home')}
                className="flex items-center space-x-2"
              >
                <Home className="h-5 w-5" />
                <span>Beranda</span>
              </Button>
              
              <Button
                variant={currentPage === 'search' ? 'default' : 'ghost'}
                onClick={() => onNavigate('search')}
                className="flex items-center space-x-2"
              >
                <Search className="h-5 w-5" />
                <span>Cari</span>
              </Button>
              
              <Button
                variant={currentPage === 'profile' ? 'default' : 'ghost'}
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-2"
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={onCreatePost}
              className="flex items-center space-x-2"
            >
              <PenSquare className="h-5 w-5" />
              <span className="hidden sm:inline">Post Baru</span>
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                <p className="text-xs text-gray-500">@{currentUser?.username}</p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden flex justify-around pb-2">
          <Button
            variant={currentPage === 'home' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('home')}
          >
            <Home className="h-5 w-5" />
          </Button>
          
          <Button
            variant={currentPage === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('search')}
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Button
            variant={currentPage === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('profile')}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
