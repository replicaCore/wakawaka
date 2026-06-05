import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",

      manifest: {
        name: "wakawaka",
        short_name: "wakawaka",
        description: "just canvas",
        theme_color: "#282828",
        background_color: "#282828",
        display: "standalone",
        orientation: "landscape",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  build: {
    target: "esnext",
    minify: true,
    cssCodeSplit: false,
  },
  base: "/wakawaka/",

  preview: {
    allowedHosts: true,
  },
});
