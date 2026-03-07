/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF3E0',
          light: '#FBF7EE',
        },
        earth: {
          DEFAULT: '#3D2B1F',
          light: '#4E3828',
          medium: '#7A6241',
          muted: '#A08B6E',
          border: '#DAC9AB',
          soft: '#E9E3CE',
          pale: '#EFE4D0',
        },
        terracotta: {
          DEFAULT: '#C2704E',
          dim: '#A85D3E',
          light: '#D4936F',
        },
        olive: {
          DEFAULT: '#6B8E23',
          light: '#7FA02D',
        },
        gold: {
          DEFAULT: '#D4A03C',
        },
        terminal: {
          bg: '#3A2E24',
          border: '#4E3E30',
          header: '#342820',
          text: '#ECE2D0',
        },
      },
      fontFamily: {
        sans: ['Merriweather Sans', 'system-ui', 'sans-serif'],
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
