import { Navigate, useLocation } from 'react-router-dom';
 
import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContexlt';
import { useAppSelector } from '../../hooks/hook';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  // const { isAuthenticated, isLoading } = useAuth();
  const { isAuthenticated, isLoading} = useAppSelector((state) => state.auth);
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary-500"></div>
          <div className="mt-4 text-primary-600 dark:text-primary-400">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render the protected content if authenticated
  return <>{children}</>;
}

export default ProtectedRoute;