import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  PieChart as PieChartIcon, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Building2,
  Briefcase,
  Users,
  Wallet,
  Calendar
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
  Legend
} from 'recharts';

interface DashboardData {
  financials: {
    totalBudget: number;
    totalAllocation: number;
    remainingBudget: number;
  };
  counts: {
    users: number;
    departments: number;
    projects: number;
  };
  departmentBreakdown: Array<{
    id: string;
    name: string;
    budget: number;
    memberCount: number;
    manager: string;
    status: string;
  }>;
  topProjects: Array<{
    id: string;
    name: string;
    budget: number;
    status: string;
    progress: number;
  }>;
}

export default function CFODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${base}/reports/cfo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch financial statistics');
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-800 border border-red-200">
        <p className="font-bold">Error loading financial dashboard</p>
        <p>{error}</p>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const budgetAllocationData = [
    { name: 'Allocated to Projects', value: data.financials.totalAllocation },
    { name: 'Unallocated Reserve', value: data.financials.remainingBudget },
  ];

  const departmentBudgetData = data.departmentBreakdown
    .sort((a, b) => b.budget - a.budget)
    .map(dept => ({
      name: dept.name,
      budget: dept.budget
    }));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Financial Oversight</h1>
        <p className="text-gray-500 dark:text-gray-400">Chief Financial Officer Dashboard | {user?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceCard 
          title="Total Operating Budget" 
          value={formatCurrency(data.financials.totalBudget)} 
          icon={<Wallet className="h-6 w-6 text-emerald-600" />} 
          subText="Approved Fiscal Year"
          color="emerald"
        />
        <FinanceCard 
          title="Project Stakes" 
          value={formatCurrency(data.financials.totalAllocation)} 
          icon={<DollarSign className="h-6 w-6 text-blue-600" />} 
          subText={`${((data.financials.totalAllocation / data.financials.totalBudget) * 100).toFixed(1)}% of total budget`}
          color="blue"
        />
        <FinanceCard 
          title="Cost Centers" 
          value={data.counts.departments} 
          icon={<Building2 className="h-6 w-6 text-purple-600" />} 
          subText="Functional Departments"
          color="purple"
        />
        <FinanceCard 
          title="Active Projects" 
          value={data.counts.projects} 
          icon={<Briefcase className="h-6 w-6 text-orange-600" />} 
          subText="Financial Assets"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Department Budget Allocation Bar Chart */}
        <div className="card lg:col-span-2">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <TrendingDown size={18} className="text-emerald-500" />
              Budget Allocation by Department
            </h3>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Fiscal 2024</span>
          </div>
          <div className="p-6">
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBudgetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={12} width={100} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), 'Budget']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="budget" fill="#10B981" radius={[0, 4, 4, 0]} barSize={30}>
                       {departmentBudgetData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Allocation vs Reserve Pie Chart */}
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
             <h3 className="font-bold flex items-center gap-2">
              <PieChartIcon size={18} className="text-blue-500" />
              Capital Distribution
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#E5E7EB" />
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Legend />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Reserve</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(data.financials.remainingBudget)}</span>
               </div>
               <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(data.financials.totalAllocation / data.financials.totalBudget) * 100}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Departmental P&L Table */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 bg-gray-50/50">
             <h3 className="font-bold flex items-center gap-2">
              <Building2 size={18} className="text-primary-600" />
              Department Financial Health
            </h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                   <tr className="border-b border-gray-100 dark:border-gray-800 uppercase text-[10px] font-bold text-gray-400 tracking-wider">
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Manager</th>
                      <th className="px-6 py-4">Personnel</th>
                      <th className="px-6 py-4 text-right">Budget</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                   {data.departmentBreakdown.map(dept => (
                      <tr key={dept.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                         <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{dept.name}</td>
                         <td className="px-6 py-4 text-gray-500">{dept.manager}</td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                               <Users size={14} className="text-gray-400" />
                               {dept.memberCount}
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(dept.budget)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Top Asset Projects */}
        <div className="card overflow-hidden">
           <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 bg-gray-50/50">
             <h3 className="font-bold flex items-center gap-2">
              <Briefcase size={18} className="text-orange-500" />
              Highest Budget Projects
            </h3>
          </div>
          <div className="p-6 space-y-4">
             {data.topProjects.map(project => (
                <div key={project.id} className="flex flex-col p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md">
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900 dark:text-white">{project.name}</h4>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs">
                        {formatCurrency(project.budget)}
                      </span>
                   </div>
                   <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                         <div className={`h-2 w-2 rounded-full ${project.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                         {project.status.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                         <Calendar size={12} />
                         FY24-Q3
                      </span>
                   </div>
                   <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-2">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                   </div>
                </div>
             ))}
             {data.topProjects.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                   No project budget data available.
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ title, value, icon, subText, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800',
    orange: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800',
  };

  return (
    <div className="card flex flex-col p-6 border-l-4 border-l-transparent transition-all hover:border-l-primary-500">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
           {subText}
        </p>
        <ArrowUpRight size={14} className="text-emerald-500" />
      </div>
    </div>
  );
}
