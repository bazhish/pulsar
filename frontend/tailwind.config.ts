import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151616",
        paper: "#f6f4ef",
        leaf: "#6f9f3f",
        coral: "#d96552",
        sky: "#4a8fbf"
      }
    }
  },
  plugins: []
};

export default config;
