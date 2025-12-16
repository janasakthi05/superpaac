import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface Typography {
  fontFamily: string;
  monoFamily: string;
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    title: number;
    header: number;
  };
  weights: {
    regular: string | number;
    medium: string | number;
    bold: string | number;
  };
  lineHeightMultiplier: number;
}

interface ThemeColors {
  primary: string;
  primaryGradient: string[];
  glow: string;

  secondary: string;
  surface: string;
  background: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  myBubble: string;
  mentorBubble: string;
  otherBubble: string;

  border: string;
  input: string;
  sendButton: string;
  header: string;

  success: string;
  error: string;
  warning: string;
  info: string;
}

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  typography: Typography;
  toggleTheme: () => void;
  isDark: boolean;
}

const THEME_STORAGE_KEY = '@superpaac_theme';

/* =======================
   PREMIUM LIGHT THEME
   ======================= */

const lightThemeColors: ThemeColors = {
  primary: '#635BFF',
  primaryGradient: ['#635BFF', '#5B55F4', '#4C48E5'],
  glow: 'rgba(99,91,255,0.22)',

  secondary: '#4C48E5',
  surface: '#FFFFFF',
  background: '#F4F7FF',

  text: '#0B1220',
  textSecondary: '#1F2937',
  textMuted: '#6B7280',

myBubble: '#F3F4FF',
mentorBubble: '#E7DBFF',
otherBubble: '#FAFAFD',

  border: '#E4E9F2',
  input: '#FFFFFF',
  sendButton: '#635BFF',
  header: '#FFFFFF',

  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  info: '#2563EB',
};

/* =======================
   PREMIUM DARK THEME
   ======================= */

const darkThemeColors: ThemeColors = {
  primary: '#8E89FF',
  primaryGradient: ['#8E89FF', '#726CF4', '#5C57E8'],
  glow: 'rgba(142,137,255,0.18)',

  secondary: '#726CF4',
  surface: '#0E1424',
  background: '#070B16',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

myBubble: '#1A1F4A',        // Midnight indigo with depth
mentorBubble: '#6A6EFF',    // Royal aurora blue (signature color)
otherBubble: '#121735',     // Deep navy shadow
     // Cosmic navy



  border: '#1F2A44',
  input: '#0B1020',
  sendButton: '#8E89FF',
  header: '#0E1424',

  success: '#22C55E',
  error: '#EF4444',
  warning: '#FBBF24',
  info: '#60A5FA',
};

/* =======================
   TYPOGRAPHY SYSTEM
   ======================= */

const typography: Typography = {
  fontFamily: 'Inter',
  monoFamily: 'Menlo',

  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 21,
    title: 24,
    header: 20,
  },

  weights: {
    regular: '400',
    medium: '600',
    bold: '700',
  },

  lineHeightMultiplier: 1.45,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setTheme(saved);
      } catch {}
    })();
  }, []);

  const toggleTheme = async () => {
    try {
      const next: Theme = theme === 'light' ? 'dark' : 'light';
      setTheme(next);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  };

  const colors = theme === 'light' ? lightThemeColors : darkThemeColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, typography, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
