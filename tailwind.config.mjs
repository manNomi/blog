/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        page: '#f3f3f3',
        surface: '#fafafa',
        soft: '#f0f0f0',
        elevated: '#ffffff',
        line: '#dfdfdf',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
        newspaper: ['ChosunCentennial', 'Noto Serif KR', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        soft: '0 4px 14px rgba(0, 0, 0, 0.06)',
        card: '0 6px 20px rgba(0, 0, 0, 0.07)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
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
        'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite',
        'float-dot': 'float-dot 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
