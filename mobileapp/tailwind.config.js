/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        skyblue: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          DEFAULT: '#0ea5e9', // Sky blue primary
          600: '#0284c7',
          700: '#0369a1',
        },
        oceanblue: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7dd0fc',
          500: '#0284c7',
          DEFAULT: '#075985', // Ocean blue primary
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
