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
  devtools: { enabled: false }
})
