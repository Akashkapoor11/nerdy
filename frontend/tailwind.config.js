/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0B0118',
          800: '#130225',
          700: '#1A0B35',
          600: '#241045',
        },
        violet: {
          400: '#9B7FFF',
          500: '#7B5FEA',
          600: '#6247D0',
        },
        gold: {
          400: '#FFE566',
          500: '#FFD700',
          600: '#E6C200',
        },
        jade: {
          400: '#4FFFB0',
          500: '#00F5A0',
          600: '#00D988',
        },
        coral: {
          400: '#FF8FAB',
          500: '#FF6B9D',
          600: '#E55A8A',
        },
        sky: {
          400: '#93E4FF',
          500: '#5BC8FF',
          600: '#2BAAEE',
        },
      },
      fontFamily: {
        display: ['Fredoka One', 'Nunito', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'star-burst': 'starBurst 0.6s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
        'pop-in': 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(123, 95, 234, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(123, 95, 234, 0.8), 0 0 80px rgba(123, 95, 234, 0.3)' },
        },
        starBurst: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: 1 },
          '60%': { transform: 'scale(1.3) rotate(270deg)', opacity: 1 },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: 0.8 },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.5)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        twinkle: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.3)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: 0 },
          '60%': { transform: 'scale(1.15)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      backgroundImage: {
        'space-gradient': 'radial-gradient(ellipse at top, #241045 0%, #0B0118 70%)',
        'card-gradient': 'linear-gradient(135deg, rgba(123,95,234,0.15) 0%, rgba(36,16,69,0.8) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FFE566 0%, #FFB800 100%)',
        'jade-gradient': 'linear-gradient(135deg, #4FFFB0 0%, #00D988 100%)',
        'coral-gradient': 'linear-gradient(135deg, #FF8FAB 0%, #E55A8A 100%)',
      },
    },
  },
  plugins: [],
};
