# System Architecture & Visual Diagrams

## 🏗️ System Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     TASKFLOW APPLICATION                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   FRONTEND (React)  │         │   BACKEND (Node.js) │       │
│  ├─────────────────────┤         ├─────────────────────┤       │
│  │                     │         │                     │       │
│  │  Admin:             │         │  Controllers:       │       │
│  │  ├─ Department Mgmt │◄────────┤├─ Department Ctrl   │       │
│  │  └─ Create Depts    │  API    ││├─ Team Ctrl        │       │
│  │                     │  Calls  │├─ User Ctrl         │       │
│  │  Manager:           │         │└─ Others...         │       │
│  │  ├─ My Department   │         │                     │       │
│  │  └─ Create Teams    │         │  Models:            │       │
│  │                     │         │  ├─ Department      │       │
│  │  Member:            │         │  ├─ Team            │       │
│  │  └─ Teams/Tasks     │         │  ├─ User            │       │
│  │                     │         │  └─ Project/Task    │       │
│  └─────────────────────┘         │                     │       │
│                                  │  Routes:            │       │
│                                  │  ├─ /departments    │       │
│                                  │  ├─ /teams          │       │
│                                  │  └─ /users          │       │
│                                  └─────────────────────┘       │
│                                           │                    │
│                                      REST API                  │
│                                           │                    │
│                                    ┌──────▼──────┐             │
│                                    │    MYSQL    │             │
│                                    │ Database    │             │
│                                    └─────────────┘             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Entity Relationship Diagram

```
┌──────────────────────────────┐
│         DEPARTMENT           │
├──────────────────────────────┤
│ _id                          │
│ name (unique)          ──────┼──┐
│ description                  │  │
│ manager → User ────────────┐ │  │
│ teams → Team[] ───────────┐│ │  │
│ members → Member[]      │ ││ │  │
│ budget                  │ ││ │  │
│ status                  │ ││ │  │
│ settings                │ ││ │  │
│ createdBy → User        │ ││ │  │
│ createdAt, updatedAt    │ ││ │  │
└──────────────────────────────┘ ││ │
                                 ││ │
                    ┌────────────┘│ │
                    │             │ │
        ┌───────────▼──────────┐  │ │
        │       USER           │  │ │
        ├──────────────────────┤  │ │
        │ _id                  │  │ │
        │ name                 │  │ │
        │ email                │  │ │
        │ password             │  │ │
        │ role                 │◄─┘ │
        │ managedDepartment ───┼────┘
        │ teams → Team[]       │
        │ reportingManager     │
        │ avatar               │
        │ preferences          │
        │ createdAt            │
        └──────────┬───────────┘
                   │
                   │ (0..N)
                   │
        ┌──────────▼──────────┐
        │        TEAM         │
        ├─────────────────────┤
        │ _id                 │
        │ name                │
        │ description         │
        │ department ────────┬┼──┐
        │ owner → User       ││  │
        │ members []         ││  │
        │ projects []        ││  │
        │ inviteCode         ││  │
        │ settings           ││  │
        │ createdAt          ││  │
        └────────────────────┘│  │
                              │  │
                    ┌─────────┘  │
                    │            │
                    └────────────┤
                          (many)
```

---

## 🔄 Role & Permission Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE PERMISSIONS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ADMIN (Admin User)                                              │
│  ├─ ✅ View all departments                                      │
│  ├─ ✅ Create departments                                        │
│  ├─ ✅ Edit all departments                                      │
│  ├─ ✅ Delete departments                                        │
│  ├─ ✅ Assign/change managers                                    │
│  ├─ ✅ Create teams anywhere                                     │
│  ├─ ✅ Manage all members                                        │
│  └─ ✅ View activity logs                                        │
│                                                                  │
│  DEPARTMENT MANAGER (Manager assigned to department)             │
│  ├─ ✅ View my department(s)                                     │
│  ├─ ❌ View other departments                                    │
│  ├─ ❌ Create departments                                        │
│  ├─ ✅ Edit my department info                                   │
│  ├─ ❌ Delete departments                                        │
│  ├─ ❌ Assign managers                                           │
│  ├─ ✅ Create teams in my department                             │
│  ├─ ✅ Manage my department members                              │
│  └─ ✅ View my team structure                                    │
│                                                                  │
│  TEAM LEAD (Lead member of team)                                 │
│  ├─ ❌ View all departments                                      │
│  ├─ ✅ View my team                                              │
│  ├─ ❌ Create departments/teams                                  │
│  ├─ ✅ Manage team members (limited)                             │
│  ├─ ✅ Create tasks/projects                                     │
│  └─ ✅ View team activity                                        │
│                                                                  │
│  TEAM MEMBER (Member of team)                                    │
│  ├─ ❌ View departments                                          │
│  ├─ ✅ View my team                                              │
│  ├─ ❌ Create teams                                              │
│  ├─ ❌ Manage members                                            │
│  ├─ ✅ Create/manage tasks                                       │
│  └─ ✅ Collaborate on projects                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📍 User Journey Flow

