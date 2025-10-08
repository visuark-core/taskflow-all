import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-7xl font-bold text-primary-600 dark:text-primary-400">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
      >
        <Home className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}