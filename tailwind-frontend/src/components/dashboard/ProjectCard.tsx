import { Link } from 'react-router-dom';
import { Project } from '../../data/mockData';
import { formatDate } from '../../lib/utils';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // Fallbacks for backend data
  const tasksCount = project.tasksCount || { completed: 0, total: 0 };
  const members = project.members || [];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'default' }> = {
      'Active': { variant: 'success' },
      'Completed': { variant: 'success' },
      'On Hold': { variant: 'warning' },
    };
    const { variant } = statusMap[status] || { variant: 'default' };
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="relative bg-gradient-to-r from-primary-600 to-secondary-500 h-3">
          <div 
            className="absolute bottom-0 left-0 h-full bg-white/30 dark:bg-white/20"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <Link 
              to={`/projects/${project._id || project.id}`} 
              className="text-lg font-semibold hover:text-primary-600 dark:hover:text-primary-400"
            >
              {project.name}
            </Link>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {project.description}
            </p>
          </div>
          <div>{getStatusBadge(project.status)}</div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium">{project.progress}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tasksCount.completed}/{tasksCount.total} tasks
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Due {project.dueDate ? formatDate(new Date(project.dueDate)) : 'N/A'}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {members.slice(0, 3).map((member: any, i: number) => (
              <Avatar 
                key={i} 
                name={member.name || 'User'} 
                size="xs" 
                className="border-2 border-white dark:border-gray-800" 
              />
            ))}
            {members.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium dark:border-gray-800 dark:bg-gray-700">
                +{members.length - 3}
              </div>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Created {formatDate(new Date(project.createdAt))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}