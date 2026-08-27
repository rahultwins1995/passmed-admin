/**
 * Dark mode for the admin panel.
 *
 * Mirrors the student/institute portals: the stylesheet is var()-driven, so dark
 * mode is a re-map of the CSS custom properties under `body.dark` (see the block
 * at the end of dashstyle.css). Flip one class, every surface follows.
 *
 * Two deliberate differences from the portals:
 *
 * 1. The choice is PERSISTED in a cookie. The portals keep it in useState only, so
 *    a refresh silently drops you back to light — tolerable there, irritating in a
 *    panel you sit in all day.
 *
 * 2. This composable does NOT touch document.body. The dashboard layout already
 *    owns the body class through useHead(bodyAttrs), and having both write to it
 *    means whoever renders last wins — classList.toggle() adds `dark`, then the
 *    next useHead patch overwrites class with "app-body" and it vanishes. So the
 *    state lives here, and the layout binds it. One writer.
 *
 * Because the cookie is readable during SSR, the correct class is in the very
 * first HTML — no white flash on reload.
 */
export const useDarkMode = () => {
  // A preference, not a session — keep it for a year.
  const cookie = useCookie<string>('admin_theme', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const isDark = useState<boolean>('darkMode', () => cookie.value === 'dark')

  const toggle = () => {
    isDark.value = !isDark.value
    cookie.value = isDark.value ? 'dark' : 'light'
  }

  return { isDark, toggle }
}
