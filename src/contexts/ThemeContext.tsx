import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeColors {
  // Background colors
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Chat bubble colors
  myBubble: string;
  mentorBubble: string;
  otherBubble: string;
  
  // UI colors
  border: string;
  input: string;
  sendButton: string;
  header: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
}

const lightTheme: ThemeColors = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  
  myBubble: '#4F46E5',
  mentorBubble: '#0EA5E9',
  otherBubble: '#F3F4F6',
  
  border: '#E5E7EB',
  input: '#FFFFFF',
  sendButton: '#FACC15',
  header: '#FFFFFF',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const darkTheme: ThemeColors = {
  primary: '#7C3AED',
  secondary: '#4F46E5',
  surface: '#1F2937',
  background: '#111827',
  
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  
  myBubble: '#7C3AED',
  mentorBubble: '#00F5FF',
  otherBubble: '#374151',
  
  border: '#4B5563',
  input: '#374151',
  sendButton: '#FACC15',
  header: '#1F2937',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@superpaac_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};