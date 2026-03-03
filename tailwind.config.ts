import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background
        bg: {
          900: '#0B0B0D',
          850: '#111114',
        },
        border: {
          primary: '#25252C',
        },
        surface: {
          800: '#17171B',
          750: '#1D1D22',
          700: '#25252C',
          600: '#2E2E36',
        },
        // Accent - Desire Red
        desire: {
          500: '#C91F4A',
          400: '#DB315E',
          300: '#F06A88',
        },
        // Trust - Teal
        trust: {
          500: '#2C8C82',
          400: '#3DA297',
          300: '#76C2BA',
        },
        // Neutral Text
        text: {
          strong: '#F3EEE8',
          primary: '#DDD6CF',
          secondary: '#AFA7A0',
          muted: '#7C756F',
        },
        // State
        state: {
          success: '#2F9A72',
          warning: '#C8922E',
          danger: '#C44444',
          info: '#4E7BB7',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        chip: '999px',
      },
      keyframes: {
        'nav-loading': {
          '0%': { transform: 'translateX(-100%)' },
          '60%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'nav-loading': 'nav-loading 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
