import type { H3Event } from 'h3'

// Server-side admin 2FA verify: proxies /login/verify-otp to the backend, and on
// success plants the same HttpOnly session cookie + readable `admin_authed` flag that
// login.post.ts does. This is step two of the email-OTP login — the token is only
// issued here, after the code is verified, so it never touches the client until the
// second factor is satisfied.
export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Forward the REAL browser IP (stamped with the shared secret) so the backend's
  // Admin Login IP allowlist enforces on the true client — this dedicated route
  // bypasses the /api catch-all proxy, so it attaches the header itself.
  const ipHeaders: Record<string, string> = {}
  const proxySecret = (config as any).adminProxySecret || ''
  const clientIp = getRequestIP(event, { xForwardedFor: true }) || ''
  if (proxySecret && clientIp) {
    ipHeaders['X-Admin-Client-IP'] = clientIp
    ipHeaders['X-Admin-Proxy-Secret'] = proxySecret
  }

  try {
    const res: any = await $fetch(`${config.public.apiBase}/login/verify-otp`, { method: 'POST', body, headers: ipHeaders })

    if (res?.status === 'success' && res?.token) {
      const isProd = process.env.NODE_ENV === 'production'
      const maxAge = 60 * 60 * 24 * 7 // 7 days

      setCookie(event, 'auth_token', res.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge,
      })

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
    return err?.response?._data || err?.data || { status: 'error', message: 'Verification failed' }
  }
})
