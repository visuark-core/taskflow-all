const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const User = require("./User");
const Department = require("./Department");
const Team = require("./Team");
const Project = require("./Project");
const Client = require("./Client");
const Service = require("./Service");
const Invoice = require("./Invoice");
const InvoiceItem = require("./InvoiceItem");
const Task = require("./Task");
const Activity = require("./Activity");
const Message = require("./Message");
const Notification = require("./Notification");
const SalaryDetail = require("./SalaryDetail");
const SalaryPayout = require("./SalaryPayout");
const Expense = require("./Expense");

// Define Join Tables / Sub-models

const ProjectMember = sequelize.define("ProjectMember", {
  role: {
    type: DataTypes.ENUM("viewer", "member", "admin"),
    defaultValue: "member",
  },
});

const TeamMember = sequelize.define("TeamMember", {
  role: {
    type: DataTypes.ENUM("member", "lead", "admin"),
    defaultValue: "member",
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const DepartmentMember = sequelize.define("DepartmentMember", {
  role: {
    type: DataTypes.ENUM("member", "lead"),
    defaultValue: "member",
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const TaskComment = sequelize.define("TaskComment", {
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const TaskAttachment = sequelize.define("TaskAttachment", {
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const TaskLabel = sequelize.define("TaskLabel", {
  name: DataTypes.STRING,
  color: DataTypes.STRING,
});

// Associations

// --- User Associations ---
User.belongsTo(Department, { as: "managedDepartment", foreignKey: "managedDepartmentId" });
Department.hasOne(User, { as: "manager", foreignKey: "managedDepartmentId" });

User.belongsTo(User, { as: "reportingManager", foreignKey: "reportingManagerId" });

User.belongsToMany(Team, { through: TeamMember, foreignKey: "UserId", otherKey: "TeamId" });
Team.belongsToMany(User, { as: "members", through: TeamMember, foreignKey: "TeamId", otherKey: "UserId" });

Team.belongsTo(User, { as: "owner", foreignKey: "ownerId" });

// --- Department Associations ---
Department.belongsTo(User, { as: "departmentManager", foreignKey: "managerId" });
Department.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });

Team.belongsTo(Department, { foreignKey: "departmentId" });
Department.hasMany(Team, { foreignKey: "departmentId" });

Department.belongsToMany(User, { as: "members", through: DepartmentMember });
User.belongsToMany(Department, { as: "departments", through: DepartmentMember });

// --- Project Associations ---
Project.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
User.hasMany(Project, { foreignKey: "ownerId" });

Project.belongsTo(Team, { foreignKey: "teamId" });
Team.hasMany(Project, { foreignKey: "teamId" });

Project.belongsTo(Client, { as: "client", foreignKey: "clientId" });
Client.hasMany(Project, { as: "projects", foreignKey: "clientId" });

Project.belongsTo(Service, { as: "service", foreignKey: "serviceId" });
Service.hasMany(Project, { as: "projects", foreignKey: "serviceId" });

Project.belongsToMany(User, { as: "members", through: ProjectMember });
User.belongsToMany(Project, { as: "projects", through: ProjectMember });

// --- Task Associations ---
Task.belongsTo(Project, { foreignKey: "projectId" });
Project.hasMany(Task, { foreignKey: "projectId" });

Task.belongsTo(User, { as: "assignee", foreignKey: "assigneeId" });
Task.belongsTo(User, { as: "assignedBy", foreignKey: "assignedById" });
User.hasMany(Task, { foreignKey: "assigneeId" });

Task.hasMany(TaskComment, { as: "comments", foreignKey: "taskId" });
TaskComment.belongsTo(Task, { foreignKey: "taskId" });
TaskComment.belongsTo(User, { foreignKey: "userId" });

Task.hasMany(TaskAttachment, { as: "attachments", foreignKey: "taskId" });
TaskAttachment.belongsTo(Task, { foreignKey: "taskId" });

Task.hasMany(TaskLabel, { as: "labels", foreignKey: "taskId" });
TaskLabel.belongsTo(Task, { foreignKey: "taskId" });

// --- Activity Associations ---
Activity.belongsTo(User, { foreignKey: "userId" });
Activity.belongsTo(Project, { foreignKey: "projectId" });
Activity.belongsTo(Task, { foreignKey: "taskId" });

// --- Message Associations ---
Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
Message.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });

// --- Notification Associations ---
Notification.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
Notification.belongsTo(Project, { as: "relatedProject", foreignKey: "relatedProjectId" });
Notification.belongsTo(Task, { as: "relatedTask", foreignKey: "relatedTaskId" });

// --- Billing/Invoice Associations ---
Invoice.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.hasMany(Invoice, { foreignKey: 'projectId', as: 'invoices' });

Invoice.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(Invoice, { foreignKey: 'clientId', as: 'invoices' });

InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice', onDelete: 'CASCADE' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items', onDelete: 'CASCADE' });

// --- Salary/Payroll Associations ---
SalaryDetail.belongsTo(User, { as: "user", foreignKey: "userId" });
User.hasOne(SalaryDetail, { as: "salaryDetail", foreignKey: "userId", onDelete: "CASCADE" });

SalaryPayout.belongsTo(User, { as: "user", foreignKey: "userId" });
User.hasMany(SalaryPayout, { as: "salaryPayouts", foreignKey: "userId", onDelete: "CASCADE" });

// --- Expense Associations ---
Expense.belongsTo(User, { as: "addedBy", foreignKey: "addedById" });
User.hasMany(Expense, { as: "expenses", foreignKey: "addedById", onDelete: "CASCADE" });

module.exports = {
  sequelize,
  User,
  Department,
  Team,
  Project,
  Client,
  Service,
  Invoice,
  InvoiceItem,
  Task,
  Activity,
  Message,
  Notification,
  SalaryDetail,
  SalaryPayout,
  Expense,
  ProjectMember,
  TeamMember,
  DepartmentMember,
  TaskComment,
  TaskAttachment,
  TaskLabel,
};
