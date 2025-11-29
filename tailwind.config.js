const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-space-grotesk)', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        ink: '#0f172a',
        sky: '#e2e8f0',
        accent: '#2563eb'
      },
      boxShadow: {
        card: '0 12px 45px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
