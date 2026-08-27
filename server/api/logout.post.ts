import type { H3Event } from 'h3'

// Server-side logout: tells the backend to end the session (Bearer from the
// HttpOnly cookie), then clears BOTH the HttpOnly auth cookie and the readable
// presence flag. The client never touches the token directly.
export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')

  try {
    if (token) {
      await $fetch(`${config.public.apiBase}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }).catch(() => {})
    }
  } finally {
    deleteCookie(event, 'auth_token', { path: '/' })
    deleteCookie(event, 'admin_authed', { path: '/' })
  }

  return { status: 'success' }
})
