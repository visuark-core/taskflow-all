import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { Camera, Edit2, Save, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/hook';
import { updateUserProfile, uploadUserAvatar } from '../features/auth/authSlice';

export default function Profile() {
  const dispatch = useAppDispatch();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
    bio: user?.bio || '',
  });
  const [uploadError, setUploadError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <p className="text-gray-600">No user information available.</p>
      </div>
    );
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit, reset form data
      setFormData({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        bio: user.bio || '',
      });
    }
    setIsEditing(!isEditing);
    setUploadError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      setIsEditing(false);
    } catch (err) {
      // Error is handled by redux state 'error'
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setUploadError('');
    try {
      await dispatch(uploadUserAvatar(file)).unwrap();
    } catch (err) {
      setUploadError(err as string || 'Failed to upload avatar');
    }
  };

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${avatarUrl}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h2>
        {!isEditing && (
          <button
            onClick={handleEditToggle}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
        )}
      </div>

      {(error || uploadError) && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 rounded-lg">
          {error || uploadError}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Banner area */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-indigo-600"></div>
        
        <div className="px-8 pb-8">
          {/* Avatar Area */}
          <div className="relative flex justify-center -mt-16 mb-6">
            <div className="relative group">
              <img
                src={getAvatarUrl(user.avatar)}
                alt={user.name}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover bg-white dark:bg-gray-800 shadow-md transition-opacity group-hover:opacity-90"
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isLoading}
                className="absolute bottom-1 right-1 p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                title="Change profile picture"
              >
                <Camera size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Tell us a little about yourself..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-shadow"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-70 font-medium shadow-sm"
                >
                  {isLoading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center md:text-left space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="w-full">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center md:text-left">
                    {user.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-full text-sm font-medium">
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                    </span>
                    {user.department && (
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-sm font-medium">
                        {user.department.charAt(0).toUpperCase() + user.department.slice(1)}
                      </span>
                    )}
                    {user.company && (
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-sm font-medium">
                        {user.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-gray-700/50">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email Address</span>
                      <span className="font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded border border-gray-100 dark:border-gray-700/50 inline-block">
                        {user.email}
                      </span>
                    </div>
                    {user.company && (
                      <div className="flex flex-col mt-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Company</span>
                        <span className="font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded border border-gray-100 dark:border-gray-700/50 inline-block">
                          {user.company}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    About
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 h-full">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.bio || <span className="italic text-gray-400">This user hasn't added a bio yet.</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50 text-xs text-gray-400 text-center md:text-left mt-8">
                User ID: {user.id}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
