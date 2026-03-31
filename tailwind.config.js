/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2B579A', light: '#3B6BB5', dark: '#1E3F6F' },
        accent: { DEFAULT: '#ED7D31', light: '#F09A5E', dark: '#D46820' },
        success: '#2E8B57',
        danger: '#DC3545',
        surface: '#F8FAFC',
        text: { DEFAULT: '#333333', muted: '#6B7280', light: '#9CA3AF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
