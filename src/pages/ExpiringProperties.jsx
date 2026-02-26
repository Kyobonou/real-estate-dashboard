import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin, Phone, Eye, AlertCircle, Calendar, RefreshCw, Clock, RotateCcw, Archive
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import './Properties.css';

const ExpiringProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const { addToast } = useToast();
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async (force = false) => {
        try {
            const response = await apiService.getImagesProperties(force);
            if (response.success) {
                setProperties(response.data);
                if (force) {
                    addToast({ type: 'success', title: 'Actualisé', message: 'La liste a été mise à jour' });
                }
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les propriétés' });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        loadProperties(true);
    };

    // Calculer les jours restants jusqu'à expiration
    const getDaysUntilExpiration = (expirationDate) => {
        if (!expirationDate) return 999;
        try {
            const parseDate = (d) => {
                if (!d) return null;
                if (typeof d === 'string') {
                    if (d.includes('/')) {
                        const cleanStr = d.replace(/le\s+/gi, '').trim();
                        const [datePart, timePart] = cleanStr.split(' ');
                        const [day, month, year] = datePart.split('/');
                        if (timePart) {
                            const [hour, minute] = timePart.split(':');
                            return new Date(year, month - 1, day, hour, minute || 0);
                        }
                        return new Date(year, month - 1, day);
                    }
                    return new Date(d);
                }
                return d instanceof Date ? d : new Date(d);
            };
            const expDate = parseDate(expirationDate);
            if (!expDate) return 999;
            const now = new Date();
            const diffMs = expDate - now;
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } catch {
            return 999;
        }
    };

    const handleRenew = async (property) => {
        setActionLoading(prev => ({ ...prev, [property.id]: true }));
        try {
            // TODO: Appel API pour renouveler (ajouter 30 jours à date_expiration, status='renewed')
            // Pour maintenant, on simule avec un toast
            addToast({
                type: 'success',
                title: 'Renouvelé',
                message: `Bien ${property.refBien} renouvelé pour 30 jours`
            });
            // Reload après action
            setTimeout(() => loadProperties(true), 500);
        } catch (error) {
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de renouveler' });
        } finally {
            setActionLoading(prev => ({ ...prev, [property.id]: false }));
        }
    };

    const handleArchive = async (property) => {
        setActionLoading(prev => ({ ...prev, [property.id + '-archive']: true }));
        try {
            // TODO: Appel API pour archiver (status='archived')
            addToast({
                type: 'info',
                title: 'Archivé',
                message: `Bien ${property.refBien} archivé`
            });
            setTimeout(() => loadProperties(true), 500);
        } catch (error) {
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible d\'archiver' });
        } finally {
            setActionLoading(prev => ({ ...prev, [property.id + '-archive']: false }));
        }
    };

    const expiringProperties = useMemo(() => {
        return properties
            .filter(p => p.renewalStatus === 'active') // Ne montrer que les actifs
            .map(p => ({
                ...p,
                daysUntilExpiration: getDaysUntilExpiration(p.dateExpiration),
            }))
            .filter(p => p.daysUntilExpiration <= 7) // À expirer dans 7 jours max
            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    }, [properties]);

    const getExpirationBadgeClass = (daysUntilExpiration) => {
        if (daysUntilExpiration <= 0) return 'expired'; // Expiré
        if (daysUntilExpiration <= 2) return 'critical'; // À expirer très bientôt (J-2)
        if (daysUntilExpiration <= 5) return 'warning'; // À expirer bientôt (J-5)
        return 'active';
    };

    const getExpirationText = (daysUntilExpiration) => {
        if (daysUntilExpiration <= 0) return 'EXPIRÉ';
        if (daysUntilExpiration === 1) return 'EXPIRE DEMAIN';
        return `J-${daysUntilExpiration}`;
    };

    if (loading) {
        return (
            <div className="gallery-loading">
                <div className="spinner"></div>
                <p>Chargement des propriétés...</p>
            </div>
        );
    }

    return (
        <div className="properties-v2">
            <div className="properties-header">
                <div className="header-left">
                    <h2>
                        <AlertCircle size={28} style={{ marginRight: '0.75rem', color: 'var(--warning, #f59e0b)' }} />
                        Annonces à Renouveler
                    </h2>
                    <span className="properties-count">
                        {expiringProperties.length} bien(s) à renouveler
                    </span>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Actualiser les données"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        <span className="hide-mobile">Actualiser</span>
                    </button>
                </div>
            </div>

            {expiringProperties.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    margin: '2rem 0'
                }}>
                    <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        Aucune annonce à renouveler pour le moment.
                    </p>
                </div>
            ) : (
                <div className="expiring-properties-list">
                    {expiringProperties.map((property, index) => (
                        <motion.div
                            key={property.id}
                            className={`expiring-property-card ${getExpirationBadgeClass(property.daysUntilExpiration)}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="expiration-header">
                                <div className={`expiration-badge ${getExpirationBadgeClass(property.daysUntilExpiration)}`}>
                                    {getExpirationText(property.daysUntilExpiration)}
                                </div>
                                <span className="days-old">
                                    Expire dans {property.daysUntilExpiration} jour(s)
                                </span>
                            </div>

                            <div className="expiring-property-main">
                                <div className="expiring-property-info">
                                    <div className="expiring-property-header">
                                        <h3>{property.typeBien}</h3>
                                        <span className="price">{property.prixFormate}</span>
                                    </div>

                                    <div className="location-info">
                                        <MapPin size={16} />
                                        <span>
                                            {property.zone}
                                            {property.commune ? ` - ${property.commune}` : ''}
                                        </span>
                                    </div>

                                    <p className="description">
                                        {property.caracteristiques ? property.caracteristiques.substring(0, 100) + '...' : 'Pas de description'}
                                    </p>

                                    <div className="expiring-property-meta">
                                        {property.chambres > 0 && (
                                            <span className="meta-tag">
                                                {property.chambres} chambres
                                            </span>
                                        )}
                                        {property.meuble && (
                                            <span className="meta-tag meuble">Meublé</span>
                                        )}
                                        {property.groupeWhatsAppOrigine && (
                                            <span className="meta-tag groupe" title="Groupe d'origine">
                                                📱 {property.groupeWhatsAppOrigine}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="expiring-property-actions">
                                    <button
                                        className="btn btn-success btn-sm"
                                        title="Renouveler pour 30 jours"
                                        onClick={() => handleRenew(property)}
                                        disabled={actionLoading[property.id]}
                                    >
                                        <RotateCcw size={16} /> Renouveler
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        title="Archiver cette annonce"
                                        onClick={() => handleArchive(property)}
                                        disabled={actionLoading[property.id + '-archive']}
                                    >
                                        <Archive size={16} /> Archiver
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Feedback Section */}
            <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    📊 Retours Récents
                </h3>
                <div style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                }}>
                    <p>Les retours de satisfaction seront affichés ici une fois les relances envoyées.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        ℹ️ Section en développement pour Phase 3
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExpiringProperties;
