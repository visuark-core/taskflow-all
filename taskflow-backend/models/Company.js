const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("Company", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { is: /^[a-z0-9][a-z0-9-]*$/ },
    },
    dbHost: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dbPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5432,
    },
    dbName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("provisioning", "active"),
      allowNull: false,
      defaultValue: "provisioning",
    },
  });