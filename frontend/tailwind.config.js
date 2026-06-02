/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626"
      }
    }
  },
  plugins: []
};