import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#F7F8F4",
        surface: "#FFFFFF",
        muted: "#6B7280",
        line: "#E5E7EB",
        leaf: "#16A34A",
        coral: "#DC4C3F",
        amber: "#F4C430",
        sky: "#2563EB",
        pulse: "#14B8A6",
        plum: "#7C3AED"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(17, 24, 39, 0.08)",
        lift: "0 18px 45px rgba(17, 24, 39, 0.12)"
      },
      borderRadius: {
        app: "8px"
      }
    }
  },
  plugins: []
};

export default config;
