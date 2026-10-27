/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // App Canvas & Surfaces
        'app-bg': '#FFF1DF',
        surface: {
          DEFAULT: '#FFF8EF',
          raised: '#FFFCF7',
          recessed: '#FFE1C4',
          peach: '#FFD2A8',
          wash: '#FFEBD8',
        },
        // Legacy class aliases mapped to neobrutalist surfaces
        background: '#FFF1DF',
        card: '#FFF8EF',
        'card-border': '#2B211B',
        panel: '#FFFCF7',

        // Ink and Typography
        ink: {
          DEFAULT: '#2B211B',
          primary: '#2B211B',
          secondary: '#604331',
          muted: '#806653',
          border: '#2B211B',
        },

        // Brand Orange
        brand: {
          orange: '#FF6A00',
          hover: '#FF8128',
          active: '#E85B00',
          strong: '#C94900',
          deep: '#9F3800',
          soft: '#FFD0A6',
          pale: '#FFE6D0',
        },

        // Controlled Complementary Highlights
        highlight: {
          yellow: '#FFC857',
          cream: '#FFF3C4',
        },

        // Semantic Statuses
        semantic: {
          success: '#226A45',
          'success-soft': '#D8F0DF',
          warning: '#865000',
          'warning-soft': '#FFE9B5',
          danger: '#B4232D',
          'danger-soft': '#FCE0E0',
          info: '#315B87',
          'info-soft': '#DCEAF6',
        },
      },
      boxShadow: {
        'neo-sm': '3px 3px 0 #2B211B',
        'neo': '5px 5px 0 #2B211B',
        'neo-md': '5px 5px 0 #2B211B',
        'neo-lg': '7px 7px 0 #2B211B',
        'neo-xl': '9px 9px 0 #2B211B',
      },
      borderWidth: {
        DEFAULT: '2px',
        '2': '2px',
        '3': '3px',
      },
      borderRadius: {
        sm: '5px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
