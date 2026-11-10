import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ReadingProvider } from './context/ReadingContext';
import { StoryProvider } from './context/StoryContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Header from './components/Header';
import TabBar from './components/TabBar';
import ConsentBanner from './components/ConsentBanner';
import { initConsent } from './utils/consent';
import HomePage from './pages/HomePage';

const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const LogPage = lazy(() => import('./pages/LogPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function AppContent() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/read/') || location.pathname.startsWith('/mese/');
  const { lang } = useLanguage();

  // Analytics (Microsoft Clarity) is loaded only if the visitor already said yes on an earlier visit.
  useEffect(() => { initConsent(); }, []);

  return (
    <div className={isReader ? '' : 'app-shell'} key={lang}>
      {!isReader && <Header />}
      <main id="main-content">
        <Suspense fallback={<div style={{ padding: '60px 20px', textAlign: 'center' }}>⏳</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route path="/mese/:slug" element={<ReaderPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </main>
      <TabBar />
      <ConsentBanner />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StoryProvider>
          <ReadingProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ReadingProvider>
        </StoryProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
