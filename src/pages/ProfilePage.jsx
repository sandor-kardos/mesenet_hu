import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';
import { useLanguage } from '../context/LanguageContext';


export default function ProfilePage() {
  const { theme, cycleTheme, themeIcon } = useTheme();
  const { userDrawings, deleteDrawing } = useReading();
  const { stories } = useStories();
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState(null); // 'aszf' | 'privacy' | null


  return (
    <div className="page-content fade-in">
      <div className="profile-header">
        <div className="avatar">👤</div>
        <h1>{t('profile')}</h1>
        <p className="subtitle">{t('readerSubtitle')}</p>
      </div>

      <div className="settings-section">
        <h2>{t('settings')}</h2>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>{t('theme')}</h3>
            <p>{t('themeDesc')}</p>
          </div>
          <button 
            className="icon-btn" 
            onClick={cycleTheme}
            aria-label={t('themeToggle')}
            style={{ width: '48px', height: '48px', fontSize: '1.5rem' }}
          >
            {themeIcon}
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t('notifications')}</h3>
            <p>{t('notificationsDesc')}</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="premium-section">
        <div className="premium-card">
          <h2>{t('premiumTitle')}</h2>
          <p>{t('premiumDesc')}</p>
          <button className="btn btn-primary">{t('premiumCTA')}</button>
        </div>
      </div>

      {/* Saját Galéria Section */}
      <div className="gallery-section" style={{ padding: '0 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{t('galleryTitle')}</h2>
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>{t('creationsCount', userDrawings.length)}</span>
        </div>
        
        {userDrawings.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '16px', 
            textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🖼️</div>
            <p className="theme-aware-muted" style={{ margin: 0, fontWeight: 500 }}>{t('noDrawings')}</p>
            <p className="theme-aware-muted" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '5px' }}>{t('drawFirst')}</p>


          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '12px' 
          }}>
            {userDrawings.map((drawing) => {
              const story = stories.find(s => s.id === drawing.storyId);
              return (
                <div key={drawing.id} className="gallery-item" style={{ 
                  position: 'relative',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  aspectRatio: '1/1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  <img 
                    src={drawing.dataUrl} 
                    alt={`Rajz: ${story?.title || 'Ismeretlen mese'}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    padding: '8px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    fontSize: '0.7rem',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {story?.title || 'Mese rajz'}
                  </div>
                  <button 
                    onClick={() => { if(confirm(t('deleteConfirm'))) deleteDrawing(drawing.id); }}
                    style={{
                      position: 'absolute',
                      top: '5px', right: '5px',
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
</div>
              );
            })}
          </div>
        )}
      </div>


      <div className="support-section" style={{ padding: '0 20px 24px', textAlign: 'center' }}>
        <a 
          href="https://ko-fi.com/sandorko" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '12px 24px', background: '#FF5E5B', color: 'white', borderRadius: '12px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 12px rgba(255, 94, 91, 0.3)' }}
        >
          {t('coffee')}
        </a>
      </div>

      <div className="footer-links">
        <button onClick={() => setActiveModal('aszf')} className="text-btn">{t('aszf')}</button>
        <button onClick={() => setActiveModal('privacy')} className="text-btn">{t('privacy')}</button>
        <a href="mailto:hello@mesenet.hu">{t('contact')}</a>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            
            {activeModal === 'aszf' && (
              <>
                <h2>Általános Szerződési Feltételek</h2>
                <div className="legal-text">
                  <p><strong>1. Bevezetés</strong><br />A Mesenet.hu ("Szolgáltató") által üzemeltetett weboldal és mobilalkalmazás ("Szolgáltatás") használatával Ön ("Felhasználó") elfogadja a jelen Általános Szerződési Feltételeket.</p>
                  <p><strong>2. Szolgáltatás célja</strong><br />A Mesenet egy digitális meseolvasó platform, amely szöveges formában biztosít hozzáférést rövid, gyermekeknek szóló történetekhez személyes, nem kereskedelmi célú felhasználásra.</p>
                  <p><strong>3. Regisztráció és Előfizetés</strong><br />Az alapfunkciók ingyenesek. A "Premium" funkciók (pl. AI felolvasás) jövőbeni bevezetése esetén külön előfizetési díj kerülhet megállapításra, melyről a Felhasználó előzetes tájékoztatást kap.</p>
                  <p><strong>4. Szerzői jogok</strong><br />A megjelenített történetek, mesék szerzői jogi védelem alatt állnak. Tilos azok sokszorosítása, árusítása vagy nyilvános megosztása a Szolgáltató írásos engedélye nélkül.</p>
                  <p><strong>5. Felelősségkizárás</strong><br />A Szolgáltató mindent megtesz az oldal zavartalan működéséért, de nem garantálja a 100%-os rendelkezésre állást. A szolgáltató nem vállal felelősséget a mesék tartalmának egyéni értelmezéséből fakadó esetleges pszichológiai hatásokért.</p>
                </div>
              </>
            )}

            {activeModal === 'privacy' && (
              <>
                <h2>Adatvédelmi Tájékoztató</h2>
                <div className="legal-text">
                  <p><strong>1. Adatkezelő megnevezése</strong><br />Mesenet.hu üzemeltetője (Kapcsolat: hello@mesenet.hu)</p>
                  <p><strong>2. Kezelt adatok köre</strong><br />A Szolgáltatás "invisible profiling" módszert használ. Ez azt jelenti, hogy nem kérünk be személyes azonosító adatokat (név, cím, telefonszám).</p>
                  <p><strong>3. Helyi adattárolás (Local Storage)</strong><br />Az Ön olvasási statisztikáit (melyik mesét hány percig olvasta, kedvencek listája, választott életkor) kizárólag az Ön saját eszközén (böngészőjében) tároljuk el a "Local Storage" technológia segítségével.</p>
                  <p><strong>4. Analitika és Sütik (Cookies)</strong><br />Az alkalmazás fejlesztése és hibakeresése érdekében anonimizált analitikai adatokat gyűjthetünk. Ezek az adatok nem alkalmasak az Ön személyes azonosítására.</p>
                  <p><strong>5. Jogorvoslat</strong><br />Mivel személyes adatot (PII) nem tárolunk a szervereinken, adattörlési kérelmét az alkalmazás beállításaiban, a helyi adatok (Cache/Local Storage) böngészőből történő törlésével tudja önállóan végrehajtani.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
