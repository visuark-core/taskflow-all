import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  UserPlus, 
  CheckSquare, 
  Trash2,
  Check,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setNotifications(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const markAsRead = async (id: number) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setNotifications(prev => 
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/api/notifications/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await axios.delete(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'task_completed':
        return <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" />;
      case 'task_due':
      case 'deadline_approaching':
        return <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />;
      case 'project_invite':
        return <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'mention':
      case 'comment_reply':
        return <MessageSquare className="h-5 w-5 text-pink-600 dark:text-pink-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-gray-500">Manage your updates and alert preferences</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="btn btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-6">
          {(['all', 'unread', 'read'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`pb-4 text-sm font-medium border-b-2 capitalize transition-colors duration-200 ${
                filter === tab
                  ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
              {tab === 'unread' && notifications.filter(n => !n.isRead).length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p className="text-center text-gray-500 py-8">Loading notifications...</p>}
      {error && <p className="text-center text-red-500 py-8">Error: {error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              <Bell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : filter} notifications found.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800/50 shadow-sm">
              {filteredNotifications.map((n) => {
                const itemWrapperClass = `p-4 flex items-start gap-4 transition-colors duration-200 ${
                  !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/10'
                }`;

                const contentNode = (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                          ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    {(n.relatedProject || n.relatedTask) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.relatedProject && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                            Project: {n.relatedProject.name}
                          </span>
                        )}
                        {n.relatedTask && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                            Task: {n.relatedTask.title}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );

                return (
                  <div 
                    key={n.id} 
                    className={itemWrapperClass}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                  >
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80">
                      {getIcon(n.type)}
                    </div>

                    {n.link ? (
                      <Link to={n.link} className="flex-1 flex gap-2 hover:no-underline">
                        {contentNode}
                        <ChevronRight className="h-4 w-4 text-gray-400 self-center" />
                      </Link>
                    ) : (
                      contentNode
                    )}

                    <div className="ml-2 flex items-center gap-1.5 self-center">
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
