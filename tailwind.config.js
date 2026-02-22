/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require('nativewind/preset')],
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                background: '#121212',
                card: '#1E1E1E',
                primary: '#3E54AC',
                secondary: '#655DBB',
                accent: '#BFACE2',
                'ios-surface': '#1C1C1E',
                'ios-elevated': '#2C2C2E',
                'ios-label': '#FFFFFF',
                'ios-secondary-label': '#8E8E93',
            },
            borderRadius: {
                ios: '14px',
            },
        },
    },
    plugins: [],
};