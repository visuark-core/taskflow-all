import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings,
  Trello,
  Shield,
  Wallet,
  Cpu,
  Megaphone,
  Building2,
  Network,
  Handshake,
  Receipt
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSelector } from 'react-redux';

interface SidebarProps {
  closeSidebar: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Clients', href: '/clients', icon: Handshake },
  { name: 'Billing', href: '/billing', icon: Receipt },
  { name: 'Salary', href: '/salary', icon: Wallet },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Kanban Board', href: '/kanban', icon: Trello },
  { name: 'Company Tree', href: '/company-tree', icon: Network },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'User Management', href: '/user-management', icon: Users },
  { name: 'Departments', href: '/departments', icon: Building2 },
];


export default function Sidebar({ closeSidebar }: SidebarProps) {
  const location = useLocation();
  const user = useSelector((state: any) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const isCeo = user?.role === 'ceo';
  const isManager = ['manager', 'department_manager'].includes(user?.role);

  const allowedAdminNav = adminNavigation.filter(item => {
    if (item.href === '/departments') {
      return isAdmin || isCeo;
    }
    if (item.href === '/user-management') {
      return isAdmin;
    }
    return false;
  });
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-2">
        <Link to="/" className="flex items-center gap-2" onClick={closeSidebar}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TaskFlow</span>
        </Link>
      </div>
      
      <nav className="mt-8 flex-1 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
              onClick={closeSidebar}
            >
              <item.icon className={cn(
                'h-5 w-5',
                isActive 
                  ? 'text-primary-700 dark:text-primary-400' 
                  : 'text-gray-500 dark:text-gray-400'
              )} />
              {item.name}
            </Link>
          );
        })}
        



        {/* Admin/Management Section */}
        {allowedAdminNav.length > 0 && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Management
            </div>
            {allowedAdminNav.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                  onClick={closeSidebar}
                >
                  <item.icon className={cn(
                    'h-5 w-5',
                    isActive 
                      ? 'text-primary-700 dark:text-primary-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      
      <div className="mt-auto px-4 py-6">
        <div className="rounded-lg bg-primary-50 p-4 dark:bg-gray-700/50">
          <h3 className="mb-2 text-sm font-medium text-primary-800 dark:text-primary-300">Powered by Visuark</h3>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Check our documentation or contact support for assistance.
          </p>
          <button className="mt-3 w-full rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600">
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
}