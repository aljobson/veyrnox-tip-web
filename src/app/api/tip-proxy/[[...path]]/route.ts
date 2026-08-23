// Server-side proxy to the TIP API. Signs requests with a secret held only
// in Cloudflare Pages env bindings (TIP_API_KEY, TIP_SIGNING_SECRET,
// TIP_API_ENDPOINT). The browser never sees these values.
import { getOptionalRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

type Ctx = { params: Promise<{ path?: string[] }> }
interface RateLimitKV {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}
type Env = {
  TIP_API_ENDPOINT?: string
  TIP_API_KEY?: string
  TIP_SIGNING_SECRET?: string
  TIP_RATE_LIMIT?: RateLimitKV
}

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const MAX_BODY_BYTES = 1024 * 1024 // 1 MiB
const RATE_LIMIT_PER_MIN = 60
// Reject dot-segments, empties, embedded slashes/backslashes (raw or encoded),
// and any segment whose URL-decoded form differs from the raw segment.
const BAD_SEG = /(^\.{1,2}$)|(^$)|[\\/]|%2[fF]|%5[cC]/
// RFC 7230 hop-by-hop headers (must not be forwarded across a proxy) plus
// content-length (recomputed by the runtime from the streamed body).
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-length',
])

function validateSegments(segs: string[]): string | null {
  for (const s of segs) {
    if (BAD_SEG.test(s)) return null
    let decoded: string
    try { decoded = decodeURIComponent(s) } catch { return null }
    if (decoded !== s) return null
    if (BAD_SEG.test(decoded)) return null
  }
  return '/' + segs.join('/')
}

async function sign(
  secret: string,
  method: string,
  pathAndQuery: string,
  contentType: string,
  body: string,
  ts: string,
) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const msg = `${method}\n${pathAndQuery}\n${contentType}\n${ts}\n${body}`
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Use `getOptionalRequestContext` so the "context not set" case (edge runtime
// during build-time prerender, or dev fallbacks) returns `undefined` rather
// than throwing — no fragile message-string matching needed. The only path
// that still throws is calling this from the Node.js runtime; that specific
// error carries the exact phrase "can only be run" which we match narrowly.
// Any other exception is a real bug — propagate so the fail-closed KV guard
// downstream (isPages && !kv → 500) cannot be silently disabled.
function getEnv(): { env: Env; isPages: boolean } {
  let ctx: { env: unknown } | undefined
  try {
    ctx = getOptionalRequestContext()
  } catch (e) {
    const msg = (e as { message?: unknown })?.message
    if (typeof msg === 'string' && msg.includes('can only be run')) {
      return { env: process.env as unknown as Env, isPages: false }
    }
    throw e
  }
  if (ctx) return { env: ctx.env as Env, isPages: true }
  return { env: process.env as unknown as Env, isPages: false }
}

// ponytail: fixed-window per-IP counter via KV. read→+1→put is NOT atomic:
// N concurrent requests in the same minute all read the same value, all pass
// the ceiling check, then all write — effective cap is unbounded by burst
// concurrency, not the RATE_LIMIT_PER_MIN constant. The jitter only smooths
// last-writer-wins for the eventual stored count; it does not enforce the
// ceiling. Real fix requires a Durable Object atomic counter (Pages must
// bind to a DO class hosted in a separate Worker script — multi-step
// rollout). Tracked in #9
// (https://github.com/aljobson/veyrnox-tip-web/issues/9). The in-isolate
// concurrency-cap mitigation was drafted but deferred — silent-login
// dashboard bursts hit this bucket and would 429 until the client rolls out.
async function checkRateLimit(kv: RateLimitKV | undefined, ip: string): Promise<boolean> {
  if (!kv) return true
  const minute = Math.floor(Date.now() / 60_000)
  const key = `rl:${ip}:${minute}`
  const current = parseInt((await kv.get(key)) ?? '0', 10) + 1
  if (current > RATE_LIMIT_PER_MIN) return false
  await new Promise(r => setTimeout(r, Math.random() * 50))
  // 65s TTL: minute bucket + small safety margin, no wasted storage window.
  await kv.put(key, String(current), { expirationTtl: 65 })
  return true
}

// Reads the request body while enforcing a hard byte cap mid-stream so a
// chunked/no-Content-Length upload cannot buffer past the limit.
async function readBodyCapped(req: Request, max: number): Promise<{ body: string; overflow: boolean }> {
  const reader = req.body?.getReader()
  if (!reader) return { body: '', overflow: false }
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > max) {
      try { await reader.cancel() } catch { /* ignore */ }
      return { body: '', overflow: true }
    }
    chunks.push(value)
  }
  const buf = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { buf.set(c, offset); offset += c.byteLength }
  return { body: new TextDecoder().decode(buf), overflow: false }
}

