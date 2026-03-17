import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#d8f0e3',
          200: '#b4e2ca',
          300: '#82cda7',
          400: '#4eb380',
          500: '#2d9460',  // verde SH principal
          600: '#1f7549',
          700: '#1a5e3a',
          800: '#174b2f',
          900: '#143d27',
        },
        earth: {
          50:  '#faf8f5',
          100: '#f0ebe1',
          200: '#e0d4c0',
          300: '#cab898',
          400: '#b09270',  // ocre/tierra
          500: '#9a7a57',
          600: '#7d6045',
          700: '#634b37',
          800: '#523d2e',
          900: '#453227',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      }
    },
  },
  plugins: [],
}
export default config
