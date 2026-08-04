import React, { useEffect, useState } from 'react';
import { 
  Receipt, Plus, Mail, Phone, Pencil, Trash2, X, Search, 
  Briefcase, Handshake, Calendar, DollarSign, Eye, Printer, 
  Settings, Check, Clock, AlertCircle, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { formatDate } from '../lib/utils';

interface Service {
  id: number;
  name: string;
  description?: string;
  rate: number;
  rateType: 'hourly' | 'fixed';
}

interface InvoiceItem {
  id?: number;
  serviceName: string;
  rate: number;
  quantity: number;
  amount: number;
}

interface Project {
  id: number;
  name: string;
  clientId?: number;
  client?: {
    id: number;
    name: string;
  };
}

interface Client {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  taxRate: number;
  discount: number;
  totalAmount: number;
  notes?: string;
  projectId: number;
  clientId: number;
  project?: Project;
  client?: Client;
  items?: InvoiceItem[];
  createdAt: string;
}

export default function Billing() {
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'services'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isAdminOrManager = currentUser && ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'].includes(currentUser.role);

  // Invoices Modals/Forms State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState<'create' | 'edit'>('create');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSubmitError, setInvoiceSubmitError] = useState<string | null>(null);

  // Invoices Detail Viewer State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailedInvoice, setDetailedInvoice] = useState<Invoice | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    projectId: '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 0,
    discount: 0,
    notes: '',
    items: [] as InvoiceItem[]
  });

  // Services Modal/Form State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceModalType, setServiceModalType] = useState<'create' | 'edit'>('create');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceSubmitError, setServiceSubmitError] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    rate: 0,
    rateType: 'hourly' as 'hourly' | 'fixed',
    description: ''
  });

  // Load Invoices, Services, Projects, Clients
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { Authorization: token ? `Bearer ${token}` : '' };

      const [invoicesRes, servicesRes, projectsRes, clientsRes] = await Promise.all([
        axios.get(`${API_URL}/api/invoices`, { headers }),
        axios.get(`${API_URL}/api/services`, { headers }),
        axios.get(`${API_URL}/api/projects`, { headers }),
        axios.get(`${API_URL}/api/clients`, { headers })
      ]);

      setInvoices(invoicesRes.data.data || []);
      setServices(servicesRes.data.data || []);
      setProjects(projectsRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load billing configuration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Invoice calculations helper
  const calculateInvoiceTotals = (items: InvoiceItem[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((acc, curr) => acc + (curr.rate * curr.quantity), 0);
    const tax = subtotal * (taxRate / 100);
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, total };
  };

  // --- Invoice Modal Handlers ---
  const handleOpenCreateInvoiceModal = () => {
    setInvoiceModalType('create');
    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setInvoiceForm({
      invoiceNumber: invoiceNum,
      projectId: '',
      clientId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxRate: 0,
      discount: 0,
      notes: '',
      items: [{ serviceName: '', rate: 0, quantity: 1, amount: 0 }]
    });
    setInvoiceSubmitError(null);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenEditInvoiceModal = (inv: Invoice) => {
    setInvoiceModalType('edit');
    setSelectedInvoice(inv);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      projectId: String(inv.projectId),
      clientId: String(inv.clientId),
      issueDate: new Date(inv.issueDate).toISOString().split('T')[0],
      dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
      taxRate: inv.taxRate,
      discount: inv.discount,
      notes: inv.notes || '',
      items: inv.items && inv.items.length > 0 
        ? inv.items.map(item => ({ ...item }))
        : [{ serviceName: '', rate: 0, quantity: 1, amount: 0 }]
    });
    setInvoiceSubmitError(null);
    setIsInvoiceModalOpen(true);
  };

  // Handle dynamic project selection inside invoice form to resolve Client automatically
  const handleProjectSelect = (projIdStr: string) => {
    const selectedProj = projects.find(p => String(p.id) === projIdStr);
    let resolvedClientId = '';
    let defaultItems: InvoiceItem[] = [{ serviceName: '', rate: 0, quantity: 1, amount: 0 }];
    
    if (selectedProj) {
      if (selectedProj.client) {
        resolvedClientId = String(selectedProj.client.id);
      } else if (selectedProj.clientId) {
        resolvedClientId = String(selectedProj.clientId);
      }

      const proj = selectedProj as any;
      if (proj.service && proj.service.name) {
        const rate = parseFloat(proj.budget) || 0;
        defaultItems = [{
          serviceName: proj.service.name,
          rate: rate,
          quantity: 1,
          amount: rate
        }];
      }
    }

    setInvoiceForm({
      ...invoiceForm,
      projectId: projIdStr,
      clientId: resolvedClientId,
      items: defaultItems
    });
  };

  const handleInvoiceItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceForm.items];
    const item = { ...updatedItems[index] };

    if (field === 'serviceName') {
      item.serviceName = value;
      // Prepopulate standard service rates if matches service catalog
      const catalogService = services.find(s => s.name === value);
      if (catalogService) {
        item.rate = catalogService.rate;
      }
    } else if (field === 'rate') {
      item.rate = parseFloat(value) || 0;
    } else if (field === 'quantity') {
      item.quantity = parseFloat(value) || 0;
    }

    item.amount = item.rate * item.quantity;
    updatedItems[index] = item;

    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const addInvoiceItemRow = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { serviceName: '', rate: 0, quantity: 1, amount: 0 }]
    });
  };

  const removeInvoiceItemRow = (index: number) => {
    if (invoiceForm.items.length === 1) return;
    const updatedItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.projectId) {
      setInvoiceSubmitError('Project is required');
      return;
    }
    if (!invoiceForm.clientId) {
      setInvoiceSubmitError('Client is required');
      return;
    }
    if (invoiceForm.items.some(item => !item.serviceName.trim() || item.rate <= 0 || item.quantity <= 0)) {
      setInvoiceSubmitError('All line items must have a service name, rate, and quantity greater than 0');
      return;
    }

    setSubmittingInvoice(true);
    setInvoiceSubmitError(null);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      if (invoiceModalType === 'create') {
        await axios.post(`${API_URL}/api/invoices`, invoiceForm, { headers });
      } else if (invoiceModalType === 'edit' && selectedInvoice) {
        await axios.put(`${API_URL}/api/invoices/${selectedInvoice.id}`, invoiceForm, { headers });
      }
      setIsInvoiceModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setInvoiceSubmitError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invId: number, newStatus: string) => {
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.put(`${API_URL}/api/invoices/${invId}`, { status: newStatus }, { headers });
      
      // Update local state if detailed view is open
      if (detailedInvoice && detailedInvoice.id === invId) {
        setDetailedInvoice({ ...detailedInvoice, status: newStatus as any });
      }
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This action is irreversible.`)) {
      return;
    }
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.delete(`${API_URL}/api/invoices/${inv.id}`, { headers });
      setIsDetailOpen(false);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  // --- Invoice Detail Viewer Handlers ---
  const handleOpenDetail = async (invId: number) => {
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const res = await axios.get(`${API_URL}/api/invoices/${invId}`, { headers });
      setDetailedInvoice(res.data.data);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert('Failed to retrieve invoice line items');
    }
  };

  // --- Services Modal Handlers ---
  const handleOpenCreateServiceModal = () => {
    setServiceModalType('create');
    setServiceForm({ name: '', rate: 0, rateType: 'hourly', description: '' });
    setServiceSubmitError(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditServiceModal = (serv: Service) => {
    setServiceModalType('edit');
    setSelectedService(serv);
    setServiceForm({
      name: serv.name,
      rate: serv.rate,
      rateType: serv.rateType,
      description: serv.description || ''
    });
    setServiceSubmitError(null);
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      setServiceSubmitError('Service name is required');
      return;
    }
    setSubmittingService(true);
    setServiceSubmitError(null);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      if (serviceModalType === 'create') {
        await axios.post(`${API_URL}/api/services`, serviceForm, { headers });
      } else if (serviceModalType === 'edit' && selectedService) {
        await axios.put(`${API_URL}/api/services/${selectedService.id}`, serviceForm, { headers });
      }
      setIsServiceModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setServiceSubmitError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit service');
    } finally {
      setSubmittingService(false);
    }
  };

  const handleDeleteService = async (serv: Service) => {
    if (!window.confirm(`Are you sure you want to delete "${serv.name}" from the catalog?`)) {
      return;
    }
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.delete(`${API_URL}/api/services/${serv.id}`, { headers });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete service');
    }
  };

  // Printing Layout trigger
  const handlePrint = () => {
    window.print();
  };

  // Filter and Search Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (inv.client?.name && inv.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.project?.name && inv.project.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: // draft
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-450';
    }
  };

  // Totals of selected items in the creation form
  const formTotals = calculateInvoiceTotals(invoiceForm.items, invoiceForm.taxRate, invoiceForm.discount);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0 print:m-0">
      
      {/* Header (Hidden when printing detailed invoice) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            Billing & Invoicing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bill your clients based on project milestones and standard services performed.
          </p>
        </div>

        {/* Navigation Tabs & Primary Actions */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'invoices' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'services' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Services Catalog
            </button>
          </div>

          {isAdminOrManager && (
            <button
              onClick={activeTab === 'invoices' ? handleOpenCreateInvoiceModal : handleOpenCreateServiceModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'invoices' ? 'Create Invoice' : 'Add Service'}
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6 print:hidden">
        
        {/* --- Invoices Tab --- */}
        {activeTab === 'invoices' && (
          <>
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-gray-900 p-4 border border-gray-250/60 dark:border-gray-800 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 max-w-sm w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by invoice #, client, project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Invoices</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Invoices List Table */}
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-750 rounded-xl bg-gray-50 dark:bg-gray-800/10">
                <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No invoices found</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by billing a project.'}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-405">
                      <tr>
                        <th className="px-6 py-4">Invoice #</th>
                        <th className="px-6 py-4">Client / Project</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Issue Date</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4 text-right">Total Amount</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-gray-150 flex items-center gap-1">
                                <Handshake className="h-3.5 w-3.5 text-gray-400" />
                                {inv.client?.name || 'Unknown Client'}
                              </span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Briefcase className="h-3 w-3 text-gray-400" />
                                {inv.project?.name || 'Global Project'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium uppercase text-[10px] ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {formatDate(new Date(inv.issueDate))}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {formatDate(new Date(inv.dueDate))}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                            ${inv.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenDetail(inv.id)}
                                className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isAdminOrManager && inv.status === 'draft' && (
                                <button
                                  onClick={() => handleOpenEditInvoiceModal(inv)}
                                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {isAdminOrManager && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv)}
                                  className="p-1 text-gray-500 hover:text-red-650 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- Services Catalog Tab --- */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {service.name}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                      {service.rateType === 'hourly' ? 'Hourly Rate' : 'Fixed Rate'}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-4 mt-6">
                  <div className="flex items-baseline text-gray-900 dark:text-gray-100">
                    <DollarSign className="h-5 w-5 shrink-0 text-gray-400" />
                    <span className="text-xl font-bold">{service.rate}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      {service.rateType === 'hourly' ? '/hr' : 'flat'}
                    </span>
                  </div>

                  {isAdminOrManager && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditServiceModal(service)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                        title="Edit Service"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service)}
                        className="p-1.5 text-gray-500 hover:text-red-650 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No services cataloged</h4>
                <p className="mt-1 text-xs text-gray-500">Configure your agency standard billing services here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Invoices Create/Edit Modal --- */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {invoiceModalType === 'create' ? 'Create Client Invoice' : `Edit Invoice ${invoiceForm.invoiceNumber}`}
                </h3>
              </div>
              <button 
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-6">
                
                {invoiceSubmitError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-350">{invoiceSubmitError}</p>
                  </div>
                )}

                {/* Primary Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Invoice Number *
                    </label>
                    <input 
                      type="text"
                      required
                      value={invoiceForm.invoiceNumber}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Billable Project *
                    </label>
                    <select
                      required
                      value={invoiceForm.projectId}
                      onChange={(e) => handleProjectSelect(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Client Profile *
                    </label>
                    <select
                      required
                      value={invoiceForm.clientId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Issue Date
                    </label>
                    <input 
                      type="date"
                      value={invoiceForm.issueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Due Date *
                    </label>
                    <input 
                      type="date"
                      required
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Line Items Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-primary-500" />
                      Line Items (Services performed)
                    </h4>
                    <button
                      type="button"
                      onClick={addInvoiceItemRow}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors"
                    >
                      + Add Item Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {invoiceForm.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
                            Service Name *
                          </label>
                          <input
                            type="text"
                            required
                            list="services-list"
                            value={item.serviceName}
                            onChange={(e) => handleInvoiceItemChange(idx, 'serviceName', e.target.value)}
                            placeholder="Type service name..."
                            className="block w-full rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          <datalist id="services-list">
                            {services.map(s => <option key={s.id} value={s.name} />)}
                          </datalist>
                        </div>

                        <div className="w-full md:w-32">
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
                            Rate ($) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.rate || ''}
                            onChange={(e) => handleInvoiceItemChange(idx, 'rate', e.target.value)}
                            className="block w-full rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        <div className="w-full md:w-24">
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
                            Qty (Hours/Flat) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={item.quantity || ''}
                            onChange={(e) => handleInvoiceItemChange(idx, 'quantity', e.target.value)}
                            className="block w-full rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        <div className="w-full md:w-28 text-right pr-2 pb-2 font-bold text-gray-900 dark:text-gray-200">
                          <span className="block text-[10px] text-gray-400 text-left mb-1 font-semibold uppercase">Total</span>
                          ${(item.rate * item.quantity).toFixed(2)}
                        </div>

                        {invoiceForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvoiceItemRow(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors mb-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adjustments & Real-time Calculations */}
                <div className="border-t border-gray-150 dark:border-gray-800 pt-4 flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="w-full md:w-1/2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Invoice Notes / Terms
                    </label>
                    <textarea 
                      rows={3}
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                      placeholder="Specify terms, bank transfer details, or project milestones..."
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-250">${formTotals.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Tax Rate (%)</span>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={invoiceForm.taxRate || ''}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-right border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 rounded px-2 py-0.5 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Discount ($)</span>
                      <input 
                        type="number"
                        min="0"
                        value={invoiceForm.discount || ''}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-right border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 rounded px-2 py-0.5 focus:outline-none"
                      />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
                      <span className="text-primary-600 dark:text-primary-400">${formTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-350 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingInvoice}
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingInvoice ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Service Create/Edit Modal --- */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {serviceModalType === 'create' ? 'Add Billing Service' : 'Edit Service details'}
                </h3>
              </div>
              <button 
                onClick={() => setIsServiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleServiceSubmit}>
              <div className="p-6 space-y-4">
                {serviceSubmitError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-300">{serviceSubmitError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Service Name *
                  </label>
                  <input 
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Frontend Development"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Billing Rate ($) *
                    </label>
                    <input 
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={serviceForm.rate || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, rate: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 75"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Billing Type
                    </label>
                    <select
                      value={serviceForm.rateType}
                      onChange={(e) => setServiceForm({ ...serviceForm, rateType: e.target.value as any })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="hourly">Hourly Rate</option>
                      <option value="fixed">Fixed Rate</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Service Description
                  </label>
                  <textarea 
                    rows={3}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Describe what services are included in this item..."
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-350 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingService}
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingService ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Detailed Invoice View (Drawer / Printing layout) --- */}
      {isDetailOpen && detailedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:static print:overflow-visible">
          <div className="bg-white dark:bg-gray-900 md:rounded-xl shadow-2xl max-w-4xl w-full flex flex-col border border-gray-200 dark:border-gray-800 min-h-screen md:min-h-0 print:border-none print:shadow-none print:w-full print:bg-white print:text-black">
            
            {/* Top Toolbar (Hidden when printing) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 print:hidden">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  &larr; Back to Invoices
                </button>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${getStatusColor(detailedInvoice.status)}`}>
                  {detailedInvoice.status}
                </span>
              </div>

              {/* Status workflow triggers */}
              <div className="flex items-center gap-2">
                {isAdminOrManager && (
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 shadow-sm">
                    {detailedInvoice.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateInvoiceStatus(detailedInvoice.id, 'sent')}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Mark Sent
                      </button>
                    )}
                    {(detailedInvoice.status === 'draft' || detailedInvoice.status === 'sent') && (
                      <button
                        onClick={() => handleUpdateInvoiceStatus(detailedInvoice.id, 'paid')}
                        className="px-2.5 py-1 text-[10px] font-bold text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 rounded"
                      >
                        Mark Paid
                      </button>
                    )}
                    {detailedInvoice.status !== 'cancelled' && detailedInvoice.status !== 'paid' && (
                      <button
                        onClick={() => handleUpdateInvoiceStatus(detailedInvoice.id, 'cancelled')}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                      >
                        Cancel Invoice
                      </button>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Print Invoice"
                >
                  <Printer size={16} />
                </button>
                
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Page */}
            <div className="p-8 md:p-12 space-y-8 flex-1 bg-white text-gray-850 dark:bg-gray-900 dark:text-gray-150 print:bg-white print:text-black">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start pb-6 border-b border-gray-100 dark:border-gray-800 print:border-gray-200">
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold text-primary-600 print:text-black">TaskFlow Inc.</h2>
                  <p className="text-xs text-gray-500">123 Agency Plaza, Suite 400</p>
                  <p className="text-xs text-gray-500">San Francisco, CA 94103</p>
                  <p className="text-xs text-gray-500">billing@taskflow.com</p>
                </div>

                <div className="text-right space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 uppercase">Invoice</h3>
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-400">#{detailedInvoice.invoiceNumber}</p>
                  
                  <div className="pt-2 text-xs text-gray-500 space-y-0.5">
                    <div>Issued: <span className="font-semibold text-gray-800 dark:text-gray-200 print:text-black">{formatDate(new Date(detailedInvoice.issueDate))}</span></div>
                    <div>Due: <span className="font-semibold text-red-600">{formatDate(new Date(detailedInvoice.dueDate))}</span></div>
                  </div>
                </div>
              </div>

              {/* Client & Project Addresses */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Billed To</span>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 print:text-black">
                    {detailedInvoice.client?.name || 'N/A'}
                  </div>
                  {detailedInvoice.client?.company && (
                    <div className="font-medium text-gray-600 dark:text-gray-300 print:text-gray-650">
                      {detailedInvoice.client.company}
                    </div>
                  )}
                  {detailedInvoice.client?.address && (
                    <div className="text-gray-500 w-64 leading-relaxed whitespace-pre-line">
                      {detailedInvoice.client.address}
                    </div>
                  )}
                  <div className="pt-1 text-gray-500 flex flex-col">
                    {detailedInvoice.client?.email && <span>{detailedInvoice.client.email}</span>}
                    {detailedInvoice.client?.phone && <span>{detailedInvoice.client.phone}</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">For Project</span>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 print:text-black">
                    {detailedInvoice.project?.name || 'N/A'}
                  </div>
                  {detailedInvoice.project?.description && (
                    <p className="text-gray-500 leading-relaxed max-w-sm line-clamp-3">
                      {detailedInvoice.project.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="pt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/30 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 print:bg-gray-100 print:text-black">
                    <tr>
                      <th className="px-4 py-3">Service Description</th>
                      <th className="px-4 py-3 text-right">Billing Rate</th>
                      <th className="px-4 py-3 text-center">Qty / Hours</th>
                      <th className="px-4 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-850 text-xs text-gray-700 dark:text-gray-300 print:divide-gray-200 print:text-black">
                    {detailedInvoice.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-gray-150 print:text-black">
                          {item.serviceName}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-500">
                          ${item.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-gray-100 print:text-black">
                          ${item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals Calculation */}
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start pt-6 border-t border-gray-100 dark:border-gray-800 print:border-gray-200">
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed md:max-w-md">
                  {detailedInvoice.notes ? (
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Notes & Terms</span>
                      <p className="whitespace-pre-line">{detailedInvoice.notes}</p>
                    </div>
                  ) : (
                    <p>Thank you for your business. Payment is requested within 15 days of invoice issue date via bank wire transfer details specified in contract terms.</p>
                  )}
                </div>

                <div className="w-full md:w-64 space-y-2.5 text-xs text-gray-500 dark:text-gray-400 print:text-black">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 print:text-black">
                      ${(detailedInvoice.items?.reduce((acc, curr) => acc + curr.amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>

                  {detailedInvoice.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({detailedInvoice.taxRate}%)</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 print:text-black">
                        ${((detailedInvoice.items?.reduce((acc, curr) => acc + curr.amount, 0) || 0) * (detailedInvoice.taxRate / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {detailedInvoice.discount > 0 && (
                    <div className="flex justify-between text-red-655 font-medium">
                      <span>Discount</span>
                      <span>-${detailedInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-800 my-1"></div>

                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 print:text-black">
                    <span>Total Due</span>
                    <span className="text-primary-600 print:text-black">
                      ${detailedInvoice.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
