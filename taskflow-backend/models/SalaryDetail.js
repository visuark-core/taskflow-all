const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SalaryDetail = sequelize.define("SalaryDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  baseSalary: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  panNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.ENUM("Bank Transfer", "UPI", "Cash"),
    defaultValue: "Bank Transfer",
  },
});

module.exports = SalaryDetail;
