import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
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
                            className="brand-logo"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                        >
                            <Building2 size={40} />
                        </motion.div>
                        <h1 className="brand-title">ImmoDash</h1>
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
