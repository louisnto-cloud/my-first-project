/** @type {import('tailwindcss').Config} */

// ─── Đọc & Viết brand: "Lacquer & Lotus" ─────────────────────────────────────
// Vietnamese lacquer red is the primary, deep jade the secondary, lotus gold
// the energy accent — on a soft warm-white ground. The palettes below REMAP
// Tailwind's red/emerald/amber so the whole app carries the identity at the
// theme level: components keep familiar class names but render in the brand.

const lacquer = {
  50: '#FBF1F0',
  100: '#F7DEDC',
  200: '#EFBCB8',
  300: '#E39089',
  400: '#D3625A',
  500: '#C23F35',
  600: '#B3261E', // brand primary
  700: '#8F1E18',
  800: '#6B1712',
  900: '#4A100D',
};

const jade = {
  50: '#EFF6F3',
  100: '#DAEBE4',
  200: '#B2D6C8',
  300: '#83BAA6',
  400: '#4F9980',
  500: '#2A7A61',
  600: '#155E4B', // brand secondary
  700: '#114C3D',
  800: '#0D3A2F',
  900: '#092921',
};

const lotus = {
  50: '#FBF5E9',
  100: '#F6EACF',
  200: '#EDD5A0',
  300: '#E3BF70',
  400: '#D9A441', // brand accent
  500: '#C08A2B',
  600: '#9E6F22',
  700: '#7B551B',
  800: '#593D14',
  900: '#3B280E',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Trebuchet MS', 'Verdana', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        red: lacquer,
        emerald: jade,
        amber: lotus,
      },
    },
  },
  plugins: [],
};
