<!--
  Cloudflare Turnstile widget — env-gated (admin portal).

  Renders nothing (and produces no token) unless a site key is configured via
  NUXT_PUBLIC_TURNSTILE_SITE_KEY. This lets the anti-bot wiring ship now and
  activate later, once the key is set AND the server route verifies the token
  (server/utils/turnstile.ts — the only thing that provides real protection).

  Usage:
    const token = ref('')
    <TurnstileWidget v-model="token" ref="tsRef" />
    // after submit: tsRef.value?.reset()
-->
<script setup>
const token = defineModel({ type: String, default: '' })

const config  = useRuntimeConfig()
const siteKey = config.public.turnstileSiteKey || ''

const el = ref(null)
let widgetId = null

function renderWidget () {
  if (!siteKey || !el.value || !window.turnstile) return
  widgetId = window.turnstile.render(el.value, {
    sitekey: siteKey,
    callback: (t) => { token.value = t },
    'error-callback':  () => { token.value = '' },
    'expired-callback': () => { token.value = '' },
  })
}

function reset () {
  if (window.turnstile && widgetId != null) {
    window.turnstile.reset(widgetId)
    token.value = ''
  }
}
defineExpose({ reset })

onMounted(() => {
  if (!siteKey) return // inert until configured

  if (window.turnstile) { renderWidget(); return }

  const scriptId = 'cf-turnstile-script'
  const existing = document.getElementById(scriptId)
  if (existing) {
    const iv = setInterval(() => {
      if (window.turnstile) { clearInterval(iv); renderWidget() }
    }, 100)
    setTimeout(() => clearInterval(iv), 5000)
    return
  }

  const s = document.createElement('script')
  s.id = scriptId
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.defer = true
  s.onload = renderWidget
  document.head.appendChild(s)
})

onBeforeUnmount(() => {
  if (window.turnstile && widgetId != null) {
    try { window.turnstile.remove(widgetId) } catch {}
  }
})
</script>

<template>
  <div v-if="siteKey" ref="el" class="cf-turnstile-widget" style="margin:10px 0;"></div>
</template>
