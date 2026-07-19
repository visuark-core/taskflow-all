import { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Target, 
  TrendingUp, 
  BarChart2, 
  Users, 
  Briefcase, 
  Calendar, 
  Search, 
  Globe, 
  PieChart as PieChartIcon,
  Flame,
  ArrowUpRight,
  Sparkles
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
  LineChart,
  Line
} from 'recharts';

interface DashboardData {
  workforce: {
    totalMarketing: number;
    supportStaff: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
  };
  taskStatus: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  topCampaigns: Array<{
    id: string;
    name: string;
    progress: number;
    status: string;
    owner: string;
  }>;
  engagementVelocity: string;
}

export default function CMODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${base}/reports/cmo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch marketing statistics');
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
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-pink-50 p-10 text-center text-pink-800 border-2 border-pink-100 shadow-lg">
        <Megaphone className="mx-auto h-16 w-16 text-pink-400 mb-6 animate-bounce" />
        <p className="font-black text-2xl mb-3">Outreach Intelligence Unavailable</p>
        <p className="text-pink-600 font-medium">{error}</p>
      </div>
    );
  }

  const PINK_PALETTE = ['#F472B6', '#EC4899', '#DB2777', '#BE185D', '#9D174D'];
  const STATUS_DATA = [
    { name: 'Creative Backlog', value: data.taskStatus.todo, color: '#FBCFE8' },
    { name: 'In Production', value: data.taskStatus.inProgress, color: '#F472B6' },
    { name: 'Client Review', value: data.taskStatus.review, color: '#EC4899' },
    { name: 'Published', value: data.taskStatus.done, color: '#BE185D' },
  ];

  const CAMPAIGN_RATIO = [
    { name: 'Active Campaigns', value: data.campaigns.active },
    { name: 'Completed', value: data.campaigns.completed },
  ];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-600 rounded-2xl shadow-lg shadow-pink-200 dark:shadow-none">
               <Target size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Brand & Outreach</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium ml-1">Chief Marketing Officer Dashboard | {user?.name}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
           <div className="flex flex-col items-end px-4 border-r border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Engagement Velocity</span>
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-orange-500 fill-orange-500" />
                <span className="text-2xl font-black text-gray-900 dark:text-white">{data.engagementVelocity}%</span>
              </div>
           </div>
           <TrendingUp className="text-pink-500 mx-2" size={28} />
        </div>
      </div>

      {/* Marketing KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MarketingCard 
          title="Campaign Portfolio" 
          value={data.campaigns.total} 
          icon={<Megaphone className="h-6 w-6 text-pink-600" />} 
          subText={`${data.campaigns.active} Currently Live`}
          trend="+2 New"
          color="pink"
        />
        <MarketingCard 
          title="Marketing Workforce" 
          value={data.workforce.totalMarketing} 
          icon={<Users className="h-6 w-6 text-violet-600" />} 
          subText="Direct & Support Staff"
          trend="Fully Scaled"
          color="violet"
        />
        <MarketingCard 
          title="Brand Outreach" 
          value={`${data.taskStatus.done}`} 
          icon={<Globe className="h-6 w-6 text-blue-600" />} 
          subText="Content Deliverables"
          trend="+12% Reach"
          color="blue"
        />
        <MarketingCard 
          title="Conversion Assets" 
          value={data.taskStatus.review} 
          icon={<Briefcase className="h-6 w-6 text-rose-600" />} 
          subText="Pending Distribution"
          trend="Critical Load"
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Production Funnel */}
        <div className="card lg:col-span-2 overflow-hidden border-none bg-white dark:bg-gray-800 shadow-2xl shadow-pink-500/5">
           <div className="border-b border-gray-50 dark:border-gray-700/50 px-8 py-6 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <BarChart2 size={20} className="text-pink-500" />
                Marketing Content Pipeline
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-pink-600 bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-full">
                 <Sparkles size={14} /> AI Optimized
              </div>
           </div>
           <div className="p-8">
              <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={STATUS_DATA} layout="vertical">
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" fontSize={11} width={120} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600 }} />
                       <Tooltip 
                         cursor={{ fill: '#FDF2F8' }}
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                       />
                       <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                          {STATUS_DATA.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Campaign Distribution */}
        <div className="card flex flex-col h-full border-none bg-white dark:bg-gray-800 shadow-2xl shadow-violet-500/5">
           <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-700/50">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <PieChartIcon size={20} className="text-violet-500" />
                Live Campaigns
              </h3>
           </div>
           <div className="p-8 flex-1 flex flex-col justify-between">
              <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={CAMPAIGN_RATIO}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={85}
                         paddingAngle={10}
                         dataKey="value"
                       >
                          <Cell fill="#EC4899" />
                          <Cell fill="#E2E8F0" />
                       </Pie>
                       <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-5">
                 <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-500">Portfolio Progress</span>
                       <span className="text-sm font-black text-pink-600">{((data.campaigns.completed / (data.campaigns.total || 1)) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                       <div 
                        className="bg-gradient-to-r from-pink-400 to-pink-600 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${(data.campaigns.completed / (data.campaigns.total || 1)) * 100}%` }}
                      ></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
         {/* Strategic Roadmap */}
         <div className="card overflow-hidden border-none shadow-xl">
            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
               <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                 <Calendar size={20} className="text-pink-500" />
                 Strategic Roadmap
               </h3>
               <Search size={18} className="text-gray-400 cursor-pointer" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
               {data.topCampaigns.map((campaign, i) => (
                  <div key={campaign.id} className="p-6 flex items-center gap-5 hover:bg-pink-50/30 dark:hover:bg-pink-900/5 transition-all group">
                     <div className="flex flex-col items-center">
                        <span className="font-black text-3xl text-gray-100 dark:text-gray-800 group-hover:text-pink-100 transition-colors">0{i+1}</span>
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">{campaign.name}</h4>
                        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                           <span className="flex items-center gap-1.5"><Users size={14} /> {campaign.owner}</span>
                           <span className={`flex items-center gap-1.5 ${campaign.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                             <div className={`h-1.5 w-1.5 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                             {campaign.status}
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-pink-600 mb-1">{campaign.progress}%</span>
                        <div className="w-20 bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-pink-500 h-full" style={{ width: `${campaign.progress}%` }}></div>
                        </div>
                     </div>
                  </div>
               ))}
               {data.topCampaigns.length === 0 && (
                  <div className="p-16 text-center text-gray-400 italic">No campaign data tracked for Q4.</div>
               )}
            </div>
         </div>

         {/* Market Insight Feed */}
         <div className="card overflow-hidden border-none shadow-xl flex flex-col">
            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
               <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                 <Globe size={20} className="text-blue-500" />
                 Market Insight Feed
               </h3>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-center">
                <div className="space-y-8">
                   <InsightItem icon={<Sparkles className="text-pink-500" />} text="Social media sentiment up by 14% on tech-focused tags." />
                   <InsightItem icon={<Target className="text-violet-500" />} text="Q4 Campaign 'CloudFlow' reached 80% delivery target." />
                   <InsightItem icon={<ArrowUpRight className="text-emerald-500" />} text="Highest engagement detected in Engineering & Finance sectors." />
                   <InsightItem icon={<Briefcase className="text-blue-500" />} text="3 Strategic initiatives ready for CMO final approval." />
                </div>
            </div>
            <div className="px-8 py-5 bg-blue-600 flex items-center justify-between text-white hover:bg-blue-700 transition-colors cursor-pointer group">
               <span className="font-bold text-sm">Download Detailed Analytics Report</span>
               <TrendingUp size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
         </div>
      </div>
    </div>
  );
}

function InsightItem({ icon, text }: any) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-50 dark:border-gray-800 shadow-sm">
       <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {icon}
       </div>
       <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
    </div>
  );
}

function MarketingCard({ title, value, icon, subText, trend, color }: any) {
  const colors: any = {
    pink: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/20 dark:border-pink-800',
    violet: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
  };

  return (
    <div className="card p-8 border-none bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:-translate-y-2 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`p-4 rounded-2xl ${colors[color]} shadow-inner`}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</span>
           <span className="text-4xl font-black text-gray-900 dark:text-white mt-1.5">{value}</span>
        </div>
      </div>
      <div className="mt-8 flex items-end justify-between">
         <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{subText}</span>
            <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
               <ArrowUpRight size={14} strokeWidth={3} /> {trend}
            </span>
         </div>
         <div className="h-2 w-16 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${color === 'pink' ? 'bg-pink-500' : (color === 'violet' ? 'bg-violet-500' : (color === 'blue' ? 'bg-blue-500' : 'bg-rose-500'))}`} style={{ width: '70%' }}></div>
         </div>
      </div>
    </div>
  );
}
