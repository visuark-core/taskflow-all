const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

function build(sequelize) {
  const User = require("./User")(sequelize);
  const Company = require("./Company")(sequelize);
  const Department = require("./Department")(sequelize);
  const Team = require("./Team")(sequelize);
  const Project = require("./Project")(sequelize);
  const Client = require("./Client")(sequelize);
  const Service = require("./Service")(sequelize);
  const Invoice = require("./Invoice")(sequelize);
  const InvoiceItem = require("./InvoiceItem")(sequelize);
  const Task = require("./Task")(sequelize);
  const Activity = require("./Activity")(sequelize);
  const Message = require("./Message")(sequelize);
  const Notification = require("./Notification")(sequelize);
  const SalaryDetail = require("./SalaryDetail")(sequelize);
  const SalaryPayout = require("./SalaryPayout")(sequelize);
  const Expense = require("./Expense")(sequelize);
  const CompanyBillingSetting = require("./CompanyBillingSetting")(sequelize);

  const ProjectMember = sequelize.define("ProjectMember", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.ENUM("viewer", "member", "admin"),
      defaultValue: "member",
    },
  });
  const TeamMember = sequelize.define("TeamMember", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
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
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
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
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  });
  const TaskAttachment = sequelize.define("TaskAttachment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
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
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    color: DataTypes.STRING,
  });

  // --- Assocations (identical to today's relationships; User stays defined
  // so FK columns like ownerId/assigneeId/senderId are still created by sync;
  // controllers must NOT include User on tenant queries) ---
  User.belongsTo(Department, { as: "managedDepartment", foreignKey: "managedDepartmentId" });
  Department.hasOne(User, { as: "manager", foreignKey: "managedDepartmentId" });
  User.belongsTo(User, { as: "reportingManager", foreignKey: "reportingManagerId" });
  User.belongsToMany(Team, { through: TeamMember, foreignKey: "UserId", otherKey: "TeamId" });
  Team.belongsToMany(User, { as: "members", through: TeamMember, foreignKey: "TeamId", otherKey: "UserId" });
  Team.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
  Department.belongsTo(User, { as: "departmentManager", foreignKey: "managerId" });
  Department.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  Team.belongsTo(Department, { foreignKey: "departmentId" });
  Department.hasMany(Team, { foreignKey: "departmentId" });
  Department.belongsToMany(User, { as: "members", through: DepartmentMember });
  User.belongsToMany(Department, { as: "departments", through: DepartmentMember });
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
  Activity.belongsTo(User, { foreignKey: "userId" });
  Activity.belongsTo(Project, { foreignKey: "projectId" });
  Activity.belongsTo(Task, { foreignKey: "taskId" });
  Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
  Message.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
  Notification.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
  Notification.belongsTo(Project, { as: "relatedProject", foreignKey: "relatedProjectId" });
  Notification.belongsTo(Task, { as: "relatedTask", foreignKey: "relatedTaskId" });
  Invoice.belongsTo(Project, { foreignKey: "projectId", as: "project" });
  Project.hasMany(Invoice, { foreignKey: "projectId", as: "invoices" });
  Invoice.belongsTo(Client, { foreignKey: "clientId", as: "client" });
  Client.hasMany(Invoice, { foreignKey: "clientId", as: "invoices" });
  InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice", onDelete: "CASCADE" });
  Invoice.hasMany(InvoiceItem, { foreignKey: "invoiceId", as: "items", onDelete: "CASCADE" });
  SalaryDetail.belongsTo(User, { as: "user", foreignKey: "userId" });
  User.hasOne(SalaryDetail, { as: "salaryDetail", foreignKey: "userId", onDelete: "CASCADE" });
  SalaryPayout.belongsTo(User, { as: "user", foreignKey: "userId" });
  User.hasMany(SalaryPayout, { as: "salaryPayouts", foreignKey: "userId", onDelete: "CASCADE" });
  Expense.belongsTo(User, { as: "addedBy", foreignKey: "addedById" });
  User.hasMany(Expense, { as: "expenses", foreignKey: "addedById", onDelete: "CASCADE" });

  return {
    sequelize, User, Company, Department, Team, Project, Client, Service,
    Invoice, InvoiceItem, Task, Activity, Message, Notification,
    SalaryDetail, SalaryPayout, Expense, CompanyBillingSetting,
    ProjectMember, TeamMember, DepartmentMember, TaskComment, TaskAttachment, TaskLabel,
  };
}

const models = build(sequelize);

module.exports = {
  ...models,
  sequelize,
  build,
};