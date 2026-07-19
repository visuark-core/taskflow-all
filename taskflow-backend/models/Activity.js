const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Activity = sequelize.define("Activity", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM(
      "task_created",
      "task_updated",
      "task_completed",
      "task_assigned",
      "comment_added",
      "project_created",
      "project_updated",
      "team_created",
      "member_joined",
      "member_left",
      "file_uploaded"
    ),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
  },
});

module.exports = Activity;
