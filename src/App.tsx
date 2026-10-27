import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GenerateCertificate = lazy(() => import("./pages/GenerateCertificate"));
const ValidateCertificate = lazy(() => import("./pages/ValidateCertificate"));
const Profile = lazy(() => import("./pages/Profile"));
const CertificateDetail = lazy(() => import("./pages/CertificateDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Smart Root route: renders Index for visitors, redirects to Dashboard for authenticated users
const RootRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cypher-primary"></div>
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cypher-primary" />
              </div>
            }
          >
            <Routes>
              {/* Landing & Public Routes */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<Login defaultTab="forgot" />} />

              {/* Public Validation - employers and verifiers do NOT need to log in */}
              <Route path="/validate" element={<ValidateCertificate />} />

              {/* Public Certificate Detail view */}
              <Route path="/certificate/:id" element={<CertificateDetail />} />

              {/* Authenticated Dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Role-Restricted Certificate Generation: Admin & Issuer only */}
              <Route path="/generate" element={
                <ProtectedRoute allowedRoles={['admin', 'issuer']}>
                  <GenerateCertificate />
                </ProtectedRoute>
              } />

              {/* Authenticated Profile */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Catch-all Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
