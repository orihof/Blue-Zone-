import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary:     { DEFAULT: "hsl(var(--primary))",     foreground: "hsl(var(--primary-foreground))" },
        secondary:   { DEFAULT: "hsl(var(--secondary))",   foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted:       { DEFAULT: "hsl(var(--muted))",       foreground: "hsl(var(--muted-foreground))" },
        accent:      { DEFAULT: "hsl(var(--accent))",      foreground: "hsl(var(--accent-foreground))" },
        popover:     { DEFAULT: "hsl(var(--popover))",     foreground: "hsl(var(--popover-foreground))" },
        card:        { DEFAULT: "hsl(var(--card))",        foreground: "hsl(var(--card-foreground))" },

        // Deep Space Biology — Nebula Palette
        bz: {
          // Void palette
          void:        "#030508",
          abyss:       "#070D18",
          deep:        "#0C1525",
          elevated:    "#111E32",
          rim:         "#1A2D48",
          // Chromatic
          ion:         "#008AFF",
          cerulean:    "#0AAFFF",
          stellar:     "#E8EEFF",
          dust:        "#6B7FA3",
          nebula:      "#3D4F6E",
          biolum:      "#00FFB3",
          plasma:      "#FF6B35",
          gold:        "#C9943A",
          // Legacy aliases
          midnight:    "#070D18",
          navy:        "#0C1525",
          "navy-light":"#111E32",
          blue:        "#008AFF",
          "blue-dim":  "#0066CC",
          white:       "#E8EEFF",
          muted:       "#6B7FA3",
          critical:    "#FF6B35",
          warn:        "#F5A623",
          optimal:     "#00FFB3",
        },
      },

      fontFamily: {
        sans:      ["var(--font-ui)",       "DM Sans",        "sans-serif"],
        serif:     ["var(--font-serif)",    "Cormorant Garamond", "Georgia", "serif"],
        editorial: ["var(--font-editorial)","Instrument Serif","Georgia",  "serif"],
        mono:      ["var(--font-mono)",     "JetBrains Mono", "Courier New", "monospace"],
        ui:        ["var(--font-ui)",       "DM Sans",        "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      transitionTimingFunction: {
        bz: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        heroFadeIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "hero-fade-in":   "heroFadeIn 300ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
