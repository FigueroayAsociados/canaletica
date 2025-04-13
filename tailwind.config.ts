import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: '#FF7E1D', // Naranja principal
          light: '#FFA04D',
          dark: '#E05E00',
        },
        secondary: {
          DEFAULT: '#4D4D4D', // Gris oscuro
          light: '#6E6E6E',
          dark: '#333333',
        },
        success: {
          DEFAULT: '#4FB06D', // Verde (mantenemos un verde para éxito)
          light: '#70C490',
          dark: '#358A51',
        },
        warning: {
          DEFAULT: '#FF9800', // Naranja ámbar
          light: '#FFC947',
          dark: '#C66900',
        },
        error: {
          DEFAULT: '#FF4B2B', // Rojo/Naranja para errores
          light: '#FF7359',
          dark: '#CC3A22',
        },
        neutral: {
          100: '#F5F5F5', // Gris muy claro
          200: '#E0E0E0', // Gris claro
          300: '#CCCCCC', // Gris medio claro
          400: '#9E9E9E', // Gris medio
          500: '#777777', // Gris
          600: '#555555', // Gris medio oscuro
          700: '#444444', // Gris oscuro
          800: '#333333', // Gris muy oscuro
          900: '#1F1F1F', // Casi negro
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;