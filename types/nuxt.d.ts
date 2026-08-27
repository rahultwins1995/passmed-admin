import type { AxiosInstance } from 'axios'

// $api also exposes postDirect() — same shape as post() but skips the /api
// Vercel proxy and uploads straight to the backend (large-file uploads).
type ApiClient = AxiosInstance & { postDirect: AxiosInstance['post'] }

declare module '#app' {
  interface NuxtApp {
    $api: ApiClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: ApiClient
  }
}

export {}