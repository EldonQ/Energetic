/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        bone: '#f4f4f4',
        haze: '#bfe5ff',
        dim: '#5a5a5a',
        faint: '#2a2a2a',
      },
      fontFamily: {
        mono: ['"Space Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        museum: '0.3em',
      },
    },
  },
  plugins: [],
};
