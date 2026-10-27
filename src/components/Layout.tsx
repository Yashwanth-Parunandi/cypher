import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { Award, CheckCircle, User, LogOut, Menu, X, LayoutDashboard, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Build role-aware routes
  const routes = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      visible: Boolean(user),
    },
    {
      name: 'Generate Certificate',
      path: '/generate',
      icon: <Award className="h-5 w-5" />,
      // Only Admin and Issuer can generate certificates
      visible: user?.userType === 'admin' || user?.userType === 'issuer',
    },
    {
      name: 'Validate Certificate',
      path: '/validate',
      icon: <CheckCircle className="h-5 w-5" />,
      visible: true,
    },
  ].filter((r) => r.visible);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'issuer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link to={user ? "/dashboard" : "/"} className="flex-shrink-0">
                <Logo asLink={false} />
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-4">
              {routes.map((route) => (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === route.path
                      ? 'text-cypher-primary bg-blue-50 font-semibold'
                      : 'text-gray-600 hover:text-cypher-primary hover:bg-blue-50'
                  }`}
                >
                  <span className="mr-2">{route.icon}</span>
                  <span>{route.name}</span>
                </Link>
              ))}
            </nav>

            {/* User menu or Login button */}
            <div className="flex items-center space-x-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative flex items-center gap-2 h-9 px-2 rounded-full hover:bg-slate-100">
                      <Avatar className="h-8 w-8 border border-gray-200">
                        <AvatarFallback className="bg-blue-gradient text-white text-xs font-semibold">
                          {getInitials(user.fullName || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
                        {user.fullName || user.email.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1.5 p-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold leading-none">{user.fullName || 'User'}</p>
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getRoleBadgeVariant(user.userType)}`}>
                            {user.userType}
                          </Badge>
                        </div>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                  <Button size="sm" className="bg-blue-gradient text-white" onClick={() => navigate('/login?tab=register')}>
                    Get Started
                  </Button>
                </div>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden ml-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-3 pt-2 pb-3 space-y-1 sm:px-3">
              {routes.map((route) => (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === route.path
                      ? 'text-cypher-primary bg-blue-50'
                      : 'text-gray-600 hover:text-cypher-primary hover:bg-blue-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-3">{route.icon}</span>
                  <span>{route.name}</span>
                </Link>
              ))}

              {user ? (
                <>
                  <div
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-cypher-primary hover:bg-blue-50 cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <User className="mr-3 h-5 w-5" />
                    <span>My Profile</span>
                  </div>
                  <div
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span>Log out</span>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                  <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-xs text-gray-500">Decentralized Certificate Authority</span>
            </div>
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Cypher. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
