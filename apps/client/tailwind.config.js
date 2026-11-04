/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003F46',
          dark: '#00343A',
          light: '#00525C',
        },
        accent: {
          DEFAULT: '#00a49f',
          dark: '#008581',
          light: '#e6f7f6',
          yellow: '#FFD54A',
        },
        marketplace: {
          teal: '#003F46',
          darkTeal: '#00343A',
          yellow: '#FFD54A',
          bg: '#F5F7F8',
          surface: '#FFFFFF',
          text: '#102A33',
          secondary: '#667784',
          border: '#E5EAED',
        },
        sell: {
          DEFAULT: '#FFD54A',
          hover: '#f5c62d',
        },
      },
    },
  },
  plugins: [],
}
