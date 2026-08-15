// Server-side proxy to the TIP API. Signs requests with a secret held only
// in Cloudflare Pages env bindings (TIP_API_KEY, TIP_SIGNING_SECRET,
// TIP_API_ENDPOINT). The browser never sees these values.
import { getRequestContext } from '@cloudflare/next-on-pages'

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

async function sign(secret: string, method: string, path: string, body: string, ts: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const msg = `${method}\n${path}\n${ts}\n${body}`
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function getEnv(): Env {
  try {
    return getRequestContext().env as unknown as Env
  } catch {
    // Local dev / non-Pages runtime fallback.
    return process.env as unknown as Env
  }
}

// ponytail: fixed-window per-IP counter via KV. Cheapest correct thing that
// works on Pages; upgrade to a Durable Object sliding window if abuse warrants.
async function checkRateLimit(kv: RateLimitKV | undefined, ip: string): Promise<boolean> {
  if (!kv) return true // fail-open when KV binding not configured
  const minute = Math.floor(Date.now() / 60_000)
  const key = `rl:${ip}:${minute}`
  const current = parseInt((await kv.get(key)) ?? '0', 10) + 1
  if (current > RATE_LIMIT_PER_MIN) return false
  await kv.put(key, String(current), { expirationTtl: 90 })
  return true
}

async function handle(req: Request, ctx: Ctx) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return new Response('Method not allowed', { status: 405 })
  }

  const env = getEnv()
  const endpoint = env.TIP_API_ENDPOINT
  const apiKey = env.TIP_API_KEY
  const secret = env.TIP_SIGNING_SECRET
  if (!endpoint || !apiKey || !secret) {
    return new Response('Server not configured', { status: 500 })
  }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!(await checkRateLimit(env.TIP_RATE_LIMIT, ip))) {
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
    body = await req.text()
    // Guard against chunked/no-Content-Length uploads.
    if (body.length > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413 })
    }
  }

  const ts = Date.now().toString()
  const signature = await sign(secret, req.method, subPath, body, ts)

  // Concatenate against the trimmed endpoint so `subPath` is used verbatim in
  // both the signature input and the outbound URL — no URL-normalization can
  // desync them.
  const upstreamUrl = endpoint.replace(/\/+$/, '') + subPath

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') ?? 'application/json',
      'x-api-key': apiKey,
      'x-timestamp': ts,
      'x-signature': signature,
    },
    body: body || undefined,
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
