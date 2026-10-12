/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          black: '#111111',
          charcoal: '#222222',
          muted: '#71717A',
          subtle: '#A1A1AA',
          border: '#E4E4E7',
          lightborder: '#F4F4F5',
          surface: '#FAFAFA',
          white: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
