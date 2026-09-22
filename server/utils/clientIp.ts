import type { H3Event } from 'h3'

/**
 * Resolve the REAL browser IP behind Cloudflare + Vercel.
 *
 * getRequestIP(event, { xForwardedFor: true }) returns a Vercel/AWS infrastructure IP
 * here (e.g. 3.236.x), NOT the visitor's browser IP — which made the admin IP allowlist
 * compare against the wrong address and never enforce. We instead read the trustworthy
 * edge headers, in order of trust:
 *
 *   1. cf-connecting-ip — Cloudflare sets this to the real client; a client cannot forge
 *      it because Cloudflare overwrites it at the edge. (Correct when admin.* is behind CF.)
 *   2. x-real-ip        — Vercel sets this to the connecting IP when NOT behind Cloudflare.
 *   3. x-forwarded-for  — leftmost entry, as a last-resort fallback.
 *
 * Returns '' when nothing resolves.
 */
export function realClientIp(event: H3Event): string {
  const h = (n: string) => String(getHeader(event, n) || '').trim()

  const cf = h('cf-connecting-ip')
  const xr = h('x-real-ip')
  const xffRaw = h('x-forwarded-for')
  const xffFirst = xffRaw ? xffRaw.split(',')[0].trim() : ''
  const fallback = getRequestIP(event, { xForwardedFor: true }) || ''

  const chosen = cf || xr || xffFirst || fallback

  return chosen
}
