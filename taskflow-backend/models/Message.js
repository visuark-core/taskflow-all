const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("Message", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });