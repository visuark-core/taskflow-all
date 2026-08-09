import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import { Mail, Plus, Trash2, Pencil } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

export default function Team() {
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    password: '',
  });
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    password: '',
  });
  const [updatingMember, setUpdatingMember] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Helper function to capitalize the first letter
  function capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${API_URL}/api/users`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        setUsers(res.data.users || res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/departments`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch departments', err);
      }
    };

    fetchUsers();
    fetchDepartments();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddMember = async () => {
    setAddError(null);
    setAddingMember(true);
    try {
      await axios.post(
        `${API_URL}/api/users`,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        role: '',
        department: '',
        password: '',
      });
      // Refresh team list
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setUsers(res.data.users || res.data);
    } catch (error: any) {
      setAddError(error.response?.data?.message || error.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleOpenEditModal = (member: any) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name || '',
      email: member.email || '',
      role: member.role || '',
      department: member.department?.name || member.department || '',
      password: '',
    });
    setUpdateError(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    setUpdateError(null);
    setUpdatingMember(true);

    const payload: any = {
      name: editFormData.name,
      email: editFormData.email,
      role: editFormData.role,
      department: editFormData.department,
    };
    if (editFormData.password && editFormData.password.trim().length >= 6) {
      payload.password = editFormData.password;
    }

    try {
      await axios.put(
        `${API_URL}/api/users/${editingMember.id || editingMember._id}`,
        payload,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
      setEditingMember(null);
      // Refresh list
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setUsers(res.data.users || res.data);
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || err.response?.data?.error || 'Failed to update member');
    } finally {
      setUpdatingMember(false);
    }
  };

  const handleDeleteMember = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await axios.delete(`${API_URL}/api/users/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      setUsers(users.filter(u => (u.id || u._id) !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete member');
    }
  };

  // Helper to normalize department value
  const getDept = (u: any) => u?.department?.name || u?.department || '';

  // Filter visible users based on current user's role
  let visibleUsers = users;
  if (currentUser?.role === 'admin') {
    // Admins see only department managers
    visibleUsers = users.filter(u => (u.role === 'department_manager' || u.role === 'manager') && (u._id || u.id) !== (currentUser._id || currentUser.id));
  } else if (currentUser?.role === 'manager') {
    // Managers see other members of their own department
    const myDept = getDept(currentUser);
    visibleUsers = users.filter(u => getDept(u) === myDept && (u._id || u.id) !== (currentUser._id || currentUser.id));
  }

  // Get unique department names from the visible users list to populate the filter options
  const uniqueDepts = Array.from(
    new Set(
      visibleUsers
        .map(u => getDept(u))
        .filter(d => typeof d === 'string' && d.trim() !== '')
    )
  ).sort() as string[];

  // Apply department filter if selected
  if (selectedDepartment !== 'all') {
    visibleUsers = visibleUsers.filter(u => getDept(u).toLowerCase() === selectedDepartment.toLowerCase());
  }

  // Sort visible users so that admins appear first (if any)
  const sortedUsers = [...visibleUsers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Department:
            </span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input py-1.5 px-3 text-sm min-w-[160px] max-w-xs"
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {uniqueDepts.map((deptName) => (
                <option key={deptName} value={deptName}>
                  {capitalize(deptName)}
                </option>
              ))}
            </select>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center justify-center gap-1"
              aria-label="Add Team Member"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-center text-gray-500">Loading team members...</p>}
      {error && <p className="text-center text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedUsers.map((user) => (
            <div
              key={user.id || user._id}
              className="card overflow-hidden rounded-xl shadow-md dark:bg-gray-900"
            >
              <div className="h-12 bg-gradient-to-r from-primary-600 to-secondary-500" />
              <div className="px-6 py-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    name={user.name}
                    size="lg"
                    className="-mt-8 border-4 border-white dark:border-gray-800"
                  />
                  <h3 className="mt-2 text-lg font-semibold">{user.name}</h3>
                  <p className="mt-1 inline-block rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    {capitalize(user.role) || 'Member'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {capitalize(user.department?.name || user.department || 'No Department')}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <a
                      href={`mailto:${user.email}`}
                      className="flex items-center gap-1 rounded-md bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                    <Link
                      to={`/team/${user._id || user.id}`}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      aria-label={`View profile of ${user.name}`}
                    >
                      View Profile
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          aria-label={`Edit ${user.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMember(user.id || user._id)}
                          className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <h2 id="add-member-title" className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Add Team Member
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="tester">Tester</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input pr-16"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {addError && <p className="mt-3 text-center text-sm font-medium text-red-600 dark:text-red-400">{addError}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-outline"
                aria-label="Cancel adding member"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className="btn btn-primary min-w-[80px]"
                aria-label="Add team member"
              >
                {addingMember ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Add Member'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Edit Team Member
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. john@example.com"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Role</label>
                <select
                  name="role"
                  value={editFormData.role}
                  onChange={handleEditInputChange}
                  className="input"
                >
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="tester">Tester</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Department</label>
                <select
                  name="department"
                  value={editFormData.department}
                  onChange={handleEditInputChange}
                  className="input"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    className="input pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {showEditPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {updateError && <p className="mt-3 text-center text-sm font-medium text-red-600 dark:text-red-400">{updateError}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={updatingMember}
                className="btn btn-primary min-w-[100px]"
              >
                {updatingMember ? (
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
