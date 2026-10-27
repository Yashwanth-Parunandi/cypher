
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { Award, CheckCircle, LogIn, User } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Redirect to dashboard if already logged in
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Logo size="md" />
        <Button
          variant="outline"
          onClick={() => navigate('/login')}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          <span>Login</span>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text leading-tight">
              Secure Certificate Generation & Validation
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Cypher uses blockchain technology to create tamper-proof digital certificates
              that can be easily verified and shared globally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="bg-blue-gradient hover:opacity-90 text-lg py-6"
                onClick={() => navigate('/login')}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                className="text-lg py-6"
                onClick={() => navigate('/login')}
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl animate-fade-in bg-white p-6 border border-slate-200 flex items-center justify-center">
            <img
              src="/cypher.png"
              alt="Cypher Certificate"
              className="w-full max-h-[380px] object-contain rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-6 animate-slide-in">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-cypher-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Certificate Generation</h3>
              <p className="text-gray-600">
                Create secure, blockchain-backed certificates with custom fields, styling, and
                validation.
              </p>
            </div>
            <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-cypher-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Certificate Validation</h3>
              <p className="text-gray-600">
                Quickly validate certificates by checking their blockchain records and verifying
                issuer signatures.
              </p>
            </div>
            <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '0.4s' }}>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-cypher-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">User Management</h3>
              <p className="text-gray-600">
                Manage your certificates, profile, and settings from a centralized dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden shadow-xl">
            <img
              src="/lovable-uploads/28cd3ce1-5070-4d70-8524-8268203b2ae9.png"
              alt="Blockchain Technology"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-text">
              About Cypher
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Cypher uses blockchain technology to issue and verify digital certificates, ensuring
              tamper-proof credential validation and management.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Tamper-proof certificates stored on the blockchain</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Instant verification through IPFS hash checks</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Public and private credential management</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-cypher-primary to-cypher-secondary py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join the future of secure certificate issuance and verification today.
          </p>
          <Button
            className="bg-white text-cypher-primary hover:bg-white/90 text-lg py-6 px-10"
            onClick={() => navigate('/login')}
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Logo size="md" />
              <p className="text-gray-500 mt-2">
                A digital certificate generation and validation app
              </p>
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

export default Index;
