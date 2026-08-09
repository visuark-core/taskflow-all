import React, { useEffect, useState } from 'react';
import { 
  Handshake, Building2, Plus, Mail, Phone, Globe, MapPin, 
  Pencil, Trash2, X, Search, FileText, Briefcase 
} from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { Link } from 'react-router-dom';

interface Project {
  id: number;
  name: string;
  status: string;
  progress: number;
}

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  website?: string;
  status: 'active' | 'inactive';
  description?: string;
  projects?: Project[];
  createdAt: string;
}

export default function Clients() {
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isAdminOrManager = currentUser && ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'].includes(currentUser.role);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/clients`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      setClients(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOpenCreateModal = () => {
    setModalType('create');
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      description: '',
      status: 'active'
    });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setModalType('edit');
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      address: client.address || '',
      description: client.description || '',
      status: client.status || 'active'
    });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSubmitError('Name is required');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (modalType === 'create') {
        await axios.post(`${API_URL}/api/clients`, formData, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
      } else if (modalType === 'edit' && selectedClient) {
        await axios.put(`${API_URL}/api/clients/${selectedClient.id}`, formData, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.name}? Projects assigned to this client will be unassigned.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/clients/${client.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      fetchClients();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete client');
    }
  };

  const filteredClients = clients.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(search) ||
      (c.company && c.company.toLowerCase().includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search))
    );
  });

  const isFinanceAuthorized = currentUser && (
    ['admin', 'ceo', 'cfo'].includes(currentUser.role) ||
    (['manager', 'department_manager'].includes(currentUser.role) && currentUser.department?.toLowerCase() === 'finance')
  );

  if (!isFinanceAuthorized) {
    return (
      <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 max-w-md mx-auto mt-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Only admins, CEOs, and finance managers can access client details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Handshake className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            Clients Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create client profiles and assign them to projects.
          </p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Client
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by client name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
        />
      </div>

      {/* Error View */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/10">
          <Handshake className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search term.' : 'Get started by creating a client profile.'}
          </p>
        </div>
      ) : (
        /* Clients Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div 
              key={client.id}
              className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-all relative group overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>

              <div>
                {/* Header info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                      {client.name}
                    </h3>
                    {client.company && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <Building2 className="h-3.5 w-3.5" />
                        {client.company}
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    client.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {client.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {client.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                    {client.description}
                  </p>
                )}

                {/* Contact list */}
                <div className="space-y-2 mb-6">
                  {client.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <a href={`mailto:${client.email}`} className="hover:underline hover:text-primary-500 truncate">
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary-500 truncate">
                        {client.website}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                      <span className="line-clamp-1">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Projects info */}
              <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4 mt-auto">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  Assigned Projects ({client.projects?.length || 0})
                </h4>
                {client.projects && client.projects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {client.projects.map((proj) => (
                      <Link 
                        key={proj.id} 
                        to={`/projects/${proj.id}`}
                        className="inline-flex items-center gap-1 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-750 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{proj.name}</span>
                        <span className="text-[10px] text-gray-405">({proj.progress}%)</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No projects currently assigned.</p>
                )}

                {/* Actions (Edit/Delete) */}
                {isAdminOrManager && (
                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-gray-750">
                    <button
                      onClick={() => handleOpenEditModal(client)}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded transition-colors"
                      title="Edit Client"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="p-1 text-gray-500 hover:text-red-650 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {modalType === 'create' ? 'Add New Client' : 'Edit Client Details'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
              <div className="p-6 space-y-4">
                {submitError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-300">{submitError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1">
                      Client Name *
                    </label>
                    <input 
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. John Doe"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-455 uppercase tracking-wider mb-1">
                      Company Name
                    </label>
                    <input 
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="e.g. Acme Corp"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. john@example.com"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-455 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input 
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. +1 555-0199"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1">
                      Website
                    </label>
                    <input 
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="e.g. www.acme.com"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-455 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g. 123 Main St, City, Country"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide additional details about the client, contract, or projects scope."
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
