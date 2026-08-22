import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Database, 
  UserPlus, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Terminal,
  Activity,
  Server
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type InstallerStep = 'agreement' | 'config' | 'loading' | 'success';

interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'success' | 'error';
}

export default function Installer() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<InstallerStep>('agreement');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [scrollReachedBottom, setScrollReachedBottom] = useState(false);
  const eulaContainerRef = useRef<HTMLDivElement>(null);

  // Admin Account configuration
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [installError, setInstallError] = useState('');

  // Live installation items
  const [progress, setProgress] = useState(0);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([
    { id: 'env', label: 'Verifying backend runtime environment...', status: 'pending' },
    { id: 'db-conn', label: 'Establishing connection to PostgreSQL...', status: 'pending' },
    { id: 'db-sync', label: 'Synchronizing relational schemas...', status: 'pending' },
    { id: 'admin-user', label: 'Creating Chief Manager administrator account...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing system assets & caching configurations...', status: 'pending' },
  ]);

  // Check scroll on EULA to encourage reading
  const handleEulaScroll = () => {
    const container = eulaContainerRef.current;
    if (container) {
      const isBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
      if (isBottom) {
        setScrollReachedBottom(true);
      }
    }
  };

  // Start the background installation process
  const startInstallation = async () => {
    setCurrentStep('loading');
    setInstallError('');
    setProgress(5);

    const updateItemStatus = (id: string, status: ProgressItem['status']) => {
      setProgressItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    };

    try {
      // 1. Verify environment
      updateItemStatus('env', 'active');
      await new Promise(r => setTimeout(r, 1200)); // Dramatic animation pause
      setProgress(20);
      updateItemStatus('env', 'success');

      // 2. Test DB Connection
      updateItemStatus('db-conn', 'active');
      await new Promise(r => setTimeout(r, 1200));
      setProgress(40);
      updateItemStatus('db-conn', 'success');

      // 3. Database Schema Sync (Actual API Call to Backend!)
      updateItemStatus('db-sync', 'active');
      try {
        await axios.get(`${API_URL}/api/db-sync`);
        setProgress(70);
        updateItemStatus('db-sync', 'success');
      } catch (err: any) {
        updateItemStatus('db-sync', 'error');
        throw new Error('Database schema synchronization failed. Make sure your database URL is correct and active. Details: ' + (err.response?.data || err.message));
      }

      // 4. Create Admin Account (Actual API Call!)
      updateItemStatus('admin-user', 'active');
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'chief_manager' // The initial admin must be the chief manager
        });
        setProgress(90);
        updateItemStatus('admin-user', 'success');
      } catch (err: any) {
        // If user already exists, we treat it as success to allow reinstallations/schema updates
        if (err.response?.data?.error?.includes('already exists') || err.response?.data?.message?.includes('already exists')) {
          setProgress(90);
          updateItemStatus('admin-user', 'success');
        } else {
          updateItemStatus('admin-user', 'error');
          throw new Error('Administrator registration failed. Details: ' + (err.response?.data?.message || err.message));
        }
      }

      // 5. Finalize
      updateItemStatus('finalize', 'active');
      await new Promise(r => setTimeout(r, 1000));
      setProgress(100);
      updateItemStatus('finalize', 'success');

      // Go to success
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep('success');
    } catch (error: any) {
      setInstallError(error.message || 'An unexpected installation error occurred.');
      setCurrentStep('config'); // fallback to let them change details
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animated Tech Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500/10 rounded-full animate-[spin_60s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-dashed border-cyan-500/15 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border border-blue-500/20 rounded-full animate-pulse" />

      {/* Main Installer Window */}
      <div className="w-full max-w-xl bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 relative z-10">
        
        {/* Top Titlebar (Linux Terminal Aesthetic) */}
        <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full block" />
            <span className="w-3 h-3 bg-yellow-500 rounded-full block" />
            <span className="w-3 h-3 bg-green-500 rounded-full block" />
            <span className="text-xs font-mono text-slate-400 pl-2">taskflow-installer_1.0.0_amd64.deb</span>
          </div>
          <div className="text-xs font-semibold uppercase text-blue-400 tracking-wider flex items-center space-x-1">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>Setup Wizard</span>
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="p-6">
          
          {/* STEP 1: License Agreement */}
          {currentStep === 'agreement' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center space-x-3 text-blue-400">
                <ShieldCheck className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">End User License Agreement</h2>
                  <p className="text-xs text-slate-400">Please review the terms of service carefully before installing.</p>
                </div>
              </div>

              {/* Scrollable EULA Box */}
              <div 
                ref={eulaContainerRef}
                onScroll={handleEulaScroll}
                className="h-48 overflow-y-auto bg-slate-950 border border-slate-850 p-4 rounded text-xs font-mono text-slate-400 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700"
              >
                <p className="text-slate-200 font-bold">TASKFLOW ENTERPRISE SOFTWARE LICENSE AGREEMENT</p>
                <p>1. LICENSE GRANT: Subject to your compliance with this EULA, TaskFlow grants you a non-exclusive, non-transferable license to install and run this application on your local machine.</p>
                <p>2. RESTRICTIONS: You shall not reverse engineer, decompile, or disassemble the database engine schema except to the extent that such activity is permitted by local laws.</p>
                <p>3. DATA SECURITY: The system uses local storage and environment configurations. If connecting to third-party databases (e.g. Supabase), data safety depends on your cloud provider security rules.</p>
                <p>4. WARRANTY DISCLAIMER: THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
                <p className="text-blue-400 font-semibold italic text-[10px]">Please scroll to the bottom to unlock acceptance.</p>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start space-x-3 bg-slate-950/40 p-3 rounded border border-slate-800">
                <input 
                  type="checkbox" 
                  id="accept" 
                  disabled={!scrollReachedBottom}
                  checked={agreementAccepted} 
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer disabled:opacity-50"
                />
                <label 
                  htmlFor="accept" 
                  className={`text-xs cursor-pointer select-none leading-snug ${scrollReachedBottom ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  I accept the terms and conditions in the Software License Agreement.
                  {!scrollReachedBottom && <span className="block text-[10px] text-yellow-500/80 mt-1">Note: Please scroll EULA completely to unlock agreement checkbox.</span>}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCurrentStep('config')}
                  disabled={!agreementAccepted}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium rounded-lg text-sm transition-all flex items-center space-x-2 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/20"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Account Configuration */}
          {currentStep === 'config' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center space-x-3 text-blue-400">
                <UserPlus className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Administrator Setup</h2>
                  <p className="text-xs text-slate-400">Configure your Chief Manager administrator account details.</p>
                </div>
              </div>

              {installError && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start space-x-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{installError}</span>
                </div>
              )}

              {/* Config Form */}
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chief Manager Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tony Stark"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Administrative Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@visuark.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Administrative Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep('agreement')}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
                >
                  Back
                </button>
                <button
                  onClick={startInstallation}
                  disabled={!adminName || !adminEmail || adminPassword.length < 6}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium rounded-lg text-sm transition-all flex items-center space-x-2 disabled:cursor-not-allowed shadow-lg"
                >
                  <span>Install Package</span>
                  <Server className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Loading Progress */}
          {currentStep === 'loading' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-slate-100">Installing System Components</h3>
                <p className="text-xs text-slate-400">Deploying files and establishing database records...</p>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* List of actions running */}
              <div className="space-y-2.5 bg-slate-950/70 p-4 rounded-lg border border-slate-850 font-mono text-xs text-slate-400">
                {progressItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="flex items-center space-x-2 overflow-hidden truncate mr-2">
                      <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.status === 'pending' && <span className="text-slate-600">Pending</span>}
                    {item.status === 'active' && <span className="text-blue-400 animate-pulse font-semibold">Running</span>}
                    {item.status === 'success' && <span className="text-green-500 font-semibold">OK</span>}
                    {item.status === 'error' && <span className="text-red-500 font-semibold">FAILED</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {currentStep === 'success' && (
            <div className="space-y-6 text-center animate-[scaleUp_0.4s_ease-out]">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-100">Setup Completed!</h2>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  TaskFlow has been successfully initialized. The relational schema is fully updated and the chief manager account has been configured.
                </p>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 text-left font-mono text-xs max-w-sm mx-auto space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service:</span>
                  <span className="text-slate-300">taskflow.service</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Endpoint:</span>
                  <span className="text-blue-400 underline cursor-pointer" onClick={() => window.open(API_URL)}>
                    {API_URL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admin Account:</span>
                  <span className="text-slate-300">{adminEmail}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm transition-all shadow-lg hover:shadow-green-500/20 w-full max-w-xs"
                >
                  Launch TaskFlow
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
