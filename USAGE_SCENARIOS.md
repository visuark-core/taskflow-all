# Department Management - Example Usage Scenarios

## Scenario 1: Complete Department Setup

### Step 1: Admin Creates Department
**User**: Admin (John)
**Action**: Create "Engineering" department with Alice as manager

**Frontend**:
1. Navigate to "Department Management" (sidebar → Admin section)
2. Click "New Department"
3. Fill form:
   - Department Name: "Engineering"
   - Description: "Software development team"
   - Manager: Select "Alice Johnson"
   - Budget: 100000
4. Click "Create"

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "_id": "dept_123",
    "name": "Engineering",
    "description": "Software development team",
    "manager": {
      "_id": "user_alice",
      "name": "Alice Johnson",
      "email": "alice@company.com"
    },
    "teams": [],
    "members": [
      {
        "user": "user_alice",
        "role": "lead"
      }
    ],
    "budget": 100000,
    "status": "active",
    "createdBy": "user_john"
  }
}
```

**System Updates**:
- ✓ Department created
- ✓ Alice's role changed to `department_manager`
- ✓ Alice's `managedDepartment` set to `dept_123`
- ✓ Alice added as department member
- ✓ Activity logged

---

### Step 2: Manager Creates Teams
**User**: Alice (Engineering Manager)
**Action**: Create "Backend" and "Frontend" teams

**Alice's View After Login**:
- Sidebar shows "My Department" link
- Navigates to `/manager-dashboard`
- Sees "Engineering" department

**Frontend - Create Backend Team**:
1. Select "Engineering" from left panel
2. In Teams section, click "New Team"
3. Fill form:
   - Team Name: "Backend"
   - Description: "API and Database"
4. Click "Create Team"

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "_id": "team_backend",
    "name": "Backend",
    "description": "API and Database",
    "department": {
      "_id": "dept_123",
      "name": "Engineering"
    },
    "owner": "user_alice",
    "members": [
      {
        "user": "user_alice",
        "role": "admin"
      }
    ],
    "status": "active"
  }
}
```

**Repeat for Frontend Team**:
- Same process creates "Frontend" team

**System Updates**:
- ✓ Both teams created
- ✓ Both added to Engineering department
- ✓ Alice set as owner of both teams
- ✓ Alice added as admin member of both teams

---

### Step 3: Add Team Members
**User**: Alice (Team Owner)
**Action**: Add Bob and Carol to Backend team

**Frontend** (Team Management):
1. Navigate to "Team" section
2. Select "Backend" team
3. Click "Add Member"
4. Select "Bob Smith"
5. Set role: "member"
6. Click "Add"

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "_id": "team_backend",
    "name": "Backend",
    "members": [
      {
        "user": "user_alice",
        "role": "admin"
      },
      {
        "user": "user_bob",
        "role": "member"
      }
    ]
  }
}
```

**Repeat for Carol**: Add to team with "lead" role

---

### Step 4: View Department Structure
**User**: John (Admin)
**Action**: View complete Engineering department structure

**Admin View**:
```
Department Management
└── Engineering (Manager: Alice Johnson)
    ├── Teams (2)
    │   ├── Backend
    │   │   ├── Alice Johnson (admin)
    │   │   ├── Bob Smith (member)
    │   │   └── Carol White (lead)
    │   └── Frontend
    │       ├── Alice Johnson (admin)
    │       └── David Chen (member)
    └── Members (2)
        ├── Alice Johnson (lead)
        └── [Other department members]
```

**API Call**:
```
GET /api/departments/dept_123?populate=teams,members
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "dept_123",
    "name": "Engineering",
    "manager": {
      "_id": "user_alice",
      "name": "Alice Johnson"
    },
    "teams": [
      {
        "_id": "team_backend",
        "name": "Backend",
        "members": [
          {"user": {"name": "Alice"}, "role": "admin"},
          {"user": {"name": "Bob"}, "role": "member"},
          {"user": {"name": "Carol"}, "role": "lead"}
        ]
      },
      {
        "_id": "team_frontend",
        "name": "Frontend",
        "members": [
          {"user": {"name": "Alice"}, "role": "admin"},
          {"user": {"name": "David"}, "role": "member"}
        ]
      }
    ],
    "members": [
      {"user": {"name": "Alice"}, "role": "lead"}
    ]
  }
}
```

---

## Scenario 2: Manager Workflow

### Alice's Daily Workflow

**Morning: Check Dashboard**
```
1. Login as Alice
2. See "My Department" in sidebar
3. Click to navigate to /manager-dashboard
4. View:
   - Engineering department
   - 2 active teams (Backend, Frontend)
   - 5 department members
   - Team activity
```

**Mid-day: Create Sprint Team**
```
1. Click "New Team" in Teams section
2. Create "DevOps" team
3. Set description: "Infrastructure and deployment"
4. Team automatically added to Engineering department
```

**Afternoon: Manage Team Members**
```
1. Open Backend team details
2. Add new team member from candidate list
3. Assign role: "member"
4. Send invite
```

**End of Day: Review Department**
```
1. View all teams created this week
2. Check team member count
3. Review budget usage
4. See activity log
```

---

## Scenario 3: Access Control Examples

### ✓ Allowed Operations

**Alice can**:
```
GET /api/departments/my-departments/list
→ See only Engineering department

GET /api/departments/dept_123
→ View full Engineering details

