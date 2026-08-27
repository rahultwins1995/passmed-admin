// app/composables/safeHtml.ts
//
// Centralised HTML sanitizer for the ADMIN panel.
//
// WHY isomorphic-dompurify (not a client-only async import): the previous version
// pulled DOMPurify in through `import('dompurify')` and, until that promise
// resolved — AND on every server render (this app is SSR; `ssr: false` is
// commented out) — the guard `if (!import.meta.client || !DOMPurify) return content`
// handed back the RAW string. That first paint could emit unsanitised HTML, which
// is exactly the window the sanitizer exists to close.
//
// isomorphic-dompurify bundles a DOM for Node, so DOMPurify.sanitize() runs
// SYNCHRONOUSLY on both the server (SSR) and the client. There is no async gap and
// no fail-open path: every string is sanitised before it is ever returned, and the
// server and client produce identical output (no hydration mismatch). Mirrors the
// institute layer's utils/sanitize.ts.
import DOMPurify from 'isomorphic-dompurify'

// Force target="_blank" links to carry rel="noopener noreferrer" so sanitised
// content can't reach back into window.opener. Feature-detect DOM methods instead
// of `instanceof Element`, which is undefined during SSR (Node).
DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
  const tag = node?.nodeName?.toLowerCase()
  if (typeof node?.getAttribute !== 'function' || typeof node?.setAttribute !== 'function') return
  if (tag === 'a' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export const safeHtmlContent = (content: any = ''): string | number | boolean => {
  if (typeof content === 'boolean') return content
  if (typeof content === 'number') return content

  if (typeof content === 'string') {
    if (!content.trim()) return ''
    // Sanitised synchronously on server AND client — never returns raw HTML.
    return DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
    })
  }

  return ''
}

/**
 * True only when `val` is a usable http(s) image URL.
 *
 * question_image_ids holds a real CDN URL, an EMPTY string, or a legacy
 * BoardVitals path (\Images_BoardVitals\...). Only the first is renderable, so
 * the image block is skipped for the other two and no empty box is left behind.
 */
export const isImageUrl = (val: any = ''): boolean => {
  if (typeof val !== 'string') return false
  return /^https?:\/\/\S+/i.test(val.trim())
}
