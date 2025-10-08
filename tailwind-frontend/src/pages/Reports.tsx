import { BarChart3, PieChart, LineChart, Download } from 'lucide-react';
import { tasks, projects } from '../data/mockData';

export default function Reports() {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projectTaskCounts = projects.map(project => ({
    name: project.name,
    total: project.tasksCount.total,
    completed: project.tasksCount.completed
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button className="btn btn-outline">
          <Download className="mr-1 h-4 w-4" />
          Export Data
        </button>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Tasks by Status</h3>
            <div className="rounded-full bg-primary-100 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <PieChart className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{status}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${
                      status === 'Completed'
                        ? 'bg-green-500'
                        : status === 'In Progress'
                        ? 'bg-blue-500'
                        : status === 'Review'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                    style={{ width: `${(count / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Tasks by Priority</h3>
            <div className="rounded-full bg-secondary-100 p-2 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(priorityCounts).map(([priority, count]) => (
              <div key={priority}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{priority}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${
                      priority === 'Critical'
                        ? 'bg-red-600'
                        : priority === 'High'
                        ? 'bg-red-500'
                        : priority === 'Medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(count / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Team Performance</h3>
            <div className="rounded-full bg-accent-100 p-2 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
              <LineChart className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-2 mt-6">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary-500 mr-2"></div>
              <span className="text-sm">Assigned Tasks</span>
              <span className="ml-auto text-sm font-medium">45</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">Completed</span>
              <span className="ml-auto text-sm font-medium">28</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
              <span className="text-sm">In Progress</span>
              <span className="ml-auto text-sm font-medium">12</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm">Overdue</span>
              <span className="ml-auto text-sm font-medium">5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Progress table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="font-medium">Project Progress</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {projectTaskCounts.map((project, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {project.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-full max-w-xs">
                        <div className="flex items-center justify-between">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{
                                width: `${Math.round((project.completed / project.total) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="ml-2 text-sm">
                            {Math.round((project.completed / project.total) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span>{project.completed}</span>
                    <span className="text-gray-500 dark:text-gray-400">/{project.total}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        (project.completed / project.total) === 1
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : (project.completed / project.total) > 0.5
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {(project.completed / project.total) === 1
                        ? 'Completed'
                        : (project.completed / project.total) > 0.5
                        ? 'On Track'
                        : 'Behind'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}