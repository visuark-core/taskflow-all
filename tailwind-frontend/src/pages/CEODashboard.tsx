import { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Building2, 
  CheckSquare, 
  TrendingUp, 
  PieChart, 
  Activity as ActivityIcon,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

interface DashboardData {
  counts: {
    users: number;
    departments: number;
    projects: number;
    tasks: number;
  };
  projectStats: {
    planning: number;
    active: number;
    completed: number;
    onHold: number;
  };
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
  };
  departmentBreakdown: Array<{
    id: string;
    name: string;
    manager: string;
    memberCount: number;
    teamCount: number;
    status: string;
  }>;
  recentActivities: any[];
}

export default function CEODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${base}/reports/ceo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch CEO statistics');
        }
      } catch (err) {
        setError('Network error white fetching statistics');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchStats();
  }, [token, base]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-800">
        <p className="font-bold">Error loading dashboard</p>
        <p>{error}</p>
      </div>
    );
  }

  const projectChartData = [
    { name: 'Active', value: data.projectStats.active, color: '#10B981' },
    { name: 'Completed', value: data.projectStats.completed, color: '#3B82F6' },
    { name: 'Planning', value: data.projectStats.planning, color: '#F59E0B' },
    { name: 'On Hold', value: data.projectStats.onHold, color: '#6B7280' },
  ];

  const taskStatsData = [
    { name: 'Todo', count: data.taskStats.todo },
    { name: 'In Progress', count: data.taskStats.inProgress },
    { name: 'Review', count: data.taskStats.review },
    { name: 'Done', count: data.taskStats.done },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back, {user?.name}. Here is an overview of your entire organization.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Personnel" 
          value={data.counts.users} 
          icon={<Users className="h-6 w-6 text-blue-600" />} 
          trend="+12% from last month"
          color="blue"
        />
        <StatCard 
          title="Active Projects" 
          value={data.counts.projects} 
          icon={<Briefcase className="h-6 w-6 text-green-600" />} 
          trend={data.projectStats.active + " currently active"}
          color="green"
        />
        <StatCard 
          title="Departments" 
          value={data.counts.departments} 
          icon={<Building2 className="h-6 w-6 text-purple-600" />} 
          trend="Functional units"
          color="purple"
        />
        <StatCard 
          title="Total Tasks" 
          value={data.counts.tasks} 
          icon={<CheckSquare className="h-6 w-6 text-orange-600" />} 
          trend={data.taskStats.overdue + " overdue tasks"}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Project Health Chart */}
        <div className="card lg:col-span-2">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" />
              Company Performance
            </h3>
          </div>
          <div className="p-6">
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskStatsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Project Status Pie */}
        <div className="card lg:col-span-1">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
             <h3 className="font-bold flex items-center gap-2">
              <PieChart size={18} className="text-primary-600" />
              Portfolio Mix
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={projectChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
               {projectChartData.map((item) => (
                 <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <span className="h-3 w-3 rounded-full" style={{backgroundColor: item.color}}></span>
                       <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Department Pulse */}
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
             <h3 className="font-bold flex items-center gap-2">
              <Building2 size={18} className="text-primary-600" />
              Department Pulse
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
               {data.departmentBreakdown.map(dept => (
                 <div key={dept.id} className="group relative flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800">
                    <div className="flex flex-col">
                       <h4 className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-wider">{dept.name}</h4>
                       <p className="text-sm text-gray-500">Manager: {dept.manager}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-xs font-medium text-gray-400 uppercase">Personnel</p>
                          <p className="font-bold">{dept.memberCount}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-medium text-gray-400 uppercase">Teams</p>
                          <p className="font-bold">{dept.teamCount}</p>
                       </div>
                       <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Global Activity Feed */}
        <div className="card">
           <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
             <h3 className="font-bold flex items-center gap-2">
              <ActivityIcon size={18} className="text-primary-600" />
              Organizational Timeline
            </h3>
          </div>
          <div className="p-6">
             <div className="flow-root">
                <ul role="list" className="-mb-8">
                   {data.recentActivities.slice(0, 8).map((activity, idx) => (
                      <li key={activity._id}>
                         <div className="relative pb-8">
                            {idx !== 7 && (
                               <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                            )}
                            <div className="relative flex space-x-3">
                               <div>
                                  {activity.user?.avatar ? (
                                     <img src={activity.user.avatar} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white dark:ring-gray-900" />
                                  ) : (
                                     <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 ring-8 ring-white dark:ring-gray-900">
                                        <ActivityIcon size={14} />
                                     </span>
                                  )}
                               </div>
                               <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                  <div>
                                     <p className="text-sm text-gray-500 dark:text-gray-400">
                                        <span className="font-bold text-gray-900 dark:text-white">{activity.user?.name}</span>{' '}
                                        {activity.description}{' '}
                                        <span className="font-medium text-gray-900 dark:text-white">{activity.project?.name}</span>
                                     </p>
                                  </div>
                                  <div className="whitespace-nowrap text-right text-xs text-gray-400 font-medium">
                                     <Clock size={12} className="inline mr-1" />
                                     {new Date(activity.createdAt).toLocaleDateString()}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    green: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800',
    orange: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800',
  };

  return (
    <div className="card flex flex-col p-6 transition-transform hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
           <TrendingUp size={14} className="text-green-500" />
           {trend}
        </p>
      </div>
    </div>
  );
}
