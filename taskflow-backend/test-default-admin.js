const assert = require('node:assert/strict');

function makeCompanyModel({ existing = null, failLookups = 0, duplicateOnCreate = false }) {
  let lookups = 0;
  const calls = { created: [] };
  const model = {
    calls,
    findOne: async () => {
      lookups += 1;
      if (lookups <= failLookups) {
        throw new Error('relation "Companies" does not exist');
      }
      return existing;
    },
    create: async (payload) => {
      if (duplicateOnCreate) {
        const err = new Error('Validation error');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      }
      calls.created.push(payload);
      return { ...payload, id: 2 };
    },
  };
  return model;
}

function workspaceCheck({ projects, tasks = projects }) {
  const provisioned = [];
  return {
    sequencer: {
      escape: (v) => `'${v}'`,
      query: async () => [{ projects, tasks }],
    },
    queries: {
      provisioned,
      provisionCompany: async (row) => {
        provisioned.push(row.slug);
        row.status = 'active';
        return row;
      },
    },
    QueryTypes: { SELECT: 'SELECT' },
  };
}

(async () => {
  const { ensureDefaultAdmin, ensureAdminCompany } = require('./utils/ensureDefaultAdmin');

  // 1. Fresh bootstrap: no users, no Company row. Creates both and provisions.
  {
    const company = makeCompanyModel({ existing: null });
    const w = workspaceCheck({ projects: null });
    let created = 0;
    const users = {
      count: async () => 0,
      findOne: async () => null,
      create: async (payload) => { created += 1; return { ...payload, id: 1 }; },
    };
    const result = await ensureDefaultAdmin(users, {
      Company: company,
      tenantManager: { TENANT_PREFIX: 'taskflow_', ...w.queries },
      sequelize: w.sequencer,
      QueryTypes: w.QueryTypes,
    });
    assert.equal(result.created, true);
    assert.equal(result.user.email, 'admin@visuark.com');
    assert.equal(result.user.company, 'visuark');
    assert.equal(result.company.slug, 'visuark');
    assert.equal(created, 1);
    assert.deepEqual(company.calls.created[0], {
      name: 'Visuark', slug: 'visuark', dbName: 'taskflow_visuark', status: 'provisioning',
    });
    assert.deepEqual(w.queries.provisioned, ['visuark']);
  }
  console.log('fresh bootstrap creates admin + Company row + provisions: ok');

  // 2. Existing admin is not duplicated.
  {
    const company = makeCompanyModel({ existing: { slug: 'visuark', status: 'active' } });
    const w = workspaceCheck({ projects: 'taskflow_visuark."Projects"' });
    const result = await ensureDefaultAdmin({
      count: async () => 1,
      findOne: async () => ({ email: 'admin@visuark.com' }),
      create: async () => { throw new Error('should not create a duplicate default admin'); },
    }, {
      Company: company,
      tenantManager: { TENANT_PREFIX: 'taskflow_', ...w.queries },
      sequelize: w.sequencer,
      QueryTypes: w.QueryTypes,
    });
    assert.equal(result.created, false);
    assert.equal(company.calls.created.length, 0);
  }
  console.log('existing admin not duplicated, existing Company row untouched: ok');

  // 3. Legacy deployment (the production bug): admin exists, tenant schema
  //    already provisioned, but the registry row is missing. Backfill must
  //    create the row as 'active' WITHOUT re-syncing the existing schema.
  {
    const company = makeCompanyModel({ existing: null });
    const w = workspaceCheck({ projects: 'taskflow_visuark."Projects"' });
    const result = await ensureAdminCompany({
      Company: company,
      tenantManager: { TENANT_PREFIX: 'taskflow_', ...w.queries },
      sequelize: w.sequencer,
      QueryTypes: w.QueryTypes,
    });
    assert.equal(result.status, 'active');
    assert.equal(result.dbName, 'taskflow_visuark');
    assert.deepEqual(w.queries.provisioned, []);
    assert.equal(company.calls.created.length, 1);
    assert.equal(company.calls.created[0].slug, 'visuark');
    assert.equal(company.calls.created[0].status, 'active');
  }
  console.log('missing Company row backfilled as active without resync: ok');

  // 4. Cold-start race: Companies table missing, self-heals via ensurePrimarySchema.
  {
    const company = makeCompanyModel({ existing: null, failLookups: 1 });
    const w = workspaceCheck({ projects: null });
    let healed = 0;
    const result = await ensureAdminCompany({
      Company: company,
      tenantManager: { TENANT_PREFIX: 'taskflow_', ...w.queries },
      sequelize: w.sequencer,
      QueryTypes: w.QueryTypes,
      ensurePrimarySchema: async () => { healed += 1; },
    });
    assert.equal(healed, 1);
    assert.equal(result.slug, 'visuark');
    assert.equal(company.calls.created.length, 1);
  }
  console.log('Companies-missing cold start self-heals: ok');

  // 5. Concurrent cold starts race to create the same registry row; the loser
  //    gets SequelizeUniqueConstraintError ("Validation error") and must fall
  //    back to the winning row instead of crashing the bootstrap.
  {
    const winner = { slug: 'visuark', status: 'active', id: 2 };
    const company = makeCompanyModel({ existing: winner, duplicateOnCreate: true });
    const w = workspaceCheck({ projects: 'taskflow_visuark."Projects"' });
    const result = await ensureAdminCompany({
      Company: company,
      tenantManager: { TENANT_PREFIX: 'taskflow_', ...w.queries },
      sequelize: w.sequencer,
      QueryTypes: w.QueryTypes,
    });
    assert.equal(result.slug, 'visuark');
    assert.equal(result.id, 2);
    assert.equal(company.calls.created.length, 0);
  }
  console.log('duplicate-create race falls back to winning row: ok');

  console.log('default admin bootstrap test passed');
})().catch((err) => {
  console.error('default admin bootstrap test failed:', err.message);
  process.exit(1);
});