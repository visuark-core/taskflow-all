import { useState, useEffect } from 'react';
import { BarChart, CheckCheck, Clock, Users } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ProjectCard from '../components/dashboard/ProjectCard';
import TaskCard from '../components/dashboard/TaskCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import ProjectProgress from '../components/dashboard/ProjectProgress';
import DepartmentGraph from '../components/dashboard/DepartmentGraph';
import NewProjectModal from '../components/modals/NewProjectModal';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({ tasksCompleted: 0, tasksInProgress: 0, projectsActive: 0, teamMembers: 0 });
  const [loading, setLoading] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const token = localStorage.getItem('token');
  const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isManager = ['manager', 'department_manager'].includes(currentUser?.role || '');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      // Fetch projects
      fetch(`${base}/projects`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(r => r.json())
        .then(d => d.data || d.projects || [])
        .catch(() => []),
      // Fetch all tasks
      fetch(`${base}/tasks`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(r => r.json())
        .then(d => d.data || d.tasks || [])
        .catch(() => []),
      // Fetch activities
      fetch(`${base}/activities`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(r => r.json())
        .then(d => d.data || d.activities || [])
        .catch(() => []),
      // Fetch team members list
      fetch(`${base}/projects/team-members/list`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(r => r.json())
        .then(d => d.data || [])
        .catch(() => [])
    ])
    .then(([projectList, taskList, activityList, memberList]) => {
      // Filter tasks to only include those belonging to the user's active/scoped projects
      const projectIds = (projectList || []).map((p: any) => (p.id || p._id)?.toString());
      const filteredTasks = (taskList || []).filter((t: any) => {
        const taskProjectId = t.projectId || t.Project?.id || (typeof t.project === 'object' ? t.project?._id || t.project?.id : t.project);
        return taskProjectId && projectIds.includes(taskProjectId.toString());
      });

      setTasks(filteredTasks);
      setActivities(activityList);

      // Calculate stats
      const completed = (filteredTasks || []).filter((t: any) => {
        const status = String(t.status || '').toLowerCase();
        return status === 'done' || status === 'completed';
      }).length;
      const inProgress = (filteredTasks || []).filter((t: any) => {
        const status = String(t.status || '').toLowerCase();
        return status === 'in-progress' || status === 'in progress';
      }).length;
      const activeProjects = (projectList || []).filter((p: any) => p.status?.toLowerCase() === 'active').length;
      
      // Calculate task counts for each project
      const projectsWithTaskCounts = (projectList || []).map((project: any) => {
        const projectTasks = (filteredTasks || []).filter((t: any) => {
          // Handle Sequelize and MongoDB fields
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
    .catch(() => {})
    .finally(() => setLoading(false));
  }, [token, base, refreshCounter]);

  if (loading) {
    return <div className="py-12 text-center"><span className="text-lg">Loading dashboard...</span></div>;
  }

  // Map backend activities to the format expected by the ActivityFeed component
  const mappedActivities = activities.map((act: any) => ({
    id: act.id || act._id,
    user: {
      name: act.User?.name || act.user?.name || 'Someone'
    },
    action: act.description || '',
    target: '',
    timestamp: act.createdAt
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <button className="btn btn-outline">Export</button>
          {currentUser?.role === 'admin' && (
            <button 
              className="btn btn-primary"
              onClick={() => setIsNewProjectModalOpen(true)}
            >
              New Project
            </button>
          )}
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
          {/* Projects section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Projects</h2>
              <a 
                href="/projects" 
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View All
              </a>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {projects && projects.length > 0 ? (
                projects
                  .slice(0, 2)
                  .map(project => (
                    <ProjectCard key={project._id || project.id} project={project} />
                  ))
              ) : (
                <p className="text-gray-500">No projects yet. Create your first project to get started.</p>
              )}
            </div>
          </div>

          {/* Tasks section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Tasks</h2>
              <a 
                href="/tasks" 
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
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

        {/* Sidebar */}
        <div className="space-y-6">
          {isManager ? (
            <DepartmentGraph />
          ) : (
            <ActivityFeed activities={mappedActivities} />
          )}
          <ProjectProgress projects={projects.slice(0, 3)} />
        </div>
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreated={() => setRefreshCounter(prev => prev + 1)}
      />
    </div>
  );
}