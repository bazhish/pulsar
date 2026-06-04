import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        leaf: "#18A957",
        coral: "#E14B5A",
        amber: "#F2B84B",
        sky: "#2F80ED",
        pulse: "#14B8A6",
        plum: "#4F46E5",
        mint: "#DDFBF1",
        night: "#0A1728"
      },
      boxShadow: {
        soft: "0 16px 38px rgb(var(--shadow-ink) / var(--shadow-soft-opacity))",
        lift: "0 24px 70px rgb(var(--shadow-ink) / var(--shadow-lift-opacity))",
        glow: "0 22px 60px rgba(20, 184, 166, 0.22)"
      },
      borderRadius: {
        app: "14px"
      }
    }
  },
  plugins: []
};

export default config;
