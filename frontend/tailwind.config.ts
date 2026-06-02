import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        paper: "#F3F7FB",
        surface: "#FFFFFF",
        muted: "#6D7B8D",
        line: "#DDE7F0",
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
        soft: "0 16px 38px rgba(16, 32, 51, 0.08)",
        lift: "0 24px 70px rgba(16, 32, 51, 0.16)",
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
