/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================================
        // Paleta BetMarketer — dark mode (Material 3 derived).
        // Tokens existentes (ink, slate, accent) se REDEFINEN para
        // que la mayoría del código siga funcionando sin tocar JSX.
        // ============================================================
        background: '#101415',
        surface: {
          DEFAULT: '#1d2022',
          lowest: '#0b0f10',
          low: '#191c1e',
          high: '#272a2c',
          highest: '#323537',
        },
        outline: {
          DEFAULT: '#8f909a',
          variant: '#45464f',
        },
        // Navy de marca + azul eléctrico
        primary: {
          DEFAULT: '#b6c4fc', // texto/links sobre dark
          container: '#0f1f4d', // navy fondo
          soft: '#1f2e5c',
        },
        secondary: {
          DEFAULT: '#b4c5ff',
          container: '#0053db', // azul eléctrico CTA
          hover: '#1d4ed8',
        },
        tertiary: {
          DEFAULT: '#fdb790', // naranja para alertas/highlights
          container: '#3d1700',
        },
        danger: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        // ============================================================
        // Tokens legacy remapeados a dark — JSX existente "just works"
        // ============================================================
        ink: {
          900: '#e0e3e5', // antes texto oscuro → ahora texto claro
          800: '#c6c6d0',
          700: '#c6c6d0',
          500: '#8f909a',
          300: '#45464f',
          100: '#101415', // antes bg light → ahora bg dark
        },
        slate: {
          50: '#272a2c',
          100: '#323537',
          200: '#45464f',
          300: '#45464f',
          400: '#8f909a',
          500: '#c6c6d0',
          600: '#c6c6d0',
          700: '#e0e3e5',
          800: '#e0e3e5',
          900: '#e0e3e5',
        },
        accent: {
          DEFAULT: '#0053db',
          hover: '#1d4ed8',
          soft: '#0f1f4d',
        },
        // Variantes para badges (mejor contraste sobre dark)
        rose: {
          50: '#3a1517',
          100: '#451a1d',
          200: '#7a2329',
          300: '#ffb4ab',
          400: '#ffb4ab',
          500: '#ff8a80',
          600: '#ff8a80',
          700: '#ffb4ab',
          800: '#ffdad6',
        },
        emerald: {
          50: '#0e2a1d',
          100: '#143b29',
          200: '#1b5a3e',
          600: '#6ce0a6',
          700: '#a7f3d0',
          800: '#d1fae5',
        },
        amber: {
          50: '#3a2a0f',
          100: '#4a3712',
          200: '#6a4f1a',
          600: '#fdb790',
          700: '#fcd34d',
          800: '#fef3c7',
        },
        sky: {
          50: '#0c2746',
          100: '#103258',
          200: '#1f4d8a',
          600: '#7cc1ff',
          700: '#b6c4fc',
          800: '#dbeafe',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        icon: ['"Material Symbols Outlined"'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.40), 0 1px 1px 0 rgb(0 0 0 / 0.30)',
        elevated: '0 8px 24px -8px rgb(0 0 0 / 0.55)',
      },
    },
  },
  plugins: [],
};
