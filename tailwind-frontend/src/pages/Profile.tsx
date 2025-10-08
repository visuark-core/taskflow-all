import { useAuth } from '../context/AuthContext';
// Extend the User type for this page to include all profile fields
type ProfileUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
  company?: string;
  bio?: string;
};

export default function Profile() {
  const { user } = useAuth() as { user: ProfileUser | null };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <p className="text-gray-600">No user information available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Profile</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center">
        {/* Avatar */}
        <div className="mb-4">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
            alt={user.name}
            className="w-24 h-24 rounded-full border-4 border-primary-500 shadow"
          />
        </div>
        {/* Name */}
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{user.name}</h3>
        {/* Role & Department */}
        <div className="flex gap-2 mb-2">
          <span className="inline-block rounded bg-primary-100 dark:bg-primary-900/20 px-3 py-1 text-sm font-medium text-primary-700 dark:text-primary-400">
            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
          </span>
          {user.department && (
            <span className="inline-block rounded bg-blue-100 dark:bg-blue-900/20 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              {user.department.charAt(0).toUpperCase() + user.department.slice(1)}
            </span>
          )}
        </div>
        {/* Company */}
        {user.company && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Company:</span> {user.company}
          </div>
        )}
        {/* Email */}
        <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Email:</span> {user.email}
        </div>
        {/* Bio */}
        {user.bio && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Bio:</span> {user.bio}
          </div>
        )}
        {/* User ID */}
        <div className="mt-4 text-xs text-gray-400">
          <span className="font-medium">User ID:</span> {user.id}
        </div>
      </div>
    </div>
  );
}
