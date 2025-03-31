import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#8E2430', // Wine red
    secondary: '#F2D4AB', // Cream
    tertiary: '#A78F7F', // Taupe
    accent: '#4B0D12', // Dark wine
    background: '#F9F9F9',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    error: '#D32F2F',
  },
  roundness: 8,
};

export type AppTheme = typeof theme;
