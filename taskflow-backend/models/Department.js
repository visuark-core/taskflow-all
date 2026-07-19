const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Department = sequelize.define("Department", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
  },
  budget: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive", "archived"),
    defaultValue: "active",
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      allowMemberInvites: true,
      requireApprovalForNewTeams: false,
    },
  },
});

module.exports = Department;
