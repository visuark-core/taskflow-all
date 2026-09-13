const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("InvoicePayment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    method: {
      type: DataTypes.ENUM("upi", "bank", "cash", "cheque", "other"),
      defaultValue: "other",
    },
    note: {
      type: DataTypes.TEXT,
    },
  });