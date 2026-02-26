/** @type {import('tailwindcss').Config} */
// All color values are mirrored from src/theme.ts — keep in sync.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ─────────────────────────────────────────────────────────
        lime: {
          DEFAULT: '#C8E600',
          dark: '#a8c100',
          light: '#d8f200',
        },
        brand: {
          black: '#0A0A0A',
        },
        // ── Surfaces ──────────────────────────────────────────────────────
        dark: {
          bg: '#111111',
          card: '#1C1C1C',
          border: '#2A2A2A',
        },
        light: {
          bg: '#F5F7FA',
          border: '#E5E7EB',
        },
        // ── Semantic ──────────────────────────────────────────────────────
        alert: '#E74C3C',
        warning: '#E67E22',
        muted: '#6B7280',

        // Keep legacy aliases so existing classes still compile
        primary: {
          DEFAULT: '#C8E600',
          light: '#d8f200',
          dark: '#a8c100',
        },
        secondary: {
          DEFAULT: '#1C1C1C',
          light: '#2A2A2A',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      // ── Animations ──────────────────────────────────────────────────────
      animation: {
        'fadeInUp': 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'fadeInDown': 'fadeInDown 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'slideInRight': 'slideInRight 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'slideInLeft': 'slideInLeft 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'slideUp': 'slideUp 0.3s ease forwards',
        'chatSlideUp': 'chatSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'floatY': 'floatY 4s ease-in-out infinite',
        'pulseGlow': 'pulseGlow 2.5s ease-in-out infinite',
        'pulseGlowLime': 'pulseGlowLime 2.5s ease-in-out infinite',
        'spinSlow': 'spin 12s linear infinite',
        'bounceDot': 'bounceDot 1.2s ease-in-out infinite',
        'scaleIn': 'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'revealCard': 'revealCard 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
        'gradientShift': 'gradientShift 6s ease infinite',
      },

      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(60px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-60px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        chatSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200,230,0,0)' },
          '50%': { boxShadow: '0 0 30px 8px rgba(200,230,0,0.3)' },
        },
        pulseGlowLime: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200,230,0,0.4)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(200,230,0,0.15)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-8px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        revealCard: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },

      backgroundSize: {
        '200': '200% 200%',
      },
    },
  },
  plugins: [],
};
