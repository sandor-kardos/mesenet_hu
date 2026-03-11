import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = ['light', 'sepia', 'dark'];
const THEME_ICONS = { light: '☀️', sepia: '📜', dark: '🌙' };

export function ThemeProvider({ children }) {
    const [themeIndex, setThemeIndex] = useState(() => {
        const saved = localStorage.getItem('mesenet-theme');
        return saved ? parseInt(saved, 10) : 0;
    });

    const theme = THEMES[themeIndex];

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mesenet-theme', themeIndex.toString());
    }, [theme, themeIndex]);

    const cycleTheme = () => {
        setThemeIndex((prev) => (prev + 1) % 3);
    };

    return (
        <ThemeContext.Provider value={{ theme, cycleTheme, themeIcon: THEME_ICONS[theme] }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
