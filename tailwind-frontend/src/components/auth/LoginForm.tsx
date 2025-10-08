import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/hook';
import { loginUser } from '../../features/auth/authSlice';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, error, user } = useAppSelector((state) => state.auth);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email) {
      setFormError('Email is required');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    try {
      await dispatch(loginUser({email,password}))
      navigate('/');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to login account');
    }
  };

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your credentials to access your account
        </p>
      </div>

      {formError && (
        <div className="p-3 bg-error-50 border border-error-200 text-error-800 dark:bg-error-900/30 dark:border-error-800 dark:text-error-400 rounded-lg animate-fade-in">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={18} className="text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              ) : (
                <Eye size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500
                border-gray-300 dark:border-gray-700 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>
          <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Forgot password?
          </a>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
          dark:bg-primary-700 dark:hover:bg-primary-600 transition duration-150 ease-in-out"
      >
        {isLoading ? (
          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        ) : (
          <LogIn size={18} className="mr-2" />
        )}
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}

export default LoginForm;
