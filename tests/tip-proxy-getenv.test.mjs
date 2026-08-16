// Standalone assert-based check that getEnv() only swallows the
// "no request context" case from @cloudflare/next-on-pages and re-throws
// every other error. Run with: node tests/tip-proxy-getenv.test.mjs
//
// This mirrors the narrowed catch in
// src/app/api/tip-proxy/[[...path]]/route.ts::getEnv — if the pattern here
// drifts from the pattern there, this test must be updated to match.
import assert from 'node:assert/strict'

function getEnvMock(throwable) {
  const getRequestContext = () => { throw throwable }
  try {
    return { env: getRequestContext().env, isPages: true }
  } catch (e) {
    const msg = e?.message
    if (typeof msg === 'string' && /no.*context/i.test(msg)) {
      return { env: {}, isPages: false }
    }
    throw e
  }
}

// 1) "no context" style errors → fallback to non-Pages
for (const m of [
  'No request context available',
  'no context',
  'NO CONTEXT FOUND',
]) {
  const r = getEnvMock(new Error(m))
  assert.equal(r.isPages, false, `expected fallback for: ${m}`)
}

// 2) Any OTHER error MUST propagate — must NOT silently disable the
//    fail-closed KV guard downstream.
for (const err of [
  new Error('KV binding missing'),
  new TypeError('boom'),
  { message: 42 },          // non-string message
  null,                     // no message at all
  'string thrown',
]) {
  assert.throws(() => getEnvMock(err), `expected re-throw for: ${JSON.stringify(err)}`)
}

console.log('ok - tip-proxy getEnv narrowing')