### Admin: Create Department & Assign Manager
```
┌─────────────────────────────────────────────────────────────────┐
│ Admin User                                                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Login → Navigate to Department Management                       │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Click "New Department"                                          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Fill Form:                                                      │
│ - Name: "Engineering"                                           │
│ - Manager: Select "Alice Johnson"                               │
│ - Budget: 100000                                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Submit → API Call: POST /api/departments                        │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Processing:                                             │
│ 1. Create Department document                                   │
│ 2. Update Alice's role → department_manager                     │
│ 3. Update Alice's managedDepartment field                       │
│ 4. Add Alice as department member (role: lead)                  │
│ 5. Log activity                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Return Success → Department created                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Alice (now manager):                                            │
│ ✓ Role changed to department_manager                            │
│ ✓ Can see "My Department" in sidebar                            │
│ ✓ Can create teams                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Manager: Create Team
```
┌─────────────────────────────────────────────────────────────────┐
│ Alice (Department Manager)                                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Navigate to "My Department"                                     │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ View "Engineering" Department:                                  │
│ - Teams: 0                                                      │
│ - Members: 1 (Alice)                                            │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Click "New Team" in Teams section                               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Fill Form:                                                      │
│ - Name: "Backend"                                               │
│ - Description: "API and Database"                               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Submit → API Call: POST /api/teams                              │
│          (with departmentId: dept_123)                          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Processing:                                             │
│ 1. Check authorization (Alice is managerof dept)                │
│ 2. Create Team document                                         │
│ 3. Set team.department = dept_123                               │
│ 4. Set Alice as team owner                                      │
│ 5. Add Alice as team member (role: amin)                        │
│ 6. Add team to department.teams  ary                            │
│ 7. Generate invite code                                         │
│ 8. Log activity                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Return Success → Team created indepartment                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Alice's View Updated:                                           │
│ ✓ Backend team appears in Engneering                            │
│ ✓ Alice is team owner                                           │
│ ✓ Can add team members                                          │
│ ✓ Can manage team details                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authorization Flow

