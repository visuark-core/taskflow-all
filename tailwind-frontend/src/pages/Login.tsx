import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
 
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <header className="py-4 px-6 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">TF</span>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-500">
              TaskFlow
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="hidden dark:inline-block w-5 h-5 text-gray-300" />
            <Moon className="inline-block dark:hidden w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-auth-pattern bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 to-accent-600/90 backdrop-blur-sm"></div>
          </div>
          <div className="relative h-full flex flex-col justify-center p-12 text-white">
            <div className="animate-float">
              <h2 className="text-4xl font-bold mb-6">Welcome to TaskFlow</h2>
              <p className="text-xl text-primary-100 mb-8">
                Your all-in-one solution for project management and team collaboration.
              </p>
              <div className="space-y-6">
                <div className="flex items-center space-x-4 bg-white/10 p-4 rounded-lg backdrop-blur-md">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <p className="text-lg">Streamline your workflow and boost productivity</p>
                </div>
                <div className="flex items-center space-x-4 bg-white/10 p-4 rounded-lg backdrop-blur-md">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="text-lg">Collaborate seamlessly with your team</p>
                </div>
                <div className="flex items-center space-x-4 bg-white/10 p-4 rounded-lg backdrop-blur-md">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-lg">Track progress with real-time analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-sm text-gray-600 dark:text-gray-400 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          &copy; 2025 TaskFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Login;