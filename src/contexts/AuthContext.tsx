import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserType } from '../types/user';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getUserProfile, 
  resetPassword as sendResetEmail,
  updateUserProfile as updateProfileService,
  AuthCredentials,
  getCachedUserType,
} from '../services/authService';
import { useToast } from '@/hooks/use-toast';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'fullName' | 'userType'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const loadUserProfile = async (uid: string, fallbackEmail = '', fallbackName = '') => {
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        setUser(profile);
        return;
      }
    } catch (e) {
      console.warn('Could not load Firestore user profile:', e);
    }

    const cachedType = getCachedUserType(uid, fallbackEmail) || 'recipient';
    setUser({
      id: uid,
      email: fallbackEmail,
      fullName: fallbackName,
      userType: cachedType,
      certificates: []
    });
  };

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserProfile(
          firebaseUser.uid, 
          firebaseUser.email || '', 
          firebaseUser.displayName || ''
        );
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: AuthCredentials) => {
    try {
      setIsLoading(true);
      const loggedInUser = await loginUser(credentials);
      setUser(loggedInUser);
      toast({
        title: 'Login Successful',
        description: `Welcome back${loggedInUser.fullName ? ', ' + loggedInUser.fullName : ''}!`,
      });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: AuthCredentials) => {
    try {
      setIsLoading(true);
      const registeredUser = await registerUser(credentials);
      setUser(registeredUser);
      toast({
        title: 'Registration Successful',
        description: 'Your account has been created. Welcome to Cypher!',
      });
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendResetEmail(email);
      toast({
        title: 'Password Reset Email Sent',
        description: `Check your inbox at ${email} for instructions to reset your password.`,
      });
    } catch (error) {
      toast({
        title: 'Reset Request Failed',
        description: error instanceof Error ? error.message : 'Could not send reset email',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateProfile = async (data: Partial<Pick<User, 'fullName' | 'userType'>>) => {
    if (!user) return;
    try {
      await updateProfileService(user.id, data);
      setUser((prev) => prev ? { ...prev, ...data } : null);
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Could not update profile',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const refreshUser = async () => {
    if (auth?.currentUser) {
      await loadUserProfile(auth.currentUser.uid, auth.currentUser.email || '', auth.currentUser.displayName || '');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, resetPassword, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
