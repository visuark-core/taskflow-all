const assert = require('node:assert/strict');

(async () => {
  try {
    const { ensureDefaultAdmin } = require('./utils/ensureDefaultAdmin');

    let created = 0;
    const fakeUserModel = {
      count: async () => 0,
      findOne: async () => null,
      create: async (payload) => {
        created += 1;
        return { ...payload, id: 1 };
      },
    };

    const result = await ensureDefaultAdmin(fakeUserModel);
    assert.equal(result.created, true);
    assert.equal(result.user.email, 'admin@visuark.com');
    assert.equal(created, 1);

    const second = await ensureDefaultAdmin({
      count: async () => 1,
      findOne: async () => ({ email: 'admin@visuark.com' }),
      create: async () => {
        throw new Error('should not create a duplicate default admin');
      },
    });
    assert.equal(second.created, false);

    console.log('default admin bootstrap test passed');
  } catch (err) {
    console.error('default admin bootstrap test failed:', err.message);
    process.exit(1);
  }
})();
