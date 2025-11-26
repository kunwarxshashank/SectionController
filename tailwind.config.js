/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          50: '#f0f4ff',
          100: '#dbe5ff',
          200: '#bed1ff',
          300: '#95b4ff',
          400: '#698dff',
          500: '#4867ff',
          600: '#2d42f5',
          700: '#1f2fd8',
          800: '#1d29ad',
          900: '#1e2788',
          950: '#161b51',
        },
        ir: {
          blue: '#002B5B',
          orange: '#EA7317',
          cream: '#FEF6E4',
          darkblue: '#001233',
          lightblue: '#2E538B',
        },
        signal: {
          green: '#00ff00',
          yellow: '#ffff00',
          red: '#ff0000',
        }
      },
      fontFamily: {
        railway: ['Rajdhani', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'train-move': 'trainMove 20s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s ease-in-out infinite',
      },
      keyframes: {
        trainMove: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
