import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Загрузка…
      </div>
    );
  }
  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    const safe = redirect && redirect !== "/" ? redirect : "/app";
    return <Navigate to={`/auth?redirect=${encodeURIComponent(safe)}`} replace />;
  }
  return children;
};