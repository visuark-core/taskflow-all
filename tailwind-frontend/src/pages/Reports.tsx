import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, LineChart, Download, AlertCircle } from 'lucide-react';

export default function Reports() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    setLoading(true);
    setError(null);

    const base = 'http://localhost:5000/api';

    Promise.all([
      fetch(`${base}/tasks`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      }).then(res => {
        if (!res.ok) throw new Error('Failed to load tasks');
        return res.json();
      }),
      fetch(`${base}/projects`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      }).then(res => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
    ])
      .then(([tasksData, projectsData]) => {
        setTasks(tasksData.data || tasksData.tasks || []);
        setProjects(projectsData.data || projectsData.projects || []);
      })
      .catch(err => {
        setError(err.message || 'Failed to load report analytics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Aggregate metrics dynamically from real database
  const statusCounts = tasks.reduce((acc, task) => {
    const s = String(task.status || '').toLowerCase();
    const status = s === 'in-progress' || s === 'active' ? 'In Progress'
                 : s === 'done' || s === 'completed' ? 'Completed'
                 : s === 'review' ? 'Review'
                 : 'To Do';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = tasks.reduce((acc, task) => {
    const rawPriority = String(task.priority || 'medium').toLowerCase();
    const priority = rawPriority === 'urgent' ? 'Urgent'
                   : rawPriority === 'high' ? 'High'
                   : rawPriority === 'low' ? 'Low'
                   : 'Medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projectTaskCounts = projects.map(project => {
    const projTasks = tasks.filter(t => t.projectId === project.id || t.projectId === project._id);
    const completed = projTasks.filter(t => {
      const s = String(t.status || '').toLowerCase();
      return s === 'done' || s === 'completed';
    }).length;
    return {
      name: project.name,
      total: projTasks.length,
      completed
    };
  });

  const totalAssigned = tasks.length;
  const totalCompleted = tasks.filter(t => {
    const s = String(t.status || '').toLowerCase();
    return s === 'done' || s === 'completed';
  }).length;
  const totalInProgress = tasks.filter(t => {
    const s = String(t.status || '').toLowerCase();
    return s === 'in-progress' || s === 'active';
  }).length;
  const totalOverdue = tasks.filter(t => {
    const s = String(t.status || '').toLowerCase();
    return t.dueDate && new Date(t.dueDate) < new Date() && s !== 'done' && s !== 'completed';
  }).length;

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto" />
        <p className="text-gray-500 dark:text-gray-400">Loading reports & analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-md mx-auto p-6 text-center space-y-4 my-12 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analytics Error</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button className="btn btn-outline flex items-center gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tasks by Status</h3>
            <div className="rounded-full bg-primary-100 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <PieChart className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No tasks found</p>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{status}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${
                        status === 'Completed'
                          ? 'bg-emerald-500'
                          : status === 'In Progress'
                          ? 'bg-blue-500'
                          : status === 'Review'
                          ? 'bg-amber-500'
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}
                      style={{ width: `${totalAssigned > 0 ? (count / totalAssigned) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tasks by Priority</h3>
            <div className="rounded-full bg-secondary-100 p-2 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            {Object.keys(priorityCounts).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No tasks found</p>
            ) : (
              Object.entries(priorityCounts).map(([priority, count]) => (
                <div key={priority}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{priority}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${
                        priority === 'Urgent'
                          ? 'bg-rose-600'
                          : priority === 'High'
                          ? 'bg-orange-500'
                          : priority === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${totalAssigned > 0 ? (count / totalAssigned) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Team Performance</h3>
            <div className="rounded-full bg-accent-100 p-2 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
              <LineChart className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-3.5 mt-6">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary-500 mr-2.5"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Assigned Tasks</span>
              <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-gray-100">{totalAssigned}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2.5"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              <span className="ml-auto text-sm font-semibold text-gray-950 dark:text-gray-50">{totalCompleted}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-blue-500 mr-2.5"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="ml-auto text-sm font-semibold text-gray-950 dark:text-gray-50">{totalInProgress}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-rose-600 mr-2.5"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Overdue</span>
              <span className="ml-auto text-sm font-semibold text-rose-600 dark:text-rose-400">{totalOverdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Progress table */}
      <div className="card overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Project Progress</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Project Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Task Completion Rate
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total Tasks
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
              {projectTaskCounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    No active projects found
                  </td>
                </tr>
              ) : (
                projectTaskCounts.map((project, i) => {
                  const rate = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {project.name}
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-sm font-medium">
                        <span className="text-gray-900 dark:text-gray-100">{project.completed}</span>
                        <span className="text-gray-400 dark:text-gray-500">/{project.total}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-sm">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            rate === 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : rate > 50
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-455'
                          }`}
                        >
                          {rate === 100
                            ? 'Completed'
                            : rate > 50
                            ? 'On Track'
                            : 'Behind'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}