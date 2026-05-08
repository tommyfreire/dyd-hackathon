import type { Config } from "tailwindcss";

// Tailwind is layered ON TOP of the BairesDev design tokens in
// src/styles/tokens.css. Most components use the bespoke `globals.css`
// component classes (e.g. .btn, .card, .rank-row) — Tailwind is here
// for one-off utilities. Never duplicate a token; reference the CSS var.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "var(--bd-orange)",
          black: "var(--bd-black)",
          deep: "var(--bd-deep)",
        },
        fg: {
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        bg: {
          page: "var(--bg-page)",
          card: "var(--bg-card)",
          surface0: "var(--surface-0)",
          surface1: "var(--surface-1)",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
