import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { formatDate } from '../lib/utils';
import { Users, ListChecks, Calendar, ArrowLeft, Info, User, Trash2, Edit, X, Handshake, Receipt } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { Link as RouterLink } from 'react-router-dom';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const token = localStorage.getItem('token');
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Check if current user can delete
  const canDelete = project && (
    project.owner?._id === currentUser?.id ||
    project.owner?.id === currentUser?.id ||
    project.members?.some((m: any) => (m.user?._id === currentUser?.id || m.user?.id === currentUser?.id) && m.role === 'admin') ||
    currentUser?.role === 'admin'
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [updatingProject, setUpdatingProject] = useState(false);
  const [editClientId, setEditClientId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [editServiceId, setEditServiceId] = useState('');
  const [editBudget, setEditBudget] = useState(0);
  const [services, setServices] = useState<any[]>([]);

  // Check if current user can edit
  const canEdit = project && (
    project.owner?._id === currentUser?.id ||
    project.owner?.id === currentUser?.id ||
    project.members?.some((m: any) => (m.user?._id === currentUser?.id || m.user?.id === currentUser?.id) && m.role === 'admin') ||
    currentUser?.role === 'admin'
  );

  const handleOpenEdit = () => {
    setEditName(project.name || '');
    setEditDescription(project.description || '');
    setEditStatus(project.status || 'planning');
    setEditDueDate((project.endDate || project.dueDate) ? new Date(project.endDate || project.dueDate).toISOString().split('T')[0] : '');
    setEditClientId(project.clientId || project.client?.id || '');
    setEditServiceId(project.serviceId || project.service?.id || '');
    setEditBudget(project.budget || 0);
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    if (editDueDate && tasks && tasks.length > 0) {
      const proposedProjDate = new Date(editDueDate);
      const activeTasksWithDueDate = tasks.filter(t => t.dueDate);
      if (activeTasksWithDueDate.length > 0) {
        const maxTaskDate = new Date(Math.max(...activeTasksWithDueDate.map(t => new Date(t.dueDate).getTime())));
        if (proposedProjDate < maxTaskDate) {
          alert(`Project deadline cannot be earlier than the latest task due date (${maxTaskDate.toISOString().split('T')[0]})`);
          return;
        }
      }
    }

    setUpdatingProject(true);
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          status: editStatus,
          dueDate: editDueDate ? new Date(editDueDate) : null,
          endDate: editDueDate ? new Date(editDueDate) : null,
          clientId: editClientId || null,
          serviceId: editServiceId || null,
          budget: parseFloat(editBudget as any) || 0
        })
      });

      const data = await response.json();
      if (data.success || response.ok) {
        const selectedClient = clients.find(c => String(c.id) === String(editClientId));
        const selectedService = services.find(s => String(s.id) === String(editServiceId));
        const updatedFields = {
          name: editName,
          description: editDescription,
          status: editStatus,
          endDate: editDueDate ? new Date(editDueDate) : null,
          dueDate: editDueDate ? new Date(editDueDate) : null,
          clientId: editClientId || null,
          client: selectedClient || null,
          serviceId: editServiceId || null,
          service: selectedService || null,
          budget: parseFloat(editBudget as any) || 0
        };
        setProject((prev: any) => ({ ...prev, ...updatedFields }));
        setIsEditModalOpen(false);
      } else {
        alert(data.error || 'Failed to update project');
      }
    } catch (error) {
      alert('Error updating project');
    } finally {
      setUpdatingProject(false);
    }
  };

  // Calculate progress from tasks
  const progressPercentage = tasks.length > 0
    ? Math.round((tasks.filter(t => {
        const status = String(t.status || '').toLowerCase();
        return status === 'done' || status === 'completed';
      }).length / tasks.length) * 100)
    : (project?.progress || 0);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/projects/${id}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setProject(data.project || data.data || null))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Fetch tasks separately so we have populated assignee info
  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:5000/api/tasks/project/${id}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setTasks(data.data || data.tasks || []))
      .catch(() => setTasks([]));
  }, [id, token]);

  // Fetch clients for project edit dropdown
  useEffect(() => {
    if (isEditModalOpen) {
      fetch('http://localhost:5000/api/clients', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
        .then(res => res.json())
        .then(data => setClients(data.data || []))
        .catch(() => setClients([]));

      fetch('http://localhost:5000/api/services', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
        .then(res => res.json())
        .then(data => setServices(data.data || []))
        .catch(() => setServices([]));
    }
  }, [isEditModalOpen, token]);

  if (loading) return <div className="py-12 text-center"><span className="text-lg">Loading...</span></div>;
  if (!project) return <div className="py-12 text-center"><span className="text-lg">Project not found.</span></div>;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      if (response.ok) {
        navigate('/projects');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      alert('Error deleting project');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>
      </div>
      <div className="card rounded-xl shadow-lg p-8 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge>{project.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 md:mt-0">
            <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-4 w-4" /> Due: {(project.endDate || project.dueDate) ? formatDate(new Date(project.endDate || project.dueDate)) : 'N/A'}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><ListChecks className="h-4 w-4" /> Progress: {progressPercentage}%</span>
            {project.client && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Handshake className="h-4 w-4 text-orange-500" /> Client: <RouterLink to="/clients" className="text-primary-600 hover:underline">{project.client.name}</RouterLink>
              </span>
            )}
            {project.service && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Receipt className="h-4 w-4 text-teal-500" /> Service: <span className="font-semibold text-gray-700 dark:text-gray-250">{project.service.name}</span> (₹{project.budget || 0})
              </span>
            )}
            {canEdit && (
              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 transition-colors shadow-sm"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">{project.description}</p>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Team Members</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Show owner first if populated */}
            {project.owner && (
              <div key={`owner-${project.owner._id || project.owner.id || 'owner'}`} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1">
                <Avatar src={project.owner.avatar} name={project.owner.name || 'Owner'} size="sm" className="border-2 border-white dark:border-gray-800" />
                <span className="text-sm font-medium">{project.owner.name || 'Owner'}</span>
                <span className="text-xs text-gray-500">(Owner)</span>
              </div>
            )}

            {project.members && project.members.length > 0 ? (
              project.members.map((member: any, i: number) => {
                // member may be populated as { user: {name,...}, role } or a flat user object
                const user = member.user || member;
                const name = user?.name || 'User';
                const avatar = user?.avatar;
                const role = member.role || (member.user?.role) || '';
                return (
                  <div key={user._id || user.id || i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1">
                    <Avatar src={avatar} name={name} size="sm" className="border-2 border-white dark:border-gray-800" />
                    <span className="text-sm font-medium">{name}</span>
                    {role && <span className="text-xs text-gray-500">({role})</span>}
                  </div>
                );
              })
            ) : (
              // If there are no members in the members array, but owner exists we already showed owner
              (!project.owner ? <span className="text-sm text-gray-500">No members assigned.</span> : null)
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-green-500" /> Tasks</h2>
          {tasks && tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map((task: any) => {
                // compute a robust id from several possible shapes returned by the API or mock data
                const rawId = task._id ?? task.id ?? (task._doc && (task._doc._id ?? task._doc.id));
                const nestedOid = rawId && rawId.$oid ? rawId.$oid : undefined;
                const tid = (typeof rawId === 'string' && rawId) || (rawId && rawId.toString && rawId.toString()) || nestedOid || undefined;

                return (
                  <li key={tid || task._id || task.id} className="p-3 rounded bg-gray-100 dark:bg-gray-800 flex justify-between items-center">
                    {tid ? (
                      <Link to={`/tasks/${encodeURIComponent(tid)}`} className="flex items-center gap-3 no-underline text-inherit">
                        <User className="h-4 w-4 text-primary-500" />
                        <div className="flex flex-col">
                          <span className="font-medium">{task.title}</span>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {task.assignee ? (
                              <>
                                <Avatar name={task.assignee.name || 'User'} size="xs" />
                                <span>Assigned to {task.assignee.name}</span>
                              </>
                            ) : (
                              <span>Unassigned</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-primary-500" />
                        <div className="flex flex-col">
                          <span className="font-medium">{task.title}</span>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {task.assignee ? (
                              <>
                                <Avatar name={task.assignee.name || 'User'} size="xs" />
                                <span>Assigned to {task.assignee.name}</span>
                              </>
                            ) : (
                              <span>Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <Badge>{task.status}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : <span className="text-sm text-gray-500">No tasks for this project.</span>}
        </div>

        <div className="text-xs text-gray-400 mt-8">Created {formatDate(new Date(project.createdAt))}</div>
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-850 dark:text-gray-100">
                  Edit Project details
                </h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Project Name
                  </label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Due Date
                    </label>
                    <input 
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Client
                    </label>
                    <select
                      value={editClientId}
                      onChange={(e) => setEditClientId(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">No Client (Internal)</option>
                      {clients.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Service Type
                    </label>
                    <select
                      value={editServiceId}
                      onChange={(e) => setEditServiceId(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">No Service Type</option>
                      {services.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Project Value (₹ Service Price)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editBudget}
                    onChange={(e) => setEditBudget(parseFloat(e.target.value) || 0)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updatingProject}
                  className="btn btn-primary px-4 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {updatingProject ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
