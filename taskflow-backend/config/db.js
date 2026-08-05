const { Sequelize } = require("sequelize");
const mysql2 = require('mysql2'); // Force Vercel to bundle mysql2 dialect
const dotenv = require("dotenv");
dotenv.config();

console.log("Database Config:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    dialectModule: mysql2, // Pass the dialect module explicitly for serverless environments
    logging: false,
  }
);

module.exports = sequelize;