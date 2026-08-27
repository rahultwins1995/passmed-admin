/**
 * Applies the `dark` class to <body> whenever the dark-mode preference changes.
 *
 * The dashboard layout also declares the class via useHead(bodyAttrs), which is
 * what puts it in the SSR HTML (no white flash on reload). This plugin is the
 * belt to that braces: unhead patches body attributes on its own schedule, and if
 * it ever re-renders bodyAttrs from a stale value the class silently disappears —
 * which looks exactly like "the toggle does nothing" (the icon flips, the colours
 * don't). Writing the class directly on every change removes that whole class of
 * failure. Both writers produce the same result, so they cannot fight.
 *
 * Client-only: there is no document during SSR — the layout's useHead covers that
 * side.
 */
export default defineNuxtPlugin(() => {
  const { isDark } = useDarkMode()

  watch(
    isDark,
    (dark) => {
      document.body.classList.toggle('dark', dark)
    },
    { immediate: true },
  )
})
