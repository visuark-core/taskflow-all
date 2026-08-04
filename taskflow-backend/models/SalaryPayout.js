const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SalaryPayout = sequelize.define("SalaryPayout", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING, // e.g. "2026-08"
    allowNull: false,
  },
  amountPaid: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  payoutDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "paid"),
    defaultValue: "pending",
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = SalaryPayout;
