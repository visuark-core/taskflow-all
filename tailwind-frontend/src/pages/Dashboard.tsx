import { BarChart, CheckCheck, Clock, Users } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ProjectCard from '../components/dashboard/ProjectCard';
import TaskCard from '../components/dashboard/TaskCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import ProjectProgress from '../components/dashboard/ProjectProgress';
import { 
  projects, 
  tasks, 
  recentActivities, 
  dashboardStats 
} from '../data/mockData';

export default function Dashboard() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <button className="btn btn-outline">Export</button>
          <button className="btn btn-primary">New Project</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tasks Completed"
          value={dashboardStats.tasksCompleted}
          icon={CheckCheck}
          iconColor="bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
          trend={{ value: 12, direction: 'up' }}
        />
        <StatsCard
          title="In Progress"
          value={dashboardStats.tasksInProgress}
          icon={Clock}
          iconColor="bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
          trend={{ value: 5, direction: 'up' }}
        />
        <StatsCard
          title="Active Projects"
          value={dashboardStats.projectsActive}
          icon={BarChart}
          trend={{ value: 0, direction: 'neutral' }}
        />
        <StatsCard
          title="Team Members"
          value={dashboardStats.teamMembers}
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
              {projects
                .filter(project => project.status === 'Active')
                .slice(0, 2)
                .map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))
              }
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
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ActivityFeed activities={recentActivities} />
          <ProjectProgress projects={projects.slice(0, 3)} />
        </div>
      </div>
    </div>
  );
}