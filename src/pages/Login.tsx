import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft, Shield, Building2, GraduationCap } from 'lucide-react';
import { UserType } from '@/types/user';

interface LoginProps {
  defaultTab?: 'login' | 'register' | 'forgot';
}

const Login: React.FC<LoginProps> = ({ defaultTab = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, resetPassword } = useAuth();
  const { toast } = useToast();

  const initialTab = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Register form state
  const [fullName, setFullName] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [registerUserType, setRegisterUserType] = useState<UserType>('recipient');

  // Forgot Password state
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isResetLoading, setIsResetLoading] = useState<boolean>(false);

  // Loading states
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab')!);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoginLoading(true);
      await login({ 
        email: loginEmail.trim(), 
        password: loginPassword,
        rememberMe 
      });
      navigate('/dashboard');
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsRegisterLoading(true);
      await register({
        email: registerEmail.trim(),
        password: registerPassword,
        fullName: fullName.trim(),
        userType: registerUserType,
      });
      navigate('/dashboard');
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your registered email address.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsResetLoading(true);
      await resetPassword(resetEmail.trim());
      setActiveTab('login');
    } catch {
      // Handled in AuthContext
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600 text-sm">
            Decentralized Certificate Authority & Verification System
          </p>
        </div>

        <Card className="glass shadow-xl border-white/40">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {activeTab !== 'forgot' && (
              <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100">
                <TabsTrigger value="login" className="font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="font-medium">Create Account</TabsTrigger>
              </TabsList>
            )}
            
            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to manage and verify your credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email Address</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="you@organization.com" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('forgot')}
                        className="text-xs text-cypher-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input 
                        id="login-password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none cursor-pointer text-gray-600"
                    >
                      Remember me on this browser
                    </label>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-gradient hover:opacity-95 text-white"
                    disabled={isLoginLoading}
                  >
                    {isLoginLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Signing in...
                      </span>
                    ) : 'Sign In'}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    Want to verify a certificate without logging in?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/validate')}
                      className="text-cypher-primary hover:underline font-semibold"
                    >
                      Public Validator
                    </button>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
            
            {/* REGISTER TAB */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Create an account</CardTitle>
                  <CardDescription>
                    Select your role and get started with Cypher
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Role Selector with Visual Tiles */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Account Role</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegisterUserType('recipient')}
                        className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                          registerUserType === 'recipient'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                        }`}
                      >
                        <GraduationCap className="h-5 w-5 mb-1 text-indigo-600" />
                        <span className="text-xs">Student</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setRegisterUserType('issuer')}
                        className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                          registerUserType === 'issuer'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                        }`}
                      >
                        <Building2 className="h-5 w-5 mb-1 text-blue-600" />
                        <span className="text-xs">Issuer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegisterUserType('admin')}
                        className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                          registerUserType === 'admin'
                            ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-semibold shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                        }`}
                      >
                        <Shield className="h-5 w-5 mb-1 text-purple-600" />
                        <span className="text-xs">Admin</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {registerUserType === 'recipient' && 'Can receive, download, and share awarded certificates.'}
                      {registerUserType === 'issuer' && 'Can issue blockchain certificates on behalf of an institution.'}
                      {registerUserType === 'admin' && 'Full administrative authority and smart contract privileges.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input 
                      id="full-name" 
                      placeholder="Jane Doe" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email Address</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input 
                        id="register-password" 
                        type="password"
                        placeholder="••••••••" 
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm</Label>
                      <Input 
                        id="confirm-password" 
                        type="password"
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-gradient text-white hover:opacity-95"
                    disabled={isRegisterLoading}
                  >
                    {isRegisterLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Creating Account...
                      </span>
                    ) : 'Complete Registration'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* FORGOT PASSWORD TAB */}
            <TabsContent value="forgot">
              <form onSubmit={handleResetPassword}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('login')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <CardTitle className="text-xl">Reset Password</CardTitle>
                  </div>
                  <CardDescription>
                    Enter your account email and we will send a password reset link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input 
                      id="reset-email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-gradient text-white"
                    disabled={isResetLoading}
                  >
                    {isResetLoading ? 'Sending link...' : 'Send Reset Link'}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setActiveTab('login')}
                  >
                    Back to Sign In
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
