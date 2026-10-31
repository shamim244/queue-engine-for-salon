import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background, 222.2 84% 4.9%))",
        foreground: "hsl(var(--foreground, 210 40% 98%))",
        card: {
          DEFAULT: "hsl(var(--card, 222.2 84% 6.9%))",
          foreground: "hsl(var(--card-foreground, 210 40% 98%))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary, 199 89% 48%))",
          foreground: "hsl(var(--primary-foreground, 222.2 47.4% 11.2%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 217.2 32.6% 17.5%))",
          foreground: "hsl(var(--secondary-foreground, 210 40% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 217.2 32.6% 17.5%))",
          foreground: "hsl(var(--muted-foreground, 215 20.2% 65.1%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 160 84% 39%))",
          foreground: "hsl(var(--accent-foreground, 210 40% 98%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 62.8% 30.6%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        border: "hsl(var(--border, 217.2 32.6% 17.5%))",
        input: "hsl(var(--input, 217.2 32.6% 17.5%))",
        ring: "hsl(var(--ring, 224.3 76.3% 48%))",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
