import { useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';

export type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeMode = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    return savedMode || 'system';
  });

  const [effectiveMode, setEffectiveMode] = useState<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return themeMode;
  });

  useEffect(() => {
    if (themeMode === 'system') {
      setEffectiveMode(prefersDarkMode ? 'dark' : 'light');
    } else {
      setEffectiveMode(themeMode);
    }
  }, [themeMode, prefersDarkMode]);

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    localStorage.setItem('themeMode', nextMode);
  };

  const setSpecificMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
  };

  return {
    themeMode,
    effectiveMode,
    toggleTheme,
    setSpecificMode,
    isSystemMode: themeMode === 'system'
  };
};