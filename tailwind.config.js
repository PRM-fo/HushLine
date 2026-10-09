/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Midnight Aurora Palette
        aurora: {
          bg: '#100D18',
          primary: '#8B7CFF',
          secondary: '#58C7FF',
          text: '#F4F0E8',
          muted: '#A6A0B8',
        },
        // Extended palette based on Aurora theme
        midnight: {
          50: '#1a1625',
          100: '#241f33',
          200: '#2e2841',
          300: '#38314f',
          400: '#423a5d',
          500: '#4c436b',
          600: '#564c79',
          700: '#605587',
          800: '#6a5e95',
          900: '#7467a3',
          950: '#100D18',
        },
        // Primary accent (violet) variations
        primary: {
          50: '#f4f0ff',
          100: '#e8e0ff',
          200: '#d0c0ff',
          300: '#b8a0ff',
          400: '#a080ff',
          500: '#8B7CFF',
          600: '#7868e6',
          700: '#6554cc',
          800: '#5240b3',
          900: '#3f2c99',
          950: '#2c1c80',
        },
        // Secondary accent (blue) variations
        secondary: {
          50: '#f0f9ff',
          100: '#e0f3ff',
          200: '#c0e7ff',
          300: '#a0dbff',
          400: '#80cfff',
          500: '#58C7FF',
          600: '#4aa8e6',
          700: '#3c89cc',
          800: '#2e6ab3',
          900: '#204b99',
          950: '#122c80',
        },
        // Text color variations
        text: {
          main: '#F4F0E8',
          muted: '#A6A0B8',
          dim: '#6b6578',
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
        'gradient-shift': 'gradientShift 3s ease infinite',
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
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% center' },
          '50%': { backgroundPosition: '100% center' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
