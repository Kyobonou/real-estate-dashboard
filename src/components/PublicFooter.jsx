import React from 'react';
import { NavLink } from 'react-router-dom';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';
import Logo from './Logo';
import './PublicFooter.css';

const PublicFooter = () => {
    return (
        <footer className="public-footer">
            <div className="footer-container">

                <div className="footer-section brand-section">
                    <Logo collapsed={false} variant="nav-mode" />
                    <p className="brand-description">
                        Votre partenaire de confiance pour trouver, vendre ou louer des biens immobiliers exclusifs. Une expertise locale pour un service sur-mesure.
                    </p>
                    <div className="social-links">
                        <a href="#" aria-label="Facebook"><Facebook size={20} /></a>
                        <a href="#" aria-label="Instagram"><Instagram size={20} /></a>
                        <a href="#" aria-label="Twitter"><Twitter size={20} /></a>
                    </div>
                </div>

                <div className="footer-section links-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><NavLink to="/">Accueil</NavLink></li>
                        <li><NavLink to="/proprietes">Nos Biens</NavLink></li>
                        <li><NavLink to="/services">Services</NavLink></li>
                        <li><NavLink to="/contact">Contact</NavLink></li>
                    </ul>
                </div>

                <div className="footer-section legal-section">
                    <h3>Légal</h3>
                    <ul>
                        <li><NavLink to="/mentions-legales">Mentions Légales</NavLink></li>
                        <li><NavLink to="/confidentialite">Politique de Confidentialité</NavLink></li>
                        <li><NavLink to="/cgu">Conditions Générales</NavLink></li>
                    </ul>
                </div>

                <div className="footer-section contact-section">
                    <h3>Contactez-nous</h3>
                    <ul className="contact-info">
                        <li>
                            <MapPin size={18} />
                            <span>Abidjan, Côte d'Ivoire</span>
                        </li>
                        <li>
                            <Phone size={18} />
                            <span>+225 00 00 00 00 00</span>
                        </li>
                        <li>
                            <Mail size={18} />
                            <span>contact@agence-immobiliere.com</span>
                        </li>
                    </ul>
                </div>

            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Agence Immobilière. Tous droits réservés.</p>
                <p className="powered-by">Propulsé par le Dashboard Immobilier</p>
            </div>
        </footer>
    );
};

export default PublicFooter;
