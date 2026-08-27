import { defineStore } from 'pinia'

interface User {
  id: number
  name: string
  firstname: string|null
  lastname: string|null
  email: string
  role: string
  role_name: string
  isAdmin: string | number
  /**
   * Admin Role Matrix for this user's role: { users: 'edit', exams: 'none', … }.
   * Sent by the backend on /login and /me.
   *
   * NOTE the plural. The old field was `permission` (singular) and the API never
   * actually sent it — so every `canAccess(auth.user?.permission?.x)` in the
   * sidebar evaluated against `undefined` and the whole matrix was inert.
   */
  permissions?: Record<string, 'none' | 'view' | 'edit' | 'full'>
}

interface AuthPayload {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as User | null
  }),

  actions: {
    setAuth({ token, user }: AuthPayload) {
      // Token kept in MEMORY only (used for direct large-file uploads). The
      // persistent session lives in the HttpOnly cookie set by the /api/login
      // server route — never written to a client-readable cookie here.
      this.token = token
      this.user = user
    },

    async fetchMe(api: any) {
      try {
          const response: any = await api.post('/me')
          this.user = response?.user || response?.data?.user || null
          // Set the market currency app-wide from /me so every screen (exam pricing
          // inputs, toggles, tables) shows the local symbol, not a hardcoded one.
          try {
            const cur = response?.currency_code || response?.data?.currency_code
            const sym = response?.currency_symbol || response?.data?.currency_symbol
            if (cur || sym) useDisplayCurrency().setLocal(cur, sym)
          } catch { /* non-fatal */ }
          return this.user
      } catch (error:any) {
        this.user = null
        return null
      }
    },

   async logout(_api?: any) {
        // Clears the HttpOnly cookie + presence flag server-side and ends the
        // backend session. (_api kept so existing call sites don't break.)
        try {
          await $fetch('/api/logout', { method: 'POST', credentials: 'include' })
        } catch (error) {}

        this.token = null
        this.user = null
    }
  }
})