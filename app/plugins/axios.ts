export default defineNuxtPlugin(() => {

  const config = useRuntimeConfig()

  // When the proxy is disabled (e.g. local dev), call the backend
  // directly instead of routing through the /api server proxy.
  const useProxy = config.public.useProxy !== false
  const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')

  const request = async (
    url: string,
    options: any = {}
  ) => {

    // `direct: true` forces this single call to skip the /api server proxy and
    // hit the Laravel backend straight from the browser. Needed for large file
    // uploads: the Vercel serverless function that runs the proxy caps the
    // request body at ~4.5MB (FUNCTION_PAYLOAD_TOO_LARGE), the backend does not.
    const direct = options.direct === true
    if ('direct' in options) delete options.direct

    // Bypass proxy when explicitly asked (direct) or when globally disabled.
    const bypass = direct || !useProxy
    const target = bypass ? `${apiBase}${url}` : `/api${url}`

    // Proxy path: the /api server proxy injects the Bearer from the HttpOnly
    // auth_token cookie (server-side). Direct path (large uploads): fetch a
    // SHORT-LIVED, upload-scoped token same-origin via /api/auth-token (the proxy
    // sends the HttpOnly cookie) — NEVER the full session token. It's rejected
    // everywhere except the upload routes, so a leak is useless. Dev-direct mode
    // (no proxy) falls back to the in-memory session token.
    const authStore = useAuthStore()
    const headers: Record<string, any> = { ...(options.headers || {}) }
    if (bypass && !headers.Authorization) {
      if (useProxy) {
        try {
          const t: any = await $fetch('/api/auth-token', { credentials: 'include' })
          const upToken = t?.token || t?.data?.token
          if (upToken) headers.Authorization = `Bearer ${upToken}`
        } catch { /* leave unauthenticated → backend 401 */ }
      } else if (authStore.token) {
        headers.Authorization = `Bearer ${authStore.token}`
      }
    }

    try {

      const response = await $fetch(target, {
        // Direct cross-origin calls omit credentials so CORS `*` origin is
        // valid (an `*` origin + credentials is rejected by browsers). Auth
        // rides on the Bearer header instead. Proxy path keeps the cookie.
        credentials: direct ? 'omit' : 'include',
        ...options,
        headers
      })

      // AXIOS STYLE SUCCESS
      return {
        data: response,
        status: 200
      }

    } catch (error: any) {

      const status =
        error?.statusCode ||
        error?.status ||
        500

      const responseData =
        error?.data ||
        {}

      // AUTO LOGOUT
      //
      // Exception: the question import runs on a background queue and the modal
      // polls /imports/progress every second. If one of those polls happens to
      // hit a 401 (e.g. the session lapsed while a long import was still
      // running), nuking the token and bouncing to /login tears the page down
      // mid-run — and the completion summary is lost. Let the poller swallow its
      // own 401 quietly instead. Every OTHER endpoint still auto-logs-out.
      const isProgressPoll = typeof url === 'string' && url.includes('/imports/progress')

      // Session-dead = a 401, OR the backend's session-timeout marker `expired: true`
      // (sent by SessionTimeoutMiddleware). Catching the flag too means an idle logout
      // still bounces to /login even if it ever arrives with a non-401 status, instead
      // of leaking a raw error page. A plain 404 without the flag is left untouched.
      const sessionDead = status === 401 || (responseData as any)?.expired === true

      if (sessionDead && !isProgressPoll) {

        authStore.token = null
        useCookie('admin_authed').value = null   // clear the readable presence flag

        if (
          import.meta.client &&
          window.location.pathname !== '/login'
        ) {
          await navigateTo('/login')
        }
      }

      // AXIOS STYLE ERROR
      throw {
        response: {
          status,
          data: responseData
        }
      }
    }
  }

  const api = {

    get: (url: string, options = {}) =>
      request(url, {
        method: 'GET',
        ...options
      }),

    post: (
      url: string,
      body = {},
      options = {}
    ) =>
      request(url, {
        method: 'POST',
        body,
        ...options
      }),

    // Same as post() but bypasses the /api Vercel proxy and uploads straight
    // to the backend — use for large file uploads that exceed Vercel's ~4.5MB
    // serverless payload limit.
    postDirect: (
      url: string,
      body = {},
      options = {}
    ) =>
      request(url, {
        method: 'POST',
        body,
        direct: true,
        ...options
      }),

    put: (
      url: string,
      body = {},
      options = {}
    ) =>
      request(url, {
        method: 'PUT',
        body,
        ...options
      }),

    patch: (
      url: string,
      body = {},
      options = {}
    ) =>
      request(url, {
        method: 'PATCH',
        body,
        ...options
      }),

    delete: (
      url: string,
      options = {}
    ) =>
      request(url, {
        method: 'DELETE',
        ...options
      })
  }

  return {
    provide: {
      api
    }
  }
})