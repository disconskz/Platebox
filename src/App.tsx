import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import AuthPage from "./pages/Auth.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Calculator from "./pages/Calculator.tsx";
import References from "./pages/References.tsx";
import CalculationView from "./pages/CalculationView.tsx";
import Quote from "./pages/Quote.tsx";
import Analytics from "./pages/Analytics.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Загрузка…
      </div>
    );
  }
  return user ? <Navigate to="/app" replace /> : <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
            <Route path="/references" element={<ProtectedRoute><References /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/calculation/:id" element={<ProtectedRoute><CalculationView /></ProtectedRoute>} />
            <Route path="/calculation/:id/quote" element={<ProtectedRoute><Quote /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
