// tailwind.config.js
module.exports = {
  darkMode: 'class', // ✅ REQUIRED for .dark class toggle to work!
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // This covers everything in src
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};