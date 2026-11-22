/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#121416", panel: "#1a1d21", card: "#20242a", hover: "#2a2f36" },
        line: "#2f353d",
        neon: { DEFAULT: "#5cff8a", dim: "#2fbf5c" },
        rare: "#b07cff",
        danger: "#ff5c5c",
        money: "#ffd84d",
        muted: "#9aa3ad",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
