import React, { useEffect, useState } from 'react';
import { 
  Wallet, Users, CreditCard, Plus, Pencil, Trash2, X, Search, 
  CheckCircle, Clock, Calendar, ArrowUpRight, Landmark, FileText,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

interface SalaryDetail {
  id: number;
  baseSalary: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  upiId?: string;
  paymentMethod: 'Bank Transfer' | 'UPI' | 'Cash';
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  managedDepartment?: {
    id: number;
    name: string;
  };
  salaryDetail?: SalaryDetail | null;
}

interface SalaryPayout {
  id: number;
  userId: number;
  month: string;
  amountPaid: number;
  payoutDate?: string;
  status: 'pending' | 'paid';
  transactionId?: string;
  paymentMethod?: string;
  notes?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default function Salary() {
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [users, setUsers] = useState<User[]>([]);
  const [payouts, setPayouts] = useState<SalaryPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'employees' | 'payouts'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // e.g. "2026-08"

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isAdminOrManager = currentUser && ['admin', 'ceo', 'cfo', 'cto', 'cmo', 'manager', 'department_manager'].includes(currentUser.role);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<SalaryPayout | null>(null);
  const [payoutModalType, setPayoutModalType] = useState<'create' | 'edit'>('create');
  
  const [submittingDetail, setSubmittingDetail] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Detail Form state
  const [detailForm, setDetailForm] = useState({
    baseSalary: 0,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: '',
    upiId: '',
    paymentMethod: 'Bank Transfer' as 'Bank Transfer' | 'UPI' | 'Cash'
  });

  // Payout Form state
  const [payoutForm, setPayoutForm] = useState({
    userId: '',
    month: new Date().toISOString().slice(0, 7),
    amountPaid: 0,
    payoutDate: new Date().toISOString().split('T')[0],
    status: 'paid' as 'pending' | 'paid',
    transactionId: '',
    paymentMethod: 'Bank Transfer',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const [usersRes, payoutsRes] = await Promise.all([
        axios.get(`${API_URL}/api/salaries`, { headers }),
        axios.get(`${API_URL}/api/salaries/payouts?month=${selectedMonth}`, { headers })
      ]);
      setUsers(usersRes.data.data);
      setPayouts(payoutsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Salary Detail modal
  const handleOpenDetailModal = (user: User) => {
    setSelectedUserForDetail(user);
    const detail = user.salaryDetail;
    setDetailForm({
      baseSalary: detail?.baseSalary || 0,
      bankName: detail?.bankName || '',
      accountNumber: detail?.accountNumber || '',
      ifscCode: detail?.ifscCode || '',
      panNumber: detail?.panNumber || '',
      upiId: detail?.upiId || '',
      paymentMethod: detail?.paymentMethod || 'Bank Transfer'
    });
    setDetailError(null);
    setIsDetailModalOpen(true);
  };

  // Save/Update Salary Detail setup
  const handleDetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDetail) return;
    setSubmittingDetail(true);
    setDetailError(null);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.post(`${API_URL}/api/salaries/detail`, {
        userId: selectedUserForDetail.id,
        ...detailForm
      }, { headers });
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      setDetailError(err.response?.data?.message || 'Failed to save salary settings');
    } finally {
      setSubmittingDetail(false);
    }
  };

  // Open Create Payout modal
  const handleOpenCreatePayoutModal = (user?: User) => {
    setPayoutModalType('create');
    setPayoutForm({
      userId: user ? String(user.id) : '',
      month: selectedMonth,
      amountPaid: user?.salaryDetail?.baseSalary || 0,
      payoutDate: new Date().toISOString().split('T')[0],
      status: 'paid',
      transactionId: '',
      paymentMethod: user?.salaryDetail?.paymentMethod || 'Bank Transfer',
      notes: ''
    });
    setPayoutError(null);
    setIsPayoutModalOpen(true);
  };

  // Open Edit Payout modal
  const handleOpenEditPayoutModal = (payout: SalaryPayout) => {
    setPayoutModalType('edit');
    setSelectedPayout(payout);
    setPayoutForm({
      userId: String(payout.userId),
      month: payout.month,
      amountPaid: payout.amountPaid,
      payoutDate: payout.payoutDate ? new Date(payout.payoutDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: payout.status,
      transactionId: payout.transactionId || '',
      paymentMethod: payout.paymentMethod || 'Bank Transfer',
      notes: payout.notes || ''
    });
    setPayoutError(null);
    setIsPayoutModalOpen(true);
  };

  // Submit Payout record
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.userId) {
      setPayoutError('Please select an employee');
      return;
    }
    setSubmittingPayout(true);
    setPayoutError(null);
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      if (payoutModalType === 'create') {
        await axios.post(`${API_URL}/api/salaries/payouts`, payoutForm, { headers });
      } else if (payoutModalType === 'edit' && selectedPayout) {
        await axios.put(`${API_URL}/api/salaries/payouts/${selectedPayout.id}`, payoutForm, { headers });
      }
      setIsPayoutModalOpen(false);
      fetchData();
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || 'Failed to log payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Delete Payout record
  const handleDeletePayout = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payout log? This action is irreversible.')) return;
    try {
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      await axios.delete(`${API_URL}/api/salaries/payouts/${id}`, { headers });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payout log');
    }
  };

  // Auto-resolve prefilled amount when changing payout user
  const handlePayoutUserChange = (uId: string) => {
    const matchedUser = users.find(u => String(u.id) === uId);
    setPayoutForm({
      ...payoutForm,
      userId: uId,
      amountPaid: matchedUser?.salaryDetail?.baseSalary || 0,
      paymentMethod: matchedUser?.salaryDetail?.paymentMethod || 'Bank Transfer'
    });
  };

  // Stats Calculations
  const totalBaseExpenses = users.reduce((acc, curr) => acc + (curr.salaryDetail?.baseSalary || 0), 0);
  const paidAmount = payouts.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amountPaid, 0);
  const pendingAmount = payouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amountPaid, 0);
  const employeesConfigured = users.filter(u => u.salaryDetail != null && u.salaryDetail.baseSalary > 0).length;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.managedDepartment?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFinanceAuthorized = currentUser && (
    ['admin', 'ceo', 'cfo'].includes(currentUser.role) ||
    (['manager', 'department_manager'].includes(currentUser.role) && currentUser.department?.toLowerCase() === 'finance')
  );

  if (!isFinanceAuthorized) {
    return (
      <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 max-w-md mx-auto mt-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Only admins, CEOs, and finance managers can access salary & payroll details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Payroll & Salary</h1>
          <p className="text-sm text-gray-500">Configure salary setups and track monthly payroll disbursements.</p>
        </div>
        
        {isAdminOrManager && (
          <div className="flex items-center gap-3">
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => handleOpenCreatePayoutModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Disburse Salary
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-350">{error}</p>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Monthly Salary Commitment */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payroll Commitment</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-500 dark:bg-blue-900/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₹{totalBaseExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{employeesConfigured} employee profile(s) configured</p>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Disbursed ({selectedMonth})</span>
            <div className="rounded-lg bg-green-50 p-2 text-green-500 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₹{paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {totalBaseExpenses > 0 ? ((paidAmount / totalBaseExpenses) * 100).toFixed(0) : 0}% of commitment cleared
            </p>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Logged</span>
            <div className="rounded-lg bg-yellow-50 p-2 text-yellow-500 dark:bg-yellow-900/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Requires transaction mapping approvals</p>
          </div>
        </div>

        {/* Next Distribution Date */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cycle Window</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-500 dark:bg-purple-900/20">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">1st - 7th Monthly</h3>
            <p className="text-xs text-gray-500 mt-1">Standard business bank payout calendar</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('employees')}
          className={`border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'employees'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Employees Directory
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'payouts'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Disbursement Logs ({selectedMonth})
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : activeTab === 'employees' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or role..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-850 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-gray-150"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Employee / Contact</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Base Salary</th>
                    <th className="px-6 py-4">Prefered Mode</th>
                    <th className="px-6 py-4">Bank Details / UPI</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-955 dark:text-gray-100">{user.name}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{user.role}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">{user.managedDepartment?.name || 'Visuark Staff'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase text-[10px] ${
                          user.status === 'active' 
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                        {user.salaryDetail?.baseSalary 
                          ? `₹${user.salaryDetail.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` 
                          : '₹0'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[10px] ${
                          user.salaryDetail?.paymentMethod === 'UPI'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                            : user.salaryDetail?.paymentMethod === 'Cash'
                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                        }`}>
                          {user.salaryDetail?.paymentMethod || 'Bank Transfer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.salaryDetail ? (
                          <div className="flex flex-col space-y-0.5">
                            {user.salaryDetail.paymentMethod === 'UPI' ? (
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{user.salaryDetail.upiId || 'No UPI ID'}</span>
                            ) : user.salaryDetail.paymentMethod === 'Bank Transfer' ? (
                              <>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {user.salaryDetail.bankName || 'Unknown Bank'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  A/C: {user.salaryDetail.accountNumber || 'N/A'} (IFSC: {user.salaryDetail.ifscCode || 'N/A'})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500">Hand-in payouts</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not configured</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded border border-primary-250 dark:border-primary-850"
                          >
                            <Pencil className="h-3 w-3" />
                            Setup Salary
                          </button>
                          
                          {isAdminOrManager && user.salaryDetail && (
                            <button
                              onClick={() => handleOpenCreatePayoutModal(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 rounded border border-green-200 dark:border-green-800"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              Pay Staff
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
        </div>
      ) : (
        <div className="space-y-4">
          {/* Payout list view */}
          {payouts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
              <Wallet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-200">No disbursements logged</h3>
              <p className="mt-1 text-sm text-gray-500">No salary payouts have been logged for {selectedMonth} yet.</p>
              {isAdminOrManager && (
                <button
                  onClick={() => handleOpenCreatePayoutModal()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Log Payout Now
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Month / Cycle</th>
                      <th className="px-6 py-4">Disbursed Amt</th>
                      <th className="px-6 py-4">Payment Status</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Transaction ID / Notes</th>
                      <th className="px-6 py-4">Cleared On</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                          {payout.user?.name || 'Unknown User'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold">{payout.month}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                          ₹{payout.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium uppercase text-[10px] ${
                            payout.status === 'paid'
                              ? 'bg-green-50 text-green-750 dark:bg-green-950/20 dark:text-green-400'
                              : 'bg-yellow-50 text-yellow-750 dark:bg-yellow-950/20 dark:text-yellow-400'
                          }`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {payout.paymentMethod || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-250 truncate max-w-[150px]">
                              {payout.transactionId || 'No Txn ID'}
                            </span>
                            {payout.notes && (
                              <span className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[150px]">{payout.notes}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditPayoutModal(payout)}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                              title="Edit Log"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayout(payout.id)}
                              className="p-1 text-gray-500 hover:text-red-655 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                              title="Delete Payout Log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SETUP SALARY STRUCTURE MODAL --- */}
      {isDetailModalOpen && selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Salary Setup: {selectedUserForDetail.name}
                </h3>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDetailSubmit}>
              <div className="p-6 space-y-4">
                {detailError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-350">{detailError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Monthly Base Salary (INR) *
                  </label>
                  <input 
                    type="number"
                    required
                    min={0}
                    value={detailForm.baseSalary}
                    onChange={(e) => setDetailForm({ ...detailForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={detailForm.paymentMethod}
                    onChange={(e) => setDetailForm({ ...detailForm, paymentMethod: e.target.value as any })}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {detailForm.paymentMethod === 'UPI' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      UPI ID
                    </label>
                    <input 
                      type="text"
                      value={detailForm.upiId}
                      onChange={(e) => setDetailForm({ ...detailForm, upiId: e.target.value })}
                      placeholder="e.g. employee@upi"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                ) : detailForm.paymentMethod === 'Bank Transfer' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Bank Name
                      </label>
                      <input 
                        type="text"
                        value={detailForm.bankName}
                        onChange={(e) => setDetailForm({ ...detailForm, bankName: e.target.value })}
                        placeholder="e.g. HDFC Bank"
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Account Number
                        </label>
                        <input 
                          type="text"
                          value={detailForm.accountNumber}
                          onChange={(e) => setDetailForm({ ...detailForm, accountNumber: e.target.value })}
                          placeholder="e.g. 50100481747128"
                          className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          IFSC Code
                        </label>
                        <input 
                          type="text"
                          value={detailForm.ifscCode}
                          onChange={(e) => setDetailForm({ ...detailForm, ifscCode: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0000086"
                          className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    PAN Card Number
                  </label>
                  <input 
                    type="text"
                    value={detailForm.panNumber}
                    onChange={(e) => setDetailForm({ ...detailForm, panNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-755 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingDetail}
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingDetail ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG SALARY PAYOUT / DISBURSEMENT MODAL --- */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {payoutModalType === 'create' ? 'Disburse Payout Log' : 'Edit Payout Log'}
                </h3>
              </div>
              <button 
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit}>
              <div className="p-6 space-y-4">
                {payoutError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-350">{payoutError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Select Employee *
                  </label>
                  <select
                    required
                    disabled={payoutModalType === 'edit'}
                    value={payoutForm.userId}
                    onChange={(e) => handlePayoutUserChange(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select Employee</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} (Base: ₹{u.salaryDetail?.baseSalary || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Cycle (Month) *
                    </label>
                    <input 
                      type="month"
                      required
                      value={payoutForm.month}
                      onChange={(e) => setPayoutForm({ ...payoutForm, month: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Amount Disbursed (INR) *
                    </label>
                    <input 
                      type="number"
                      required
                      min={0}
                      value={payoutForm.amountPaid}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amountPaid: parseFloat(e.target.value) || 0 })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Payout Date
                    </label>
                    <input 
                      type="date"
                      value={payoutForm.payoutDate}
                      onChange={(e) => setPayoutForm({ ...payoutForm, payoutDate: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={payoutForm.status}
                      onChange={(e) => setPayoutForm({ ...payoutForm, status: e.target.value as any })}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="paid">Paid (Disbursed)</option>
                      <option value="pending">Pending / Processing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Method
                    </label>
                    <input 
                      type="text"
                      value={payoutForm.paymentMethod}
                      onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value })}
                      placeholder="e.g. Bank Transfer, UPI"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Transaction / Ref ID
                    </label>
                    <input 
                      type="text"
                      value={payoutForm.transactionId}
                      onChange={(e) => setPayoutForm({ ...payoutForm, transactionId: e.target.value })}
                      placeholder="e.g. TXN9872164"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Notes
                  </label>
                  <textarea 
                    rows={2}
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                    placeholder="Provide memo (e.g. Salary + Performance Bonus)"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-855 dark:text-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-755 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingPayout}
                  className="btn btn-primary bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingPayout ? 'Submitting...' : 'Log Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
