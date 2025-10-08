import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { formatDate } from '../lib/utils';
import { Users, ListChecks, Calendar, ArrowLeft, Info, User } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
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
            {project.members && project.members.length > 0 ? project.members.map((member: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1">
                <Avatar name={member.name || 'User'} size="sm" className="border-2 border-white dark:border-gray-800" />
                <span className="text-sm font-medium">{member.name}</span>
                {member.role && <span className="text-xs text-gray-500">({member.role})</span>}
              </div>
            )) : <span className="text-sm text-gray-500">No members assigned.</span>}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-green-500" /> Tasks</h2>
          {project.tasks && project.tasks.length > 0 ? (
            <ul className="space-y-2">
              {project.tasks.map((task: any) => (
                <li key={task._id || task.id} className="p-3 rounded bg-gray-100 dark:bg-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary-500" />
                    <span>{task.title}</span>
                  </div>
                  <Badge>{task.status}</Badge>
                </li>
              ))}
            </ul>
          ) : <span className="text-sm text-gray-500">No tasks for this project.</span>}
        </div>

        <div className="text-xs text-gray-400 mt-8">Created {formatDate(new Date(project.createdAt))}</div>
      </div>
    </div>
  );
}
