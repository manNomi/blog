/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--color-page) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        soft: 'rgb(var(--color-soft) / <alpha-value>)',
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        soft: '0 4px 14px rgb(var(--shadow-soft))',
        card: '0 6px 20px rgb(var(--shadow-card))',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'step-enter': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'panel-reveal': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'result-pop': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          '55%': { opacity: '1', transform: 'translateY(-1px) scale(1.004)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-slide': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.72' },
        },
        'float-dot': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms ease both',
        'step-enter': 'step-enter 360ms cubic-bezier(0.18, 0.9, 0.32, 1) both',
        'panel-reveal': 'panel-reveal 420ms ease both',
        'result-pop': 'result-pop 460ms cubic-bezier(0.22, 0.9, 0.26, 1) both',
        'toast-slide': 'toast-slide 260ms ease both',
        'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite',
        'float-dot': 'float-dot 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
