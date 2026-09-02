import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ink: "var(--text)",
        "ink-secondary": "var(--text-secondary)",
        "ink-muted": "var(--text-muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          border: "var(--primary-border)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          border: "var(--warning-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          hover: "var(--danger-hover)",
          soft: "var(--danger-soft)",
          border: "var(--danger-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          border: "var(--info-border)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          soft: "var(--neutral-soft)",
          border: "var(--neutral-border)",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
      },
    },
  },
  plugins: [],
};
export default config;
