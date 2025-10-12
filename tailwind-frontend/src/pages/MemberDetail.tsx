
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../app/store';
import { updateUser as updateUserAction } from '../features/auth/authSlice';
import Avatar from '../components/ui/Avatar';
import { Mail, User, Briefcase, Calendar, Shield, ArrowLeft } from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const token = localStorage.getItem('token');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [departmentMembers, setDepartmentMembers] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:5000/api/users/${id}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setUser(data.user || data.data || null))
      .catch(() => setError('Failed to fetch user'))
      .finally(() => setLoading(false));
  }, [id, token]);

  // If current user is admin and the profile user has a department, fetch department peers
  useEffect(() => {
    if (!user) return;
    if (currentUser?.role !== 'admin') return;
    const dept = user.department?.name || user.department || '';
    if (!dept) return;

    // Fetch all users and filter by department (server supports /api/users)
    fetch(`http://localhost:5000/api/users`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(res => res.json())
      .then(data => {
        const list = data.users || data.data || [];
        const peers = list.filter((u: any) => {
          const ud = u.department?.name || u.department || '';
          return ud && ud.toLowerCase() === String(dept).toLowerCase() && (u._id !== user._id);
        });
        setDepartmentMembers(peers);
      })
      .catch(() => setDepartmentMembers([]));
  }, [user, currentUser, token]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        department: user.department?.name || user.department || '',
        status: user.status || 'Active'
      });
    }
  }, [user]);

  if (loading) return <div className="py-12 text-center"><span className="text-lg">Loading...</span></div>;
  if (error || !user) return <div className="py-12 text-center"><span className="text-lg">User not found.</span></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <Link to="/team" className="inline-flex items-center text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Team
        </Link>
      </div>
      <div className="card rounded-xl shadow-lg p-8 flex flex-col items-center bg-white dark:bg-gray-900">
        <Avatar name={user.name} size="lg" className="mb-4" />

        {/* Header + edit controls for admins */}
        <div className="w-full flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <User className="h-5 w-5 text-primary-500" /> {user.name}
            </h1>
            <p className="mb-2 text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => { setIsEditing(true); setSaveSuccess(null); setSaveError(null); }}
                  className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded bg-gray-300 px-3 py-1.5 text-sm font-medium dark:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          {/* If editing and admin, show editable fields */}
          {isEditing ? (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-medium">Name</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium">Email</label>
                <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="mt-1 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="tester">Tester</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium">Department</label>
                <input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="mt-1 rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Role:</span>
                <span>{user.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-green-500" />
                <span className="font-medium">Department:</span>
                <span>{user.department?.name || user.department || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Joined:</span>
                <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span>{user.status || 'Active'}</span>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 w-full">
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <a
            href={`mailto:${user.email}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
          >
            <Mail className="h-4 w-4" />
            {user.email}
          </a>
        </div>
        {/* Add more sections here, e.g., teams, projects, activity, etc. */}

        {isEditing && (
          <div className="mt-4 w-full flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="rounded bg-gray-300 px-4 py-2 text-sm dark:bg-gray-700">Cancel</button>
            <button
              onClick={async () => {
                setSaveError(null);
                setSaveSuccess(null);
                setSaving(true);
                try {
                  const res = await fetch(`http://localhost:5000/api/users/${id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                      name: formData.name,
                      email: formData.email,
                      role: formData.role,
                      department: formData.department,
                      status: formData.status
                    })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || 'Failed to update user');
                  const updated = data.data || data.user || data;
                  setUser(updated);
                  setIsEditing(false);
                  setSaveSuccess('User updated successfully');
                  // If admin edited themselves, update Redux + localStorage
                  if (currentUser && (currentUser._id === id || currentUser.id === id)) {
                    dispatch(updateUserAction(updated));
                  }
                } catch (err: any) {
                  setSaveError(err.message || 'Failed to update user');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className={`rounded px-4 py-2 text-sm text-white ${saving ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {saveError && <div className="mt-3 text-sm text-red-600">{saveError}</div>}
        {saveSuccess && <div className="mt-3 text-sm text-green-600">{saveSuccess}</div>}
      </div>

      {/* Department members for admins viewing a manager */}
      {currentUser?.role === 'admin' && departmentMembers.length > 0 && (
        <div className="max-w-2xl mx-auto p-6 animate-fade-in mt-6">
          <h3 className="text-lg font-semibold mb-3">Department Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departmentMembers.map(m => (
              <div key={m._id} className="card p-4 flex items-center gap-3">
                <Avatar name={m.name} size="sm" />
                <div>
                  <Link to={`/team/${m._id}`} className="font-medium hover:text-primary-600">{m.name}</Link>
                  <div className="text-sm text-gray-500">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
