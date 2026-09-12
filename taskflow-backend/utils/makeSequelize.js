const { Sequelize } = require("sequelize");
const pg = require("pg");

module.exports = function makeSequelize(connectionUri, poolMax = 2) {
  const useSsl = !/localhost|127\.0\.0\.1|::1/.test(connectionUri.split("@").pop() || connectionUri);
  const dialectOptions = useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {};
  return new Sequelize(connectionUri, {
    dialect: "postgres",
    dialectModule: pg,
    dialectOptions,
    logging: false,
    pool: { max: poolMax, min: 0, acquire: 10000, idle: 2000, evict: 2000 },
  });
};