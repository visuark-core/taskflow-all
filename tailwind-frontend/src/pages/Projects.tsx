import React, { useState } from 'react';
import { Filter, Search, Plus } from 'lucide-react';
import ProjectCard from '../components/dashboard/ProjectCard';
import NewProjectModal from '../components/modals/NewProjectModal';

export default function Projects() {
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  React.useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/projects', {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || data.data || []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [token, isNewProjectModalOpen]);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(project => project.status?.toLowerCase() === filter);

  const handleNewProject = () => {
    setIsNewProjectModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setIsNewProjectModalOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex space-x-2">
          {['all', 'active', 'completed', 'on hold'].map((status) => (
            <button
              key={status}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === status
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              type="search"
              placeholder="Search projects..."
              className="h-9 w-full rounded-md border border-gray-300 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:placeholder:text-gray-400 sm:w-64"
            />
          </div>
          
          <button className="flex h-9 items-center gap-1 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Filter className="h-3.5 w-3.5" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="py-12 text-center">
          <span className="text-lg">Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(project => (
            <ProjectCard key={project._id || project.id} project={project} />
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No projects found. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      )}

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreated={handleNewProject}
      />
    </div>
  );
}