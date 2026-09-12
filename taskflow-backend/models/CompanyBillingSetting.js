const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("CompanyBillingSetting", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signatureUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });