import { ReactNode, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Bell, Search, Plus, UserCircle, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface NavbarProps {
  children?: ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
    const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {children}
          
          <div className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                type="search"
                placeholder="Search..."
                className="h-9 w-[200px] rounded-md border border-gray-300 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:placeholder:text-gray-400 lg:w-[280px]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/tasks/new"
            className="hidden items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:flex"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Link>

          <div className="relative">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (showUserMenu) setShowUserMenu(false);
              }}
            >
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500"></span>
              <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
                <div className="p-3 border-b dark:border-gray-700">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 hover:bg-gray-50 dark:hover:bg-gray-700",
                        i === 1 && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      <div className="flex gap-3">
                        <Avatar name="User" size="sm" />
                        <div className="flex-1">
                          <p className="text-sm"><span className="font-medium">Taylor Swift</span> commented on <span className="font-medium">Homepage redesign</span></p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t dark:border-gray-700">
                  <Link 
                    to="/notifications"
                    className="block w-full rounded-md p-2 text-center text-xs font-medium text-primary-600 hover:bg-gray-50 dark:text-primary-400 dark:hover:bg-gray-700"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border-r h-6 mx-1 border-gray-300 dark:border-gray-600" />

          <ThemeToggle />

          <div className="relative">
            <button
              className="flex items-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                if (showNotifications) setShowNotifications(false);
              }}
            >
              {user ? (
                <Avatar name={user.name} />
              ) : (
                <Avatar name="" />
              )}
            </button>
            {showUserMenu && user && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
                <div className="p-1">
                  <div className="border-b pb-2 pt-1 px-4 dark:border-gray-700">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { icon: UserCircle, label: 'Profile', href: '/profile' },
                      { icon: Settings, label: 'Settings', href: '/settings' },
                      { icon: HelpCircle, label: 'Help', href: '/help' },
                    ].map((item, i) => (
                      <Link
                        key={i}
                        to={item.href}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <item.icon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t py-1 dark:border-gray-700">
                    <button 
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        navigate('/login');
                        window.location.reload();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}