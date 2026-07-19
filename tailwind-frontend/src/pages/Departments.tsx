import { useEffect, useState } from 'react';
import { Building2, Plus, Users, DollarSign, User as UserIcon, Pencil } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Department {
  id: number;
  name: string;
  description: string;
  budget: number;
  departmentManager?: User;
  Teams?: any[];
  members?: User[];
}

export default function Departments() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
    budget: 0
  });

  // Edit Modal State
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    manager: '',
    budget: 0
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/departments`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setDepartments(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setUsers(res.data.users || res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      await axios.post(
        `${API_URL}/api/departments`,
        formData,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        }
      );
      setIsModalOpen(false);
      setFormData({ name: '', description: '', manager: '', budget: 0 });
      fetchDepartments(); // Refresh list
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.response?.data?.error || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditModal = (dept: Department) => {
    setEditingDept(dept);
    setEditFormData({
      name: dept.name,
      description: dept.description || '',
      manager: dept.departmentManager?.id ? String(dept.departmentManager.id) : '',
      budget: dept.budget || 0
    });
    setUpdateError(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async () => {
    if (!editingDept) return;
    setUpdateError(null);
    setUpdating(true);
    try {
      await axios.put(
        `${API_URL}/api/departments/${editingDept.id}`,
        editFormData,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        }
      );
      setEditingDept(null);
      fetchDepartments(); // Refresh list
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || err.response?.data?.error || 'Failed to update department');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="text-primary-600 dark:text-primary-400" /> 
          Departments
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center gap-1"
          aria-label="Create Department"
        >
          <Plus className="h-4 w-4" />
          Create Department
        </button>
      </div>

      {loading && <p className="text-center text-gray-500">Loading departments...</p>}
      {error && <p className="text-center text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="card overflow-hidden rounded-xl shadow-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="h-2 bg-gradient-to-r from-primary-600 to-indigo-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                  <button
                    onClick={() => handleOpenEditModal(dept)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Edit Department"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 min-h-[40px]">
                  {dept.description || 'No description provided.'}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Manager:</span>
                    <span className="truncate">{dept.departmentManager?.name || 'Unassigned'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Budget:</span>
                    <span>${dept.budget?.toLocaleString() || '0'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      <Users className="h-3.5 w-3.5 text-primary-500" />
                      {dept.members?.length || 0} Members
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                      {dept.Teams?.length || 0} Teams
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Departments Found</h3>
              <p className="mt-1 text-gray-500">Create a new department to get started.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <h2 className="mb-6 text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Building2 className="text-primary-600 dark:text-primary-400" />
              Create Department
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Department Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Engineering"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  placeholder="Describe the department's purpose..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Manager</label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">Select a Manager (Optional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Budget ($)</label>
                <input
                  type="number"
                  name="budget"
                  placeholder="0"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
            </div>

            {createError && <p className="mt-4 text-center text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 py-2 rounded">{createError}</p>}

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn btn-primary min-w-[140px]"
              >
                {creating ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Create Department'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <h2 className="mb-6 text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Pencil className="text-primary-600 dark:text-primary-400" size={20} />
              Edit Department
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Department Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Engineering"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  placeholder="Describe the department's purpose..."
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Manager</label>
                <select
                  name="manager"
                  value={editFormData.manager}
                  onChange={handleEditInputChange}
                  className="input"
                >
                  <option value="">Select a Manager (Optional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Budget ($)</label>
                <input
                  type="number"
                  name="budget"
                  placeholder="0"
                  value={editFormData.budget}
                  onChange={handleEditInputChange}
                  className="input"
                />
              </div>
            </div>

            {updateError && <p className="mt-4 text-center text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 py-2 rounded">{updateError}</p>}

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setEditingDept(null)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="btn btn-primary min-w-[140px]"
              >
                {updating ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
