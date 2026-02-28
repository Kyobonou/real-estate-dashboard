import React from 'react';
import './Logo.css';
import bogbesLogo from '../assets/bogbes-logo.jpg';

const Logo = ({ collapsed = false }) => {
    return (
        <div className={`app-logo ${collapsed ? 'collapsed' : ''}`}>
            <div className="logo-icon-wrapper">
                <img
                    src={bogbesLogo}
                    alt="Bogbe's Groupe Multi Services"
                    className="logo-img"
                />
            </div>
        </div>
    );
};

export default Logo;
