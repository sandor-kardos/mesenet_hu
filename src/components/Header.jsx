import { useTheme } from '../context/ThemeContext';
import { NavLink } from 'react-router-dom';

export default function Header() {
    const { cycleTheme, themeIcon } = useTheme();

    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="icon-btn" onClick={cycleTheme} aria-label="Témaváltás" id="theme-toggle">
                    {themeIcon}
                </button>
                <NavLink to="/" className="header-logo">
                    mese<span>net.hu</span>
                </NavLink>
            </div>
            <div className="header-actions">
                <NavLink to="/profile" className="icon-btn" aria-label="Profil" id="profile-btn">
                    👤
                </NavLink>
            </div>
        </header>
    );
}
