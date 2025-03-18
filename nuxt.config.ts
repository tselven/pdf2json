// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  css: [
    "bootstrap/dist/css/bootstrap.min.css",
    "bootstrap-icons/font/bootstrap-icons.css",
  ],
  plugins:[
    '~/plugins/bootstrap.client.js'
  ],
  build: {
    transpile: ["bootstrap"],
  },
  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css' }
      ]
    }
  },
  nitro: {
    preset: 'node-server'
  },
  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  },
  devtools: { enabled: false }
})
