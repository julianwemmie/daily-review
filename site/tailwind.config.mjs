/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: '#141414',
        border: '#1e1e1e',
        accent: '#00ff88',
        'accent-dim': '#00cc6a',
        'accent-cyan': '#22d3ee',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'fade-up': 'fadeUp 0.6s ease-out both',
        'fade-up-delay-1': 'fadeUp 0.6s ease-out 0.1s both',
        'fade-up-delay-2': 'fadeUp 0.6s ease-out 0.2s both',
        'fade-up-delay-3': 'fadeUp 0.6s ease-out 0.3s both',
        'fade-up-delay-4': 'fadeUp 0.6s ease-out 0.4s both',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
