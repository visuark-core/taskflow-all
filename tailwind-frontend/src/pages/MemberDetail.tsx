
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import { Mail, User, Briefcase, Calendar, Shield, ArrowLeft } from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('token');

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
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" /> {user.name}
        </h1>
        <p className="mb-2 text-gray-500 dark:text-gray-400">{user.email}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
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
      </div>
    </div>
  );
}
