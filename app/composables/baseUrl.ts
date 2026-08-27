let _cachedBase: string = ''
let _isLoaded = false

// Call this on app start
export const initBaseUrl = async () => {
  if (_isLoaded) return

  const config = useRuntimeConfig()
  const { $api } = useNuxtApp()

  let base: string = config.public.baseUrl || ''

  try {
    const res: any = await $api.get('/getbaseUrl')
    const domainUrl = res.data?.domainUrl || ''

    if (domainUrl) {
      base = domainUrl
    }
  } catch (e) {}

  _cachedBase = base.replace(/\/+$/, '')
  _isLoaded = true
}

// Sync function
export const baseUrl = (element: string = ''): string => {
  if (element && !element.startsWith('/')) {
    element = '/' + element
  }

  return _cachedBase + element
}