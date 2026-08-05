const { Sequelize } = require("sequelize");
const pg = require('pg'); // Force Vercel to bundle pg dialect
const dotenv = require("dotenv");
dotenv.config();

let connectionUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let host = process.env.DB_HOST;
let port = process.env.DB_PORT || "5432";
let dbUser = process.env.DB_USER;

// Automatically map IPv6 direct connection to the IPv4 pooler for this Supabase project
if (connectionUri) {
  const supabaseUriMatch = connectionUri.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (supabaseUriMatch) {
    const projectRef = supabaseUriMatch[1];
    console.log(`Rewriting connection URL to use Supabase IPv4 Pooler for tenant: ${projectRef}`);
    
    // 1. Replace the host
    connectionUri = connectionUri.replace(`db.${projectRef}.supabase.co`, "aws-0-ap-south-1.pooler.supabase.com");
    
    // 2. Change port 5432 to 6543 if present
    connectionUri = connectionUri.replace(":5432", ":6543");
    
    // 3. Append the project reference suffix to the username in the connection URI
    const urlMatch = connectionUri.match(/postgresql:\/\/([^:@]+)(:[^@]+)?@/);
    if (urlMatch) {
      const originalUser = urlMatch[1];
      if (!originalUser.endsWith(`.${projectRef}`)) {
        const replacementUser = `${originalUser}.${projectRef}`;
        connectionUri = connectionUri.replace(`postgresql://${originalUser}`, `postgresql://${replacementUser}`);
      }
    }
  }
}

if (host) {
  const supabaseMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (supabaseMatch) {
    const projectRef = supabaseMatch[1];
    console.log(`Rewriting DB_HOST, DB_PORT and DB_USER to use Supabase IPv4 Pooler for tenant: ${projectRef}`);
    host = "aws-0-ap-south-1.pooler.supabase.com";
    port = "6543";
    
    if (dbUser && !dbUser.endsWith(`.${projectRef}`)) {
      dbUser = `${dbUser}.${projectRef}`;
    }
  }
}

console.log("Database Config (Actual):");
console.log("DB_HOST:", host);
console.log("DB_PORT:", port);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", dbUser);
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
      dbUser,
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