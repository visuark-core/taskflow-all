const { Sequelize } = require("sequelize");
const pg = require('pg'); // Force Vercel to bundle pg dialect
const dotenv = require("dotenv");
dotenv.config();

console.log("Database Config:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("Available Environment Keys:", Object.keys(process.env).filter(k => k.startsWith('DB_') || k.startsWith('SUPABASE_') || k.includes('JWT')));

const dialectOptions = {};
// Enable SSL for cloud hosting (e.g. Supabase) but keep it disabled for localhost development
if (process.env.DB_HOST && process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1") {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    dialectModule: pg, // Pass the dialect module explicitly for serverless environments
    dialectOptions,
    logging: false,
  }
);

module.exports = sequelize;