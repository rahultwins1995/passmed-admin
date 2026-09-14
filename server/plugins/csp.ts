// Per-request Content-Security-Policy with a nonce — ADMIN (highest-privilege surface).
//
// Mirrors frontend/server/plugins/csp.ts. Why a Nitro plugin and not a static header
// in nuxt.config.ts: Nuxt injects a small inline bootstrap script
// (`window.__NUXT__.config = …`) that the client entry reads during hydration. A
// static `script-src 'self'` (no 'unsafe-inline') blocks that inline script, so the
// admin never hydrates. We keep a strict CSP (no 'unsafe-inline' on scripts) and mint
// a fresh nonce per request, put it in `script-src`, and stamp the same nonce onto
// every inline <script> Nuxt emits. A static hash can't be used because the bootstrap
// script embeds a per-build buildId that changes every deploy.
//
// Admin allowlist is deliberately TIGHTER than the frontend's: the admin has no
// Stripe / Google Sign-In / GA / Meta Pixel. The only third party is Cloudflare
// Turnstile (admin login — see app/components/Loginform.vue + TurnstileWidget.vue),
// and the Laravel API (api.passmed.com; most calls go via the same-origin /api proxy,
// which is 'self', but direct calls need it whitelisted).
//
// Production only — the dev server needs inline/eval for HMR and applies no CSP, so
// `npm run dev` is completely unaffected.
import { randomBytes } from 'node:crypto'

const buildCsp = (nonce: string): string =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // 'self' for the admin's own forms; the space-separated origins in
    // NUXT_PUBLIC_PORTAL_ORIGINS authorise the cross-origin "Log as" handoff form
    // POST to the student/institute portal (e.g. https://www.passmed.uk). Each
    // regional admin deploy sets its own portal origin(s) via that env var.
    `form-action 'self' ${process.env.NUXT_PUBLIC_PORTAL_ORIGINS || ''}`.trim(),
    // 'self' authorises the external entry/vendor module scripts (Chart.js, TipTap,
    // axios — all bundled by Vite, so same-origin); the nonce authorises Nuxt's inline
    // bootstrap script. challenges.cloudflare.com serves the Turnstile widget script.
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
    // 'unsafe-inline' on styles only (Nuxt/components emit inline style attributes and
    // <style> blocks; nonces don't cover style attributes). fonts.googleapis.com serves
    // the Google Fonts stylesheet linked in nuxt.config.ts app.head.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    // Same-origin /api proxy is 'self'; direct backend calls need api.passmed.com.
    // challenges.cloudflare.com is Turnstile's client-side verify/telemetry endpoint.
    "connect-src 'self' https://api.passmed.com https://challenges.cloudflare.com",
    // Turnstile renders its challenge inside an iframe from this origin.
    "frame-src https://challenges.cloudflare.com",
  ].join('; ')

// Add nonce="…" to inline <script> tags only (those without a src= attribute).
// External module scripts are already allowed via 'self'; data blocks such as
// <script type="application/json"> are not executed, so a nonce on them is inert.
const stampNonce = (chunks: string[], nonce: string): string[] =>
  chunks.map((c) =>
    c.replace(/<script(?![^>]*\ssrc=)/g, `<script nonce="${nonce}"`),
  )

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV !== 'production') return

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64')

    html.head = stampNonce(html.head, nonce)
    html.bodyPrepend = stampNonce(html.bodyPrepend, nonce)
    html.bodyAppend = stampNonce(html.bodyAppend, nonce)

    setResponseHeader(event, 'content-security-policy', buildCsp(nonce))
  })
})
