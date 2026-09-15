const { Sequelize } = require("sequelize");
const pg = require('pg'); // Force Vercel to bundle pg dialect
const dotenv = require("dotenv");
const normalizeSupabaseUri = require("../utils/normalizeSupabaseUri");

dotenv.config();

const SUPABASE_POOLER_REGION = process.env.SUPABASE_POOLER_REGION || "ap-south-1";
const poolerHost = `aws-0-${SUPABASE_POOLER_REGION}.pooler.supabase.com`;

let connectionUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let host = process.env.DB_HOST;
let port = process.env.DB_PORT || "5432";
let dbUser = process.env.DB_USER;

// Automatically map IPv6 direct connection to the IPv4 pooler for this Supabase project
connectionUri = normalizeSupabaseUri(connectionUri);

if (host && !process.env.SYNC_DIRECT) {
  const supabaseMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (supabaseMatch) {
    const projectRef = supabaseMatch[1];
    console.log(`Rewriting DB_HOST, DB_PORT and DB_USER to use Supabase IPv4 Pooler for tenant: ${projectRef}`);
    host = poolerHost;
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
      pool: {
        max: 2,
        min: 0,
        acquire: 10000,
        idle: 2000,
        evict: 2000
      }
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
        pool: {
          max: 2,
          min: 0,
          acquire: 10000,
          idle: 2000,
          evict: 2000
        }
      }
    );

// The primary schema holds the global Users/Companies tables. Supabase's
// session-mode pooler can hand this connection a server socket whose search_path
// was left pointing at a tenant schema (taskflow_*) by an earlier tenant
// Sequelize instance, so unqualified "Users"/"Companies" then resolve to the
// wrong schema (seen on production as transient "relation Companies does not
// exist" from register/CompanyLookup). Pin the search path on every connect.
sequelize.addHook("afterConnect", (connection) => {
  return connection.query("SET search_path TO public");
});

module.exports = sequelize;