// Per-query search_path pinning for Supabase transaction pooler.
//
// The transaction pooler (port 6543) shares backend sockets across logical
// connections, so a tenant's SET search_path can leak into the primary
// connection (seen as "User not found" / wrong schema resolution). Session
// mode avoids the leak but costs 5-9s per request in serverless because every
// invocation opens dedicated connections.
//
// Pinning search_path INSIDE every query (not just on connect) makes each
// statement self-contained, so it resolves the right schema no matter which
// backend socket the pooler hands over. Set dialectOptions.prependSearchPath
// so Sequelize honors the searchPath query option (see sequelize.js query()).
function pinSearchPath(sequelize, searchPath) {
  if (!sequelize.options.dialectOptions) sequelize.options.dialectOptions = {};
  sequelize.options.dialectOptions.prependSearchPath = true;

  const originalQuery = sequelize.query.bind(sequelize);
  sequelize.query = function (sql, options) {
    const opts = options || {};
    if (opts.searchPath === undefined) opts.searchPath = searchPath;
    return originalQuery(sql, opts);
  };
  return sequelize;
}

module.exports = pinSearchPath;