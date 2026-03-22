/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf7",
          100: "#dcfce9",
          200: "#b4f8d3",
          300: "#7bf0b5",
          400: "#42CE9F",
          500: "#22b87e",
          600: "#149465",
          700: "#107552",
          800: "#115c43",
          900: "#1a3c34",
          950: "#0a2420",
        },
      },
    },
  },
  plugins: [],
}

