const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Invoice = sequelize.define("Invoice", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  issueDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("draft", "sent", "paid", "overdue", "cancelled"),
    defaultValue: "draft",
  },
  taxRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0, // e.g. 15 for 15%
  },
  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
});

module.exports = Invoice;
