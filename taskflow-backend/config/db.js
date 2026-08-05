const { Sequelize } = require("sequelize");
const pg = require('pg'); // Force Vercel to bundle pg dialect
const dotenv = require("dotenv");
dotenv.config();

console.log("Database Config:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("Has DATABASE_URL:", !!process.env.DATABASE_URL);
console.log("Has POSTGRES_URL:", !!process.env.POSTGRES_URL);

const connectionUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const dialectOptions = {};
let useSsl = false;

if (connectionUri) {
  if (!connectionUri.includes("localhost") && !connectionUri.includes("127.0.0.1")) {
    useSsl = true;
  }
} else if (process.env.DB_HOST && process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1") {
  useSsl = true;
}

if (useSsl) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

const sequelize = connectionUri
  ? new Sequelize(connectionUri, {
      dialect: "postgres",
      dialectModule: pg,
      dialectOptions,
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "postgres",
        dialectModule: pg,
        dialectOptions,
        logging: false,
      }
    );

module.exports = sequelize;