/** @type {import('tailwindcss').Config} */

// ─── Read & Write brand: "Ink & Paper" ───────────────────────────────────────
// Deep teal (ink-green) is the primary, ink navy the secondary, marigold the
// energy accent. The palettes below REMAP Tailwind's violet/indigo/fuchsia so
// the whole app rebrands at the theme level — components keep their class
// names but render in the new identity.

const inkTeal = {
  50: '#F1F7F4',
  100: '#DFEEE7',
  200: '#BEDDD0',
  300: '#92C5B0',
  400: '#5CA689',
  500: '#348769',
  600: '#256E54',
  700: '#1D5743',
  800: '#164236',
  900: '#0F2E26',
};

const inkNavy = {
  50: '#F0F4F8',
  100: '#DCE6EF',
  200: '#B9CDDF',
  300: '#8FADC7',
  400: '#5F87A8',
  500: '#3F698C',
  600: '#2F5271',
  700: '#254058',
  800: '#1B2F42',
  900: '#12202D',
};

const marigold = {
  50: '#FDF6EA',
  100: '#FAEBD0',
  200: '#F4D69F',
  300: '#EDBE6B',
  400: '#E4A440',
  500: '#D68A24',
  600: '#B26E1C',
  700: '#8C5518',
  800: '#663E14',
  900: '#452A0F',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Trebuchet MS', 'Verdana', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        violet: inkTeal,
        indigo: inkNavy,
        fuchsia: marigold,
      },
    },
  },
  plugins: [],
};
