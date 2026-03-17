import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    hu: {
        // Navigation
        home: 'Főoldal',
        discover: 'Felfedezés',
        log: 'Napló',
        profile: 'Profil',
        back: 'Vissza',
        seeAll: 'Összes mese →',
        
        // Reader
        end: '~ Vége ~',
        didYouLike: 'Tetszett a mese?',
        letsTalk: 'Miről beszélgessünk?',
        share: 'Megosztás',
        illDraw: 'Rajzolok egyet',
        nextStory: 'Következő mese',
        loading: 'Betöltés...',
        error: 'Hiba',
        storyNotFound: 'Mese nem található',
        backToHome: 'Vissza a főoldalra',
        textSize: 'Szövegméret',
        
        // Home
        continue: 'Folytatás',
        recommended: '✨ Nektek ajánljuk',
        fresh: '🎁 Friss mesék',
        tonightsStories: 'Ennek az estének a meséi',
        merchTitle: 'A Bölcs Róka most pólón is!',
        merchCTA: 'Megnézem →',
        moralLight: 'Könnyed',
        moralAdventure: 'Kalandos',
        moralSerious: 'Komoly',
        moralQuestion: 'Milyen estét szeretnétek?',
        ageLabel: 'Kor:',
        tagsLabel: 'Címkék:',
        loadingStories: 'Mesék betöltése...',
        somethingWentWrong: 'A manóba, valami elromlott!',
        readerSubtitle: 'Mesenet — Mesék, amik számítanak',
        
        // Discover
        discoverLabel: 'Felfedezés',
        searchStories: 'Mesék keresése...',
        all: 'Minden',
        noResults: 'Nincs találat a keresésre.',
        searchLoading: 'Keresés betöltése...',
        
        // Log
        logTitle: 'Olvasási napló',
        logSubtitle: (count) => `Eddig ${count} mesét olvastál el!`,
        history: '📖 Előzmények',
        favorites: (count) => `❤️ Kedvencek (${count})`,
        noHistory: 'Még nem olvastál el egy mesét sem végig.',
        noFavorites: 'Még nincsenek kedvenc meséid. Nyomj a szív ikonra az olvasóban!',
        
        // Profile
        settings: 'Beállítások',
        theme: 'Téma',
        themeDesc: 'Válassz a három színvilág közül',
        notifications: 'Értesítések',
        notificationsDesc: 'Emlékeztető az esti meséléshez',
        premiumTitle: '🌟 Mesenet Premium',
        premiumDesc: 'Korlátlan hozzáférés több ezer meséhez, saját hangon felolvasó AI mód, és offline működés.',
        premiumCTA: 'Próbáld ki ingyen',
        galleryTitle: '🎨 Saját Galéria',
        creationsCount: (count) => `${count} alkotás`,
        noDrawings: 'Még nincsenek mentett rajzaid.',
        drawFirst: 'Olvasd el a kedvenc meséd, és készíts hozzá egy rajzot!',
        deleteConfirm: 'Biztosan törlöd ezt a rajzot?',
        coffee: '☕ Hívj meg egy kávéra a Ko-fi-n!',
        aszf: 'ÁSZF',
        privacy: 'Adatvédelem',
        contact: 'Kapcsolat',
        
        // Feedback
        feedbackTitle: 'Miben segíthetünk?',
        feedbackDesc: (title) => `Miért nem tetszett a(z) ${title}?`,
        catIncomplete: '🧩 Hiányos / Érthetetlen szöveg',
        catAge: '🔞 Nem megfelelő korcsoport',
        catAI: '🤖 AI hiba (furcsa mondatok)',
        catImage: '🖼️ A kép nem illik a meséhez',
        catBoring: '💤 Nem volt érdekes',
        thankYou: 'Köszönjük!',
        helpUs: 'A visszajelzésed sokat segít a Mesenet fejlődésében.',
        sending: 'Küldés... 🚀',
        
        // Drawing
        undo: 'Visszavonás',
        clear: 'Törlés',
        brushSize: 'Méret:',
        cancel: 'Mégse',
        done: 'Kész vagyok! ✨',
        drawPrompt: 'Rajzold le, mi tetszett a legjobban a mesében, tölts fel egy fotót, és a Mesegép jövő héten életre kelti!',
        drawButton: 'Rajzolok egyet',
        uploadButton: 'Fotó feltöltése',
        saved: 'elmentve!',
        themeToggle: 'Témaváltás'
    },
    en: {
        // Navigation
        home: 'Home',
        discover: 'Discover',
        log: 'Journal',
        profile: 'Profile',
        back: 'Back',
        seeAll: 'All stories →',
        
        // Reader
        end: '~ The End ~',
        didYouLike: 'Did you like the story?',
        letsTalk: "Let's talk about it",
        share: 'Share',
        illDraw: "I'll draw one",
        nextStory: 'Next story',
        loading: 'Loading...',
        error: 'Error',
        storyNotFound: 'Story not found',
        backToHome: 'Back to home',
        textSize: 'Text size',
        
        // Home
        continue: 'Continue',
        recommended: '✨ Recommended',
        fresh: '🎁 New stories',
        tonightsStories: "Tonight's stories",
        merchTitle: 'The Wise Fox is now on t-shirts!',
        merchCTA: 'Check it out →',
        moralLight: 'Light',
        moralAdventure: 'Adventurous',
        moralSerious: 'Serious',
        moralQuestion: 'What kind of evening would you like?',
        ageLabel: 'Age:',
        tagsLabel: 'Tags:',
        loadingStories: 'Loading stories...',
        somethingWentWrong: 'Oops, something went wrong!',
        readerSubtitle: 'Mesenet — Stories that matter',
        
        // Discover
        discoverLabel: 'Discover',
        searchStories: 'Search stories...',
        all: 'All',
        noResults: 'No stories found.',
        searchLoading: 'Loading search...',
        
        // Log
        logTitle: 'Reading Journal',
        logSubtitle: (count) => `You have read ${count} stories so far!`,
        history: '📖 History',
        favorites: (count) => `❤️ Favorites (${count})`,
        noHistory: "You haven't finished any stories yet.",
        noFavorites: "You don't have favorite stories yet. Tap the heart icon in the reader!",
        
        // Profile
        settings: 'Settings',
        theme: 'Theme',
        themeDesc: 'Choose from three color schemes',
        notifications: 'Notifications',
        notificationsDesc: 'Reminder for story time',
        premiumTitle: '🌟 Mesenet Premium',
        premiumDesc: 'Unlimited access to thousands of stories, AI mode that reads in your voice, and offline mode.',
        premiumCTA: 'Try for free',
        galleryTitle: '🎨 My Gallery',
        creationsCount: (count) => `${count} creations`,
        noDrawings: 'You have no saved drawings yet.',
        drawFirst: 'Read your favorite story and make a drawing for it!',
        deleteConfirm: 'Are you sure you want to delete this drawing?',
        coffee: '☕ Buy me a coffee on Ko-fi!',
        aszf: 'Terms',
        privacy: 'Privacy',
        contact: 'Contact',
        
        // Feedback
        feedbackTitle: 'How can we help?',
        feedbackDesc: (title) => `Why didn't you like the story: ${title}?`,
        catIncomplete: '🧩 Incomplete / Unintelligible text',
        catAge: '🔞 Inappropriate age group',
        catAI: '🤖 AI error (strange sentences)',
        catImage: '🖼️ Image doesn\'t fit the story',
        catBoring: '💤 It wasn\'t interesting',
        thankYou: 'Thank you!',
        helpUs: 'Your feedback helps Mesenet improve.',
        sending: 'Sending... 🚀',
        
        // Drawing
        undo: 'Undo',
        clear: 'Clear',
        brushSize: 'Size:',
        cancel: 'Cancel',
        done: 'I am done! ✨',
        drawPrompt: 'Draw what you liked best in the story, upload a photo, and the StoryMachine will bring it to life next week!',
        drawButton: 'I want to draw',
        uploadButton: 'Upload photo',
        saved: 'saved!',
        themeToggle: 'Switch theme'
    }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'hu');

    useEffect(() => {
        localStorage.setItem('lang', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key, param) => {
        const translation = translations[lang][key];
        if (typeof translation === 'function') {
            return translation(param);
        }
        return translation || key;
    };

    const toggleLanguage = () => setLang(prev => prev === 'hu' ? 'en' : 'hu');

    return (
        <LanguageContext.Provider value={{ lang, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
