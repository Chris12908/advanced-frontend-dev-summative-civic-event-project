
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { 50: '#ECFAF6', 100: '#D2F0E7', 600: '#0E8F7E', 700: '#0F766E', 800: '#115E59', 900: '#0B2E3A' },
        sun: { 100: '#FDF0D2', 400: '#F2B84B', 600: '#B9770E' },
        stone: { 50: '#F4FAF8' },                                    // page background
        slate: { 600: '#4A6472', 700: '#2E4954', 900: '#12303A' }     // teal-tinted ink for text
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif']
      }
    }
  }
};