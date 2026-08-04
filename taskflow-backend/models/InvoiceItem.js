const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InvoiceItem = sequelize.define("InvoiceItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  serviceName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  rate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  quantity: {
    type: DataTypes.FLOAT,
    defaultValue: 1,
    validate: {
      min: 0.01,
    },
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
});

module.exports = InvoiceItem;
