import { Link } from 'react-router-dom';
import { Project } from '../../data/mockData';
import { formatDate } from '../../lib/utils';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { Trash2, Handshake } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: number | string) => void;
  showDelete?: boolean;
}

export default function ProjectCard({ project, onDelete, showDelete }: ProjectCardProps) {
  // Fallbacks for backend data
  const tasksCount = project.tasksCount || { completed: 0, total: 0 };
  // Handle both flat member arrays and nested member.user structure
  const membersList = project.members?.map((m: any) => m.user || m) || [];
  // Include owner in the members list if not already there
  const allMembers = project.owner && !membersList.find((m: any) => m._id === project.owner._id)
    ? [project.owner, ...membersList]
    : membersList;
  // Calculate progress percentage from task counts
  const progressPercentage = tasksCount.total > 0 
    ? Math.round((tasksCount.completed / tasksCount.total) * 100) 
    : (project.progress || 0);

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
            style={{ width: `${progressPercentage}%` }}
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
            {project.client && (
              <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-orange-650 dark:text-orange-400">
                <Handshake size={13} className="shrink-0" />
                <span>{project.client.name}</span>
              </div>
            )}
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
              {project.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(project.status)}
            {showDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project._id || project.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                title="Delete Project"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium">{progressPercentage}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tasksCount.completed}/{tasksCount.total} tasks
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Due {(project.endDate || project.dueDate) ? formatDate(new Date(project.endDate || project.dueDate)) : 'N/A'}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {allMembers.slice(0, 3).map((member: any, i: number) => (
              <Avatar 
                key={i} 
                name={member.name || 'User'} 
                size="xs" 
                className="border-2 border-white dark:border-gray-800" 
              />
            ))}
            {allMembers.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium dark:border-gray-800 dark:bg-gray-700">
                +{allMembers.length - 3}
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