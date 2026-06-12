import type { Config } from 'tailwindcss';

// The five sacred tokens. No other hues may be introduced.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lapis: '#1C2647',
        gold: '#D9A441',
        garnet: '#7A1F2B',
        ivory: '#F3ECDD',
        incense: '#8A8578',
      },
      fontFamily: {
        display: ['Cinzel', 'Cormorant Garamond', 'serif'],
        story: ['Cormorant Garamond', 'Georgia', 'serif'],
        ui: ['Nunito Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '28rem',
      },
    },
  },
  plugins: [],
};

export default config;
