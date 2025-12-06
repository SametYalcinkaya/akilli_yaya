/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: "#0ea271",
                    dark: "#0b7652",
                    light: "#e7f8f0",
                },
            },
        },
    },
    plugins: [],
};
