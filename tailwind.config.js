/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          50: '#f0f4f6',
          100: '#d9e4e8',
          200: '#b3c8d1',
          300: '#7d9fab',
          400: '#4a6b7a',
          500: '#2c4a59',
          600: '#1e3543',
          700: '#152631',
          800: '#0e1b24',
          900: '#081119',
          950: '#040a0f',
        },
        teal: {
          50: '#effcf9',
          100: '#cbf7ee',
          200: '#97ede0',
          300: '#5ddccd',
          400: '#2cc4b5',
          500: '#14a89a',
          600: '#0d877c',
          700: '#106b64',
          800: '#115451',
          900: '#134544',
          950: '#042827',
        },
        ice: {
          50: '#f7fafc',
          100: '#eef4f8',
          200: '#dbe7ee',
          300: '#b9cfdd',
          400: '#8fb0c4',
          500: '#6b91a8',
          600: '#547488',
          700: '#445e6e',
          800: '#3a4f5c',
          900: '#344450',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'wave-pulse': 'wavePulse 2.5s ease-in-out infinite',
        'wave-pulse-delayed': 'wavePulse 2.5s ease-in-out 0.5s infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'signal-rise': 'signalRise 1.2s ease-out forwards',
        'scatter-fade': 'scatterFade 1.5s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        wavePulse: {
          '0%, 100%': { transform: 'scaleY(0.3)', opacity: '0.4' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        signalRise: {
          '0%': { transform: 'translateY(100%) scale(0.5)', opacity: '0' },
          '60%': { opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        scatterFade: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8) translateY(-20px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
