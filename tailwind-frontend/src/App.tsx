import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const Team = lazy(() => import('./pages/Team'));
const MemberDetail = lazy(() => import('./pages/MemberDetail'));
const Departments = lazy(() => import('./pages/Departments'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Installer = lazy(() => import('./pages/Installer'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CompanyTree = lazy(() => import('./pages/CompanyTree'));
const Clients = lazy(() => import('./pages/Clients'));
const Billing = lazy(() => import('./pages/Billing'));
const Salary = lazy(() => import('./pages/Salary'));

import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'TaskFlow - Project Management System';
  }, []);

  return (
    <AuthProvider>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Auth routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/installer" element={<Installer />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Profile />} />
        </Route>

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/new" element={<Navigate to="/tasks" replace />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="team" element={<Team />} />
          <Route path="team/:id" element={<MemberDetail />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="departments" element={<Departments />} />
          <Route path="clients" element={<Clients />} />
          <Route path="billing" element={<Billing />} />
          <Route path="salary" element={<Salary />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="company-tree" element={<CompanyTree />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Post-registration congratulations screen */}
        <Route path="/welcome" element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        } />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;