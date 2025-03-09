export const COLORS = {
  // Primary colors
  primary: '#3E54AC', // Deep blue for night sky
  secondary: '#655DBB', // Purple for cosmic feel
  accent: '#BFACE2', // Light purple for stars
  highlight: '#ECF2FF', // Light blue for highlights

  // Star types
  luminary: '#FFD700', // Gold for Luminary
  navigator: '#C0C0C0', // Silver for Navigator

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Functional
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',

  // Background
  background: '#121212', // Dark background for night sky
  card: '#1E1E1E', // Slightly lighter for cards
  input: '#2C2C2C', // Input fields
};

export const FONTS = {
  // Font families
  regular: 'System',
  medium: 'System',
  bold: 'System',

  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body1: 16,
  body2: 14,
  caption: 12,
  button: 16,
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const SIZES = {
  // Screen dimensions
  width: 375, // Default design width
  height: 812, // Default design height

  // Component sizes
  buttonHeight: 48,
  inputHeight: 48,
  borderRadius: 8,
  iconSize: 24,
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  },
}; 