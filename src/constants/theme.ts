export const Colors = {
  // Primary palette — Balochistan landscape
  terracotta: '#C1440E',      // Balochistan clay soil, pottery
  makranTeal: '#1B5E52',      // Arabian Sea / Makran coast
  saffron: '#E8A020',         // Desert sun, Balochi embroidery gold
  sand: '#F5EDD8',            // Warm sandy background (app background)
  jetBlack: '#1A1A1A',        // Neo-brutalism borders and text
  deepClay: '#6B3A2A',        // Secondary text, earthy
  white: '#FAFAF5',           // Card backgrounds
  limestone: '#E8DFD0',       // Dividers, subtle backgrounds
  mountainSlate: '#3D4F4A',   // Map UI, secondary elements
  
  // Semantic
  success: '#2D7A4F',
  error: '#C1440E',
  warning: '#E8A020',
  
  // Category colors (for map pins and filter chips)
  categories: {
    beach: '#1B5E52',
    waterfall: '#1A6B8A',
    mountain: '#3D4F4A',
    valley: '#2D7A4F',
    viewpoint: '#C1440E',
    historical: '#6B3A2A',
    desert: '#E8A020',
    forest: '#1B5E52',
  }
} as const;

export const Typography = {
  // Space Grotesk for headings — bold, raw, modern
  display: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 32, lineHeight: 38 },
  heading1: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, lineHeight: 30 },
  heading2: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 20, lineHeight: 26 },
  heading3: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, lineHeight: 22 },
  
  // Inter for body — clean, readable
  body: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 },
  bodyMedium: { fontFamily: 'Inter-Medium', fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18 },
  captionBold: { fontFamily: 'Inter-SemiBold', fontSize: 12, lineHeight: 18 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
} as const;

export const Brutalism = {
  border: { borderWidth: 2.5, borderColor: '#1A1A1A' },
  borderLight: { borderWidth: 1.5, borderColor: '#1A1A1A' },
  shadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0, // Android: use custom boxShadow approach
  },
  shadowSmall: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  borderRadius: 4,  // Very minimal — raw brutalist aesthetic
  borderRadiusLarge: 8,
} as const;
