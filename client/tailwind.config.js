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
        os: {
          bg: "var(--os-bg)",
          bgSecondary: "var(--os-bg-secondary)",
          surface: "var(--os-surface)",
          border: "var(--os-border)",
          text: "var(--os-text)",
          textSecondary: "var(--os-text-secondary)",
          textMuted: "var(--os-text-muted)",
        },
        brand: {
          cyan: "#00D9FF",
          blue: "#2563EB",
          indigo: "#4F46E5",
          violet: "#7C3AED",
          mint: "#10B981",
        }
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "Fira Code", "IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #00D9FF 0%, #2563EB 45%, #7C3AED 100%)',
      },
      boxShadow: {
        'os-light': '0 20px 60px rgba(15, 23, 42, 0.08), 0 8px 30px rgba(15, 23, 42, 0.05)',
        'os-dark': '0 20px 60px rgba(0, 0, 0, 0.8), 0 8px 30px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
