// Server-side proxy to the TIP API. Signs requests with a secret held only
// in Cloudflare Pages env bindings (TIP_API_KEY, TIP_SIGNING_SECRET,
// TIP_API_ENDPOINT). The browser never sees these values.

export const runtime = 'edge'

type Ctx = { params: Promise<{ path?: string[] }> }

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

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

async function handle(req: Request, ctx: Ctx) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return new Response('Method not allowed', { status: 405 })
  }

  // On Cloudflare Pages, env bindings are on the Request context via
  // process.env at build/edge time. Fall back to process.env for local dev.
  const endpoint = process.env.TIP_API_ENDPOINT
  const apiKey = process.env.TIP_API_KEY
  const secret = process.env.TIP_SIGNING_SECRET

  if (!endpoint || !apiKey || !secret) {
    return new Response('Server not configured', { status: 500 })
  }

  const params = await ctx.params
  const subPath = '/' + (params.path?.join('/') ?? '')
  const url = new URL(subPath, endpoint)
  const body = req.method === 'GET' || req.method === 'DELETE' ? '' : await req.text()
  const ts = Date.now().toString()
  const signature = await sign(secret, req.method, subPath, body, ts)

  const upstream = await fetch(url.toString(), {
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
