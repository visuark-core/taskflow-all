# Database Schema Documentation - Department Management

## Department Collection

### Schema Definition
```javascript
{
  _id: ObjectId,
  
  // Basic Information
  name: String (required, unique),
  description: String,
  
  // Management
  manager: ObjectId (references User, required),
  
  // Organization
  teams: [ObjectId],  // Array of Team IDs
  members: [
    {
      user: ObjectId (references User),
      role: String (enum: ['member', 'lead']),
      joinedAt: Date
    }
  ],
  
  // Financial
  budget: Number (default: 0),
  
  // Status & Control
  status: String (enum: ['active', 'inactive', 'archived'], default: 'active'),
  settings: {
    allowMemberInvites: Boolean (default: true),
    requireApprovalForNewTeams: Boolean (default: false)
  },
  
  // Audit
  createdBy: ObjectId (references User),
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Engineering",
  "description": "Software development and infrastructure",
  "manager": "507f1f77bcf86cd799439012",
  "teams": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ],
  "members": [
    {
      "user": "507f1f77bcf86cd799439012",
      "role": "lead",
      "joinedAt": "2025-01-19T10:00:00Z"
    },
    {
      "user": "507f1f77bcf86cd799439015",
      "role": "member",
      "joinedAt": "2025-01-19T11:30:00Z"
    }
  ],
  "budget": 100000,
  "status": "active",
  "settings": {
    "allowMemberInvites": true,
    "requireApprovalForNewTeams": false
  },
  "createdBy": "507f1f77bcf86cd799439001",
  "createdAt": "2025-01-19T09:00:00Z",
  "updatedAt": "2025-01-19T09:00:00Z"
}
```

## User Collection (Updated Fields)

### New/Modified Fields
```javascript
{
  // ... existing fields ...
  
  // NEW: Department Management
  managedDepartment: ObjectId (references Department, default: null),
  
  // UPDATED: Role Options
  role: String (enum: [
    'user',
    'admin',
    'manager',
    'department_manager',  // ← NEW
    'developer',
    'designer',
    'tester'
  ], default: 'user'),
  
  // ... rest of existing fields ...
}
```

### Key Changes
- **`managedDepartment`**: Only set when user is assigned as department manager
- **`department_manager` role**: Automatically assigned when creating/updating department manager
- When manager is changed or removed: `managedDepartment` is cleared and role reverts to `user`

## Team Collection (Updated Schema)

### New/Modified Fields
```javascript
{
  name: String,
  description: String,
  
  // NEW: Department Association
  department: ObjectId (references Department, required),
  
  owner: ObjectId (references User),
  members: [
    {
      user: ObjectId (references User),
      role: String (enum: ['member', 'lead', 'admin']),
      // REMOVED: department, departmentRole
      joinedAt: Date
    }
  ],
  
  projects: [ObjectId],
  inviteCode: String,
  settings: {...},
  createdAt: Date
}
```

### What Changed
- ✓ **ADDED**: `department` field (scopes team to department)
- ✗ **REMOVED**: `department` from members array
- ✗ **REMOVED**: `departmentRole` from members array

## Relationships & Indexing

### Relationship Diagram
```
Department
├── manager (→ User)
├── teams[] (→ Team[])
├── members[]
│   └── user (→ User)
└── createdBy (→ User)

User
├── managedDepartment (→ Department)
└── teams[] (→ Team[])

Team
├── department (→ Department)
├── owner (→ User)
└── members[]
    └── user (→ User)
```

### Recommended Indexes
```javascript
// Department Collection
db.departments.createIndex({ name: 1 }, { unique: true })
db.departments.createIndex({ manager: 1 })
db.departments.createIndex({ status: 1 })
db.departments.createIndex({ createdBy: 1 })

// User Collection
db.users.createIndex({ managedDepartment: 1 })
db.users.createIndex({ role: 1 })

// Team Collection
db.teams.createIndex({ department: 1 })
db.teams.createIndex({ owner: 1 })
db.teams.createIndex({ status: 1 })
```

## Query Examples

### Get All Departments with Manager Details
```javascript
db.departments.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "manager",
      foreignField: "_id",
      as: "managerDetails"
    }
  },
  {
    $unwind: "$managerDetails"
  }
])
```

### Get Department with All Teams and Members
```javascript
db.departments.aggregate([
  { $match: { _id: ObjectId("...") } },
  {
    $lookup: {
      from: "teams",
      localField: "teams",
      foreignField: "_id",
      as: "teamDetails"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "members.user",
      foreignField: "_id",
      as: "memberDetails"
    }
  }
])
```

### Get Manager's Departments
```javascript
db.departments.find({
  manager: ObjectId("user_id_here")
})
```

### Get Teams in Department
```javascript
db.teams.find({
  department: ObjectId("dept_id_here")
})
```

### Find User's Managed Department
```javascript
db.users.findOne({
  _id: ObjectId("user_id_here")
}).managedDepartment
```

## Data Integrity Constraints

### Referential Integrity Checks (Implemented)
1. **Department Manager Validation**
   - Manager must exist as a User
   - Manager role automatically updated to `department_manager`

2. **Team-Department Association**
   - Team's department must exist
   - When team is created, automatically added to department.teams
   - When team is deleted, removed from department.teams

3. **Member Management**
   - Member users must exist
   - Duplicate members prevented
   - Valid roles enforced

4. **Cascade Operations**
   - Deleting manager: requires department deletion first
   - Deleting department: removes all teams in it
   - Deleting team: removes from department.teams array

## Migration Notes (If From Existing System)

### If migrating from system without departments:

1. **Create Department Collection**
   ```javascript
   db.createCollection("departments")
   ```

2. **Add managedDepartment to Users**
   ```javascript
   db.users.updateMany(
     {},
     { $set: { managedDepartment: null } }
   )
   ```

3. **Update Team Schema**
   ```javascript
   // Add department field to existing teams
   db.teams.updateMany(
     { department: { $exists: false } },
     { $set: { department: null } }
   )
   ```

4. **Create Departments** for existing organizational structure

5. **Assign Teams** to appropriate departments

## Monitoring Queries

### Department Statistics
```javascript
db.departments.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      avgBudget: { $avg: "$budget" }
    }
  }
])
```

### Teams per Department
```javascript
db.departments.aggregate([
  {
    $project: {
      name: 1,
      teamCount: { $size: "$teams" },
      memberCount: { $size: "$members" }
    }
  }
])
```

### Managers with Departments
```javascript
db.users.aggregate([
  { $match: { role: "department_manager" } },
  {
    $lookup: {
      from: "departments",
      localField: "managedDepartment",
      foreignField: "_id",
      as: "department"
    }
  }
])
```
