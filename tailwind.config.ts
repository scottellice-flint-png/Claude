import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Foremark brand colors
        foremark: {
          green: '#0F4C4C',      // Dark teal header
          'green-light': '#1A5C5C', // Lighter teal for hover
          'green-dark': '#0A3A3A',  // Darker teal
          lime: '#C8E64C',       // Accent lime/yellow-green
          'lime-dark': '#B5D43A', // Darker lime for hover
        },
        // Keep semantic colors
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
