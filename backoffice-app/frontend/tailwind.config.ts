import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: 'hsl(215 20% 65%)',
        background: '#eef1f5',
        foreground: '#111827',
        primary: { DEFAULT: '#2b2d31', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f3f4f6', foreground: '#111827' },
        muted: { DEFAULT: '#e5e7eb', foreground: '#6b7280' },
        accent: { DEFAULT: '#0ea5e9', foreground: '#ffffff' },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      borderRadius: { lg: '12px', md: '10px', sm: '8px' },
      boxShadow: { card: '0 8px 24px rgba(17,24,39,.06)' }
    }
  }
} satisfies Config