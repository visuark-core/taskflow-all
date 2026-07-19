import { useState, useEffect } from 'react';
import { 
  Cpu, 
  Code, 
  Database, 
  Terminal, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layout,
  Gauge
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
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface DashboardData {
  workforce: {
    developers: number;
    testers: number;
    designers: number;
    totalTech: number;
  };
  taskStatus: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  priorities: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  topTechnicalProjects: Array<{
    id: string;
    name: string;
    progress: number;
    status: string;
    owner: string;
  }>;
  totalTasks: number;
}

export default function CTODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${base}/reports/cto`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch technical statistics');
        }
      } catch (err) {
        setError('Network error while fetching statistics');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchStats();
  }, [token, base]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-indigo-50 p-8 text-center text-indigo-800 border-2 border-indigo-100 shadow-sm">
        <Cpu className="mx-auto h-12 w-12 text-indigo-400 mb-4" />
        <p className="font-bold text-xl mb-2">Technical Dashboard Unavailable</p>
        <p className="text-indigo-600">{error}</p>
      </div>
    );
  }

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E'];
  const STATUS_COLORS: any = {
    todo: '#94A3B8',
    'inProgress': '#6366F1',
    review: '#F59E0B',
    done: '#10B981'
  };

  const statusData = [
    { name: 'To Do', value: data.taskStatus.todo, color: STATUS_COLORS.todo },
    { name: 'In Progress', value: data.taskStatus.inProgress, color: STATUS_COLORS.inProgress },
    { name: 'In Review', value: data.taskStatus.review, color: STATUS_COLORS.review },
    { name: 'Completed', value: data.taskStatus.done, color: STATUS_COLORS.done },
  ];

  const priorityData = [
    { name: 'Urgent', value: data.priorities.urgent },
    { name: 'High', value: data.priorities.high },
    { name: 'Medium', value: data.priorities.medium },
    { name: 'Low', value: data.priorities.low },
  ];

  const workforceData = [
    { name: 'Developers', value: data.workforce.developers },
    { name: 'Testers', value: data.workforce.testers },
    { name: 'Designers', value: data.workforce.designers },
  ];

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
               <Cpu size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Technical Operations</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-10">Chief Technology Officer Dashboard | {user?.name}</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <div className="flex flex-col items-end px-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Velocity</span>
              <span className="text-lg font-black text-indigo-600">
                {((data.taskStatus.done / (data.totalTasks || 1)) * 100).toFixed(0)}%
              </span>
           </div>
           <div className="h-10 w-[2px] bg-gray-100 dark:bg-gray-700"></div>
           <Gauge className="text-indigo-500 mx-2" size={24} />
        </div>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <TechCard 
          title="Engineering Talent" 
          value={data.workforce.totalTech} 
          icon={<Users className="h-6 w-6 text-indigo-600" />} 
          subText={`${data.workforce.developers} Developers`}
          trend="+3 this month"
          color="indigo"
        />
        <TechCard 
          title="Technical Debt" 
          value={data.taskStatus.todo + data.taskStatus.inProgress} 
          icon={<Terminal className="h-6 w-6 text-rose-600" />} 
          subText="Active Backlog Items"
          trend="-12% vs last week"
          color="rose"
        />
        <TechCard 
          title="System Stability" 
          value="99.9%" 
          icon={<ShieldCheck className="h-6 w-6 text-emerald-600" />} 
          subText="Current Uptime"
          trend="Stable"
          color="emerald"
        />
        <TechCard 
          title="Deployment Rate" 
          value={data.taskStatus.done} 
          icon={<Zap className="h-6 w-6 text-amber-600" />} 
          subText="Deliverables Completed"
          trend="+18 total"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Development Velocity / Task Status */}
        <div className="card lg:col-span-2 overflow-hidden border-none shadow-xl shadow-indigo-500/5">
           <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity size={18} />
                Development Flow & Status
              </h3>
              <div className="flex gap-2">
                 <div className="w-2 h-2 rounded-full bg-white/40"></div>
                 <div className="w-2 h-2 rounded-full bg-white/20"></div>
                 <div className="w-2 h-2 rounded-full bg-white/10"></div>
              </div>
           </div>
           <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                 {statusData.map(item => (
                    <div key={item.name} className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.name}</span>
                       <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{item.value}</span>
                          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }}></div>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="h-72 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#94A3B8' }} />
                       <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#94A3B8' }} />
                       <Tooltip 
                         cursor={{ fill: 'transparent' }}
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       />
                       <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                          {statusData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Priority Blockers */}
        <div className="card flex flex-col h-full border-none shadow-xl shadow-rose-500/5">
           <div className="bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertCircle size={18} />
                Technical Blockers
              </h3>
           </div>
           <div className="p-8 flex-1 flex flex-col justify-between">
              <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={priorityData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={8}
                         dataKey="value"
                       >
                          <Cell fill="#F43F5E" />
                          <Cell fill="#FB923C" />
                          <Cell fill="#6366F1" />
                          <Cell fill="#CBD5E1" />
                       </Pie>
                       <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                 {priorityData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#F43F5E', '#FB923C', '#6366F1', '#CBD5E1'][i] }}></div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{p.name} Priorities</span>
                       </div>
                       <span className="font-bold text-gray-900 dark:text-white">{p.value}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
         {/* Technical Roadmap / Projects */}
         <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
               <h3 className="font-bold flex items-center gap-2">
                 <Code size={18} className="text-indigo-500" />
                 Technical Roadmap
               </h3>
               <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded tracking-widest uppercase">
                 Q3 Deliverables
               </span>
            </div>
            <div className="p-2">
               {data.topTechnicalProjects.map((project, i) => (
                  <div key={project.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all group">
                     <span className="text-2xl font-black text-gray-100 dark:text-gray-800 group-hover:text-indigo-100 transition-colors">0{i+1}</span>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-gray-900 dark:text-white truncate">{project.name}</h4>
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                             {project.status}
                           </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                           <span className="flex items-center gap-1"><Users size={12} /> {project.owner}</span>
                           <span className="flex items-center gap-1"><Clock size={12} /> Updated 2h ago</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-sm font-black text-indigo-600">{project.progress}%</span>
                        <div className="w-16 bg-gray-100 dark:bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
                           <div className="bg-indigo-500 h-full" style={{ width: `${project.progress}%` }}></div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Talent Allocation */}
         <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
               <h3 className="font-bold flex items-center gap-2">
                 <Layout size={18} className="text-emerald-500" />
                 Talent Allocation 
               </h3>
            </div>
            <div className="p-8">
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={workforceData}>
                        <defs>
                           <linearGradient id="colorTalent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#94A3B8' }} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#94A3B8' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#10B981" fillOpacity={1} fill="url(#colorTalent)" strokeWidth={3} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-3 gap-4 font-center text-center mt-6">
                  {workforceData.map(w => (
                     <div key={w.name}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{w.name}</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{w.value}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function TechCard({ title, value, icon, subText, trend, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
  };

  return (
    <div className="card p-6 border-none shadow-lg shadow-gray-200/50 dark:shadow-none hover:-translate-y-1 transition-transform">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
           <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{value}</span>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
         <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">{subText}</span>
            <span className={`text-[10px] font-bold ${trend.includes('+') ? 'text-emerald-500' : (trend.includes('-') ? 'text-rose-500' : 'text-indigo-400')}`}>
               {trend}
            </span>
         </div>
         <div className="h-2 w-12 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${color === 'indigo' ? 'bg-indigo-500' : (color === 'rose' ? 'bg-rose-500' : (color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'))}`} style={{ width: '60%' }}></div>
         </div>
      </div>
    </div>
  );
}
