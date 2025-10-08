import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Remove signup from destructuring below
// import { useDispatch } from 'react-redux';
 
import { useAppDispatch } from '../../hooks/hook';
import { registerUser } from '../../features/auth/authSlice';

function SignupForm() {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const { isLoading } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!name) {
      setFormError('Name is required');
      return false;
    }
    if (!company) {
      setFormError('Company name is required');
      return false;
    }
    if (!email) {
      setFormError('Email is required');
      return false;
    }
    if (!password) {
      setFormError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) {
      return;
    }
    try {
      await dispatch(registerUser({ name, email, password, company, role: 'admin', department: 'management' }));
      navigate('/');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create an account
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sign up to start using TaskFlow
        </p>
      </div>

      {formError && (
        <div className="p-3 bg-error-50 border border-error-200 text-error-800 dark:bg-error-900/30 dark:border-error-800 dark:text-error-400 rounded-lg animate-fade-in">
          {formError}
        </div>
      )}

  <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Company name
          </label>
          <div className="relative">
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your Company Name"
              className="block w-full pl-3 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

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

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500
              border-gray-300 dark:border-gray-700 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            I agree to the <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">Terms of Service</a> and <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">Privacy Policy</a>
          </label>
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
          <UserPlus size={18} className="mr-2" />
        )}
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

export default SignupForm;