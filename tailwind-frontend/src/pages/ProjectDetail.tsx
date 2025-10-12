import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { formatDate } from '../lib/utils';
import { Users, ListChecks, Calendar, ArrowLeft, Info, User } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

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

  if (loading) return <div className="py-12 text-center"><span className="text-lg">Loading...</span></div>;
  if (!project) return <div className="py-12 text-center"><span className="text-lg">Project not found.</span></div>;

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
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-4 w-4" /> Due: {project.dueDate ? formatDate(new Date(project.dueDate)) : 'N/A'}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><ListChecks className="h-4 w-4" /> Progress: {project.progress || 0}%</span>
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
    </div>
  );
}
