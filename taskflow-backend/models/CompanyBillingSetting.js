const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CompanyBillingSetting = sequelize.define("CompanyBillingSetting", {
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

module.exports = CompanyBillingSetting;