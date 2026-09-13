import React, { useEffect, useRef, useState } from 'react';
import { 
  Receipt, Plus, Mail, Phone, Pencil, Trash2, X, Search, 
  Briefcase, Handshake, Calendar, IndianRupee, Eye, Printer, 
  Settings, Check, Clock, AlertCircle, Sparkles, MapPin
} from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { formatDate } from '../lib/utils';

const dataUrlToFile = (dataUrl: string, name: string): File | null => {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1] || '');
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], `${name}.png`, { type: mime });
  } catch (err) {
    return null;
  }
};

const formatDateSlash = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
};

const formatDuration = (startStr?: string, endStr?: string) => {
  if (!startStr) return '';
  const s = new Date(startStr);
  const e = endStr ? new Date(endStr) : null;
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const sFormatted = s.toLocaleDateString('en-US', options);
  const eFormatted = e ? e.toLocaleDateString('en-US', options) : '';
  return eFormatted ? `${sFormatted} - ${eFormatted}` : sFormatted;
};


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
  description?: string;
}

type PaymentMethod = 'upi' | 'bank' | 'cash' | 'cheque' | 'other';

interface InvoicePayment {
  id: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
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
  payments?: InvoicePayment[];
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
  const [activeTab, setActiveTab] = useState<'invoices' | 'services' | 'payments'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isAdminOrManager = currentUser && ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'chief_manager', 'department_manager'].includes(currentUser.role);

  // Invoices Modals/Forms State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState<'create' | 'edit'>('create');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSubmitError, setInvoiceSubmitError] = useState<string | null>(null);

  // Invoices Detail Viewer State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailedInvoice, setDetailedInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: '', method: 'other' as PaymentMethod, note: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    projectId: '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 0,
    discount: 0,
    notes: '',
    status: 'draft',
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

  // Agency Billing Settings state
  interface AgencyBillingSettings {
    upiId: string;
    phone: string;
    address: string;
    greeting: string;
    authorizedName: string;
  }

  const [agencySettings, setAgencySettings] = useState<AgencyBillingSettings>(() => {
    const saved = localStorage.getItem('agency_billing_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      upiId: 'mastersunil@yesg',
      phone: '+91 8619949455',
      address: 'I Start Incubation Center, Jodhpur',
      greeting: 'Thank you for be a part of VISUARK!',
      authorizedName: 'Authorized Signed'
    };
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<AgencyBillingSettings>({ ...agencySettings });

  // Sync settingsForm when modal opens or agencySettings changes
  useEffect(() => {
    setSettingsForm({ ...agencySettings });
  }, [agencySettings]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAgencySettings(settingsForm);
    localStorage.setItem('agency_billing_settings', JSON.stringify(settingsForm));
    setIsSettingsModalOpen(false);
  };

  // Company billing assets (logo & signature) stored on the backend
  const [billingAssets, setBillingAssets] = useState<{ logoUrl: string; signatureUrl: string }>({ logoUrl: '', signatureUrl: '' });
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetBusy, setAssetBusy] = useState<'logo' | 'signature' | null>(null);
  const [assetPreview, setAssetPreview] = useState<{ logo: string | null; signature: string | null }>({ logo: null, signature: null });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const fetchBillingAssets = async () => {
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const res = await axios.get(`${API_URL}/api/billing-settings`, { headers });
      const data = res.data?.data;
      if (data) {
        setBillingAssets({
          logoUrl: data.logoUrl || '',
          signatureUrl: data.signatureUrl || ''
        });
      }
    } catch (err) {
      // Non-fatal: fall back to default logo / SVG signature
    }
  };

  const handleAssetFileSelect = (type: 'logo' | 'signature') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAssetError(`${type === 'logo' ? 'Logo' : 'Signature'} must be an image file`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAssetError('Image size must be less than 10MB');
      return;
    }

    setAssetError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAssetPreview(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAssetUpload = async (type: 'logo' | 'signature') => {
    const preview = assetPreview[type];
    if (!preview) return;

    const fileToUpload = preview.startsWith('data:image') ? dataUrlToFile(preview, type) : null;
    if (!fileToUpload) return;

    setAssetError(null);
    setAssetBusy(type);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const formData = new FormData();
      formData.append(type, fileToUpload);
      const res = await axios.post(`${API_URL}/api/billing-settings/${type}`, formData, { headers });
      if (type === 'logo') {
        setBillingAssets(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
      } else {
        setBillingAssets(prev => ({ ...prev, signatureUrl: res.data.signatureUrl }));
      }
      setAssetPreview(prev => ({ ...prev, [type]: null }));
    } catch (err: any) {
      setAssetError(err.response?.data?.error || err.response?.data?.message || `Failed to upload ${type}`);
    } finally {
      setAssetBusy(null);
    }
  };

  const handleAssetRemove = async (type: 'logo' | 'signature') => {
    const label = type === 'logo' ? 'logo' : 'signature';
    if (!window.confirm(`Remove custom ${label} and use the default one?`)) return;
    setAssetError(null);
    setAssetBusy(type);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.delete(`${API_URL}/api/billing-settings/${type}`, { headers });
      if (type === 'logo') {
        setBillingAssets(prev => ({ ...prev, logoUrl: '' }));
      } else {
        setBillingAssets(prev => ({ ...prev, signatureUrl: '' }));
      }
      setAssetPreview(prev => ({ ...prev, [type]: null }));
    } catch (err: any) {
      setAssetError(err.response?.data?.error || err.response?.data?.message || `Failed to remove ${label}`);
    } finally {
      setAssetBusy(null);
    }
  };

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
    fetchBillingAssets();
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
      status: 'draft',
      items: [{ serviceName: '', rate: 0, quantity: 1, amount: 0, description: '' }]
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
      status: inv.status,
      items: inv.items && inv.items.length > 0 
        ? inv.items.map(item => ({ ...item, description: item.description || '' }))
        : [{ serviceName: '', rate: 0, quantity: 1, amount: 0, description: '' }]
    });
    setInvoiceSubmitError(null);
    setIsInvoiceModalOpen(true);
  };

  // Handle dynamic project selection inside invoice form to resolve Client automatically
  const handleProjectSelect = (projIdStr: string) => {
    const selectedProj = projects.find(p => String(p.id) === projIdStr);
    let resolvedClientId = '';
    let defaultItems: InvoiceItem[] = [{ serviceName: '', rate: 0, quantity: 1, amount: 0, description: '' }];
    
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
          amount: rate,
          description: `Service performed for project: ${proj.name}`
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
    } else if (field === 'description') {
      item.description = value;
    }

    item.amount = item.rate * item.quantity;
    updatedItems[index] = item;

    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const addInvoiceItemRow = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { serviceName: '', rate: 0, quantity: 1, amount: 0, description: '' }]
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
    if (invoiceForm.items.some(item => !item.serviceName.trim() || item.rate < 0 || item.quantity <= 0)) {
      setInvoiceSubmitError('All line items must have a service name, positive rate, and quantity greater than 0');
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

  const filteredPayments = invoices
    .filter(inv => (inv.payments || []).length > 0)
    .flatMap(inv => (inv.payments || []).map(p => ({ invoice: inv, payment: p })))
    .sort((a, b) => new Date(b.payment.paymentDate).getTime() - new Date(a.payment.paymentDate).getTime());

  const paymentTotals = (inv: Invoice): { paid: number; remaining: number } => {
    const paid = (inv.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(inv.totalAmount) - paid);
    return { paid, remaining };
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedInvoice) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Enter a valid payment amount greater than 0');
      return;
    }
    const { remaining } = paymentTotals(detailedInvoice);
    if (amount - remaining > 0.01) {
      alert(`Payment amount exceeds remaining balance of ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      return;
    }
    setSubmittingPayment(true);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const res = await axios.post(
        `${API_URL}/api/invoices/${detailedInvoice.id}/payments`,
        {
          amount,
          paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
          method: paymentForm.method,
          note: paymentForm.note || undefined
        },
        { headers }
      );
      const totals = res.data.data;
      setDetailedInvoice(prev => prev ? { ...prev, status: totals.invoiceStatus, payments: [...(prev.payments || []), res.data.data.payment] } : prev);
      setPaymentForm({ amount: '', paymentDate: '', method: 'other', note: '' });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!detailedInvoice) return;
    if (!window.confirm('Delete this payment? The invoice status will be recalculated.')) return;
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const res = await axios.delete(`${API_URL}/api/invoices/${detailedInvoice.id}/payments/${paymentId}`, { headers });
      const totals = res.data.data;
      setDetailedInvoice(prev => prev ? { ...prev, status: totals.invoiceStatus, payments: (prev.payments || []).filter(p => p.id !== paymentId) } : prev);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payment');
    }
  };

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

  const isFinanceAuthorized = currentUser && (
    ['admin', 'ceo', 'cfo'].includes(currentUser.role) ||
    (['chief_manager', 'department_manager'].includes(currentUser.role) && currentUser.department?.toLowerCase() === 'finance')
  );

  if (!isFinanceAuthorized) {
    return (
      <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 max-w-md mx-auto mt-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Only admins, CEOs, and finance managers can access billing details.</p>
      </div>
    );
  }

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
            Bill your clients in Indian Rupees (₹) based on project milestones and standard services performed.
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
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Payments
            </button>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-350 px-3 py-2 text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Edit print layout settings (UPI, greeting, phone, address)"
              >
                <Settings className="h-4 w-4" />
                Bill Settings
              </button>
              {(activeTab === 'invoices' || activeTab === 'services') && (
                <button
                  onClick={activeTab === 'invoices' ? handleOpenCreateInvoiceModal : handleOpenCreateServiceModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {activeTab === 'invoices' ? 'Create Invoice' : 'Add Service'}
                </button>
              )}
            </div>
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
                  className="rounded-lg border border-gray-255 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                        <th className="px-6 py-4 text-right">Paid</th>
                        <th className="px-6 py-4 text-right">Remaining</th>
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
                            ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
                            ₹{paymentTotals(inv).paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400">
                            ₹{paymentTotals(inv).remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                              {currentUser && (
                                <button
                                  onClick={() => handleOpenEditInvoiceModal(inv)}
                                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {currentUser && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv)}
                                  className="p-1 text-gray-500 hover:text-red-655 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
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

        {activeTab === 'payments' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-750 rounded-xl bg-gray-50 dark:bg-gray-800/10 m-4">
                <IndianRupee className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No payments recorded yet</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Open an invoice and record its payment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-405">
                    <tr>
                      <th className="px-6 py-4">Invoice #</th>
                      <th className="px-6 py-4">Client / Project</th>
                      <th className="px-6 py-4">Payment Date</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Note</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                    {filteredPayments.map(({ invoice, payment }) => (
                      <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          {(invoice.client?.name || '—')}{invoice.project?.name ? ` / ${invoice.project.name}` : ''}
                        </td>
                        <td className="px-6 py-4">{formatDateSlash(payment.paymentDate)}</td>
                        <td className="px-6 py-4">
                          <span className="capitalize bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{payment.method}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-700 dark:text-green-400">
                          ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{payment.note || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                      {service.rateType === 'hourly' ? 'Hourly' : 'Fixed'}
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
                    <IndianRupee className="h-5 w-5 shrink-0 text-gray-400" />
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
                        className="p-1.5 text-gray-500 hover:text-red-655 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in print:hidden">
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
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Issue Date
                    </label>
                    <input 
                      type="date"
                      value={invoiceForm.issueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                      Due Date *
                    </label>
                    <input 
                      type="date"
                      required
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Invoice Status *
                    </label>
                    <select
                      required
                      value={invoiceForm.status}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent (Due)</option>
                      <option value="paid" disabled>Paid (auto via payments)</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
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

                  <div className="space-y-4">
                    {invoiceForm.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-lg border border-gray-150 dark:border-gray-800 relative">
                        
                        <div className="flex flex-col md:flex-row gap-3 items-end">
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
                              Rate (₹) *
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
                              className="block w-full rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>

                          <div className="w-full md:w-28 text-right pr-2 pb-2 font-bold text-gray-900 dark:text-gray-205">
                            <span className="block text-[10px] text-gray-400 text-left mb-1 font-semibold uppercase">Total</span>
                            ₹{(item.rate * item.quantity).toFixed(2)}
                          </div>

                          {invoiceForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInvoiceItemRow(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-655 hover:bg-gray-105 dark:hover:bg-gray-700 rounded transition-colors mb-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Description field */}
                        <div className="w-full">
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
                            Line details / Notes (Things mentioned on it)
                          </label>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleInvoiceItemChange(idx, 'description', e.target.value)}
                            placeholder="Describe what services are included in this item (e.g. details, notes)..."
                            className="block w-full rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

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
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-250">₹{formTotals.subtotal.toFixed(2)}</span>
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
                      <span>Discount (₹)</span>
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
                      <span className="text-primary-600 dark:text-primary-400">₹{formTotals.total.toFixed(2)}</span>
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
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Service Name *
                  </label>
                  <input 
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Frontend Development"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                      Billing Rate (₹) *
                    </label>
                    <input 
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={serviceForm.rate || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, rate: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 1500"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
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
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Service Description
                  </label>
                  <textarea 
                    rows={3}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Describe what services are included in this item..."
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
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

      {/* --- Agency Bill Print Settings Modal --- */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Edit Bill Print Settings
                </h3>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="p-6 space-y-4">
                {assetError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-300">{assetError}</p>
                  </div>
                )}

                {/* Company Logo */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">
                      Company Logo
                    </label>
                    <span className="text-[10px] text-gray-400">appears on printed invoices</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center p-1.5 overflow-hidden">
                      <img
                        src={assetPreview.logo || billingAssets.logoUrl || '/logo.png'}
                        alt="Company Logo"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          if (!assetPreview.logo && !billingAssets.logoUrl) {
                            e.currentTarget.src = '/logo.png';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAssetFileSelect('logo')}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Choose Image
                      </button>
                      {assetPreview.logo && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAssetUpload('logo')}
                            disabled={assetBusy === 'logo'}
                            className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                          >
                            {assetBusy === 'logo' ? 'Uploading...' : 'Save Logo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssetPreview(prev => ({ ...prev, logo: null }))}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {billingAssets.logoUrl && !assetPreview.logo && (
                        <button
                          type="button"
                          onClick={() => handleAssetRemove('logo')}
                          disabled={assetBusy === 'logo'}
                          className="text-xs font-semibold text-red-655 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Signature */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">
                      Company Signature
                    </label>
                    <span className="text-[10px] text-gray-400">signs printed invoices</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center p-1.5 overflow-hidden">
                      {assetPreview.signature || billingAssets.signatureUrl ? (
                        <img
                          src={assetPreview.signature || billingAssets.signatureUrl}
                          alt="Company Signature"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <svg viewBox="0 0 200 60" className="h-10 w-24 text-gray-400">
                          <path
                            d="M 25 38 C 30 12, 38 10, 45 32 C 48 42, 45 48, 52 38 C 60 28, 62 18, 65 35 C 68 45, 75 32, 80 25 C 88 18, 92 38, 98 42 C 105 45, 110 32, 115 28 C 120 22, 125 35, 128 42 C 132 46, 138 32, 142 28 C 148 22, 155 35, 160 40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={signatureInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAssetFileSelect('signature')}
                      />
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Choose Image
                      </button>
                      {assetPreview.signature && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAssetUpload('signature')}
                            disabled={assetBusy === 'signature'}
                            className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                          >
                            {assetBusy === 'signature' ? 'Uploading...' : 'Save Signature'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssetPreview(prev => ({ ...prev, signature: null }))}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {billingAssets.signatureUrl && !assetPreview.signature && (
                        <button
                          type="button"
                          onClick={() => handleAssetRemove('signature')}
                          disabled={assetBusy === 'signature'}
                          className="text-xs font-semibold text-red-655 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    UPI ID for Payments *
                  </label>
                  <input 
                    type="text"
                    required
                    value={settingsForm.upiId}
                    onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                    placeholder="e.g. mastersunil@yesg"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Contact Phone Number *
                  </label>
                  <input 
                    type="text"
                    required
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    placeholder="e.g. +91 8619949455"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Greeting Message *
                  </label>
                  <input 
                    type="text"
                    required
                    value={settingsForm.greeting}
                    onChange={(e) => setSettingsForm({ ...settingsForm, greeting: e.target.value })}
                    placeholder="e.g. Thank you for be a part of VISUARK!"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Authorized Signer Label *
                  </label>
                  <input 
                    type="text"
                    required
                    value={settingsForm.authorizedName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, authorizedName: e.target.value })}
                    placeholder="e.g. Authorized Signed"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-555 uppercase mb-1">
                    Office Address / Location *
                  </label>
                  <textarea 
                    rows={2}
                    required
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    placeholder="e.g. I Start Incubation Center, Jodhpur"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-350 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-sm transition-colors shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Detailed Invoice View (Drawer / Printing layout) --- */}
      {isDetailOpen && detailedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-6 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:static print:overflow-visible">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col border border-gray-200 dark:border-gray-800 max-h-[92vh] overflow-hidden print:border-none print:shadow-none print:w-full print:max-h-none print:h-auto print:overflow-visible print:bg-white print:text-black">
            
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
                    {detailedInvoice.status !== 'cancelled' && detailedInvoice.status !== 'paid' && (
                      <button
                        onClick={() => handleUpdateInvoiceStatus(detailedInvoice.id, 'cancelled')}
                        className="px-2.5 py-1 text-[10px] font-bold text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                      >
                        Cancel Invoice
                      </button>
                    )}
                  </div>
                )}
                
                {currentUser && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenEditInvoiceModal(detailedInvoice);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                    Edit Invoice
                  </button>
                )}

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </button>
                
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
                {/* Printable Invoice Page */}
            <div className="p-8 md:p-12 pb-24 space-y-8 flex-1 overflow-y-auto bg-white text-gray-850 dark:bg-gray-900 dark:text-gray-150 print:bg-white print:text-black print:pb-16 relative print:overflow-hidden print:h-[28.2cm] print:max-h-[28.2cm] print:p-8 print:space-y-4">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-center pb-6 print:pb-3 border-b border-gray-100 dark:border-gray-800 print:border-gray-200">
                <div>
                  <img 
                    src={billingAssets.logoUrl || '/logo.png'} 
                    alt="Company Logo" 
                    className="h-14 md:h-16 object-contain" 
                    onError={(e) => {
                      if (!billingAssets.logoUrl) {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>

                <div className="text-right">
                  <h3 className="text-4xl font-light tracking-[0.15em] text-gray-900 dark:text-gray-100 uppercase font-sans print:text-black">Invoice</h3>
                </div>
              </div>

              {/* Client & Project Addresses and Metadata */}
              <div className="grid grid-cols-2 gap-8 text-xs pt-4 print:pt-2">
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-gray-950 dark:text-gray-100 print:text-black">Invoice to:</span>
                  <div className="text-base font-bold text-gray-900 dark:text-gray-100 print:text-black">
                    {detailedInvoice.client?.name || 'N/A'}
                  </div>
                  {detailedInvoice.client?.address &&
                    <div className="text-gray-500 w-64 leading-relaxed whitespace-pre-line text-xs print:text-black">
                      {detailedInvoice.client.address}
                    </div>
                  }
                </div>

                <div className="text-right text-xs space-y-1 text-gray-700 dark:text-gray-300 print:text-black">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 print:text-black">Invoice : </span>
                    {detailedInvoice.invoiceNumber.replace('INV-', '')}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 print:text-black">Date : </span>
                    {formatDateSlash(detailedInvoice.issueDate)}
                  </div>
                </div>
              </div>

              {/* Duration line */}
              {detailedInvoice.project?.startDate &&
                <div className="text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300 print:text-black">
                  Duration- {formatDuration(detailedInvoice.project.startDate, detailedInvoice.project.endDate || detailedInvoice.project.dueDate)}
                </div>
              }

              {/* Line Items Table */}
              <div className="pt-2 overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-y-2 border-gray-900 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-bold print:border-black print:text-black">
                      <th className="px-2 py-3 font-bold text-gray-900 dark:text-gray-100 print:text-black">Item</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-900 dark:text-gray-100 print:text-black">Quantity</th>
                      <th className="px-2 py-3 text-right font-bold text-gray-900 dark:text-gray-100 print:text-black">Unit Price</th>
                      <th className="px-2 py-3 text-right font-bold text-gray-900 dark:text-gray-100 print:text-black">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-700 dark:text-gray-300 print:divide-gray-300 print:text-black">
                    {detailedInvoice.items?.map((item) => (
                      <tr key={item.id} className="border-b border-gray-150 dark:border-gray-800 print:border-gray-200">
                        <td className="px-2 py-4 print:py-2 text-gray-900 dark:text-gray-150 print:text-black">
                          <div className="font-bold text-xs">{item.serviceName}</div>
                          {item.description && (
                            <div className="text-[10px] font-normal text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-line leading-relaxed">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-4 print:py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-4 print:py-2 text-right">
                          ₹{item.rate.toFixed(2)}
                        </td>
                        <td className="px-2 py-4 print:py-2 text-right font-bold text-gray-950 dark:text-gray-100 print:text-black">
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals Calculation */}
              <div className="flex flex-col items-end pt-4 print:pt-2 space-y-2 border-t-2 border-gray-900 dark:border-gray-800 print:border-black">
                <div className="flex justify-between w-64 text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black">
                  <span>Subtotal</span>
                  <span>₹{(detailedInvoice.items?.reduce((acc, curr) => acc + curr.amount, 0) || 0).toFixed(2)}</span>
                </div>

                {detailedInvoice.taxRate > 0 &&
                  <div className="flex justify-between w-64 text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black">
                    <span>Tax ({detailedInvoice.taxRate}%)</span>
                    <span>₹{((detailedInvoice.items?.reduce((acc, curr) => acc + curr.amount, 0) || 0) * (detailedInvoice.taxRate / 100)).toFixed(2)}</span>
                  </div>
                }

                {detailedInvoice.discount > 0 &&
                  <div className="flex justify-between w-64 text-xs font-semibold text-red-655">
                    <span>Discount</span>
                    <span>-₹{detailedInvoice.discount.toFixed(2)}</span>
                  </div>
                }

                <div className="border-t border-gray-900 dark:border-gray-800 w-64 my-1 print:border-black"></div>

                <div className="flex justify-between w-64 items-baseline">
                  <span className="text-lg font-bold text-gray-950 dark:text-gray-100 print:text-black">Total</span>
                  <span className="text-2xl font-black text-gray-950 dark:text-gray-100 print:text-black">
                    ₹{detailedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* --- Payments Register (not printed) --- */}
              <div className="print:hidden border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-gray-50 dark:bg-gray-800/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-green-600" /> Payments
                  </h4>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-green-600 dark:text-green-400">
                      Paid: ₹{paymentTotals(detailedInvoice).paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      Remaining: ₹{paymentTotals(detailedInvoice).remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {(detailedInvoice.payments || []).length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {(detailedInvoice.payments || []).slice().reverse().map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-700 dark:text-green-400">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 dark:text-gray-400">{formatDateSlash(p.paymentDate)}</span>
                          <span className="capitalize bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{p.method}</span>
                          {p.note && <span className="text-gray-500 dark:text-gray-400 italic">{p.note}</span>}
                        </div>
                        {isAdminOrManager && (
                          <button onClick={() => handleDeletePayment(p.id)} className="text-red-500 hover:text-red-700" title="Delete payment">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No payments recorded yet.</p>
                )}

                {detailedInvoice.status !== 'paid' && detailedInvoice.status !== 'cancelled' && isAdminOrManager && (
                  <form onSubmit={handleAddPayment} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
                      <input type="number" min="0.01" step="0.01" required value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
                      <input type="date" value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Method</label>
                      <select value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethod })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option value="upi">UPI</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Note</label>
                      <input type="text" value={paymentForm.note}
                        onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <button type="submit" disabled={submittingPayment}
                        className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-xs font-semibold">
                        <Plus className="h-3.5 w-3.5" /> {submittingPayment ? 'Saving...' : 'Add Payment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Payment Details, Greeting, Seal & Signature Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 print:pt-3 border-t border-gray-100 dark:border-gray-800 items-end relative print:border-gray-200 print:gap-4">
                
                {/* Left Side: Payment Method & Greeting */}
                <div className="space-y-6 print:space-y-3">
                  <div>
                    <span className="block text-xs font-bold text-gray-900 dark:text-gray-100 print:text-black uppercase tracking-wider">Payment Method</span>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black mt-1">
                      UPI ID: {agencySettings.upiId}
                    </div>
                  </div>
                  
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 print:text-black font-sans leading-snug">
                    {agencySettings.greeting}
                  </div>
                </div>

                {/* Right Side: Signature Line & Stamp Seal */}
                <div className="flex flex-col items-center justify-end relative select-none md:ml-auto w-48">
                  {/* Stamp Seal overlaid */}
                  <div className="absolute -top-12 left-4 opacity-75 rotate-[15deg] pointer-events-none z-10 print:opacity-90">
                    {detailedInvoice.status === 'paid' ? (
                      <svg viewBox="0 0 100 100" className="w-24 h-24 text-green-600 print:text-green-700">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="24" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">VISUARK DIGITAL</text>
                        <text x="50" y="81" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">AGENCY * JODHPUR</text>
                        <rect x="20" y="38" width="60" height="24" rx="2" fill="white" fillOpacity="0.9" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="55" textAnchor="middle" fontSize="13" fontWeight="900" fill="currentColor" letterSpacing="1">PAID</text>
                      </svg>
                    ) : detailedInvoice.status === 'overdue' ? (
                      <svg viewBox="0 0 100 100" className="w-24 h-24 text-red-655 print:text-red-750">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="24" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">VISUARK DIGITAL</text>
                        <text x="50" y="81" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">AGENCY * JODHPUR</text>
                        <rect x="15" y="38" width="70" height="24" rx="2" fill="white" fillOpacity="0.9" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor" letterSpacing="0.5">OVERDUE</text>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-600 print:text-amber-705">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="24" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">VISUARK DIGITAL</text>
                        <text x="50" y="81" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" letterSpacing="0.3">AGENCY * JODHPUR</text>
                        <rect x="20" y="38" width="60" height="24" rx="2" fill="white" fillOpacity="0.9" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="55" textAnchor="middle" fontSize="13" fontWeight="900" fill="currentColor" letterSpacing="1">DUE</text>
                      </svg>
                    )}
                  </div>

                  {/* Cursive SVG Signature */}
                  <div className="mb-1">
                    {billingAssets.signatureUrl ? (
                      <img
                        src={billingAssets.signatureUrl}
                        alt="Authorized Signature"
                        className="h-14 w-44 object-contain"
                      />
                    ) : (
                      <svg viewBox="0 0 200 60" className="h-14 w-44 text-gray-800 dark:text-gray-200 print:text-black">
                      <path 
                        d="M 25 38 C 30 12, 38 10, 45 32 C 48 42, 45 48, 52 38 C 60 28, 62 18, 65 35 C 68 45, 75 32, 80 25 C 88 18, 92 38, 98 42 C 105 45, 110 32, 115 28 C 120 22, 125 35, 128 42 C 132 46, 138 32, 142 28 C 148 22, 155 35, 160 40" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                      <path 
                        d="M 20 48 L 175 48" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                      />
                    </svg>
                    )}
                  </div>
                  
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 text-center">
                    {agencySettings.authorizedName}
                  </span>
                </div>

              </div>

              {/* Bottom blue gradient footer banner */}
              <div className="mt-8 bg-gradient-to-r from-blue-950 to-sky-500 text-white py-3 px-6 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-semibold tracking-wide print:rounded-none print:absolute print:bottom-0 print:left-0 print:right-0 print:w-full print:px-8">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-sky-200" />
                  <span>{agencySettings.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-200" />
                  <span>{agencySettings.address}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
