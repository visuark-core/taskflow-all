import { Activity } from '../../data/mockData';
import Avatar from '../ui/Avatar';

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return `${interval} year${interval === 1 ? '' : 's'} ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return `${interval} month${interval === 1 ? '' : 's'} ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return `${interval} day${interval === 1 ? '' : 's'} ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return `${interval} hour${interval === 1 ? '' : 's'} ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return `${interval} minute${interval === 1 ? '' : 's'} ago`;
    }
    
    return `${Math.floor(seconds)} second${seconds === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="card">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <h3 className="font-medium">Recent Activity</h3>
      </div>
      
      <div className="p-5">
        <div className="relative">
          {activities.map((activity, i) => (
            <div key={activity.id} className="flex gap-3 pb-6">
              <div className="relative">
                <Avatar name={activity.user.name} size="sm" />
                {i !== activities.length - 1 && (
                  <div className="absolute left-1/2 top-8 bottom-0 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  {activity.action}{' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {getTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-200 px-5 py-3 text-center dark:border-gray-700">
        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          View all activity
        </button>
      </div>
    </div>
  );
}