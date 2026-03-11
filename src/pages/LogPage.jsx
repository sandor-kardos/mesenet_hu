import React, { useState } from 'react';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';
import StoryList from '../components/StoryList';

export default function LogPage() {
  const { readLog, favorites } = useReading();
  const { stories, isLoading, error } = useStories();
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'favorites'

  const readStories = stories.filter(s => readLog.includes(s.id));
  const favoriteStories = stories.filter(s => favorites.includes(s.id));

  if (isLoading) return <div className="page-content fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>⏳ Napló betöltése...</div>;
  if (error) return <div className="page-content fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>⚠️ {error}</div>;

  return (
    <div className="page-content fade-in">
      <div className="log-header">
        <h1>Olvasási napló</h1>
        <p className="subtitle">
          Eddig {readLog.length} mesét olvastál el!
        </p>
      </div>

      <div className="log-tabs">
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📖 Előzmények
        </button>
        <button 
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          ❤️ Kedvencek ({favorites.length})
        </button>
      </div>

      <div className="log-content">
        {activeTab === 'history' && (
          readStories.length > 0 ? (
            <StoryList stories={readStories.reverse()} />
          ) : (
            <div className="empty-state">
              <span className="empty-emoji">📚</span>
              <p>Még nem olvastál el egy mesét sem végig.</p>
            </div>
          )
        )}

        {activeTab === 'favorites' && (
          favoriteStories.length > 0 ? (
             <StoryList stories={favoriteStories} />
          ) : (
            <div className="empty-state">
              <span className="empty-emoji">🤍</span>
              <p>Még nincsenek kedvenc meséid. Nyomj a szív ikonra az olvasóban!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
