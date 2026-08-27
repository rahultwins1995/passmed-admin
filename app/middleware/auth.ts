import { canVisitAdminPath, firstAllowedAdminPath } from '@/composables/usePermission'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
   const { $api } = useNuxtApp()
  const authed = useCookie<string | null>('admin_authed')

  // No presence flag = not logged in. (The real session token is HttpOnly and is
  // read server-side by the /api proxy — client JS never sees it.)
  if (!authed.value) {
    return navigateTo('/login')
  }

  // If user not loaded, fetch from backend (proxy sends the HttpOnly cookie)
  if (!authStore.user) {
    await authStore.fetchMe($api)
  }

  // Still no user = invalid session
  if (!authStore.user) {
    authStore.logout($api)
    return navigateTo('/login')
  }

  // Role gate: only master-admin-portal roles may access /dashboard/*.
  // institution-admin and professor belong to the institute portal.
  if (!getIsAllowedRole(authStore.user.role)) {
    authStore.logout($api)
    return navigateTo('/login')
  }

  // Permission gate: the Admin Role Matrix decides which screens this role can
  // open. Typing a URL for an area they hold `none` on bounces them to the first
  // page they CAN see, rather than showing an empty screen full of 403s.
  //
  // Super Admin always passes (see usePermission), so the matrix can never lock
  // the last admin out of the panel.
  if (!canVisitAdminPath(to.path)) {
    const fallback = firstAllowedAdminPath()
    return navigateTo(fallback === to.path ? '/dashboard' : fallback)
  }
})