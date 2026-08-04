import { useState, useEffect } from 'react';
import { Plus, User as UserIcon, AlertCircle, X, Shield, Briefcase, Mail, Eye, EyeOff, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  password?: string;
}

const ROLES = ['user', 'admin', 'ceo', 'coo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager', 'developer', 'designer', 'tester'];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    newPassword: '',
    role: 'user',
    department: ''
  });
  const [departments, setDepartments] = useState<any[]>([]);

  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const currentUser = useSelector((state: any) => state.auth.user);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const showAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setErrorMessage('');
    } else {
      setErrorMessage(msg);
      setSuccessMessage('');
    }
    setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
  };

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${base}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.data || d.users || []))
      .catch(() => showAlert('error', 'Failed to fetch users'))
      .finally(() => setLoading(false));
  };

  const fetchDepartments = () => {
    fetch(`${base}/departments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setDepartments(d.data || []))
      .catch(() => console.error('Failed to fetch departments'));
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
      fetchDepartments();
    }
  }, [currentUser, token, base]);

  // ---------- Create User ----------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      showAlert('error', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${base}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        showAlert('success', `User "${formData.name}" created successfully!`);
        setShowCreateModal(false);
        setFormData({ name: '', email: '', password: '', role: 'user', department: '' });
        fetchUsers();
      } else {
        showAlert('error', result.error || 'Failed to create user');
      }
    } catch {
      showAlert('error', 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Open Edit Modal ----------
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      newPassword: '',
      role: user.role,
      department: user.department || ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditFormData({ name: '', email: '', newPassword: '', role: 'user', department: '' });
  };

  // ---------- Save Edit ----------
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      showAlert('error', 'Name and Email are required');
      return;
    }
    if (editFormData.newPassword && editFormData.newPassword.length < 6) {
      showAlert('error', 'New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        department: editFormData.department,
      };
      if (editFormData.newPassword) payload.password = editFormData.newPassword;

      const res = await fetch(`${base}/users/${editingUser!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        showAlert('success', `User "${editFormData.name}" updated successfully!`);
        closeEditModal();
        fetchUsers();
      } else {
        showAlert('error', result.error || 'Failed to update user');
      }
    } catch {
      showAlert('error', 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string | number, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${base}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        showAlert('success', `User "${userName}" deleted successfully!`);
        fetchUsers();
      } else {
        showAlert('error', result.error || 'Failed to delete user');
      }
    } catch {
      showAlert('error', 'Failed to delete user');
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">Only admins can manage users.</p>
      </div>
    );
  }

  const roleColor = (role: string) => {
    if (role === 'admin') return 'bg-red-100 text-red-800';
    if (role === 'department_manager') return 'bg-purple-100 text-purple-800';
    if (role === 'manager') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> New User
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800 flex items-start gap-3">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="font-semibold flex items-center gap-2">
            <UserIcon size={18} /> All Users ({users.length})
          </h3>
        </div>
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading users...</p>
          ) : users.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Password (Hash)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-transparent dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatar ? (
                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail size={12} /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-300">
                        <Shield className="mr-1.5 h-4 w-4 text-gray-400" />
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    {/* Department */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 capitalize">
                        <Briefcase className="mr-1.5 h-4 w-4 text-gray-400" />
                        {user.department || 'Unassigned'}
                      </div>
                    </td>
                    {/* Password */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded max-w-[180px] truncate">
                          {visiblePasswords[user.id] ? user.password || 'N/A' : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id as string)}
                          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={visiblePasswords[user.id] ? 'Hide' : 'Show'}
                        >
                          {visiblePasswords[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit user"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        {String(currentUser?.id) !== String(user.id) && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-sm text-gray-500 py-10">No users found</p>
          )}
        </div>
      </div>

      {/* ───────── Create User Modal ───────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Plus size={20} /> Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., John Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email *</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input" placeholder="e.g., john@example.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password *</label>
                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input" placeholder="Minimum 6 characters" required minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Department</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Edit User Modal ───────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Pencil size={18} /> Edit User</h2>
                <p className="text-xs text-gray-500 mt-0.5">Editing: <span className="font-medium text-gray-700 dark:text-gray-300">{editingUser.email}</span></p>
              </div>
              <button onClick={closeEditModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email *</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="input"
                  placeholder="Email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editFormData.newPassword}
                  onChange={e => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                  className="input"
                  placeholder="Enter new password (min 6 chars)"
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
                  <select value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })} className="input">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Department</label>
                  <select value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} className="input">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Inline error inside modal */}
              {errorMessage && (
                <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={15} /> {errorMessage}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={closeEditModal} className="btn btn-outline flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
