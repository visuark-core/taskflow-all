// Lazily ensure the primary schema exists (Users, Companies, ...).
// Guards against the first request arriving before the boot-time sync finishes
// (common on serverless cold starts) by running the create-if-missing sync
// inline and caching it, so it runs at most once per process.
let syncPromise = null;

async function ensurePrimarySchema() {
  if (!syncPromise) {
    syncPromise = (async () => {
      const { sequelize } = require("../models");
      await sequelize.sync();
      console.log("[ensurePrimarySchema] Primary schema synced (create-if-missing)");
    })();
  }
  return syncPromise;
}

module.exports = ensurePrimarySchema;