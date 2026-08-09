import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Tag, ExternalLink, X, Calendar as CalendarIcon, Info, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPriorityColor } from '../lib/utils';

const defaultColumns = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editingDueDate, setEditingDueDate] = useState('');
  const [editingStatus, setEditingStatus] = useState('');

  const token = localStorage.getItem('token');

  // Fetch projects list
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    fetch(`${base}/projects`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(r => r.json())
      .then(data => {
        const list = data.data || data.projects || [];
        setProjects(list);
        setSelectedProject('');
      })
      .catch(() => setProjects([]));
  }, [token]);

  // Fetch tasks
  useEffect(() => {
    setLoading(true);
    const base = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

    if (selectedProject === '') {
      if (!projects || projects.length === 0) {
        setAllTasks([]);
        setLoading(false);
        return;
      }

      Promise.allSettled(projects.map((p) =>
        fetch(`${base}/tasks/project/${p._id || p.id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
          .then(r => r.json()).catch(() => ({ data: [] }))
      ))
        .then(results => {
          const tasks: any[] = [];
          for (const r of results) {
            if (r.status === 'fulfilled') {
              const json = r.value || {};
              const data = json.data || json.tasks || [];
              tasks.push(...data);
            }
          }
          setAllTasks(tasks);
        })
        .catch(() => setAllTasks([]))
        .finally(() => setLoading(false));

      return;
    }

    if (selectedProject) {
      fetch(`${base}/tasks/project/${selectedProject}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        .then(res => res.json())
        .then(data => {
          setAllTasks(data.data || data.tasks || []);
        })
        .catch(() => setAllTasks([]))
        .finally(() => setLoading(false));
    }
  }, [selectedProject, token, projects, refreshTrigger]);

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setEditingDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setEditingStatus(task.status || 'todo');
  };

  const handleQuickSave = async () => {
    if (!selectedTask) return;

    const projId = selectedTask.projectId || selectedTask.project || (selectedTask.Project && (selectedTask.Project._id || selectedTask.Project.id));
    const parentProj = projects.find(p => (p._id || p.id) === projId);
    if (parentProj && parentProj.dueDate && editingDueDate) {
      const projDate = new Date(parentProj.dueDate);
      const taskDate = new Date(editingDueDate);
      if (taskDate > projDate) {
        alert(`Task due date cannot be after the project's deadline (${new Date(parentProj.dueDate).toISOString().split('T')[0]})`);
        return;
      }
    }

    const base = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const tid = selectedTask._id || selectedTask.id;
      const response = await fetch(`${base}/tasks/${tid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          dueDate: editingDueDate ? new Date(editingDueDate) : null,
          status: editingStatus
        })
      });
      const data = await response.json();
      if (data.success) {
        setRefreshTrigger(prev => prev + 1);
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const snapToday = () => {
    setCurrentMonth(new Date());
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  const renderHeader = () => {
    const dateFormat = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Interactive Calendar</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <div className="w-56">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 shadow-sm text-gray-800 dark:text-gray-200">
            <button
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold mx-3 min-w-[7.5rem] text-center">
              {dateFormat.format(currentMonth)}
            </h2>
            <button
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button 
            onClick={snapToday} 
            className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 text-sm transition-colors shadow-sm"
          >
            Today
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    
    const startDate = new Date(currentMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/40" key={i}>
          {dateFormat.format(new Date(startDate))}
        </div>
      );
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = day.getDate().toString();
        const cloneDay = new Date(day);
        
        // Filter tasks scheduled on this day
        const dayEvents = (allTasks || []).filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return (
            taskDate.getDate() === cloneDay.getDate() &&
            taskDate.getMonth() === cloneDay.getMonth() &&
            taskDate.getFullYear() === cloneDay.getFullYear()
          );
        });

        // Filter projects launching today
        const projectsStartingToday = (projects || []).filter(proj => {
          const rawStart = proj.startDate;
          if (!rawStart) return false;
          const start = new Date(rawStart);
          return (
            start.getDate() === cloneDay.getDate() &&
            start.getMonth() === cloneDay.getMonth() &&
            start.getFullYear() === cloneDay.getFullYear()
          );
        });

        // Filter project deadlines ending today
        const projectsEndingToday = (projects || []).filter(proj => {
          const rawEnd = proj.endDate || proj.dueDate;
          if (!rawEnd) return false;
          const end = new Date(rawEnd);
          return (
            end.getDate() === cloneDay.getDate() &&
            end.getMonth() === cloneDay.getMonth() &&
            end.getFullYear() === cloneDay.getFullYear()
          );
        });

        // Filter projects active intermediate today
        const projectsActiveToday = (projects || []).filter(proj => {
          const rawStart = proj.startDate;
          const rawEnd = proj.endDate || proj.dueDate;
          if (!rawStart || !rawEnd) return false;

          const start = new Date(rawStart);
          start.setHours(0,0,0,0);
          const end = new Date(rawEnd);
          end.setHours(23,59,59,999);
          const current = new Date(cloneDay);
          current.setHours(12,0,0,0);

          const isBetween = current > start && current < end;
          
          const isBoundary = 
            (start.getDate() === cloneDay.getDate() && start.getMonth() === cloneDay.getMonth() && start.getFullYear() === cloneDay.getFullYear()) ||
            (end.getDate() === cloneDay.getDate() && end.getMonth() === cloneDay.getMonth() && end.getFullYear() === cloneDay.getFullYear());

          return isBetween && !isBoundary;
        });

        const totalScheduledCount = dayEvents.length + projectsStartingToday.length + projectsEndingToday.length + projectsActiveToday.length;

        days.push(
          <div
            className={`min-h-[120px] p-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all ${
              day.getMonth() !== currentMonth.getMonth()
                ? "bg-gray-50/40 text-gray-400 dark:bg-gray-850/20 dark:text-gray-600"
                : "text-gray-800 dark:text-gray-200"
            }`}
            key={day.toString()}
          >
            <div className="flex justify-between items-center mb-1">
              <span
                className={`text-xs font-semibold h-5 w-5 rounded-full flex items-center justify-center ${
                  isToday(day)
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {formattedDate}
              </span>
              {totalScheduledCount > 0 && (
                <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">
                  {totalScheduledCount} scheduled
                </span>
              )}
            </div>

            <div className="mt-1 space-y-1 max-h-[85px] overflow-y-auto scrollbar-none">
              {/* Projects Starting Today */}
              {projectsStartingToday.map((proj) => (
                <Link
                  key={`proj-start-${proj.id || proj._id}`}
                  to={`/projects/${proj.id || proj._id}`}
                  className="block text-[9px] font-bold rounded px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white truncate hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm border border-emerald-600/30 dark:border-emerald-950/40"
                  title={`Project Launch: ${proj.name}`}
                >
                  <Folder className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">🚀 {proj.name} Starts</span>
                </Link>
              ))}

              {/* Projects Active Intermediate Today */}
              {projectsActiveToday.map((proj) => (
                <Link
                  key={`proj-active-${proj.id || proj._id}`}
                  to={`/projects/${proj.id || proj._id}`}
                  className="block text-[8px] font-semibold rounded px-1.5 py-0.5 bg-sky-50 text-sky-800 dark:bg-sky-950/20 dark:text-sky-300 border-l-2 border-sky-500 truncate hover:opacity-90 transition-opacity flex items-center gap-1"
                  title={`Active Project Frame: ${proj.name}`}
                >
                  <Folder className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{proj.name} Span</span>
                </Link>
              ))}

              {/* Projects Ending Today (Deadline) */}
              {projectsEndingToday.map((proj) => (
                <Link
                  key={`proj-end-${proj.id || proj._id}`}
                  to={`/projects/${proj.id || proj._id}`}
                  className="block text-[9px] font-bold rounded px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white truncate hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm border border-rose-600/30 dark:border-rose-900/40"
                  title={`Project Deadline: ${proj.name}`}
                >
                  <Folder className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">🏁 {proj.name} Deadline</span>
                </Link>
              ))}

              {/* Task Events rendering */}
              {dayEvents.map((event, idx) => {
                const priority = (event.priority || 'medium').toLowerCase();
                const pColor = priority === 'low' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                             : priority === 'high' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300 border-orange-200 dark:border-orange-800/60'
                             : priority === 'urgent' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border-red-200 dark:border-red-800/60'
                             : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';

                return (
                  <div
                    key={idx}
                    onClick={() => handleTaskClick(event)}
                    className={`text-[9px] font-medium rounded px-1.5 py-0.5 border cursor-pointer truncate hover:brightness-95 dark:hover:brightness-110 active:scale-95 transition-all ${pColor}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = new Date(day);
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mt-0">{rows}</div>;
  };

  return (
    <div className="animate-fade-in space-y-6">
      {renderHeader()}
      
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Loading calendar schedules...</p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-md border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
          {renderDays()}
          {renderCells()}
        </div>
      )}

      {/* Task Event Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-850 dark:text-gray-100">
                  Manage Task Schedule
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider">
                  Task Title
                </h4>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1">
                  {selectedTask.title}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-2">
                  Task Specifications
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-200 dark:border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-[9px] text-gray-400">Priority</div>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${getPriorityColor(selectedTask.priority)}`}>
                        {selectedTask.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-[9px] text-gray-400">Assignee</div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[6.25rem] inline-block">
                        {selectedTask.assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider">
                    Description
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-3 bg-gray-50 dark:bg-gray-800/20 p-2.5 rounded border border-gray-200 dark:border-gray-800">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Schedule Management Form */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input 
                    type="date" 
                    value={editingDueDate}
                    onChange={(e) => setEditingDueDate(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1.5">
                    Task Status
                  </label>
                  <select
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  >
                    {defaultColumns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-between items-center">
              <Link 
                to={`/tasks/${selectedTask._id || selectedTask.id}`}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Full Details
              </Link>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleQuickSave}
                  className="btn btn-primary px-3 py-1.5 text-xs transition-colors shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}