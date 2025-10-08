import React, { useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { X, Plus, Trash2 } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function NewProjectModal({ isOpen, onClose, onCreated }: NewProjectModalProps) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    tags: [] as string[],
    color: '#3B82F6',
  });
  const [newTag, setNewTag] = useState('');
  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
  ];
  const today = new Date().toISOString().split('T')[0];
  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag) && trimmedTag.length <= 50) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setNewTag('');
    }
  };
  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      tags: [],
      color: '#3B82F6',
    });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tags: formData.tags,
        color: formData.color,
      };
      await axios.post('http://localhost:5000/api/projects', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      resetForm();
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Project</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: formData.color }}></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter a descriptive project name" maxLength={100} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                  <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" rows={4} placeholder="Describe the project goals, scope, and key deliverables" maxLength={500} />
                  <p className="mt-1 text-xs text-gray-500">{formData.description.length}/500 characters</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label>
                  <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} min={today} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label>
                  <input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} min={formData.startDate || today} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Project Color Theme</label>
                <div className="flex flex-wrap gap-3 items-center">
                  {colorOptions.map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 ${formData.color === color ? 'border-gray-900 dark:border-gray-100 scale-110 shadow-lg' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`} style={{ backgroundColor: color }} title={`Select color theme`} />
                  ))}
                  <div className="ml-2">
                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer" title="Choose custom color" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Tags</h3>
              <div>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={handleTagKeyPress} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" placeholder="Add tags like 'frontend', 'urgent', 'client-work'..." maxLength={50} />
                  <button type="button" onClick={addTag} disabled={!newTag.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm dark:bg-primary-900 dark:text-primary-200">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-600 dark:hover:text-primary-300 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-md" style={{ backgroundColor: formData.color }}>Create Project</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}