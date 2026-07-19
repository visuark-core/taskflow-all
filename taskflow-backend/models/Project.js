const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Project = sequelize.define("Project", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("planning", "active", "on-hold", "completed", "archived"),
    defaultValue: "planning",
  },
  priority: {
    type: DataTypes.ENUM("low", "medium", "high", "urgent"),
    defaultValue: "medium",
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  budget: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: "#3B82F6",
  },
});

// Instance method
Project.prototype.calculateProgress = async function () {
  const Task = sequelize.models.Task;
  const tasks = await Task.findAll({ where: { ProjectId: this.id } });

  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  return Math.round((completedTasks / tasks.length) * 100);
};

module.exports = Project;
