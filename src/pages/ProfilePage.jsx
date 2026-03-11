import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ProfilePage() {
  const { theme, cycleTheme, themeIcon } = useTheme();

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

      <div className="footer-links">
        <a href="#">ÁSZF</a>
        <a href="#">Adatvédelem</a>
        <a href="#">Kapcsolat</a>
      </div>
    </div>
  );
}
