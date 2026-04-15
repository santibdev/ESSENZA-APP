/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // All colors reference CSS variables defined in src/assets/globals.css
      // Change colors there → they cascade through the entire app
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'logo-pop': 'logoPop 0.9s ease-out forwards',
        'bar-fill': 'barFill 2.4s ease-out forwards',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        logoPop: {
          '0%': { opacity: '0', transform: 'scale(0.7) translateY(12px)' },
          '65%': { opacity: '1', transform: 'scale(1.06) translateY(-3px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        barFill: {
          '0%': { width: '0%' },
          '30%': { width: '40%' },
          '70%': { width: '75%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
