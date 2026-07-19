const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const crypto = require("crypto");

const Team = sequelize.define("Team", {
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
  },
  inviteCode: {
    type: DataTypes.STRING,
    unique: true,
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      isPrivate: false,
      allowMemberInvites: true,
    },
  },
});

// Instance method
Team.prototype.generateInviteCode = function () {
  this.inviteCode = crypto.randomBytes(6).toString("hex");
};

module.exports = Team;
