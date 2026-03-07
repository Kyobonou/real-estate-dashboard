import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Building2, Briefcase, Phone, LogIn } from 'lucide-react';
import Logo from './Logo';
import './PublicNavbar.css';

const PublicNavbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isHome = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Accueil', path: '/', icon: Home },
        { name: 'Nos Biens', path: '/proprietes', icon: Building2 },
        { name: 'Services', path: '/services', icon: Briefcase },
        { name: 'Contact', path: '/contact', icon: Phone },
    ];

    const isNavSolid = isScrolled || !isHome;

    const handleClientClick = () => {
        const isVitrineMode = import.meta.env.VITE_SITE_MODE === 'vitrine';
        const dashboardUrl = import.meta.env.VITE_SITE_URL_APP || '/dashboard';
        if (isVitrineMode) {
            window.open(dashboardUrl, '_blank');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <>
            {/* Top Navbar */}
            <header className={`public-navbar ${isNavSolid ? 'scrolled' : ''}`}>
                <div className="navbar-container">
                    <div className="navbar-logo" onClick={() => navigate('/')}>
                        <Logo collapsed={false} variant="nav-mode" />
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="desktop-nav">
                        <ul className="nav-links">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <NavLink
                                        to={link.path}
                                        className={({ isActive }) => isActive ? 'active' : ''}
                                    >
                                        {link.name}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Desktop Login Button */}
                    <button className="btn-login" onClick={handleClientClick}>
                        <LogIn size={16} />
                        <span>Espace Client</span>
                    </button>
                </div>
            </header>

            {/* Mobile Bottom Navigation Bar (replaces hamburger) */}
            <nav className="bottom-nav">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                        <NavLink
                            key={link.name}
                            to={link.path}
                            className={({ isActive }) =>
                                `bottom-nav-link${isActive ? ' active' : ''}`
                            }
                            end={link.path === '/'}
                        >
                            <Icon />
                            <span>{link.name}</span>
                        </NavLink>
                    );
                })}
                <button className="bottom-nav-client" onClick={handleClientClick}>
                    <LogIn />
                    <span>Accès Pro</span>
                </button>
            </nav>
        </>
    );
};

export default PublicNavbar;
