import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#000000', // Black
    secondary: '#E0E0E0', // Light gray
    tertiary: '#F0F0F0', // Very light gray
    accent: '#000000', // Black
    background: '#FFFFFF', // White
    surface: '#FFFFFF', // White
    text: '#000000', // Black
    error: '#000000', // Black
    onSurface: '#000000', // Black
    outline: '#E0E0E0', // Light gray
  },
  roundness: 8,
};

export type AppTheme = typeof theme;
