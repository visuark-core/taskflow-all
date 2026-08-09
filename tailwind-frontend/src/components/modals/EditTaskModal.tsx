import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { X } from 'lucide-react';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedTask: any) => void;
  task: any;
}

export default function EditTaskModal({ isOpen, onClose, onSubmit, task }: EditTaskModalProps) {
  const token = useSelector((state: RootState) => state.auth.token);
  
  // Resolve IDs from objects or IDs directly
  const assigneeId = task?.assignee?._id || task?.assignee?.id || task?.assignee || '';
  const projectId = task?.Project?._id || task?.Project?.id || task?.project?._id || task?.project?.id || task?.projectId || '';

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee: assigneeId,
    project: projectId,
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });
  
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects and users from backend
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    Promise.all([
      axios.get(`${base}/projects`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }),
      axios.get(`${base}/users`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      })
    ]).then(([projectsRes, usersRes]) => {
      setProjects(projectsRes.data.projects || projectsRes.data.data || []);
      setUsers(usersRes.data.users || usersRes.data.data || []);
    }).catch(() => {
      setProjects([]);
      setUsers([]);
    }).finally(() => setLoading(false));
  }, [isOpen, token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProj = projects.find(p => (p._id || p.id) === formData.project);
    if (selectedProj && selectedProj.dueDate && formData.dueDate) {
      const projDate = new Date(selectedProj.dueDate);
      const taskDate = new Date(formData.dueDate);
      if (taskDate > projDate) {
        alert(`Task due date cannot be after the selected project's deadline (${new Date(selectedProj.dueDate).toISOString().split('T')[0]})`);
        return;
      }
    }

    // Prepare payload for backend
    const payload = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee: formData.assignee || undefined,
      assigneeId: formData.assignee || undefined,
      project: formData.project,
      projectId: formData.project,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    };
    
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    const taskId = task?._id || task?.id;

    axios.put(`${base}/tasks/${taskId}`, payload, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        onSubmit(res.data.data);
        onClose();
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to update task');
      });
  };

  if (!isOpen) return null;
  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 text-center">
        <span className="text-lg text-gray-700 dark:text-gray-300">Loading...</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold dark:text-white">Edit Task</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignee
              </label>
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id || user.id} value={user._id || user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project
              </label>
              <select
                required
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project._id || project.id} value={project._id || project.id}>
                    {project.name} {project.status ? `(${project.status.charAt(0).toUpperCase() + project.status.slice(1)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due Date
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
