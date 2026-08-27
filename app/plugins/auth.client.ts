import { useAuthStore } from '@/stores/auth';

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  // Presence flag only — the real session token is HttpOnly and read server-side
  // by the /api proxy. If a session exists, restore the user via /me (proxy sends
  // the HttpOnly cookie).
  const authed = useCookie<string | null>('admin_authed')
  const { $api } = useNuxtApp()

  if (authed.value && !authStore.user) {
    await authStore.fetchMe($api)
  }
})