async function handle(req: Request, ctx: Ctx) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return new Response('Method not allowed', { status: 405 })
  }

  const { env, isPages } = getEnv()
  const endpoint = env.TIP_API_ENDPOINT
  const apiKey = env.TIP_API_KEY
  const secret = env.TIP_SIGNING_SECRET
  if (!endpoint || !apiKey || !secret) {
    return new Response('Server not configured', { status: 500 })
  }

  // In dev fallback, `process.env.TIP_RATE_LIMIT` may be a plain string — guard
  // it so we do not try to call `.get()` on a non-KV value.
  const rawKv = env.TIP_RATE_LIMIT as unknown
  const kv: RateLimitKV | undefined =
    rawKv && typeof (rawKv as { get?: unknown }).get === 'function'
      ? (rawKv as RateLimitKV)
      : undefined

  // Production (running on Pages) MUST have the KV binding configured — a
  // silent fail-open here defeats the whole rate limit.
  if (isPages && !kv) {
    return new Response('Server not configured: rate limiter missing', { status: 500 })
  }

  // Only cf-connecting-ip is trustworthy behind Cloudflare. Anything absent
  // gets bucketed together under 'unknown' — still rate-limited, just shared.
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
  if (!(await checkRateLimit(kv, ip))) {
    return new Response('Too many requests', { status: 429, headers: { 'retry-after': '60' } })
  }
  // ponytail: no Turnstile / origin check yet. Add a first-request Turnstile
  // challenge if scrapers still burn quota under valid IPs.

  const params = await ctx.params
  const rawSegs = params.path ?? []
  const subPath = validateSegments(rawSegs)
  if (subPath === null) {
    return new Response('Bad path', { status: 400 })
  }

  // Canonicalize the query string (sorted params) before both signing AND
  // forwarding. Otherwise `?a=1&b=2` and `?b=2&a=1` sign differently but hit
  // the same upstream data, breaking downstream cache dedup.
  const sp = new URLSearchParams(new URL(req.url).search)
  sp.sort()
  const canonicalSearch = sp.toString()
  const pathAndQuery = subPath + (canonicalSearch ? '?' + canonicalSearch : '')

  const hasBody = !(req.method === 'GET' || req.method === 'DELETE')
  let body = ''
  if (hasBody) {
    const len = req.headers.get('content-length')
    if (len !== null) {
      const n = parseInt(len, 10)
      if (!Number.isFinite(n) || n > MAX_BODY_BYTES) {
        return new Response('Payload too large', { status: 413 })
      }
    }
    const result = await readBodyCapped(req, MAX_BODY_BYTES)
    if (result.overflow) {
      return new Response('Payload too large', { status: 413 })
    }
    body = result.body
  }

  // Bind content-type into the signature so an attacker can't swap
  // application/json for text/plain (or vice versa) and change how the
  // upstream parses the same body bytes.
  const contentType = hasBody
    ? (req.headers.get('content-type') ?? 'application/json')
    : ''
  const ts = Date.now().toString()
  const signature = await sign(secret, req.method, pathAndQuery, contentType, body, ts)

  // Concatenate against the trimmed endpoint so `pathAndQuery` is used verbatim
  // in both the signature input and the outbound URL — no URL-normalization
  // can desync them.
  const upstreamUrl = endpoint.replace(/\/+$/, '') + pathAndQuery

  const upstreamHeaders: Record<string, string> = {
    'x-api-key': apiKey,
    'x-timestamp': ts,
    'x-signature': signature,
  }
  if (hasBody) upstreamHeaders['content-type'] = contentType

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers: upstreamHeaders,
    body: body || undefined,
  })

  // Forward every upstream header except the hop-by-hop set (RFC 7230). This
  // preserves set-cookie, cache-control, www-authenticate, retry-after,
  // content-encoding, etc. that the caller genuinely needs.
  const respHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) respHeaders.append(key, value)
  })
  // Only default when upstream said nothing — text/plain is a safer guess than
  // application/json (won't cause a client to JSON.parse arbitrary bytes).
  if (!respHeaders.has('content-type')) {
    respHeaders.set('content-type', 'text/plain; charset=utf-8')
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
