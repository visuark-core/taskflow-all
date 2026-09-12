const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("Service", {
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
    rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    rateType: {
      type: DataTypes.ENUM("hourly", "fixed"),
      defaultValue: "hourly",
    },
  });