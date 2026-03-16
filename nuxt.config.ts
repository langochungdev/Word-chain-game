// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@vercel/speed-insights"],
  compatibilityDate: "2025-07-15",
  ssr: false,
  devtools: { enabled: false },
  css: ["bootstrap/dist/css/bootstrap.min.css", "~/assets/styles/main.css"],
  runtimeConfig: {
    maintenanceMode: "off",
    maintenanceBypassToken: "",
    public: {
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      firebaseAppId: "",
      firebaseStorageBucket: "",
      firebaseMessagingSenderId: "",
    },
  },
  app: {
    head: {
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "alternate icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
      ],
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
      ],
    },
  },
});
