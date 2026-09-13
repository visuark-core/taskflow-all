import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PartyPopper, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { useAppSelector } from '../hooks/hook';

function Welcome() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    sessionStorage.removeItem('tf_signed_up');
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <header className="py-4 px-6 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">TF</span>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-500">
              TaskFlow
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center shadow-lg mb-6 animate-float">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Congratulations!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your company is all set up and you're signed in.
            </p>

            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {user?.company?.replace(/-/g, ' ') || 'Your company'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                dark:bg-primary-700 dark:hover:bg-primary-600 transition duration-150 ease-in-out"
            >
              Go to my dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Redirecting to your dashboard in {countdown > 0 ? countdown : 0}s
            </p>

            <Link
              to="/login"
              className="mt-2 inline-block text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Sign out and use a different account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Welcome;