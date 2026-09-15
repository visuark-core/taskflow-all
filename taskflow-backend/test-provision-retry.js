const assert = require('node:assert/strict');

// Hermetic tests for the transient-DB-error retry that production provisioning
// needs. Supabase's pooler can hand reads to a lagging/replica session that
// reports "relation X does not exist" for tables that are already there (a
// cold-start Vercel function failed with exactly this during provisioning).
// retryTransient must ride over that window; non-transient failures must NOT
// be retried so callers keep deterministic error behavior and rollbacks.

(async () => {
  const { retryTransient } = require('./services/tenantManager');

  // 1. Transient "does not exist" errors with action-attainable backoff are
  //    retried and the eventual success is returned.
  {
    let attempts = 0;
    const result = await retryTransient(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('relation "Companies" does not exist');
      return 'provisioned';
    }, { attempts: 3, baseDelayMs: 1 });
    assert.equal(result, 'provisioned');
    assert.equal(attempts, 3);
  }
  console.log('transient error is retried until success: ok');

  // 2. A non-transient error is NOT retried and surfaces immediately, so the
  //    register handler can roll the company row back deterministically.
  {
    let attempts = 0;
    const fatal = new Error('cannot cast type enum_X to public.enum_X');
    await assert.rejects(
      retryTransient(async () => {
        attempts += 1;
        throw fatal;
      }, { attempts: 3, baseDelayMs: 1 }),
      (err) => err === fatal
    );
    assert.equal(attempts, 1);
  }
  console.log('non-transient error is not retried: ok');

  // 3. Once attempts are exhausted the last transient error is rethrown.
  {
    const last = new Error('relation "Companies" does not exist');
    await assert.rejects(
      retryTransient(async () => {
        throw last;
      }, { attempts: 2, baseDelayMs: 1 }),
      (err) => err === last
    );
  }
  console.log('attempts exhausted rethrows last error: ok');

  // 4. A successful first attempt returns immediately without waiting on a
  //    backoff sleep afterwards.
  {
    let attempts = 0;
    const result = await retryTransient(async () => {
      attempts += 1;
      return 'fast';
    }, { attempts: 3, baseDelayMs: 1000 });
    assert.equal(result, 'fast');
    assert.equal(attempts, 1);
  }
  console.log('successful call does not sleep: ok');

  // 5. When provisioning still fails, the ErrorResponse detail (real underlying
  //    statement) must reach the API response so we can diagnose without Vercel
  //    logs; without detail the field must be absent.
  {
    const errorHandler = require('./middlewares/errorHandler');
    const ErrorResponse = require('./utils/errorResponse');
    const capture = (err) => {
      let body = null;
      const res = { status: () => ({ json: (b) => { body = b; } }) };
      errorHandler(err, { headers: {} }, res, () => {});
      return body;
    };
    const withDetail = capture(new ErrorResponse('Failed to set up your company workspace. Please try again.', 500, 'relation "Companies" does not exist'));
    assert.equal(withDetail.success, false);
    assert.equal(withDetail.error, 'Failed to set up your company workspace. Please try again.');
    assert.equal(withDetail.detail, 'relation "Companies" does not exist');

    const plain = capture(new ErrorResponse('generic failure', 500));
    assert.equal('detail' in plain, false);
  }
  console.log('error detail surfaces without logs: ok');
})();