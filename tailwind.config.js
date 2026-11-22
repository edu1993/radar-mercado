/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F1',
        surface: '#FFFFFF',
        hairline: '#E5E3DC',
        ink: '#121212',
        graphite: '#666560',
        smart: '#059669',
        signal: '#EAB308',
        outlier: '#E11D48'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      borderRadius: {
        card: '8px',
        control: '6px'
      }
    }
  },
  plugins: []
};
