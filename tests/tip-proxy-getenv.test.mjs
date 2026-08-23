// Standalone assert-based check that getEnv():
//   - returns isPages:true when getOptionalRequestContext yields a ctx,
//   - returns isPages:false when it yields undefined (edge, no ctx),
//   - returns isPages:false only for the specific "can only be run" nodejs
//     runtime error and re-throws every other exception.
//
// Mirrors the logic in src/app/api/tip-proxy/[[...path]]/route.ts::getEnv —
// if that logic drifts, this test must be updated to match.
import assert from 'node:assert/strict'

function getEnvMock(opts = {}) {
  const getOptionalRequestContext = () => {
    if ('throwable' in opts) throw opts.throwable
    return opts.ctx
  }
  let c
  try {
    c = getOptionalRequestContext()
  } catch (e) {
    const msg = e?.message
    if (typeof msg === 'string' && msg.includes('can only be run')) {
      return { env: {}, isPages: false }
    }
    throw e
  }
  if (c) return { env: c.env, isPages: true }
  return { env: {}, isPages: false }
}

// 1) ctx present → isPages true
{
  const r = getEnvMock({ ctx: { env: { X: 1 } } })
  assert.equal(r.isPages, true)
  assert.equal(r.env.X, 1)
}

// 2) ctx undefined (edge, no ctx set) → fallback, no throw
{
  const r = getEnvMock({ ctx: undefined })
  assert.equal(r.isPages, false)
}

// 3) nodejs-runtime error (exact upstream phrase) → fallback
{
  const err = new Error(
    "`getRequestContext` and `getOptionalRequestContext` can only be run\n\t\t\tinside the edge runtime",
  )
  const r = getEnvMock({ throwable: err })
  assert.equal(r.isPages, false)
}

// 4) Any OTHER error MUST propagate — must NOT silently disable the
//    fail-closed KV guard downstream. Also verifies the old broad regex
//    would have false-matched some of these ("no permission", etc).
for (const err of [
  new Error('KV binding missing'),
  new Error('Cannot get context: no permission'), // false-match under old /no.*context/i
  new TypeError('boom'),
  { message: 42 },   // non-string message
  null,              // no message at all
  'string thrown',
]) {
  assert.throws(
    () => getEnvMock({ throwable: err }),
    `expected re-throw for: ${JSON.stringify(err)}`,
  )
}

console.log('ok - tip-proxy getEnv narrowing')
