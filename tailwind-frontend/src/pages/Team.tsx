import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import { Mail, Plus } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

export default function Team() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

        const res = await axios.get('http://localhost:5000/api/users', {
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

    fetchUsers();
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
        'http://localhost:5000/api/users',
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
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      setUsers(res.data.users || res.data);
    } catch (error: any) {
      setAddError(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // Sort users so that admins appear first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-1"
            aria-label="Add Team Member"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 id="add-member-title" className="mb-4 text-xl font-bold">
              Add Team Member
            </h2>

            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleInputChange}
              className="mb-2 w-full rounded border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className="mb-2 w-full rounded border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            />

            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mb-2 w-full rounded border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select Role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="tester">Tester</option>
            </select>

            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="mb-2 w-full rounded border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select Department</option>
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
              <option value="support">Support</option>
              <option value="design">Design</option>
              <option value="hr">HR</option>
            </select>

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 pr-10 text-sm dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-sm text-gray-500 dark:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {addError && <p className="mb-4 text-center text-sm text-red-600">{addError}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded bg-gray-300 px-4 py-2 text-sm dark:bg-gray-700 dark:text-white"
                aria-label="Cancel adding member"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className={`rounded px-4 py-2 text-sm text-white ${
                  addingMember ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                aria-label="Add team member"
              >
                {addingMember ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
