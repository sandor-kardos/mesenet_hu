import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ReadingContext = createContext();

export function ReadingProvider({ children }) {
    // Reading progress: { storyId, scrollPercent, timestamp }
    const [lastRead, setLastRead] = useState(() => {
        const saved = localStorage.getItem('mesenet-last-read');
        return saved ? JSON.parse(saved) : null;
    });

    // Reading log: array of storyIds
    const [readLog, setReadLog] = useState(() => {
        const saved = localStorage.getItem('mesenet-read-log');
        return saved ? JSON.parse(saved) : [1, 3, 5, 10, 11]; // Pre-fill with some read stories for demo
    });

    // Favorites: array of storyIds
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('mesenet-favorites');
        return saved ? JSON.parse(saved) : [1, 4, 15]; // Pre-fill with some favorites for demo
    });

    // Ratings: { [storyId]: 'up' | 'down' }
    const [ratings, setRatings] = useState(() => {
        const saved = localStorage.getItem('mesenet-ratings');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        if (lastRead) localStorage.setItem('mesenet-last-read', JSON.stringify(lastRead));
    }, [lastRead]);

    useEffect(() => {
        localStorage.setItem('mesenet-read-log', JSON.stringify(readLog));
    }, [readLog]);

    useEffect(() => {
        localStorage.setItem('mesenet-favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem('mesenet-ratings', JSON.stringify(ratings));
    }, [ratings]);

    const updateProgress = useCallback((storyId, scrollPercent) => {
        setLastRead({ storyId, scrollPercent, timestamp: Date.now() });
    }, []);

    const markAsRead = useCallback((storyId) => {
        setReadLog((prev) => {
            if (prev.includes(storyId)) return prev;
            return [...prev, storyId];
        });
    }, []);

    const rateStory = useCallback((storyId, rating) => {
        setRatings((prev) => ({ ...prev, [storyId]: rating }));
    }, []);

    const toggleFavorite = useCallback((storyId) => {
        setFavorites((prev) => {
            if (prev.includes(storyId)) return prev.filter(id => id !== storyId);
            return [...prev, storyId];
        });
    }, []);

    const clearProgress = useCallback(() => {
        setLastRead(null);
        localStorage.removeItem('mesenet-last-read');
    }, []);

    return (
        <ReadingContext.Provider value={{
            lastRead,
            readLog,
            favorites,
            ratings,
            updateProgress,
            markAsRead,
            toggleFavorite,
            rateStory,
            clearProgress,
        }}>
            {children}
        </ReadingContext.Provider>
    );
}

export function useReading() {
    return useContext(ReadingContext);
}