POST /api/teams
→ Create Backend, Frontend, DevOps teams (with departmentId: dept_123)

PUT /api/departments/dept_123
→ Update description, budget

POST /api/departments/dept_123/members
→ Add members to department

GET /api/departments/dept_123/teams
→ See all teams in Engineering
```

### ✗ Denied Operations

**Alice cannot**:
```
GET /api/departments
→ 403 Forbidden - Not admin

GET /api/departments/dept_456 (Marketing)
→ 403 Forbidden - Not manager of this dept

DELETE /api/departments/dept_123
→ 403 Forbidden - Not admin

POST /api/teams (with departmentId: dept_456)
→ 403 Forbidden - Not manager of Marketing

PUT /api/departments/dept_456
→ 403 Forbidden - Not manager of Marketing
```

---

## Scenario 4: Admin Changes Manager

### Admin Reassigns Manager
**User**: John (Admin)
**Action**: Change Engineering manager from Alice to Carol

**Frontend**:
1. Navigate to Department Management
2. Select "Engineering"
3. Click "Edit"
4. Change Manager dropdown from "Alice Johnson" to "Carol White"
5. Click "Update"

**Backend Process**:
```javascript
// 1. Find current manager (Alice)
const currentManager = await User.findById("user_alice");

// 2. Update Alice
await User.updateOne(
  { _id: "user_alice" },
  { 
    role: "user",  // ← Revert role
    managedDepartment: null  // ← Clear managed department
  }
);

// 3. Update new manager (Carol)
await User.updateOne(
  { _id: "user_carol" },
  {
    role: "department_manager",  // ← New role
    managedDepartment: "dept_123"  // ← Assign department
  }
);

// 4. Update department
await Department.updateOne(
  { _id: "dept_123" },
  { manager: "user_carol" }  // ← New manager
);
```

**Result**:
- ✓ Carol now department_manager
- ✓ Alice reverts to user role
- ✓ Carol sees "My Department" in sidebar
- ✓ Alice no longer has manager access
- ✓ All teams remain in Engineering
- ✓ Activity logged

---

## Scenario 5: API Integration Example

### Create Department via API
```bash
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{
    "name": "Marketing",
    "description": "Marketing and customer acquisition",
    "manager": "user_carol_id",
    "budget": 75000
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "dept_marketing",
    "name": "Marketing",
    "description": "Marketing and customer acquisition",
    "manager": {
      "_id": "user_carol",
      "name": "Carol White",
      "email": "carol@company.com"
    },
    "teams": [],
    "members": [{
      "user": "user_carol",
      "role": "lead"
    }],
    "budget": 75000,
    "status": "active",
    "createdAt": "2025-01-19T15:30:00Z"
  }
}
```

### Create Team in Department via API
```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer manager_token" \
  -d '{
    "name": "Content Creation",
    "description": "Blog, video, and social media content",
    "departmentId": "dept_marketing"
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "team_content",
    "name": "Content Creation",
    "description": "Blog, video, and social media content",
    "department": {
      "_id": "dept_marketing",
      "name": "Marketing"
    },
    "owner": "user_carol",
    "members": [{
      "user": "user_carol",
      "role": "admin"
    }],
    "inviteCode": "abc123def456"
  }
}
```

### Get Manager's Departments
```bash
curl -X GET http://localhost:5000/api/departments/my-departments/list \
  -H "Authorization: Bearer manager_token"
```

**Response**:
```json
{
  "success": true,
  "count": 1,
  "data": [{
    "_id": "dept_marketing",
    "name": "Marketing",
    "teams": [{
      "_id": "team_content",
      "name": "Content Creation",
      "members": [...]
    }],
    "members": [...]
  }]
}
```

---

## Scenario 6: Error Handling

### Manager tries to access another department
```bash
curl -X GET http://localhost:5000/api/departments/dept_engineering \
  -H "Authorization: Bearer carol_token"
# Carol is manager of Marketing, not Engineering
```

**Response** (403 Forbidden):
```json
{
  "success": false,
  "message": "Not authorized to access this department"
}
```

### Try to create team without department
```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer manager_token" \
  -d '{"name": "Team A"}'
# No departmentId provided
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Team must belong to a department"
}
```

### Try to create department as non-admin
```bash
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user_token" \
  -d '{"name": "Sales"}'
# User is not admin
```

**Response** (403 Forbidden):
```json
{
  "success": false,
  "message": "Only admins can create departments"
}
```

---

## Scenario 7: Complete User Journey

### New Hire: Bob Smith

**Day 1: Account Creation**
- HR creates account: bob@company.com
- Sets initial role: "user"
- Sets department: "Engineering" (for email/profile)

**Day 2: Team Assignment**
- Alice (Engineering Manager) adds Bob to Backend team
- Bob receives notification
- Bob's teams array updated

**Day 3: Bob Logs In**
- Sees Dashboard
- Sees "Team" section with "Backend"
- Can see Backend team details
- Can access Backend project/tasks

**Day 30: Promotion to Team Lead**
- Alice updates Bob's role in Backend team to "lead"
- Bob now sees team management options
- Bob can add/remove members from team

**Day 90: Transfer to Frontend**
- Alice removes Bob from Backend team
- Alice adds Bob to Frontend team
- Bob's team list updated
- Bob can now access Frontend work

---

This comprehensive scenario walkthrough demonstrates the complete department management workflow from admin creation through manager operations to team member participation.
