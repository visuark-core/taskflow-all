const { Sequelize } = require("sequelize");
const pg = require('pg'); // Force Vercel to bundle pg dialect
const dotenv = require("dotenv");
dotenv.config();

let connectionUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let host = process.env.DB_HOST;
let port = process.env.DB_PORT || "5432";

// Automatically map IPv6 direct connection to the IPv4 pooler for this Supabase project
if (connectionUri && connectionUri.includes("db.fxyjskvayzytamfqstgn.supabase.co")) {
  console.log("Rewriting connection URL to use Supabase IPv4 Pooler");
  connectionUri = connectionUri.replace("db.fxyjskvayzytamfqstgn.supabase.co", "aws-0-ap-south-1.pooler.supabase.com");
  // Change port 5432 to 6543 if present
  connectionUri = connectionUri.replace(":5432", ":6543");
}

if (host === "db.fxyjskvayzytamfqstgn.supabase.co") {
  console.log("Rewriting DB_HOST and DB_PORT to use Supabase IPv4 Pooler");
  host = "aws-0-ap-south-1.pooler.supabase.com";
  port = "6543";
}

console.log("Database Config (Actual):");
console.log("DB_HOST:", host);
console.log("DB_PORT:", port);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("Has connectionUri:", !!connectionUri);

const dialectOptions = {};
let useSsl = false;

if (connectionUri) {
  if (!connectionUri.includes("localhost") && !connectionUri.includes("127.0.0.1")) {
    useSsl = true;
  }
} else if (host && host !== "localhost" && host !== "127.0.0.1") {
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
        host: host,
        port: port,
        dialect: "postgres",
        dialectModule: pg,
        dialectOptions,
        logging: false,
      }
    );

module.exports = sequelize;