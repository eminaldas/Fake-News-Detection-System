import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const [fontScale, setFontScaleState] = useState(() => {
        return localStorage.getItem('font-scale') || 'md';
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        document.documentElement.setAttribute('data-font-scale', fontScale);
        localStorage.setItem('font-scale', fontScale);
    }, [fontScale]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const setFontScale = (scale) => {
        if (['sm', 'md', 'lg'].includes(scale)) setFontScaleState(scale);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontScale, setFontScale }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
