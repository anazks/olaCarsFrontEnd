/** @type {import('tailwindcss').Config} */
// All color values are mirrored from src/theme.ts — keep in sync.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
        'uw': '3840px',
      },
      colors: {
        // ── Brand ─────────────────────────────────────────────────────────
        lime: {
          DEFAULT: 'var(--brand-lime)',
          vibrant: 'var(--brand-lime-vibrant)',
          dark: 'var(--brand-lime-dark)',
          light: 'var(--brand-lime-light)',
        },
        brand: {
          black: 'var(--brand-black)',
        },
        // ── Surfaces ──────────────────────────────────────────────────────
        dark: {
          bg: 'var(--bg-main)',
          card: 'var(--bg-card)',
          border: 'var(--border-main)',
        },
        light: {
          bg: 'var(--bg-main)',
          border: 'var(--border-main)',
        },
        // ── Semantic ──────────────────────────────────────────────────────
        alert: 'var(--alert-red)',
        warning: 'var(--warn-orange)',
        muted: 'var(--text-muted)',

        // Keep legacy aliases
        primary: {
          DEFAULT: 'var(--brand-lime)',
          light: 'var(--brand-lime-light)',
          dark: 'var(--brand-lime-dark)',
        },
        secondary: {
          DEFAULT: 'var(--bg-card)',
          light: 'var(--border-main)',
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