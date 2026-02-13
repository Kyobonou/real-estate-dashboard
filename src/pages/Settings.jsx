import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Lock, Bell, Shield, Wifi, WifiOff,
    Save, LogOut, Eye, EyeOff, Check, Database,
    Server, Activity, Globe, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import apiService from '../services/api';
import './Settings.css';

const Settings = () => {
    const { user, updateUser, logout } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('profile');
    const [isOnline, setIsOnline] = useState(apiService.isOnline);
    const [saving, setSaving] = useState(false);

    // Profile form
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        company: 'Gravel Ivoire',
    });

    // Password form
    const [passwords, setPasswords] = useState({
        current: '', new: '', confirm: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false, new: false, confirm: false
    });

    // Notification settings
    const [notifications, setNotifications] = useState({
        email: true, push: true, sms: false,
        newLead: true, visitReminder: true, weeklyReport: true, priceAlert: false
    });

    // n8n connection status
    useEffect(() => {
        const unsubscribe = apiService.subscribe('connectionChange', ({ online }) => {
            setIsOnline(online);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        updateUser({ name: profile.name });
        addToast({ type: 'success', title: 'Profil mis à jour', message: 'Vos informations ont été sauvegardées' });
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            addToast({ type: 'error', title: 'Erreur', message: 'Les mots de passe ne correspondent pas' });
            return;
        }
        if (passwords.new.length < 8) {
            addToast({ type: 'error', title: 'Erreur', message: 'Le mot de passe doit contenir au moins 8 caractères' });
            return;
        }
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setPasswords({ current: '', new: '', confirm: '' });
        addToast({ type: 'success', title: 'Mot de passe modifié', message: 'Votre mot de passe a été mis à jour' });
        setSaving(false);
    };

    const handleSaveNotifications = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 600));
        addToast({ type: 'success', title: 'Préférences sauvegardées', message: 'Vos préférences de notification ont été mises à jour' });
        setSaving(false);
    };

    const handleTestConnection = async () => {
        addToast({ type: 'info', title: 'Test de connexion', message: 'Vérification de la connexion n8n...' });
        const result = await apiService.getStats();
        if (result.source === 'cache') {
            addToast({ type: 'warning', title: 'Mode hors ligne', message: 'Données locales utilisées. n8n non accessible.' });
        } else {
            addToast({ type: 'success', title: 'Connecté', message: 'Connexion n8n active et fonctionnelle !' });
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Sécurité', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'integration', label: 'Intégration n8n', icon: Server },
    ];

    return (
        <div className="settings-page">
            <motion.div
                className="settings-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h2>Paramètres</h2>
                    <p className="settings-subtitle">Gérez votre compte et vos préférences</p>
                </div>
                <div className="connection-indicator">
                    {isOnline ? (
                        <span className="status-online"><Wifi size={14} /> En ligne</span>
                    ) : (
                        <span className="status-offline"><WifiOff size={14} /> Hors ligne</span>
                    )}
                </div>
            </motion.div>

            <div className="settings-layout">
                {/* Sidebar Tabs */}
                <motion.div
                    className="settings-tabs"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </motion.button>
                    ))}
                    <div className="tab-divider"></div>
                    <motion.button
                        className="settings-tab danger"
                        onClick={logout}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <LogOut size={18} />
                        <span>Déconnexion</span>
                    </motion.button>
                </motion.div>

                {/* Content */}
                <motion.div
                    className="settings-content"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <AnimatePresence mode="wait">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                className="settings-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h3>Informations personnelles</h3>
                                <p className="panel-description">Mettez à jour vos informations de profil</p>

                                <div className="profile-avatar-section">
                                    <div className="large-avatar">{user?.avatar || user?.name?.charAt(0) || 'U'}</div>
                                    <div>
                                        <h4>{user?.name}</h4>
                                        <span className="role-badge">{user?.role === 'admin' ? 'Administrateur' : user?.role === 'agent' ? 'Agent' : 'Utilisateur'}</span>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Nom complet</label>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Téléphone</label>
                                        <input
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="+225 07 07 07 07"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Entreprise</label>
                                        <input
                                            type="text"
                                            value={profile.company}
                                            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="panel-actions">
                                    <motion.button
                                        className="btn btn-primary"
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {saving ? <div className="spinner-sm"></div> : <Save size={16} />}
                                        Sauvegarder
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                className="settings-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h3>Sécurité du compte</h3>
                                <p className="panel-description">Gérez votre mot de passe et la sécurité</p>

                                <div className="security-status">
                                    <div className="security-item good">
                                        <Shield size={20} />
                                        <div>
                                            <strong>Authentification active</strong>
                                            <small>Session sécurisée avec token JWT</small>
                                        </div>
                                        <Check size={18} className="check-icon" />
                                    </div>
                                    <div className="security-item good">
                                        <Database size={20} />
                                        <div>
                                            <strong>Données chiffrées</strong>
                                            <small>Connexion HTTPS vers n8n</small>
                                        </div>
                                        <Check size={18} className="check-icon" />
                                    </div>
                                </div>

                                <h4 className="section-title">Changer le mot de passe</h4>
                                <div className="password-form">
                                    {['current', 'new', 'confirm'].map((field) => (
                                        <div key={field} className="input-group">
                                            <label>
                                                {field === 'current' ? 'Mot de passe actuel' :
                                                    field === 'new' ? 'Nouveau mot de passe' : 'Confirmer'}
                                            </label>
                                            <div className="input-wrapper-settings">
                                                <input
                                                    type={showPasswords[field] ? 'text' : 'password'}
                                                    value={passwords[field]}
                                                    onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    className="toggle-visibility"
                                                    onClick={() => setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })}
                                                >
                                                    {showPasswords[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="panel-actions">
                                    <motion.button
                                        className="btn btn-primary"
                                        onClick={handleChangePassword}
                                        disabled={saving || !passwords.current || !passwords.new}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Lock size={16} />
                                        Modifier le mot de passe
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <motion.div
                                key="notifications"
                                className="settings-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h3>Préférences de notification</h3>
                                <p className="panel-description">Choisissez comment vous souhaitez être notifié</p>

                                <h4 className="section-title">Canaux de notification</h4>
                                <div className="toggle-list">
                                    {[
                                        { key: 'email', label: 'Email', desc: 'Recevoir des notifications par email' },
                                        { key: 'push', label: 'Push', desc: 'Notifications dans le navigateur' },
                                        { key: 'sms', label: 'SMS', desc: 'Recevoir des SMS' },
                                    ].map(({ key, label, desc }) => (
                                        <div key={key} className="toggle-item">
                                            <div>
                                                <strong>{label}</strong>
                                                <small>{desc}</small>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notifications[key]}
                                                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <h4 className="section-title">Types d'alertes</h4>
                                <div className="toggle-list">
                                    {[
                                        { key: 'newLead', label: 'Nouveau prospect', desc: 'Quand un nouveau prospect arrive' },
                                        { key: 'visitReminder', label: 'Rappel de visite', desc: '30 minutes avant chaque visite' },
                                        { key: 'weeklyReport', label: 'Rapport hebdomadaire', desc: 'Résumé chaque lundi matin' },
                                        { key: 'priceAlert', label: 'Alerte prix', desc: 'Changements significatifs de prix' },
                                    ].map(({ key, label, desc }) => (
                                        <div key={key} className="toggle-item">
                                            <div>
                                                <strong>{label}</strong>
                                                <small>{desc}</small>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notifications[key]}
                                                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="panel-actions">
                                    <motion.button
                                        className="btn btn-primary"
                                        onClick={handleSaveNotifications}
                                        disabled={saving}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Save size={16} />
                                        Sauvegarder
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* Integration Tab */}
                        {activeTab === 'integration' && (
                            <motion.div
                                key="integration"
                                className="settings-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <h3>Intégration n8n</h3>
                                <p className="panel-description">Configuration de la connexion à votre instance n8n</p>

                                <div className="integration-status-card">
                                    <div className="integration-header">
                                        <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
                                        <div>
                                            <strong>Instance n8n</strong>
                                            <span className="integration-url">yobed-n8n-supabase-claude.hf.space</span>
                                        </div>
                                        <span className={`status-label ${isOnline ? 'online' : 'offline'}`}>
                                            {isOnline ? 'Connecté' : 'Déconnecté'}
                                        </span>
                                    </div>
                                </div>

                                <div className="integration-info">
                                    <div className="info-card">
                                        <Globe size={20} />
                                        <div>
                                            <strong>URL de l'API</strong>
                                            <code>https://yobed-n8n-supabase-claude.hf.space</code>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <Activity size={20} />
                                        <div>
                                            <strong>Webhook</strong>
                                            <code>/webhook/dashboard-api</code>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <Database size={20} />
                                        <div>
                                            <strong>Workflow</strong>
                                            <code>Dashboard API - Real Estate</code>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <Server size={20} />
                                        <div>
                                            <strong>Mode</strong>
                                            <code>Polling (30s) + Cache</code>
                                        </div>
                                    </div>
                                </div>

                                <div className="panel-actions">
                                    <motion.button
                                        className="btn btn-primary"
                                        onClick={handleTestConnection}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <RefreshCw size={16} />
                                        Tester la connexion
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default Settings;
