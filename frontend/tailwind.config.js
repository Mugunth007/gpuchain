/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#08090C",
        surface: "#101216",
        "surface-card": "#15181E",
        "surface-border": "#212631",
        "surface-hover": "#1C2028",
        avax: {
          DEFAULT: "#E84142",
          hover: "#D03233",
          light: "#FF5E5F",
          dark: "#B82425"
        },
        gpu: {
          green: "#00E599",
          cyan: "#00C2FF",
          purple: "#9D5CFF",
          amber: "#FFB020"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"]
      }
    },
  },
  plugins: [],
}
