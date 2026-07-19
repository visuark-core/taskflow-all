# Department Management - Quick Start Guide

## For Administrators

### Creating a Department

1. Go to **Admin** section in sidebar → **Department Management**
2. Click **"New Department"** button
3. Fill in:
   - **Department Name** (required) - e.g., "Engineering", "Marketing"
   - **Description** (optional) - Department purpose and scope
   - **Manager** (required) - Select the user who will manage this department
   - **Budget** (optional) - Department budget allocation
4. Click **"Create"**

The selected manager will automatically:
- Be assigned the `department_manager` role
- Become a member of the department with `lead` role
- Be able to access "My Department" in their sidebar

### Managing Departments

On the **Department Management** page:
- **Left Panel**: See all departments in your organization
- **Middle Panel**: 
  - View selected department details
  - Edit or Delete department
  - See teams in department
  - See department members
  - Create new teams within the department

### Assigning Teams to Departments

When creating a team:
1. Go to **Department Management**
2. Select the department
3. Click **"New Team"** in the Teams section
4. Enter team name and description
5. Click **"Create Team"**

The team will be automatically scoped to that department.

## For Department Managers

### Accessing Your Department

1. Look for **"My Department"** in the sidebar (Manager section)
2. Click to navigate to your department dashboard
3. All departments you manage appear in the left panel

### Creating Teams in Your Department

1. Go to **My Department** dashboard
2. Select your department from the left panel
3. Click **"New Team"** button in the Teams section
4. Fill in:
   - **Team Name** (required)
   - **Description** (optional)
5. Click **"Create Team"**

### Managing Team Members

Each team shows:
- Team name and description
- Number of members
- Team lead/owner name

### Viewing Department Members

In your department view, see all members with:
- Member name and email
- Member role (lead, member)

## API Endpoints Reference

### Department Endpoints (All require authentication)

#### For Admins:
```
GET    /api/departments                 → Get all departments
POST   /api/departments                 → Create new department
PUT    /api/departments/:id             → Update department
DELETE /api/departments/:id             → Delete department
```

#### For Managers:
```
GET    /api/departments/my-departments/list  → Get your departments
GET    /api/departments/:id                   → Get department details
```

#### For Team Management:
```
GET    /api/departments/:id/teams       → Get teams in department
POST   /api/departments/:id/members     → Add member to department
DELETE /api/departments/:id/members     → Remove member from department
```

### Team Endpoints (Updated)

```
POST   /api/teams                       → Create team (now with departmentId)
GET    /api/teams/department/:departmentId → Get teams in department
```

## Sample API Calls

### Create Department (Admin)
```json
POST /api/departments
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Engineering",
  "description": "Software development team",
  "manager": "user_id_here",
  "budget": 50000
}
```

### Create Team in Department (Manager)
```json
POST /api/teams
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Backend Team",
  "description": "API and database development",
  "departmentId": "dept_id_here"
}
```

### Get My Departments (Manager)
```
GET /api/departments/my-departments/list
Authorization: Bearer {token}
```

### Get Department Teams (Admin/Manager)
```
GET /api/departments/{departmentId}/teams
Authorization: Bearer {token}
```

## Key Features Summary

| Feature | Admin | Manager | Member |
|---------|-------|---------|--------|
| Create Department | ✓ | ✗ | ✗ |
| View All Departments | ✓ | ✗ | ✗ |
| View My Departments | ✗ | ✓ | ✗ |
| Edit Department | ✓* | ✓ | ✗ |
| Delete Department | ✓ | ✗ | ✗ |
| Change Manager | ✓ | ✗ | ✗ |
| Create Teams in Department | ✓ | ✓** | ✗ |
| Manage Team Members | ✓ | ✓** | ✓*** |
| View Department Members | ✓ | ✓ | ✓ |

*Admins can edit any department, managers can only edit their own
**Managers can only create teams in their assigned departments
***Members can manage teams they belong to

## Workflow Example

### Complete Setup Scenario

1. **Admin Action**: Create "Engineering" department
   - Navigate to Department Management
   - Create department with name "Engineering"
   - Assign "Alice" as manager

2. **System Auto-Update**:
   - Alice's role changed to `department_manager`
   - Alice added as department member
   - Alice's sidebar now shows "My Department"

3. **Manager Action**: Alice creates "Backend" team
   - Alice navigates to "My Department"
   - Selects "Engineering" department
   - Creates "Backend" team
   - Team automatically assigned to Engineering

4. **Manager Action**: Alice creates "Frontend" team
   - Similar process
   - Now Engineering has 2 teams

5. **Results**:
   - Admin sees: 1 department with 2 teams managed by Alice
   - Alice sees: 1 department with 2 teams she can manage
   - Team members see: Their respective teams with tasks/projects
