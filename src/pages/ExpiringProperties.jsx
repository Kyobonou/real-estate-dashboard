import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin, Phone, Eye, AlertCircle, Calendar, RefreshCw, Clock
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import './Properties.css';

const ExpiringProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // Calculer les jours depuis publication
    const getDaysOld = (dateStr) => {
        if (!dateStr) return 999;
        try {
            const parseDate = (d) => {
                if (!d || typeof d !== 'string') return new Date();
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
            };
            const publishDate = parseDate(dateStr);
            const now = new Date();
            const diffMs = now - publishDate;
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } catch {
            return 999;
        }
    };

    const expiringProperties = useMemo(() => {
        return properties
            .map(p => ({
                ...p,
                daysOld: getDaysOld(p.datePublication),
            }))
            .filter(p => p.daysOld >= 25) // À expirer dans les 5 prochains jours (25-30j)
            .sort((a, b) => b.daysOld - a.daysOld);
    }, [properties]);

    const getExpirationBadgeClass = (daysOld) => {
        if (daysOld >= 30) return 'expired'; // Expiré
        if (daysOld >= 28) return 'critical'; // À expirer très bientôt (J-2)
        if (daysOld >= 25) return 'warning'; // À expirer bientôt (J-5)
        return 'active';
    };

    const getExpirationText = (daysOld) => {
        if (daysOld >= 30) return 'EXPIRÉ';
        const remaining = 30 - daysOld;
        if (remaining <= 0) return 'EXPIRÉ';
        if (remaining === 1) return 'EXPIRE DEMAIN';
        return `J-${remaining}`;
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
                            className={`expiring-property-card ${getExpirationBadgeClass(property.daysOld)}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="expiration-header">
                                <div className={`expiration-badge ${getExpirationBadgeClass(property.daysOld)}`}>
                                    {getExpirationText(property.daysOld)}
                                </div>
                                <span className="days-old">
                                    Publié il y a {property.daysOld} jours
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
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setSelectedProperty(property);
                                            setModalOpen(true);
                                        }}
                                        title="Voir les détails"
                                    >
                                        <Eye size={16} /> Détails
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        title="Contacter l'agent"
                                        onClick={() => {
                                            if (property.telephoneExpediteur) {
                                                let phone = property.telephoneExpediteur.replace(/\D/g, '');
                                                if (!phone.startsWith('225')) phone = '225' + phone;
                                                const msg = encodeURIComponent(`Annonce REF-${property.refBien}: ${property.typeBien} à ${property.zone} - À renouveler`);
                                                window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                                            }
                                        }}
                                    >
                                        <Phone size={16} /> Contacter
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExpiringProperties;
