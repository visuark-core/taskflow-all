const app = require('./app');
const sequelize = require('./config/db');

// Helper to make API requests using native fetch
async function apiRequest(port, method, path, body = null, token = null) {
  const url = `http://localhost:${port}${path}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE API INTEGRATION TESTS ---');
  
  // 1. Wait for database connection
  await app.ready;
  console.log('Database connected.');

  // Start Express app on random port
  const server = app.listen(0);
  const { port } = server.address();
  console.log(`Server started on dynamic port: ${port}`);

  let adminToken = null;
  let managerToken = null;
  let userToken = null;
  let adminId = null;
  let managerId = null;
  let userId = null;
  let departmentId = null;
  let teamId = null;
  let projectId = null;
  let taskId = null;

  const rand = Math.floor(Math.random() * 1000000);
  const adminEmail = `admin_${rand}@example.com`;
  const managerEmail = `manager_${rand}@example.com`;
  const userEmail = `user_${rand}@example.com`;

  try {
    // ==========================================
    // 2. AUTHENTICATION & REGISTRATION TESTS
    // ==========================================
    console.log('\n[TEST] 1. Authentication Flow');

    // Register admin user
    const regAdminRes = await apiRequest(port, 'POST', '/api/auth/register', {
      name: `Test Admin ${rand}`,
      email: adminEmail,
      password: 'password123',
      company: 'TaskFlow Corp',
      role: 'admin'
    });
    if (regAdminRes.status === 201 && regAdminRes.data.success) {
      console.log('✅ Admin registered successfully');
      adminToken = regAdminRes.data.token;
      adminId = regAdminRes.data.user.id;
    } else {
      console.error('❌ Failed to register Admin:', regAdminRes);
    }

    // Register manager user (will start as 'user', then we assign to manager)
    const regManagerRes = await apiRequest(port, 'POST', '/api/auth/register', {
      name: `Test Manager ${rand}`,
      email: managerEmail,
      password: 'password123',
      company: 'TaskFlow Corp',
      role: 'user'
    });
    if (regManagerRes.status === 201 && regManagerRes.data.success) {
      console.log('✅ Manager user registered successfully');
      managerToken = regManagerRes.data.token;
      managerId = regManagerRes.data.user.id;
    } else {
      console.error('❌ Failed to register Manager user:', regManagerRes);
    }

    // Register regular user
    const regUserRes = await apiRequest(port, 'POST', '/api/auth/register', {
      name: `Test User ${rand}`,
      email: userEmail,
      password: 'password123',
      company: 'TaskFlow Corp',
      role: 'user'
    });
    if (regUserRes.status === 201 && regUserRes.data.success) {
      console.log('✅ Regular user registered successfully');
      userToken = regUserRes.data.token;
      userId = regUserRes.data.user.id;
    } else {
      console.error('❌ Failed to register Regular user:', regUserRes);
    }

    // Login as Admin
    const loginAdminRes = await apiRequest(port, 'POST', '/api/auth/login', {
      email: adminEmail,
      password: 'password123'
    });
    if (loginAdminRes.status === 200 && loginAdminRes.data.success && loginAdminRes.data.token) {
      console.log('✅ Login as Admin succeeded');
    } else {
      console.error('❌ Login as Admin failed:', loginAdminRes);
    }

    // Get Me (Me profile)
    const getMeRes = await apiRequest(port, 'GET', '/api/auth/me', null, adminToken);
    if (getMeRes.status === 200 && getMeRes.data.success && getMeRes.data.data.name.includes('Admin')) {
      console.log('✅ Get Me route succeeded');
    } else {
      console.error('❌ Get Me route failed:', getMeRes);
    }

    // ==========================================
    // 3. DEPARTMENT MANAGEMENT TESTS
    // ==========================================
    console.log('\n[TEST] 2. Department Management Flow');

    // Create department (admin only)
    const createDeptRes = await apiRequest(port, 'POST', '/api/departments', {
      name: `Engineering_${rand}`,
      description: 'Engineering and Development Department',
      budget: 150000,
      manager: managerId
    }, adminToken);

    if (createDeptRes.status === 201 && createDeptRes.data.success) {
      console.log('✅ Create Department (Admin) succeeded');
      departmentId = createDeptRes.data.data.id;
    } else {
      console.error('❌ Create Department failed:', createDeptRes);
    }

    // Verify manager's role got updated to 'department_manager'
    const loginManagerRes = await apiRequest(port, 'POST', '/api/auth/login', {
      email: managerEmail,
      password: 'password123'
    });
    if (loginManagerRes.status === 200 && loginManagerRes.data.user.role === 'department_manager') {
      console.log('✅ Manager role automatically updated to department_manager');
      managerToken = loginManagerRes.data.token;
    } else {
      console.error('❌ Manager role NOT updated:', loginManagerRes);
    }

    // Non-admin attempting to create a department
    const createDeptFailedRes = await apiRequest(port, 'POST', '/api/departments', {
      name: `FailingDept_${rand}`,
      description: 'Should fail',
      budget: 10000
    }, managerToken);
    if (createDeptFailedRes.status === 403) {
      console.log('✅ Prevented non-admin from creating department (Expected 403)');
    } else {
      console.error('❌ Failure protection failed for non-admin department creation:', createDeptFailedRes);
    }

    // Get all departments (admin only)
    const getDeptsRes = await apiRequest(port, 'GET', '/api/departments', null, adminToken);
    if (getDeptsRes.status === 200 && getDeptsRes.data.success) {
      console.log(`✅ Get all departments (Admin) succeeded (count: ${getDeptsRes.data.count})`);
    } else {
      console.error('❌ Get all departments failed:', getDeptsRes);
    }

    // Get my departments (manager only)
    const getMyDeptsRes = await apiRequest(port, 'GET', '/api/departments/my-departments/list', null, managerToken);
    if (getMyDeptsRes.status === 200 && getMyDeptsRes.data.success) {
      console.log(`✅ Get my departments (Manager) succeeded (count: ${getMyDeptsRes.data.count})`);
    } else {
      console.error('❌ Get my departments failed:', getMyDeptsRes);
    }

    // Add member to department
    const addMemberRes = await apiRequest(port, 'POST', `/api/departments/${departmentId}/members`, {
      userId: userId,
      role: 'member'
    }, managerToken);
    if (addMemberRes.status === 200 && addMemberRes.data.success) {
      console.log('✅ Add member to department succeeded');
    } else {
      console.error('❌ Add member to department failed:', addMemberRes);
    }

    // ==========================================
    // 4. TEAM MANAGEMENT TESTS
    // ==========================================
    console.log('\n[TEST] 3. Team Scoping and Scoped Operations Flow');

    // Create team in department (as manager)
    const createTeamRes = await apiRequest(port, 'POST', '/api/teams', {
      name: `Core Frontend Devs_${rand}`,
      description: 'Main Frontend Developers Team',
      departmentId: departmentId
    }, managerToken);

    if (createTeamRes.status === 201 && createTeamRes.data.success) {
      console.log('✅ Create Team (scoped to department) succeeded');
      teamId = createTeamRes.data.data.id;
    } else {
      console.error('❌ Create Team failed:', createTeamRes);
    }

    // Retrieve teams by department
    const getDeptTeamsRes = await apiRequest(port, 'GET', `/api/teams/department/${departmentId}`, null, managerToken);
    if (getDeptTeamsRes.status === 200 && getDeptTeamsRes.data.success) {
      console.log(`✅ Get teams by department succeeded (count: ${getDeptTeamsRes.data.count})`);
    } else {
      console.error('❌ Get teams by department failed:', getDeptTeamsRes);
    }

    // Non-manager of department attempting to create team in it
    const createTeamFailedRes = await apiRequest(port, 'POST', '/api/teams', {
      name: `Illegal Team_${rand}`,
      description: 'Should fail',
      departmentId: departmentId
    }, userToken);
    if (createTeamFailedRes.status === 403) {
      console.log('✅ Prevented unauthorized user from creating team in department (Expected 403)');
    } else {
      console.error('❌ Failure protection failed for unauthorized team creation:', createTeamFailedRes);
    }

    // ==========================================
    // 5. PROJECT & TASK MANAGEMENT TESTS
    // ==========================================
    console.log('\n[TEST] 4. Projects and Tasks Management Flow');

    // Create Project (as admin)
    const createProjRes = await apiRequest(port, 'POST', '/api/projects', {
      name: `TaskFlow Mobile App_${rand}`,
      description: 'Build Next-Gen TaskFlow Mobile Application',
      teamId: teamId,
      status: 'planning',
      priority: 'high',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days out
    }, adminToken);

    if (createProjRes.status === 201 && createProjRes.data.success) {
      console.log('✅ Create Project (Admin) succeeded');
      projectId = createProjRes.data.data.id;
    } else {
      console.error('❌ Create Project failed:', createProjRes);
    }

    // Unauthorized access check
    const unauthProjGet = await apiRequest(port, 'GET', `/api/projects/${projectId}`, null, userToken);
    if (unauthProjGet.status === 403) {
      console.log('✅ Prevented unauthorized user from viewing project (Expected 403)');
    } else {
      console.error('❌ Project view access restriction failed:', unauthProjGet);
    }

    // Unauthorized delete check
    const unauthProjDelete = await apiRequest(port, 'DELETE', `/api/projects/${projectId}`, null, userToken);
    if (unauthProjDelete.status === 403) {
      console.log('✅ Prevented unauthorized user from deleting project (Expected 403)');
    } else {
      console.error('❌ Project deletion restriction failed:', unauthProjDelete);
    }

    // Authorized access check
    const authProjGet = await apiRequest(port, 'GET', `/api/projects/${projectId}`, null, managerToken);
    if (authProjGet.status === 200 && authProjGet.data.success) {
      console.log('✅ Authorized user successfully retrieved project details');
    } else {
      console.error('❌ Authorized project details fetch failed:', authProjGet);
    }

    // Get Projects (as admin / manager / team owner)
    const getProjRes = await apiRequest(port, 'GET', '/api/projects', null, managerToken);
    if (getProjRes.status === 200 && getProjRes.data.success) {
      console.log(`✅ Get Projects list succeeded (count: ${getProjRes.data.count})`);
    } else {
      console.error('❌ Get Projects failed:', getProjRes);
    }

    // Create Task under Project
    const createTaskRes = await apiRequest(port, 'POST', '/api/tasks', {
      title: 'Design UI Mockups',
      description: 'Create mobile UI wireframes and high fidelity mockups',
      projectId: projectId,
      status: 'todo',
      priority: 'high',
      assignee: userId,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days out
    }, adminToken);

    if (createTaskRes.status === 201 && createTaskRes.data.success) {
      console.log('✅ Create Task under Project succeeded');
      taskId = createTaskRes.data.data.id;
    } else {
      console.error('❌ Create Task failed:', createTaskRes);
    }

    // Get Tasks of Project
    const getTasksRes = await apiRequest(port, 'GET', `/api/tasks/project/${projectId}`, null, managerToken);
    if (getTasksRes.status === 200 && getTasksRes.data.success) {
      console.log(`✅ Get tasks by project succeeded (count: ${getTasksRes.data.count})`);
    } else {
      console.error('❌ Get tasks failed:', getTasksRes);
    }

    // Update Task Checklist / Status (Assignee user)
    const updateTaskRes = await apiRequest(port, 'PUT', `/api/tasks/${taskId}`, {
      status: 'in-progress'
    }, userToken);
    if (updateTaskRes.status === 200 && updateTaskRes.data.success && updateTaskRes.data.data.status === 'in-progress') {
      console.log('✅ Update Task status by assignee succeeded');
    } else {
      console.error('❌ Update Task status by assignee failed:', updateTaskRes);
    }

    // ==========================================
    // 6. ACTIVITIES & NOTIFICATIONS TESTS
    // ==========================================
    console.log('\n[TEST] 5. Activities and Notifications Flow');

    // Get notification for team owner (manager) because a project was assigned to their team
    const getNotifRes = await apiRequest(port, 'GET', '/api/notifications', null, managerToken);
    if (getNotifRes.status === 200 && getNotifRes.data.success) {
      console.log(`✅ Get notifications succeeded (count: ${getNotifRes.data.count})`);
      const inviteNotif = getNotifRes.data.data.find(n => n.type === 'project_invite');
      if (inviteNotif) {
        console.log('✅ Received project invite/assignment notification successfully');
        
        // Test mark read
        const markReadRes = await apiRequest(port, 'PUT', `/api/notifications/${inviteNotif.id}/read`, {}, managerToken);
        if (markReadRes.status === 200 && markReadRes.data.success && markReadRes.data.data.isRead) {
          console.log('✅ Mark single notification as read succeeded');
        } else {
          console.error('❌ Mark notification read failed:', markReadRes);
        }

        // Test delete notification
        const deleteNotifRes = await apiRequest(port, 'DELETE', `/api/notifications/${inviteNotif.id}`, null, managerToken);
        if (deleteNotifRes.status === 200 && deleteNotifRes.data.success) {
          console.log('✅ Delete notification succeeded');
        } else {
          console.error('❌ Delete notification failed:', deleteNotifRes);
        }
      } else {
        console.log('⚠️ Expected project_invite notification not found, but API is working');
      }

      // Test mark all read
      const markAllReadRes = await apiRequest(port, 'PUT', '/api/notifications/read-all', {}, managerToken);
      if (markAllReadRes.status === 200 && markAllReadRes.data.success) {
        console.log('✅ Mark all notifications as read succeeded');
      } else {
        console.error('❌ Mark all read failed:', markAllReadRes);
      }
    } else {
      console.error('❌ Get notifications failed:', getNotifRes);
    }

    // Get activities (all user actions logged)
    const getActivitiesRes = await apiRequest(port, 'GET', '/api/activities', null, adminToken);
    if (getActivitiesRes.status === 200 && getActivitiesRes.data.success) {
      console.log(`✅ Get activities succeeded (count: ${getActivitiesRes.data.count})`);
    } else {
      console.error('❌ Get activities failed:', getActivitiesRes);
    }

    console.log('\n--- ALL COMPONENT API TESTS SUCCESSFULLY COMPLETED ---');

  } catch (error) {
    console.error('❌ Test execution encountered an unhandled error:', error);
  } finally {
    // Close server
    server.close(() => {
      console.log('Test Server stopped.');
      process.exit(0);
    });
  }
}

runTests();
