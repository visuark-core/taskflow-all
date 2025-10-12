import { Link } from 'react-router-dom';
import { formatDate, getPriorityColor, getStatusColor } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import { MessageSquare, Paperclip, Clock } from 'lucide-react';

interface TaskCardProps {
  task: any; // using any because API returns tasks with _id and different shapes
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="card hover:shadow-md dark:hover:shadow-none transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <Link 
            to={`/tasks/${task._id || task.id}`}
            className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
          >
            {task.title}
          </Link>
          
          <div className="flex items-center space-x-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {task.description}
        </p>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {task.assignee ? (
              <div className="flex items-center">
                <Avatar 
                  name={task.assignee.name} 
                  size="xs" 
                />
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                  {task.assignee.name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Unassigned
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{task.comments}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="text-xs">{task.attachments}</span>
            </div>
          </div>
          
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Clock className="mr-1 h-3.5 w-3.5" />
            <span>Due {formatDate(new Date(task.dueDate))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}