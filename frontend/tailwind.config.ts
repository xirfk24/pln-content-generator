import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Poppins'", 'var(--font-family-base)', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
        poppins: ["'Poppins'", 'sans-serif'],
      },
      colors: {
        /* ── Surfaces ── */
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          hover: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        /* ── Text (ink) ── */
        ink: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        /* ── Brand ── */
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          border: "var(--primary-border)",
        },
        /* ── Semantic ── */
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
      fontSize: {
        /* Custom type-scale steps */
        base: ["var(--font-size-base)", { lineHeight: "var(--line-normal)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-normal)" }],
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-snug)" }],
        "card-title": ["var(--font-size-card-title)", { lineHeight: "var(--line-snug)" }],
        micro: ["var(--font-size-micro)", { lineHeight: "var(--line-snug)" }],
      },
    },
  },
  plugins: [],
};
export default config;
