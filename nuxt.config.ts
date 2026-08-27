// Cache-buster for the raw stylesheets in public/. Vite fingerprints anything it
// bundles, but a <link href="/assets/css/…"> is served untouched, so a browser
// that cached the old file keeps using it after a deploy. Bump this when you edit
// any of the CSS files under public/assets/css.
const ASSET_V = '2026-07-13-dark-2'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-23',
  devtools: { enabled: false },
    srcDir: 'app/',
    nitro: {
    preset: 'vercel'
  },
  // ssr: false,
   app: {
    head: {
      link: [
        {
         rel: 'stylesheet',
          href: '/assets/css/font-awesome.css'
        }, 
        {
         rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Figtree:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap'
        },
        // These live in public/ and are linked raw, so Vite never fingerprints
        // them — the browser will happily serve a months-old cached copy after a
        // deploy. Bump ASSET_V whenever one of them changes (dark mode landing in
        // dashstyle.css is exactly the case that made this bite).
        {
        rel: 'stylesheet',
        href: `/assets/css/dashstyle.css?v=${ASSET_V}`
        },
        {
        rel: 'stylesheet',
        href: `/assets/css/loginstyle.css?v=${ASSET_V}`
        },
        {
        rel: 'stylesheet',
        href: `/assets/css/style.css?v=${ASSET_V}`
        },
        {
        rel: 'stylesheet',
        href: `/assets/css/media-responsive.css?v=${ASSET_V}`
        },
        ],
    },
  },

  css: [
    '~/assets/css/editor.css',
  ],
  plugins: ['~/plugins/axios.ts'],
  modules: ['@pinia/nuxt'],
  typescript: {
    strict: true
  },
  runtimeConfig: {
    public: {
    baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
    apiBase: process.env.NUXT_PUBLIC_API_BASE,
    // Set NUXT_PUBLIC_USE_PROXY=false (e.g. on local) to bypass the
    // /api server proxy and call apiBase directly from the client.
    useProxy: process.env.NUXT_PUBLIC_USE_PROXY !== 'false',
    // Cloudflare Turnstile site key — the widget stays inert (renders nothing) until
    // this is set. Server-side verify uses NUXT_TURNSTILE_SECRET (see server/utils).
    turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY,
    }
  },
   imports: {
    dirs: ['~/composables'],
  },
  vite: {
    optimizeDeps: {
      include: [
      'axios',
      '@vueform/multiselect',

      '@tiptap/core',
      '@tiptap/vue-3',
      '@tiptap/starter-kit',

      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-text-align',
      '@tiptap/extension-code-block',
      '@tiptap/extension-underline',
      'chart.js/auto'
      ]
    }
  }
});