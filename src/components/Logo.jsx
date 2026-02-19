import React from 'react';
import './Logo.css';

const Logo = ({ collapsed = false }) => {
    return (
        <div className={`app-logo ${collapsed ? 'collapsed' : ''}`}>
            <div className="logo-icon-wrapper">
                <svg viewBox="0 0 100 120" className="logo-svg">
                    {/* Upper part of B */}
                    <path
                        d="M35,10 H65 C80,10 90,20 90,35 C90,50 80,60 65,60 H35 V10 Z"
                        fill="#1B4299"
                    />
                    {/* Lower part of B */}
                    <path
                        d="M35,65 H65 C80,65 90,75 90,90 C90,105 80,115 65,115 H35 V65 Z"
                        fill="#F29202"
                    />
                    {/* Background Stem (Blue) */}
                    <rect x="35" y="10" width="15" height="105" fill="#1B4299" />

                    {/* Swoosh elements (The tails on the left) */}
                    <path d="M25,50 Q30,55 45,58 L45,52 Q30,48 25,50 Z" fill="#1B4299" />
                    <path d="M25,60 Q30,58 45,62 L45,68 Q30,65 25,60 Z" fill="#F29202" />

                    {/* White separation line */}
                    <path d="M35,60 Q60,55 90,65 L90,60 Q60,50 35,55 Z" fill="white" />
                </svg>
            </div>
            {!collapsed && (
                <div className="logo-text">
                    <div className="brand-primary-name">BOGBE'S</div>
                    <div className="brand-secondary-name">GROUPE</div>
                    <div className="tagline-container">
                        <div className="multi-box">Multi</div>
                        <div className="services-box">services</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logo;
