import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ProfilePage() {
  const { theme, cycleTheme, themeIcon } = useTheme();
  const [activeModal, setActiveModal] = useState(null); // 'aszf' | 'privacy' | null

  return (
    <div className="page-content fade-in">
      <div className="profile-header">
        <div className="avatar">👤</div>
        <h1>Profil</h1>
        <p className="subtitle">Meseolvasó</p>
      </div>

      <div className="settings-section">
        <h2>Beállítások</h2>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>Téma</h3>
            <p>Válassz a három színvilág közül</p>
          </div>
          <button 
            className="icon-btn" 
            onClick={cycleTheme}
            aria-label="Téma váltása"
            style={{ width: '48px', height: '48px', fontSize: '1.5rem' }}
          >
            {themeIcon}
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Értesítések</h3>
            <p>Emlékeztető az esti meséléshez</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="premium-section">
        <div className="premium-card">
          <h2>🌟 Mesenet Premium</h2>
          <p>Korlátlan hozzáférés több ezer meséhez, saját hangon felolvasó AI mód, és offline működés.</p>
          <button className="btn btn-primary">Próbáld ki ingyen</button>
        </div>
      </div>

      <div className="support-section" style={{ padding: '0 20px 24px', textAlign: 'center' }}>
        <a 
          href="https://ko-fi.com/sandorko" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '12px 24px', background: '#FF5E5B', color: 'white', borderRadius: '12px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 12px rgba(255, 94, 91, 0.3)' }}
        >
          ☕ Hívj meg egy kávéra a Ko-fi-n!
        </a>
      </div>

      <div className="footer-links">
        <button onClick={() => setActiveModal('aszf')} className="text-btn">ÁSZF</button>
        <button onClick={() => setActiveModal('privacy')} className="text-btn">Adatvédelem</button>
        <a href="mailto:hello@mesenet.hu">Kapcsolat</a>
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
