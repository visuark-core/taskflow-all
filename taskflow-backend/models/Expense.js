const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define("Expense", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Other", // Software, Office Supplies, Travel, Marketing, Salaries, Utilities, Other
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  expenseDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  addedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Cash", // Credit Card, Bank Transfer, Cash, UPI
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "approved",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Expense;
