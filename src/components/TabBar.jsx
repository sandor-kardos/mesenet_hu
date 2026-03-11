import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
    { to: '/', icon: '🏠', label: 'Főoldal' },
    { to: '/discover', icon: '🔍', label: 'Felfedezés' },
    { to: '/log', icon: '📖', label: 'Napló' },
    { to: '/profile', icon: '👤', label: 'Profil' },
];

export default function TabBar() {
    const location = useLocation();

    // Hide tab bar on reader pages
    if (location.pathname.startsWith('/read/')) return null;

    return (
        <nav className="tab-bar" id="tab-bar">
            {tabs.map((tab) => {
                const isActive = tab.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(tab.to);

                return (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={`tab-item ${isActive ? 'active' : ''}`}
                        id={`tab-${tab.label.toLowerCase()}`}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
