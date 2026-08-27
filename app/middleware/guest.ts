export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  const authed = useCookie<string | null>('admin_authed')
  const { $api } = useNuxtApp()
  // If a session exists (readable presence flag), restore user and keep them off
  // guest pages. The real token is HttpOnly (read server-side by the /api proxy).
  if (authed.value) {
    if (!authStore.user) {
      await authStore.fetchMe($api)
    }

    // Logged in users should not access guest pages
    if (authStore.user) {
      return navigateTo('/dashboard')
    }
  }
})