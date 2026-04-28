import { Navigate, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "./loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute: ", { isAuthenticated, isLoading });

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    // Redirect to login page
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader />;
  }

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

interface PermissionRouteProps {
  children: React.ReactNode;
  pageName: string;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({ children, pageName }) => {
  const { hasPermission, isAdmin } = useAuth();

  // Admins always have access
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Check if the user has view permission for this page
  if (!hasPermission(pageName, 'View')) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Unauthorized error to access this page based on the permission matrix.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
