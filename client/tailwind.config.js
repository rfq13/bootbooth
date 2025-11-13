/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FDF8F3",
          100: "#FAF1E7",
          200: "#F3E5D3",
          300: "#EDD9C0",
          400: "#EAD0B3",
          500: "#E8D3BA", // requested cream
          600: "#D6BFA1",
          700: "#C5A888",
          800: "#B3916F",
          900: "#9B7A5B",
        },
        secondary: {
          50: "#faf7f2",   // very light warm gray
          100: "#f3efe7",
          200: "#e5ded0",
          300: "#cfc5b3",
          400: "#b6a992",
          500: "#9c8f78",
          600: "#6d6354",
          700: "#4f4a41",
          800: "#2f2c28",
          900: "#1a1917",   // deep warm charcoal
        },
      },
      animation: {
        countdown: "countdown 1s ease-in-out infinite",
        flash: "flash 0.3s ease-in-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        countdown: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.1)", opacity: "0.8" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        flash: {
          "0%": { opacity: "1" },
          "50%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
