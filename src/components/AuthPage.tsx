import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { CrowLogo } from './CrowLogo';

const supabase = getSupabaseClient();

interface AuthPageProps {
  onAuthSuccess: (accessToken: string, userId: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerName.trim()) {
      toast.error('Nama harus diisi');
      return;
    }
    
    if (!registerEmail.trim()) {
      toast.error('Email harus diisi');
      return;
    }
    
    if (registerPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call server to create user
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b017b546/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            email: registerEmail,
            password: registerPassword,
            name: registerName
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }
      
      toast.success('Registrasi berhasil! Silakan login.');
      
      // Clear form
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterName('');
      
      // Auto switch to login tab
      document.querySelector('[value="login"]')?.dispatchEvent(new Event('click', { bubbles: true }));
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registrasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim()) {
      toast.error('Email harus diisi');
      return;
    }
    
    if (!loginPassword) {
      toast.error('Password harus diisi');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) throw error;
      
      if (data.session) {
        toast.success('Login berhasil!');
        onAuthSuccess(data.session.access_token, data.user.id);
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <CrowLogo size={40} className="text-gray-900" />
            <span className="text-gray-900">Crow</span>
          </CardTitle>
          <CardDescription className="text-center">
            Platform sosial media untuk berbagi dan terhubung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Memproses...' : 'Login'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nama</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Nama lengkap"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Memproses...' : 'Daftar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}