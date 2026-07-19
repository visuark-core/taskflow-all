import React, { useState } from 'react';
import { Filter, Search, Plus, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import ProjectCard from '../components/dashboard/ProjectCard';
import NewProjectModal from '../components/modals/NewProjectModal';

export default function Projects() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastTaskFetchId, setLastTaskFetchId] = useState<string>('');
  const token = localStorage.getItem('token');

  // Fetch team members on mount
  React.useEffect(() => {
    fetch('http://localhost:5000/api/projects/team-members/list', {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => {
        setTeamMembers(data.data || []);
      })
      .catch(() => setTeamMembers([]));
  }, [token]);

  React.useEffect(() => {
    setLoading(true);
    
    let url = 'http://localhost:5000/api/projects';
    
    // If a member is selected, get their projects
    if (selectedMember) {
      url = `http://localhost:5000/api/projects/team-member/${selectedMember}`;
    }
    
    fetch(url, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || data.data || []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [token, isNewProjectModalOpen, refreshCounter, selectedMember]);

  // Fetch task counts for each project to display on ProjectCard
  React.useEffect(() => {
    if (projects.length === 0) return;
    // Deduplicate: only fetch if projects changed (not on every token/dependency update)
    const projectIds = projects.map(p => p._id || p.id).sort().join(',');
    if (projectIds === lastTaskFetchId) return;
    setLastTaskFetchId(projectIds);
    
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    Promise.all(projects.map(p => 
      fetch(`${base}/tasks/project/${p._id || p.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
        .then(r => r.json())
        .then(data => {
          const tasks = data.data || data.tasks || [];
          return {
            projectId: p._id || p.id,
            total: tasks.length,
            completed: tasks.filter((t: any) => {
              const status = String(t.status || '').toLowerCase();
              return status === 'done' || status === 'completed';
            }).length
          };
        })
        .catch(() => ({ projectId: p._id || p.id, total: 0, completed: 0 }))
    ))
      .then(counts => {
        const countMap = counts.reduce((acc: any, c: any) => {
          acc[c.projectId] = { total: c.total, completed: c.completed };
          return acc;
        }, {});
        setProjects(prev => prev.map(p => ({
          ...p,
          tasksCount: countMap[p._id || p.id] || { total: 0, completed: 0 }
        })));
      })
      .catch(() => {}); // silently fail, keep existing projects
  }, [projects.length, token]);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(project => project.status?.toLowerCase() === filter);

  const handleNewProject = () => {
    setIsNewProjectModalOpen(false);
  };

  const selectedMemberName = teamMembers.find(m => m._id === selectedMember)?.name || '';

  // Listen for task creation events to refetch project data
  React.useEffect(() => {
    const handleTaskCreated = () => {
      setRefreshCounter(c => c + 1);
    };
    window.addEventListener('taskCreated', handleTaskCreated);
    return () => window.removeEventListener('taskCreated', handleTaskCreated);
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        {currentUser?.role === 'admin' && (
          <button 
            className="btn btn-primary"
            onClick={() => setIsNewProjectModalOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Project
          </button>
        )}
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
          {/* Team Member Filter */}
          <div className="relative">
            <button
              className="flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setShowMemberDropdown(!showMemberDropdown)}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{selectedMemberName ? `Team Member: ${selectedMemberName}` : 'Team Members'}</span>
            </button>
            
            {showMemberDropdown && (
              <div className="absolute top-full z-50 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="max-h-64 overflow-y-auto p-2">
                  <button
                    className={`w-full rounded px-3 py-2 text-left text-sm ${
                      !selectedMember
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      setSelectedMember(null);
                      setShowMemberDropdown(false);
                    }}
                  >
                    All Projects
                  </button>
                  
                  {teamMembers.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400">
                      No team members found
                    </div>
                  ) : (
                    teamMembers.map(member => (
                      <button
                        key={member._id}
                        className={`w-full rounded px-3 py-2 text-left text-sm ${
                          selectedMember === member._id
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => {
                          setSelectedMember(member._id);
                          setShowMemberDropdown(false);
                        }}
                      >
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs opacity-75">{member.email}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              type="search"
              placeholder="Search projects..."
              className="h-9 w-full rounded-md border border-gray-300 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:placeholder:text-gray-400 sm:w-64"
            />
          </div>
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