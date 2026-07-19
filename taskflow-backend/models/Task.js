const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Task = sequelize.define("Task", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM("todo", "in-progress", "review", "done"),
    defaultValue: "todo",
  },
  priority: {
    type: DataTypes.ENUM("low", "medium", "high", "urgent"),
    defaultValue: "medium",
  },
  dueDate: {
    type: DataTypes.DATE,
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  timeTracking: {
    type: DataTypes.JSON,
    // Store: { estimated: Number, logged: Number, sessions: [...] }
  },
  checklist: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
});

module.exports = Task;
