import React, { useState } from 'react';
import { Filter, Search, Plus, ListFilter, LayoutGrid } from 'lucide-react';
import TaskCard from '../components/dashboard/TaskCard';
import NewProjectModal from '../components/modals/NewProjectModal';
import Badge from '../components/ui/Badge';
import NewTaskModal from '../components/modals/NewTaskModal';

export default function Tasks() {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  // Fetch projects on mount
  React.useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
          // Select first project by default
          if (data.data.length > 0) setSelectedProject(data.data[0]._id || data.data[0].id);
        }
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Fetch tasks when selectedProject changes
  React.useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    async function fetchTasks() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tasks/project/${selectedProject}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setTasks(data.data);
        }
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [selectedProject]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  
  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(task => task.status === filter);

  const handleNewTask = () => {
    setIsNewTaskModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-primary"
            onClick={() => setIsNewTaskModalOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Task
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setIsNewProjectModalOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Create Project
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', 'to-do', 'in-progress', 'review', 'completed'].map((status) => (
            <button
              key={status}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === status
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' 
                ? 'All' 
                : status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              type="search"
              placeholder="Search tasks..."
              className="h-9 w-full rounded-md border border-gray-300 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:placeholder:text-gray-400 sm:w-64"
            />
          </div>
          
          <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-700">
            <button 
              className={`p-2 ${view === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              className={`p-2 ${view === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              <ListFilter className="h-4 w-4" />
            </button>
          </div>
          
          <button className="flex h-9 items-center gap-1 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Project selector */}
      {projects.length === 0 ? (
        <div className="py-12 text-center">
          <span className="text-lg">No projects found.</span>
          <div className="mt-4">
            <button className="btn btn-primary" onClick={() => setIsNewProjectModalOpen(true)}>
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
            {projects.map(project => (
              <option key={project._id || project.id} value={project._id || project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      )}
      {loading ? (
        <div className="py-12 text-center">
          <span className="text-lg">Loading...</span>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map(task => (
            <TaskCard key={task._id || task.id} task={task} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No tasks found. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTasks.map((task) => (
                <tr 
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <a href={`/tasks/${task.id}`} className="font-medium hover:text-primary-600 dark:hover:text-primary-400">
                        {task.title}
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {task.project.name}
                      </p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge className={task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                      {task.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge className={task.priority === 'High' || task.priority === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {task.assignee ? (
                      <div className="flex items-center">
                        <div className="h-6 w-6 flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-primary-500" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm">{task.assignee.name}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTasks.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No tasks found. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      )}

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSubmit={handleNewTask}
      />
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreated={() => window.location.reload()}
      />
    </div>
 );
}