/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Eye, EyeOff, AlertTriangle, User, Lock } from 'lucide-react';
import { authApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { LoginRequestDto } from '@/types/api-types';

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Login - Avyaan Knitfab';
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loginData: LoginRequestDto = {
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      };

      const response = await authApi.login(loginData);
      console.log('Login response:', response);
      const loginResult = apiUtils.extractData(response);

      console.log('Login result:', loginResult);

      // Store auth data
      apiUtils.setAuthToken(loginResult.token);
      localStorage.setItem('auth_refresh_token', loginResult.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(loginResult.user));

      // Call context login if needed
      if (login) {
        await login(loginData);
      }

      toast.success('Login Successful', 'Welcome back! You have been successfully logged in.');
      navigate('/', { replace: true });
    } catch (err) {
      const errorMessage = apiUtils.handleError(err);
      setError(errorMessage);
      toast.error('Login Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-background p-4">
      {/* Theme Toggle - Top Right */}
      {/* <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div> */}

      <div className="w-full max-w-md space-y-6">
        {/* Login Form */}
        <Card className="login-card animate-fade-in-up">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <img
                src="/avyaanlogo.png"
                alt="Avyaan Knitfab Logo"
                className="h-20 w-auto border-2 logo-glow animate-grok-float"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground animate-grok-pulse font-display">
                  Avyaan Knitfab
                </h1>
              </div>
            </div>
            <div className="space-y-2">
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <Separator className="my-6" />
            <div className="text-center text-xs text-muted-foreground font-bold">
              <p>
                &copy; {new Date().getFullYear()} Aarkay Techno Consultants Pvt. Ltd. All rights
                reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
