import type { H3Event } from 'h3'

// Server-side login: proxies /login to the backend, then plants the session token
// in a HARDENED, HttpOnly cookie (never readable by client JS → XSS can't steal it),
// plus a small non-sensitive `admin_authed` flag the client middleware can read to
// know a session exists. Mirrors the frontend proxy's setAuthCookie.
export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Anti-bot: verify Cloudflare Turnstile BEFORE hitting the backend. verifyTurnstile is
  // a no-op until NUXT_TURNSTILE_SECRET is set — so admin login is unchanged until
  // Turnstile is configured; once configured, a missing/invalid token HARD-FAILS here.
  if (!(await verifyTurnstile(body?.turnstileToken || '', getRequestIP(event, { xForwardedFor: true })))) {
    setResponseStatus(event, 400)
    return { status: 'error', message: 'Verification failed. Please try again.' }
  }
  if (body && 'turnstileToken' in body) delete body.turnstileToken

  try {
    const res: any = await $fetch(`${config.public.apiBase}/login`, { method: 'POST', body })

    if (res?.status === 'success' && res?.token) {
      const isProd = process.env.NODE_ENV === 'production'
      const maxAge = 60 * 60 * 24 * 7 // 7 days

      // The real session token — HttpOnly so client JS can never read it. The
      // /api server proxy reads it server-side and forwards it as a Bearer.
      setCookie(event, 'auth_token', res.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge,
      })

      // Non-sensitive presence flag (NO token). Route middleware reads this to
      // decide "is there a session?" since it cannot read the HttpOnly cookie.
      setCookie(event, 'admin_authed', '1', {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge,
      })
    }

    return res
  } catch (err: any) {
    setResponseStatus(event, err?.response?.status || err?.statusCode || 401)
    return err?.response?._data || err?.data || { status: 'error', message: 'Login failed' }
  }
})
