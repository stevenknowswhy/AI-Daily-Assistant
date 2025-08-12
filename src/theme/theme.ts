import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    customGlass?: {
      background: string;
      backgroundSelected: string;
      border: string;
      borderSelected: string;
      text: string;
      textSecondary: string;
      overlay: string;
    };
  }
  interface ThemeOptions {
    customGlass?: {
      background?: string;
      backgroundSelected?: string;
      border?: string;
      borderSelected?: string;
      text?: string;
      textSecondary?: string;
      overlay?: string;
    };
  }
}

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#4A90E2',
      light: '#6BA3F0',
      dark: '#357ABD'
    },
    secondary: {
      main: '#5C6BC0',
      light: '#7986CB',
      dark: '#3F51B5'
    },
    success: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C'
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00'
    },
    info: {
      main: '#2196F3',
      light: '#42A5F5',
      dark: '#1976D2'
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF'
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#666666'
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    },
    divider: 'rgba(0, 0, 0, 0.12)'
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    h3: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '1rem'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '25px',
          padding: '12px 32px',
          fontSize: '16px',
          transition: 'all 0.3s ease-in-out'
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: '8px',
          borderRadius: '4px'
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out'
        }
      }
    }
  }
};

const theme = createTheme(themeOptions);

export default theme;