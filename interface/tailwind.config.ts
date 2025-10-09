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
  			// Background colors
  			background: 'rgb(var(--background) / <alpha-value>)',
  			'background-elevated': 'rgb(var(--background-elevated) / <alpha-value>)',
  			surface: 'rgb(var(--surface) / <alpha-value>)',
  			'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
  			
  			// Foreground colors
  			foreground: 'rgb(var(--foreground) / <alpha-value>)',
  			'foreground-muted': 'rgb(var(--foreground-muted) / <alpha-value>)',
  			'foreground-subtle': 'rgb(var(--foreground-subtle) / <alpha-value>)',
  			
  			// Border colors
  			border: 'rgb(var(--border) / <alpha-value>)',
  			'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
  			'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
  			
  			// Primary/Brand colors
  			primary: {
  				DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
  				hover: 'rgb(var(--primary-hover) / <alpha-value>)',
  				foreground: 'rgb(var(--primary-foreground) / <alpha-value>)'
  			},
  			
  			// Accent colors
  			accent: {
  				DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
  				hover: 'rgb(var(--accent-hover) / <alpha-value>)',
  				foreground: 'rgb(var(--accent-foreground) / <alpha-value>)'
  			},
  			
  			// Status colors
  			success: {
  				DEFAULT: 'rgb(var(--success) / <alpha-value>)',
  				bg: 'rgb(var(--success-bg) / <alpha-value>)'
  			},
  			error: {
  				DEFAULT: 'rgb(var(--error) / <alpha-value>)',
  				bg: 'rgb(var(--error-bg) / <alpha-value>)'
  			},
  			warning: {
  				DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
  				bg: 'rgb(var(--warning-bg) / <alpha-value>)'
  			},
  			info: {
  				DEFAULT: 'rgb(var(--info) / <alpha-value>)',
  				bg: 'rgb(var(--info-bg) / <alpha-value>)'
  			},
  			
  			// Muted colors
  			muted: {
  				DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
  				foreground: 'rgb(var(--muted-foreground) / <alpha-value>)'
  			},
  			
  			// Card colors
  			card: {
  				DEFAULT: 'rgb(var(--card) / <alpha-value>)',
  				elevated: 'rgb(var(--card-elevated) / <alpha-value>)',
  				foreground: 'rgb(var(--card-foreground) / <alpha-value>)'
  			},
  			
  			// Popover/Modal colors
  			popover: {
  				DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
  				foreground: 'rgb(var(--popover-foreground) / <alpha-value>)'
  			},
  			
  			// Input colors
  			input: {
  				DEFAULT: 'rgb(var(--input) / <alpha-value>)',
  				bg: 'rgb(var(--input-bg) / <alpha-value>)'
  			},
  			
  			// Ring/Focus color
  			ring: 'rgb(var(--ring) / <alpha-value>)',
  			
		// Brand color scale (for gradients)
		brand: {
			'50': '#edf8ff',
			'100': '#d6f0ff',
			'200': '#b6e4ff',
			'300': '#84d5ff',
			'400': '#4bbeff',
			'500': '#1c9cf0',
			'600': '#0d7dd1',
			'700': '#0c64aa',
			'800': '#0e548c',
			'900': '#124774',
			'950': '#0c2c4d'
		},
  			
  			// Chart colors
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
	backgroundImage: {
		'brand-gradient': 'linear-gradient(135deg, #1889d6 0%, #1c9cf0 50%, #3daaf3 100%)'
	},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
