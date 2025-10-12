import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { ArrowLeft, MessageCircle, User, Calendar, Tag } from 'lucide-react';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${base}/tasks/${id}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setTask(data.data || data.task || null))
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <div className="py-12 text-center"><span className="text-lg">Loading...</span></div>;
  if (!task) return <div className="py-12 text-center"><span className="text-lg">Task not found.</span></div>;

  const project = task.project || {};

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <Link to={`/projects/${project._id || project.id || project}`} className="inline-flex items-center text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Project
        </Link>
      </div>

      <div className="card rounded-xl shadow-lg p-8 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge>{task.status}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-4 w-4" /> {task.dueDate ? formatDate(new Date(task.dueDate)) : 'No due date'}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><Tag className="h-4 w-4" /> {task.priority || 'Medium'}</span>
          </div>
        </div>

        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">{task.description}</p>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary-500" />
            <div className="flex items-center gap-3">
              {task.assignee ? (
                <>
                  <Avatar src={task.assignee.avatar} name={task.assignee.name || 'User'} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{task.assignee.name}</div>
                    <div className="text-xs text-gray-500">Assignee</div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Unassigned</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary-500" />
            <div>
              <div className="text-sm font-medium">{task.assignedBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500">Assigned by</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>
          {task.comments && task.comments.length > 0 ? (
            <ul className="space-y-3">
              {task.comments.map((c: any) => (
                <li key={c._id || c.createdAt} className="p-3 rounded bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.user?.name || 'User'} size="xs" />
                    <div>
                      <div className="text-sm font-medium">{c.user?.name || 'User'} <span className="text-xs text-gray-500">· {formatDate(new Date(c.createdAt))}</span></div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">No comments yet.</div>
          )}
        </div>

        <div className="text-xs text-gray-400 mt-8">Created {task.createdAt ? formatDate(new Date(task.createdAt)) : 'N/A'}</div>
      </div>
    </div>
  );
}
