/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    prefix: "debo:",
    theme: {
        extend: {},
    },
    plugins: [require("daisyui")],
    daisyui: {
        logs: false, // Disable daisyUI logs
    },
};
