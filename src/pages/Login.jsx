import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import './Login.css';

const Login = () => {
    const { login, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Veuillez remplir tous les champs');
            return;
        }

        setLoading(true);
        try {
            const result = await login(email, password);
            if (!result.success) {
                setError(result.error || 'Identifiants incorrects');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        setError('');
        try {
            let result;
            if (provider === 'google') {
                result = await loginWithGoogle();
            }

            if (result && !result.success) {
                if (result.error.includes('popup-closed-by-user')) {
                    // Ignore popup closure
                } else if (result.error.includes('cancelled-popup-request')) {
                    // Ignore multiple clicks
                } else {
                    setError('Erreur d\'authentification: ' + result.error);
                }
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async (role) => {
        setLoading(true);
        setError('');
        const demos = {
            admin: { email: 'admin@immodash.ci', password: 'Admin2026!' },
            agent: { email: 'agent@immodash.ci', password: 'Agent2026!' },
            demo: { email: 'demo@immodash.ci', password: 'Demo2026!' },
        };
        const { email: dEmail, password: dPass } = demos[role];
        setEmail(dEmail);
        setPassword(dPass);

        const result = await login(dEmail, dPass);
        if (!result.success) setError(result.error);
        setLoading(false);
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="grid-overlay"></div>
            </div>

            <motion.div
                className="login-container"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                {/* Left Panel - Branding */}
                <motion.div
                    className="login-branding"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <div className="brand-content">
                        <motion.div
                            className="login-logo-wrapper"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Logo />
                        </motion.div>
                        <h1 className="brand-title" style={{ display: 'none' }}>ImmoDash</h1>
                        <p className="brand-subtitle">Plateforme de gestion immobilière intelligente</p>

                        <div className="brand-features">
                            <motion.div
                                className="brand-feature"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <div className="feature-icon">📊</div>
                                <div>
                                    <h4>Tableau de bord en temps réel</h4>
                                    <p>Suivez vos KPIs instantanément</p>
                                </div>
                            </motion.div>
                            <motion.div
                                className="brand-feature"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="feature-icon">🤖</div>
                                <div>
                                    <h4>Synchronisation n8n</h4>
                                    <p>Connecté à votre workflow</p>
                                </div>
                            </motion.div>
                            <motion.div
                                className="brand-feature"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div className="feature-icon">🔐</div>
                                <div>
                                    <h4>Sécurisé & fiable</h4>
                                    <p>Protection des données avancée</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Panel - Form */}
                <motion.div
                    className="login-form-panel"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    <div className="form-header">
                        <h2>Connexion</h2>
                        <p>Accédez à votre espace de gestion</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    className="error-message"
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                >
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="input-group">
                            <label htmlFor="login-email">Email</label>
                            <div className="input-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="votre@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            {email.toLowerCase().includes('@gmail.com') && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="gmail-hint"
                                >
                                    👋 Vous pouvez aussi utiliser vos identifiants ImmoDash.
                                </motion.div>
                            )}
                        </div>


                        <div className="input-group">
                            <label htmlFor="login-password">Mot de passe</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Se souvenir de moi
                            </label>
                            <a href="#" className="forgot-link">Mot de passe oublié ?</a>
                        </div>

                        <motion.button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <Shield size={18} />
                                    <span>Se connecter</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="social-section">
                        <div className="divider">
                            <span>Ou continuer avec</span>
                        </div>
                        <div className="social-buttons">
                            <motion.button
                                className="social-btn google"
                                onClick={() => handleSocialLogin('google')}
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Google</span>
                            </motion.button>
                        </div>
                    </div>

                    <div className="demo-section">
                        <div className="divider">
                            <span>Accès rapide</span>
                        </div>
                        <div className="demo-buttons">
                            <motion.button
                                className="demo-btn admin"
                                onClick={() => handleDemoLogin('admin')}
                                disabled={loading}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <span className="demo-avatar">👑</span>
                                <div>
                                    <strong>Admin</strong>
                                    <small>Accès complet</small>
                                </div>
                            </motion.button>
                            <motion.button
                                className="demo-btn agent"
                                onClick={() => handleDemoLogin('agent')}
                                disabled={loading}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <span className="demo-avatar">🏠</span>
                                <div>
                                    <strong>Agent</strong>
                                    <small>Terrain</small>
                                </div>
                            </motion.button>
                            <motion.button
                                className="demo-btn demo"
                                onClick={() => handleDemoLogin('demo')}
                                disabled={loading}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <span className="demo-avatar">👤</span>
                                <div>
                                    <strong>Demo</strong>
                                    <small>Lecture seule</small>
                                </div>
                            </motion.button>
                        </div>
                    </div>

                    <p className="login-footer">
                        Connecté à <span className="n8n-badge">n8n Production</span>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Login;
