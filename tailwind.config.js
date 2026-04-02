/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0F1C',
          surface: '#111827',
          elevated: '#1F2937',
          input: '#0D1321',
        },
        accent: {
          DEFAULT: '#06B6D4',
          hover: '#22D3EE',
          muted: '#083344',
        },
        border: {
          DEFAULT: '#1F2937',
          hover: '#374151',
          accent: '#06B6D4',
        },
        txt: {
          primary: '#F9FAFB',
          secondary: '#9CA3AF',
          muted: '#4B5563',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
