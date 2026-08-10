import { useState, useEffect } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  Cell, 
  PieChart as RechartsPieChart, 
  Pie, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  BarChart, 
  CheckCheck, 
  Clock, 
  Users, 
  Building2, 
  DollarSign, 
  Shield, 
  TrendingUp, 
  Plus, 
  AlertCircle, 
  Briefcase, 
  Activity,
  ArrowRight,
  TrendingDown,
  Layers,
  Award,
  Wallet
} from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ProjectCard from '../components/dashboard/ProjectCard';
import TaskCard from '../components/dashboard/TaskCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import ProjectProgress from '../components/dashboard/ProjectProgress';
import DepartmentGraph from '../components/dashboard/DepartmentGraph';
import NewProjectModal from '../components/modals/NewProjectModal';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { cn } from '../lib/utils';

// Helper to fetch with an enforced timeout
const fetchWithTimeout = (url: string, options: any, timeoutMs = 18000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout fetching ${url}`)), timeoutMs)
    )
  ]);
};

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({ tasksCompleted: 0, tasksInProgress: 0, projectsActive: 0, teamMembers: 0 });
  const [loading, setLoading] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Admin Command Center State
  const [ceoData, setCeoData] = useState<any>(null);
  const [cfoData, setCfoData] = useState<any>(null);
  const [ctoData, setCtoData] = useState<any>(null);
  const [cmoData, setCmoData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<any[]>([]);

  const token = localStorage.getItem('token');
  const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isManager = ['chief_manager', 'department_manager'].includes(currentUser?.role || '');

  useEffect(() => {
    setLoading(true);
    console.log('[Diagnostic] Current User Role:', currentUser?.role);
    
    if (currentUser?.role === 'admin') {
      const fetchJson = (url: string) => {
        console.log(`[Diagnostic] Fetching: ${url}`);
        return fetchWithTimeout(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } }, 18000)
          .then(r => {
            console.log(`[Diagnostic] Status received for ${url}: ${r.status}`);
            return r.ok ? r.json() : null;
          })
          .catch(err => {
            console.warn(`[Diagnostic] Error or timeout for ${url}:`, err);
            return null;
          });
      };

      Promise.all([
        fetchJson(`${base}/reports/ceo`),
        fetchJson(`${base}/reports/cfo`),
        fetchJson(`${base}/reports/cto`),
        fetchJson(`${base}/reports/cmo`),
        fetchJson(`${base}/reports/productivity`),
        fetchJson(`${base}/projects`)
      ])
      .then(([ceoRes, cfoRes, ctoRes, cmoRes, prodRes, projRes]) => {
        console.log('[Diagnostic] Finished fetching all admin reports');
        if (ceoRes && ceoRes.success) setCeoData(ceoRes.data);
        if (cfoRes && cfoRes.success) setCfoData(cfoRes.data);
        if (ctoRes && ctoRes.success) setCtoData(ctoRes.data);
        if (cmoRes && cmoRes.success) setCmoData(cmoRes.data);
        if (prodRes && prodRes.success) setProductivityData(prodRes.data);
        if (projRes && (projRes.data || projRes.projects)) {
          setProjects(projRes.data || projRes.projects || []);
        }
      })
      .catch((err) => console.error('Error fetching founder command dashboard data', err))
      .finally(() => {
        console.log('[Diagnostic] Setting loading to false (admin path)');
        setLoading(false);
      });
    } else {
      // Normal user / manager dashboard
      const fetchJsonSafe = (url: string, fallback: any) => {
        console.log(`[Diagnostic] Fetching non-admin: ${url}`);
        return fetchWithTimeout(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } }, 18000)
          .then(r => {
            console.log(`[Diagnostic] Status received for non-admin ${url}: ${r.status}`);
            return r.ok ? r.json() : fallback;
          })
          .then(d => d?.data || d?.projects || d?.tasks || d || fallback)
          .catch(err => {
            console.warn(`[Diagnostic] Error or timeout for non-admin ${url}:`, err);
            return fallback;
          });
      };

      Promise.all([
        fetchJsonSafe(`${base}/projects`, []),
        fetchJsonSafe(`${base}/tasks`, []),
        fetchJsonSafe(`${base}/activities`, []),
        fetchJsonSafe(`${base}/projects/team-members/list`, [])
      ])
      .then(([projectList, taskList, activityList, memberList]) => {
        console.log('[Diagnostic] Finished fetching non-admin data');
        const projectIds = (projectList || []).map((p: any) => (p.id || p._id)?.toString());
        const filteredTasks = (taskList || []).filter((t: any) => {
          const taskProjectId = t.projectId || t.Project?.id || (typeof t.project === 'object' ? t.project?._id || t.project?.id : t.project);
          return taskProjectId && projectIds.includes(taskProjectId.toString());
        });

        setTasks(filteredTasks);
        setActivities(activityList);

        const completed = (filteredTasks || []).filter((t: any) => {
          const status = String(t.status || '').toLowerCase();
          return status === 'done' || status === 'completed';
        }).length;
        const inProgress = (filteredTasks || []).filter((t: any) => {
          const status = String(t.status || '').toLowerCase();
          return status === 'in-progress' || status === 'in progress';
        }).length;
        const activeProjects = (projectList || []).filter((p: any) => p.status?.toLowerCase() === 'active').length;
        
        const projectsWithTaskCounts = (projectList || []).map((project: any) => {
          const projectTasks = (filteredTasks || []).filter((t: any) => {
            const taskProjectId = t.projectId || t.Project?.id || (typeof t.project === 'object' ? t.project?._id || t.project?.id : t.project);
            const projectId = project.id || project._id;
            return taskProjectId && projectId && taskProjectId.toString() === projectId.toString();
          });
          const completedTasks = projectTasks.filter((t: any) => {
            const status = String(t.status || '').toLowerCase();
            return status === 'done' || status === 'completed';
          }).length;
          
          return {
            ...project,
            tasksCount: {
              total: projectTasks.length,
              completed: completedTasks
            }
          };
        });
        
        setProjects(projectsWithTaskCounts);
        setStats({
          tasksCompleted: completed,
          tasksInProgress: inProgress,
          projectsActive: activeProjects,
          teamMembers: (memberList || []).length
        });
      })
      .catch((err) => console.error('Error fetching non-admin data', err))
      .finally(() => {
        console.log('[Diagnostic] Setting loading to false (non-admin path)');
        setLoading(false);
      });
    }
  }, [token, base, refreshCounter, currentUser]);

  // Robust formatting helpers to avoid runtime crashes
  const formatTime = (dateStr: any) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '₹0';
    try {
      return `₹${Number(val).toLocaleString()}`;
    } catch (e) {
      return '₹0';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">Loading Founder Command Center...</span>
        </div>
      </div>
    );
  }

  // If user is NOT admin, return the default employee / manager dashboard view
  if (currentUser?.role !== 'admin') {
    const mappedActivities = activities.map((act: any) => ({
      id: act.id || act._id,
      user: { name: act.User?.name || act.user?.name || 'Someone' },
      action: act.description || '',
      target: '',
      timestamp: act.createdAt
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex space-x-2">
            <button className="btn btn-outline" onClick={() => window.print()}>Export</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tasks Completed"
            value={stats.tasksCompleted}
            icon={CheckCheck}
            iconColor="bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
            trend={{ value: 12, direction: 'up' }}
          />
          <StatsCard
            title="In Progress"
            value={stats.tasksInProgress}
            icon={Clock}
            iconColor="bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
            trend={{ value: 5, direction: 'up' }}
          />
          <StatsCard
            title="Active Projects"
            value={stats.projectsActive}
            icon={BarChart}
            trend={{ value: 0, direction: 'neutral' }}
          />
          <StatsCard
            title="Team Members"
            value={stats.teamMembers}
            icon={Users}
            iconColor="bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400"
            trend={{ value: 2, direction: 'up' }}
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Active Projects</h2>
                <a href="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  View All
                </a>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {projects && projects.length > 0 ? (
                  projects.slice(0, 2).map(project => (
                    <ProjectCard key={project._id || project.id} project={project} />
                  ))
                ) : (
                  <p className="text-gray-500">No projects yet. Create your first project to get started.</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Tasks</h2>
                <a href="/tasks" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  View All
                </a>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tasks.slice(0, 4).map(task => (
                  <TaskCard key={task._id || task.id} task={task} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isManager ? <DepartmentGraph /> : <ActivityFeed activities={mappedActivities} />}
            <ProjectProgress projects={projects.slice(0, 3)} />
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // FOUNDER / ADMIN COMMAND CENTER DASHBOARD
  // ============================================
  
  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getDepartmentBudgetData = () => {
    if (!cfoData?.departmentBreakdown) return [];
    return cfoData.departmentBreakdown.map((dept: any) => ({
      name: dept.name,
      value: dept.budget || 0
    }));
  };

  const getPriorityData = () => {
    if (!ctoData?.priorities) return [];
    return [
      { name: 'Urgent', count: ctoData.priorities.urgent || 0, fill: '#ef4444' },
      { name: 'High', count: ctoData.priorities.high || 0, fill: '#f97316' },
      { name: 'Medium', count: ctoData.priorities.medium || 0, fill: '#f59e0b' },
      { name: 'Low', count: ctoData.priorities.low || 0, fill: '#3b82f6' }
    ];
  };

  const getTaskStatusData = () => {
    if (!ctoData?.taskStatus) return [];
    return [
      { name: 'Todo', value: ctoData.taskStatus.todo || 0 },
      { name: 'In Progress', value: ctoData.taskStatus.inProgress || 0 },
      { name: 'Review', value: ctoData.taskStatus.review || 0 },
      { name: 'Done', value: ctoData.taskStatus.done || 0 }
    ];
  };

  const totalAllocation = cfoData?.financials?.totalAllocation || 0;
  const totalBudget = cfoData?.financials?.totalBudget || 1;
  const budgetProgress = totalBudget > 0 ? Math.min((totalAllocation / totalBudget) * 100, 100) : 0;
  const budgetRatioString = totalBudget > 0 ? ((totalAllocation / totalBudget) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Premium Command Center Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-100 dark:border-primary-900/60 mb-2">
            <Layers size={12} /> Founder Command Center
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Company Command Overview
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time analytics and company metrics from departments, budgets, technical pipelines, and campaigns.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="btn btn-outline flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
          >
            Export PDF Report
          </button>
          {currentUser && ['admin', 'ceo', 'chief_manager', 'department_manager'].includes(currentUser.role || '') && (
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              className="btn btn-primary bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 border-none flex items-center gap-2 shadow-md px-4 py-2 text-xs font-semibold rounded-lg text-white"
            >
              <Plus size={14} /> Create New Project
            </button>
          )}
        </div>
      </div>

      {/* ==================== 🏢 CEO / OPERATIONS COMMAND SECTION ==================== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="p-2 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-lg">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Operations & CEO Command</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Overview of departments, workforce, project pipeline and real-time activity.</p>
          </div>
        </div>

        {/* Main 4 Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Workforce"
            value={ceoData?.counts?.users || 0}
            icon={Users}
            iconColor="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
            trend={{ value: 8, direction: 'up' }}
          />
          <StatsCard
            title="Departments"
            value={ceoData?.counts?.departments || 0}
            icon={Building2}
            iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            trend={{ value: 1, direction: 'up' }}
          />
          <StatsCard
            title="Total Projects"
            value={ceoData?.counts?.projects || 0}
            icon={Briefcase}
            iconColor="bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
            trend={{ value: 4, direction: 'up' }}
          />
          <StatsCard
            title="Work Tasks"
            value={ceoData?.counts?.tasks || 0}
            icon={CheckCheck}
            iconColor="bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
            trend={{ value: 15, direction: 'up' }}
          />
        </div>

        {/* Project & Task Status Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Status Pipeline</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Active Pipeline', count: ceoData?.projectStats?.active || 0, color: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20' },
                { label: 'In Planning', count: ceoData?.projectStats?.planning || 0, color: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/20' },
                { label: 'Completed', count: ceoData?.projectStats?.completed || 0, color: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/20' },
                { label: 'On Hold', count: ceoData?.projectStats?.onHold || 0, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800/40' }
              ].map((item, idx) => (
                <div key={idx} className={cn('p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between', item.color)}>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{item.label}</span>
                  <span className="text-2xl font-extrabold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Completion State</h3>
              {ceoData?.taskStats?.overdue > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded animate-pulse">
                  <AlertCircle size={12} /> {ceoData.taskStats.overdue} Overdue
                </span>
              )}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Completed / Done', count: ceoData?.taskStats?.done || 0, color: 'bg-success-500' },
                { label: 'Under Review', count: ceoData?.taskStats?.review || 0, color: 'bg-indigo-500' },
                { label: 'In Progress', count: ceoData?.taskStats?.inProgress || 0, color: 'bg-warning-500' },
                { label: 'To Do list', count: ceoData?.taskStats?.todo || 0, color: 'bg-gray-400' }
              ].map((item, idx) => {
                const total = (ceoData?.taskStats?.done || 0) + (ceoData?.taskStats?.review || 0) + (ceoData?.taskStats?.inProgress || 0) + (ceoData?.taskStats?.todo || 0) || 1;
                const pct = ((item.count / total) * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                      <span>{item.label}</span>
                      <span>{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', item.color)} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Departments & Recent Live Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Departments</h3>
              <a href="/departments" className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline">
                Go to Departments <ArrowRight size={12} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Manager</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {ceoData?.departmentBreakdown?.map((dept: any) => (
                    <tr key={dept.id}>
                      <td className="py-3 font-semibold text-gray-800 dark:text-gray-200">{dept.name}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{dept.manager}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activities</h3>
            <div className="flow-root max-h-[350px] overflow-y-auto pr-1">
              <ul className="-mb-8">
                {ceoData?.recentActivities?.map((activity: any, idx: number) => (
                  <li key={activity.id || idx}>
                    <div className="relative pb-8">
                      {idx !== ceoData.recentActivities.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 flex items-center justify-center ring-8 ring-white dark:ring-gray-900">
                            <Activity size={14} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-bold text-gray-900 dark:text-white">{activity.User?.name || 'Someone'}</span>
                            {' '}{activity.description || activity.action}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                            {formatTime(activity.createdAt)}
                          </span>
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

      {/* ==================== 💰 CFO / FINANCIALS COMMAND SECTION ==================== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 pt-6">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Financial Control & CFO</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track company budget pools, project allocations, and department balances.</p>
          </div>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatsCard
            title="Company Total Budget"
            value={formatCurrency(cfoData?.financials?.totalBudget)}
            icon={Wallet}
            iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <StatsCard
            title="Project Allocated Budget"
            value={formatCurrency(cfoData?.financials?.totalAllocation)}
            icon={DollarSign}
            iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          />
          <div className={cn(
            'card p-6 border transition-all hover:shadow-md bg-white dark:bg-gray-900',
            (cfoData?.financials?.remainingBudget || 0) < 0 
              ? 'border-red-200 dark:border-red-950/40' 
              : 'border-emerald-250 dark:border-emerald-950/40'
          )}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Unallocated Budget</p>
                <h3 className={cn(
                  'mt-2 text-3xl font-extrabold',
                  (cfoData?.financials?.remainingBudget || 0) < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {formatCurrency(cfoData?.financials?.remainingBudget)}
                </h3>
                <div className="mt-2 flex items-center text-xs text-gray-400">
                  {cfoData?.financials?.remainingBudget >= 0 ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                      <TrendingUp size={12} /> Safe margin
                    </span>
                  ) : (
                    <span className="text-red-500 font-bold flex items-center gap-0.5">
                      <TrendingDown size={12} /> Over-allocated budget!
                    </span>
                  )}
                </div>
              </div>
              <div className={cn(
                'rounded-full p-3',
                (cfoData?.financials?.remainingBudget || 0) < 0
                  ? 'bg-red-50 text-red-500 dark:bg-red-950/20'
                  : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20'
              )}>
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Budget Consumption Bar */}
        <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-300">
            <span>Overall Budget Allocated to Active Projects</span>
            <span>{budgetRatioString}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-4 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full bg-gradient-to-r',
                (totalAllocation / totalBudget) > 1
                  ? 'from-red-500 to-rose-600'
                  : 'from-emerald-500 to-indigo-500'
              )}
              style={{ width: `${budgetProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Top high-budget projects */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top High-Budget Projects</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                    <th className="pb-3">Project Name</th>
                    <th className="pb-3">Budget</th>
                    <th className="pb-3 text-center">Progress</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {cfoData?.topProjects?.map((proj: any) => (
                    <tr key={proj.id}>
                      <td className="py-3.5 font-bold text-gray-800 dark:text-gray-200">{proj.name}</td>
                      <td className="py-3.5 font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(proj.budget)}</td>
                      <td className="py-3.5 max-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: `${proj.progress || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-500">{proj.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
                          proj.status === 'completed'
                            ? 'bg-success-50 text-success-700 dark:bg-success-950/20'
                            : 'bg-primary-50 text-primary-700 dark:bg-primary-950/20'
                        )}>
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department budgets distribution */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Department Budgets</h3>
            <div className="h-64 w-full flex items-center justify-center">
              {getDepartmentBudgetData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getDepartmentBudgetData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {getDepartmentBudgetData().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString()}` : ''} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-sm text-gray-500">No department budgets configured.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== ⚙️ CTO / TECHNOLOGY COMMAND SECTION ==================== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 pt-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Technology & CTO Pipelines</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Monitor developers, technical project progress, and engineering task priority spreads.</p>
          </div>
        </div>

        {/* Engineering Workforce Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tech Workforce"
            value={ctoData?.workforce?.totalTech || 0}
            icon={Shield}
            iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          />
          <StatsCard
            title="Software Developers"
            value={ctoData?.workforce?.developers || 0}
            icon={Briefcase}
            iconColor="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
          />
          <StatsCard
            title="QA & Testers"
            value={ctoData?.workforce?.testers || 0}
            icon={CheckCheck}
            iconColor="bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
          />
          <StatsCard
            title="UX/UI Designers"
            value={ctoData?.workforce?.designers || 0}
            icon={Award}
            iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Task Priority distribution bar chart */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Priority Distribution</h3>
            <div className="h-64 w-full">
              {getPriorityData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={getPriorityData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {getPriorityData().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-sm text-gray-500">No engineering priority metrics found.</span>
              )}
            </div>
          </div>

          {/* Task state chart */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Technical Tasks Status</h3>
            <div className="h-64 w-full flex items-center justify-center">
              {getTaskStatusData().some(x => x.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getTaskStatusData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {getTaskStatusData().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-sm text-gray-500">No technical tasks found.</span>
              )}
            </div>
          </div>

          {/* Tech Projects progress */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 lg:col-span-3 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Technical Projects</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                    <th className="pb-3">Project Name</th>
                    <th className="pb-3 text-center">Progress</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {ctoData?.topTechnicalProjects?.map((proj: any) => (
                    <tr key={proj.id}>
                      <td className="py-3 font-semibold text-gray-800 dark:text-gray-200">{proj.name}</td>
                      <td className="py-3 max-w-[200px]">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-full max-w-[150px] bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: `${proj.progress || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-500">{proj.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 📈 CMO / GROWTH & MARKETING SECTION ==================== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 pt-6">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Growth & Marketing Campaigns</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Monitor marketer personnel metrics, campaign pipelines, and engagement progress velocities.</p>
          </div>
        </div>

        {/* CMO Marketing Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Marketing Personnel"
            value={cmoData?.workforce?.totalMarketing || 0}
            icon={Users}
            iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <StatsCard
            title="Total Campaigns"
            value={cmoData?.campaigns?.total || 0}
            icon={Briefcase}
            iconColor="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
          />
          <StatsCard
            title="Active Campaigns"
            value={cmoData?.campaigns?.active || 0}
            icon={Clock}
            iconColor="bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
          />
          <StatsCard
            title="Campaign Progress"
            value={`${cmoData?.engagementVelocity || 0}%`}
            icon={TrendingUp}
            iconColor="bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Top Campaigns list */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Growth Campaigns</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                    <th className="pb-3">Campaign Name</th>
                    <th className="pb-3 text-center">Progress</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {cmoData?.topCampaigns?.map((camp: any) => (
                    <tr key={camp.id}>
                      <td className="py-3 font-semibold text-gray-800 dark:text-gray-200">{camp.name}</td>
                      <td className="py-3 max-w-[200px]">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-full max-w-[150px] bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: `${camp.progress || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-500">{camp.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400">
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CMO Marketing Capacity Card */}
          <div className="card p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Campaign Workforce Ratio</h3>
            <div className="flex justify-center items-center h-48 relative">
              {/* Circular indicator */}
              <div className="w-36 h-36 rounded-full border-8 border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center">
                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {cmoData?.workforce?.totalMarketing || 0}
                </span>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Marketers</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Growth Marketers</span>
                <span>{cmoData?.workforce?.totalMarketing || 0}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Support Personnel</span>
                <span>{cmoData?.workforce?.supportStaff || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal Component */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreated={() => setRefreshCounter(prev => prev + 1)}
      />
    </div>
  );
}