```
┌────────────────────────────────────────────────────────────────┐
│ API Request with JWT Token                                     │
└────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────┐
│ Middleware: protect (verfy JWT)                                │
│ ✓ Token valid?                                                 │
│ ✓ User exists?                                                 │
│ ✓ User active?                                                 │
└────────────────────────────────────────────────────────────────┘
    │
    ├─ NO ───→ 401 Unauthorized
    │
    ▼ YES
    │
┌────────────────────────────────────────────────────────────────┐
│ Controller Logic: Chek Specific Permission                     │
│                                                                │
│ For Department Oprtions:                                       │
│ IF admin → ✅ Alow all                                         │
│ IF department_mnager → ✅ Allow if managing this dept          │
│ ELSE → 403 Fobidden                                            │
│                                                                │
│ For Team prations:                                             │
│ IF admin →✅ Allow all                                         │
│ IF team owner/lead → ✅ Allow in their teams                   │
│ ELSE → 43 Forbidden                                            │
└────────────────────────────────────────────────────────────────┘
    │
    ├─ Not Authorized ───→ 403 Forbidden
    │
    ▼ Authorized
    │
┌────────────────────────────────────────────────────────────────┐
│ ExecueOperation:                                               │
│ 1. Feth requested resources                                    │
│ 2. Pocess business logic                                       │
│ 3. pdate database                                              │
│ 4.Log activity                                                 │
│ 5 Return response                                              │
└────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────┐
│ Success Response (200/201) or Error Response (4xx/5xx)         │
└────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoint Hierarchy

```
/api/
│
├── /departments (NEW)
│   │
│   ├── GET /                        [Admin Only]
│   │   └─ Get all departments
│   │
│   ├── GET /my-departments/list     [Manager Only]
│   │   └─ Get manager's departments
│   │
│   ├── POST /                       [Admin Only]
│   │   └─ Create new department
│   │
│   ├── /:id
│   │   ├── GET                      [Authorized Users]
│   │   │   └─ Get single department
│   │   │
│   │   ├── PUT                      [Admin/Manager]
│   │   │   └─ Update department
│   │   │
│   │   ├── DELETE                   [Admin Only]
│   │   │   └─ Delete department
│   │   │
│   │   ├── /members
│   │   │   ├── POST                 [Admin/Manager]
│   │   │   │   └─ Add member
│   │   │   │
│   │   │   └── DELETE               [Admin/Manager]
│   │   │       └─ Remove member
│   │   │
│   │   └── /teams
│   │       └── GET                  [Authorized Users]
│   │           └─ Get department teams
│   │
│   └── ... (other dept routes)
│
├── /teams (UPDATED)
│   ├── GET /                        [User's Teams]
│   ├── GET /department/:deptId      [Updated Route]
│   ├── POST /                       [Now with departmentId]
│   ├── PUT /:id
│   ├── DELETE /:id
│   └── ... (other team routes)
│
├── /users
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /:id
│   └── ...
│
└── ... (other routes)
```

---

## 💾 Database Collections Relationship

```
┌─────────────────────────┐
│   departments           │
├─────────────────────────┤
│ _id: ObjectId           │
│ name: String            │
│ manager: → users._id    │◄─────┐
│ teams: [→ teams._id]    │◄───┐ │
│ members:                │◄─┐ │ │
│   ├─ user: → users._id  │  │ │ │
│   ├─ role: String       │  │ │ │
│   └─ joinedAt: Date     │  │ │ │
│ createdBy: → users._id  │  │ │ │
│ ...                     │  │ │ │
└─────────────────────────┘  │ │ │
                             │ │ │
┌─────────────────────────┐  │ │ │
│   users                 │  │ │ │
├─────────────────────────┤  │ │ │
│ _id: ObjectId           │  │ │ │
│ name: String            │  │ │ │
│ email: String           │  │ │ │
│ role: String            │  │ │ │
│ managedDepartment───────┼──┘ │ │
│   → departments._id     │    │ │
│ teams: [→ teams._id]────┼────┘ │
│ ...                     │      │
└─────────────────────────┘      │
                                 │
┌─────────────────────────┐      │
│   teams                 │      │
├─────────────────────────┤      │
│ _id: ObjectId           │      │
│ name: String            │      │
│ department──────────────┼──────┘
│   → departments._id     │
│ owner: → users._id      │
│ members:                │
│   ├─ user: → users._id  │
│   ├─ role: String       │
│   └─ joinedAt: Date     │
│ ...                     │
└─────────────────────────┘
```

---

## 🎯 State Management Overview

```
Frontend State Management (React/Redux)

┌─────────────────────────────────────────────┐
│         Redux Store (auth)                  │
├─────────────────────────────────────────────┤
│ {                                           │
│   user: {                                   │
│     _id: "...",                             │
│     name: "Alice",                          │
│     email: "alice@...",                     │
│     role: "department_manager",  ← NEW      │
│     managedDepartment: "dept_123",  ← NEW   │
│     teams: [...]                            │
│   },                                        │
│   token: "eyJhbGc..."                       │
│ }                                           │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│   Component State (Page/Form Level)         │
├─────────────────────────────────────────────┤
│ departments: []                             │
│ selectedDepartment: {...}                   │
│ departmentTeams: []                         │
│ loading: false                              │
│ errorMessage: ""                            │
│ showModal: false                            │
│ formData: {...}                             │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│        API Calls (fetch/axios)              │
├─────────────────────────────────────────────┤
│ GET /api/departments                        │
│ GET /api/departments/my-departments/list    │
│ POST /api/departments                       │
│ PUT /api/departments/:id                    │
│ DELETE /api/departments/:id                 │
│ GET /api/teams/department/:deptId           │
└─────────────────────────────────────────────┘
```

---

## 📈 Complete System Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ USER INTERACTION                                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND (React Component)                                       │
│ - Render UI                                                      │
│ - Handle user input                                              │
│ - Manage local state                                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ API LAYER (fetch/axios)                                          │
│ - Build request                                                  │
│ - Add authentication token                                       │
│ - Send to backend                                                │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ NETWORK                                                          │
│ HTTP Request → Backend Server                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ BACKEND MIDDLEWARE                                               │
│ - Verify token (protect)                                         │
│ - Attach user to request                                         │
│ - Pass to controller                                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ CONTROLLER (Business Logic)                                      │
│ - Validate input                                                 │
│ - Check authorization                                            │
│ - Call model methods                                             │
│ - Format response                                                │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ DATA MODEL (MongoDB Operations)                                  │
│ - Query database                                                 │
│ - Insert/Update/Delete records                                   │
│ - Return data                                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ DATABASE (MongoDB)                                               │
│ - Store/Retrieve data                                            │
│ - Maintain relationships                                         │
│ - Apply validations                                              │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ RESPONSE PATH (Reverse)                                          │
│ Data → Controller → Response → Network → Frontend → Update UI    │
└──────────────────────────────────────────────────────────────────┘
```

---

This visual documentation provides a comprehensive understanding of the system architecture, data flow, authorization patterns, and component relationships. Use these diagrams alongside the other documentation files for complete understanding.
