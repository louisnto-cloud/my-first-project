/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // Refined brand scale — a calm, premium indigo-violet (replaces the
        // harsh default violet used across the app).
        violet: {
          50: '#f5f3ff',
          100: '#ece8fe',
          200: '#dcd5fc',
          300: '#c3b6f8',
          400: '#a690f1',
          500: '#8b6fe8',
          600: '#6a51df',
          700: '#5a41c4',
          800: '#4a37a0',
          900: '#3e2f82',
        },
        // Harmonised orchid for tasteful gradients (no hot pink).
        fuchsia: {
          400: '#c98bea',
          500: '#b56fe2',
          600: '#9f54d6',
        },
        ink: '#1b1830',
        cloud: '#f6f5fb',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(27,24,48,0.04), 0 8px 24px -14px rgba(27,24,48,0.18)',
        lift: '0 2px 6px -2px rgba(27,24,48,0.10), 0 18px 40px -16px rgba(106,81,223,0.32)',
        glow: '0 10px 30px -8px rgba(106,81,223,0.45)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3.5xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
