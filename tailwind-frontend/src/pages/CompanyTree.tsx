import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { 
  Network, 
  Search, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Briefcase,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function CompanyTree() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    executives: true,
    departments: true
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch users
        const usersRes = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const usersList = usersRes.data.users || usersRes.data.data || [];
        setUsers(usersList);

        // Extract unique department names
        const depts = Array.from(
          new Set(usersList.map((u: any) => u.department).filter(Boolean))
        ) as string[];
        setDepartments(depts);

        // Initialize expand states for all departments
        const initialExpanded: Record<string, boolean> = {
          executives: true,
          departments: true
        };
        depts.forEach(dept => {
          initialExpanded[dept] = true;
        });
        setExpandedNodes(initialExpanded);

      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load company directory');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const toggleExpand = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = role?.toLowerCase() || '';
    if (['admin', 'ceo', 'cto', 'cfo', 'cmo', 'coo'].includes(r)) {
      return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-none shadow-sm';
    }
    if (['manager', 'department_manager'].includes(r)) {
      return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none shadow-sm';
    }
    if (r === 'developer') {
      return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-none shadow-sm';
    }
    if (r === 'designer') {
      return 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-none shadow-sm';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  };

  const formatRole = (role: string) => {
    const r = role?.toLowerCase() || '';
    if (r === 'department_manager') return 'Department Manager';
    if (r === 'ceo') return 'Chief Executive Officer (CEO)';
    if (r === 'cto') return 'Chief Technology Officer (CTO)';
    if (r === 'cfo') return 'Chief Financial Officer (CFO)';
    if (r === 'cmo') return 'Chief Marketing Officer (CMO)';
    if (r === 'coo') return 'Chief Operating Officer (COO)';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // 1. Filtered users based on search
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || u.department?.toLowerCase() === selectedDept.toLowerCase();
    return matchesSearch && matchesDept;
  });

  // 2. Separate executive level users (they report directly to the top hub)
  const executives = filteredUsers.filter((u: any) => 
    ['ceo', 'cto', 'cfo', 'cmo', 'coo', 'admin'].includes(u.role?.toLowerCase() || '')
  );

  // 3. Department-specific groupings (excluding executives from the main department sub-list to avoid repetition, unless filtered specifically)
  const getDepartmentHierarchy = (deptName: string) => {
    const deptUsers = filteredUsers.filter((u: any) => 
      u.department?.toLowerCase() === deptName.toLowerCase() &&
      !['ceo', 'cto', 'cfo', 'cmo', 'coo', 'admin'].includes(u.role?.toLowerCase() || '')
    );

    // Group department users by position rank
    const managers = deptUsers.filter((u: any) => 
      ['manager', 'department_manager'].includes(u.role?.toLowerCase() || '')
    );

    const members = deptUsers.filter((u: any) => 
      !['manager', 'department_manager'].includes(u.role?.toLowerCase() || '')
    );

    return { managers, members };
  };

  // Render a member profile card
  const MemberCard = ({ member }: { member: any }) => (
    <Link 
      to={`/team/${member.id}`}
      className="group relative flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-primary-500/50 w-56 flex-shrink-0"
    >
      <div className="relative mb-3">
        <Avatar name={member.name} size="lg" />
        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-950" />
      </div>
      
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate w-full px-1">
        {member.name}
      </h4>
      
      <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getRoleBadgeStyle(member.role)}`}>
        {formatRole(member.role)}
      </span>

      <div className="mt-4 flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-400 w-full">
        <div className="flex items-center gap-1.5 justify-center w-full">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate capitalize">{member.department || 'General'}</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center w-full">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary-600 dark:text-primary-500 animate-pulse" />
            Company Hierarchy Tree
          </h1>
          <p className="text-sm text-gray-500">Visualize structure, departments, and roles in real-time</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-primary-500 w-60"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-primary-500 capitalize"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-center py-16 text-gray-500">Generating company graph...</p>}
      {error && <p className="text-center py-16 text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <div className="space-y-12 overflow-x-auto pb-8">
          
          {/* Top-Level: Executive Suite Node */}
          {executives.length > 0 && (
            <div className="flex flex-col items-center">
              <button 
                onClick={() => toggleExpand('executives')}
                className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-5 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                EXECUTIVE BOARD
                {expandedNodes['executives'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {expandedNodes['executives'] && (
                <div className="mt-6 flex flex-wrap justify-center gap-6 animate-fade-in">
                  {executives.map(exec => (
                    <MemberCard key={exec.id} member={exec} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Department Nodes Connection Line */}
          {executives.length > 0 && departments.length > 0 && (
            <div className="hidden lg:flex flex-col items-center justify-center -my-6 h-12 w-full">
              <div className="h-full w-0.5 bg-gray-200 dark:bg-gray-800" />
            </div>
          )}

          {/* Level 2: Departments Layout */}
          <div className="space-y-10">
            {departments.map((deptName) => {
              const { managers, members } = getDepartmentHierarchy(deptName);
              
              // Skip empty departments under searches
              if (managers.length === 0 && members.length === 0) return null;

              return (
                <div 
                  key={deptName} 
                  className="bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6"
                >
                  {/* Department Section Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                    <button
                      onClick={() => toggleExpand(deptName)}
                      className="flex items-center gap-2 group text-left"
                    >
                      <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      <span className="font-bold text-gray-900 dark:text-white capitalize text-lg">
                        {deptName} Department
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {managers.length + members.length}
                      </span>
                      {expandedNodes[deptName] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </button>
                  </div>

                  {expandedNodes[deptName] && (
                    <div className="space-y-8 animate-fade-in">
                      {/* Department Manager Row */}
                      {managers.length > 0 && (
                        <div className="flex flex-col items-center gap-4">
                          <span className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5" /> Department Leadership
                          </span>
                          <div className="flex flex-wrap justify-center gap-6">
                            {managers.map(mgr => (
                              <MemberCard key={mgr.id} member={mgr} />
                            ))}
                          </div>

                          {members.length > 0 && (
                            <div className="hidden lg:block w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                          )}
                        </div>
                      )}

                      {/* Department Members Grid */}
                      {members.length > 0 && (
                        <div className="flex flex-col items-center gap-4">
                          {managers.length > 0 && (
                            <span className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5" /> Team Members
                            </span>
                          )}
                          <div className="flex flex-wrap justify-center gap-6">
                            {members.map(dev => (
                              <MemberCard key={dev.id} member={dev} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
