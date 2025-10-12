import { useEffect, useState } from 'react';
import { Plus, Filter, SortAsc } from 'lucide-react';
import KanbanColumn from '../components/kanban/KanbanColumn';

const defaultColumns = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

export default function KanbanBoard() {
  const [columns] = useState<any[]>(defaultColumns);
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, any[]>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [_, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const refreshTasks = () => {
    // bump selectedProject to trigger effect by resetting it briefly
    setSelectedProject((s) => s ? '' : '');
  };

  useEffect(() => {
    // fetch user's projects for the selector
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${base}/projects`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(r => r.json())
      .then(data => {
        const list = data.data || data.projects || [];
        setProjects(list);
        // default to All Projects
        setSelectedProject('');
      })
      .catch(() => setProjects([]));
  }, [token]);

  useEffect(() => {
    setLoading(true);
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // normalize helper
    const normalize = (s: any) => {
      if (!s && s !== 0) return 'todo';
      const st = String(s).toLowerCase();
      if (st === 'todo' || st === 'to do' || st === 'to-do') return 'todo';
      if (st === 'inprogress' || st === 'in-progress' || st === 'in progress' || st === 'in_progress') return 'in-progress';
      if (st === 'review') return 'review';
      if (st === 'done' || st === 'completed' || st === 'complete') return 'done';
      return st;
    };

    const groupedEmpty: Record<string, any[]> = {};
    for (const c of defaultColumns) groupedEmpty[c.id] = [];

    // If selectedProject is empty string -> fetch tasks for ALL projects
    if (selectedProject === '') {
      if (!projects || projects.length === 0) {
        setTasksByStatus(groupedEmpty);
        setLoading(false);
        return;
      }

      Promise.allSettled(projects.map((p) =>
        fetch(`${base}/tasks/project/${p._id || p.id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
          .then(r => r.json()).catch(() => ({ data: [] }))
      ))
        .then(results => {
          const allTasks: any[] = [];
          for (const r of results) {
            if (r.status === 'fulfilled') {
              const json = r.value || {};
              const data = json.data || json.tasks || [];
              allTasks.push(...data);
            }
          }

          const grouped: Record<string, any[]> = {};
          for (const c of defaultColumns) grouped[c.id] = [];
          for (const t of allTasks) {
            const status = normalize(t.status);
            if (!grouped[status]) grouped[status] = [];
            grouped[status].push(t);
          }
          setTasksByStatus(grouped);
        })
        .catch(() => setTasksByStatus(groupedEmpty))
        .finally(() => setLoading(false));

      return;
    }

    // fetch for a single project
    if (selectedProject) {
      fetch(`${base}/tasks/project/${selectedProject}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(res => res.json())
        .then(data => {
          const tasks = data.data || data.tasks || [];
          const grouped: Record<string, any[]> = {};
          for (const c of defaultColumns) grouped[c.id] = [];
          for (const t of tasks) {
            const status = normalize(t.status);
            if (!grouped[status]) grouped[status] = [];
            grouped[status].push(t);
          }
          setTasksByStatus(grouped);
        })
        .catch(() => setTasksByStatus(groupedEmpty))
        .finally(() => setLoading(false));
    } else {
      // no project selected (shouldn't reach here) -> clear
      setTasksByStatus(groupedEmpty);
      setLoading(false);
    }
  }, [selectedProject, token, projects]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kanban Board</h1>

        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <button className="flex items-center gap-1 rounded-l-md border-r border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            <button className="flex items-center gap-1 rounded-r-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
              <SortAsc className="h-3.5 w-3.5" />
              <span>Sort</span>
            </button>
          </div>

          <div className="w-64">
            <label className="sr-only">Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option value="">Select a project</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary">
            <Plus className="mr-1 h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id] || []}
            columnId={column.id}
            onMove={refreshTasks}
          />
        ))}

        <div className="flex-shrink-0 w-72">
          <button className="flex h-12 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 font-medium text-gray-500 hover:border-primary-500 hover:text-primary-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400">
            <Plus className="mr-1 h-4 w-4" />
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}