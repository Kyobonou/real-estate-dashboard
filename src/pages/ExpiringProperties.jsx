import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin, Phone, AlertCircle, Calendar, RefreshCw, RotateCcw, Archive, CheckCircle, MessageSquare
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { whatsappLink, extractBestPhone } from '../utils/phoneUtils';
import './Properties.css';

const ExpiringProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const { addToast } = useToast();
    const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'warning'

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async (force = false) => {
        setLoading(true);
        try {
            // Utilise la méthode dédiée qui filtre directement depuis Supabase
            const response = await apiService.getExpiringProperties(30);
            if (response.success) {
                setProperties(response.data);
                if (force) {
                    addToast({ type: 'success', title: 'Actualisé', message: 'Liste mise à jour' });
                }
            } else {
                addToast({ type: 'error', title: 'Erreur', message: response.error || 'Chargement impossible' });
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Connexion impossible' });
        } finally {
            setLoading(false);
        }
    };

    // Calculer les jours restants
    const getDaysUntilExpiration = (expirationDate) => {
        if (!expirationDate) return 999;
        try {
            const expDate = new Date(expirationDate);
            if (isNaN(expDate.getTime())) return 999;
            const diffMs = expDate - Date.now();
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } catch {
            return 999;
        }
    };

    const handleRenew = async (property) => {
        const key = property.id;
        setActionLoading(prev => ({ ...prev, [key]: true }));
        try {
            const response = await apiService.renewProperty(property.id, 30);
            if (response.success) {
                addToast({
                    type: 'success',
                    title: 'Renouvelé',
                    message: `Bien ${property.refBien} renouvelé pour 30 jours`
                });
                // Mettre à jour localement sans recharger tout
                setProperties(prev => prev.map(p =>
                    p.id === property.id
                        ? { ...p, dateExpiration: response.newExpiration, renewalStatus: 'active' }
                        : p
                ));
            } else {
                addToast({ type: 'error', title: 'Erreur', message: response.error || 'Renouvellement impossible' });
            }
        } catch (error) {
            addToast({ type: 'error', title: 'Erreur', message: 'Connexion impossible' });
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleArchive = async (property) => {
        const key = property.id + '-archive';
        setActionLoading(prev => ({ ...prev, [key]: true }));
        try {
            const response = await apiService.archiveProperty(property.id);
            if (response.success) {
                addToast({
                    type: 'info',
                    title: 'Archivé',
                    message: `Bien ${property.refBien} archivé`
                });
                // Retirer de la liste localement
                setProperties(prev => prev.filter(p => p.id !== property.id));
            } else {
                addToast({ type: 'error', title: 'Erreur', message: response.error || 'Archivage impossible' });
            }
        } catch (error) {
            addToast({ type: 'error', title: 'Erreur', message: 'Connexion impossible' });
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const enrichedProperties = useMemo(() => {
        return properties.map(p => ({
            ...p,
            daysUntilExpiration: getDaysUntilExpiration(p.dateExpiration),
        })).sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    }, [properties]);

    const filtered = useMemo(() => {
        if (filter === 'critical') return enrichedProperties.filter(p => p.daysUntilExpiration <= 2);
        if (filter === 'warning') return enrichedProperties.filter(p => p.daysUntilExpiration > 2 && p.daysUntilExpiration <= 7);
        return enrichedProperties;
    }, [enrichedProperties, filter]);

    const counts = useMemo(() => ({
        total: enrichedProperties.length,
        expired: enrichedProperties.filter(p => p.daysUntilExpiration <= 0).length,
        critical: enrichedProperties.filter(p => p.daysUntilExpiration > 0 && p.daysUntilExpiration <= 2).length,
        warning: enrichedProperties.filter(p => p.daysUntilExpiration > 2 && p.daysUntilExpiration <= 7).length,
        normal: enrichedProperties.filter(p => p.daysUntilExpiration > 7).length,
    }), [enrichedProperties]);

    const getStatusClass = (days) => {
        if (days <= 0) return 'expired';
        if (days <= 2) return 'critical';
        if (days <= 7) return 'warning';
        return 'active';
    };

    const getStatusText = (days) => {
        if (days <= 0) return 'EXPIRÉ';
        if (days === 1) return 'EXPIRE DEMAIN';
        if (days <= 0) return 'EXPIRÉ';
        return `J-${days}`;
    };

    if (loading) {
        return (
            <div className="properties-v2">
                <div className="properties-header">
                    <div className="header-left">
                        <h2><AlertCircle size={28} style={{ marginRight: '0.75rem' }} />Annonces à Renouveler</h2>
                        <Skeleton width="80px" height="22px" style={{ borderRadius: '999px' }} />
                    </div>
                    <Skeleton width="120px" height="38px" style={{ borderRadius: '8px' }} />
                </div>
                {/* Filter pills skeleton */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[100, 160, 140].map((w, i) => (
                        <Skeleton key={i} width={`${w}px`} height="32px" style={{ borderRadius: '999px' }} />
                    ))}
                </div>
                {/* Card skeletons */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Skeleton width="56px" height="22px" style={{ borderRadius: '4px' }} />
                                <Skeleton width="140px" height="16px" />
                                <Skeleton width="80px" height="16px" style={{ marginLeft: 'auto' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <Skeleton width="55%" height="22px" />
                                    <Skeleton width="40%" height="16px" />
                                    <Skeleton width="70%" height="14px" />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <Skeleton width="60px" height="22px" style={{ borderRadius: '999px' }} />
                                        <Skeleton width="80px" height="22px" style={{ borderRadius: '999px' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '110px' }}>
                                    <Skeleton width="110px" height="34px" style={{ borderRadius: '8px' }} />
                                    <Skeleton width="110px" height="34px" style={{ borderRadius: '8px' }} />
                                    <Skeleton width="110px" height="34px" style={{ borderRadius: '8px' }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="properties-v2">
            {/* Header */}
            <div className="properties-header">
                <div className="header-left">
                    <h2>
                        <AlertCircle size={28} style={{ marginRight: '0.75rem', color: 'var(--warning, #f59e0b)' }} />
                        Annonces à Renouveler
                    </h2>
                    <span className="properties-count">{counts.total} bien(s)</span>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => loadProperties(true)} title="Actualiser">
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        <span className="hide-mobile">Actualiser</span>
                    </button>
                </div>
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'Tous', count: counts.total, color: 'var(--text-secondary)' },
                    { key: 'critical', label: 'Critiques (J≤2)', count: counts.critical + counts.expired, color: '#ef4444' },
                    { key: 'warning', label: 'Attention (J≤7)', count: counts.warning, color: '#f59e0b' },
                ].map(({ key, label, count, color }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '999px',
                            border: `2px solid ${filter === key ? color : 'var(--border-subtle)'}`,
                            background: filter === key ? color + '20' : 'transparent',
                            color: filter === key ? color : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: filter === key ? 600 : 400,
                            fontSize: '0.875rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        {label} ({count})
                    </button>
                ))}
            </div>

            {/* Liste vide */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <CheckCircle size={48} style={{ marginBottom: '1rem', color: '#22c55e', opacity: 0.7 }} />
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        {filter === 'all' ? 'Aucune annonce à renouveler dans les 30 prochains jours.' : 'Aucune annonce dans cette catégorie.'}
                    </p>
                </div>
            ) : (
                <div className="expiring-properties-list">
                    {filtered.map((property, index) => {
                        const statusClass = getStatusClass(property.daysUntilExpiration);
                        const phone = extractBestPhone(property);
                        const isRenewing = actionLoading[property.id];
                        const isArchiving = actionLoading[property.id + '-archive'];

                        return (
                            <motion.div
                                key={property.id}
                                className={`expiring-property-card ${statusClass}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                                layout
                            >
                                <div className="expiration-header">
                                    <div className={`expiration-badge ${statusClass}`}>
                                        {getStatusText(property.daysUntilExpiration)}
                                    </div>
                                    <span className="days-old" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        <Calendar size={13} style={{ marginRight: 4 }} />
                                        {property.daysUntilExpiration <= 0
                                            ? 'Expiré'
                                            : `Expire dans ${property.daysUntilExpiration} jour${property.daysUntilExpiration > 1 ? 's' : ''}`
                                        }
                                    </span>
                                    {property.refBien && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                                            {property.refBien}
                                        </span>
                                    )}
                                </div>

                                <div className="expiring-property-main">
                                    <div className="expiring-property-info">
                                        <div className="expiring-property-header">
                                            <h3>{property.typeBien || 'Bien'}</h3>
                                            <span className="price">{property.prixFormate} FCFA</span>
                                        </div>

                                        <div className="location-info">
                                            <MapPin size={14} />
                                            <span>
                                                {[property.commune, property.quartier].filter(Boolean).join(' · ') || property.zone || '—'}
                                            </span>
                                        </div>

                                        {(property.groupName || property.groupeWhatsApp) && (
                                            <div className="location-info" style={{ color: '#25D366' }}>
                                                <MessageSquare size={14} />
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {property.groupName || property.groupeWhatsApp}
                                                </span>
                                            </div>
                                        )}

                                        {property.caracteristiques && (
                                            <p className="description" style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {property.caracteristiques.substring(0, 120)}{property.caracteristiques.length > 120 ? '…' : ''}
                                            </p>
                                        )}

                                        <div className="expiring-property-meta">
                                            {property.chambres > 0 && (
                                                <span className="meta-tag">{property.chambres} ch.</span>
                                            )}
                                            {property.meuble && <span className="meta-tag meuble">Meublé</span>}
                                            {property.expediteur && (
                                                <span className="meta-tag" title="Partagé par">
                                                    👤 {property.expediteur}
                                                </span>
                                            )}
                                            {property.relanceCount > 0 && (
                                                <span className="meta-tag" style={{ color: 'var(--warning)' }}>
                                                    {property.relanceCount} relance(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="expiring-property-actions">
                                        {phone && (
                                            <a
                                                href={whatsappLink(phone, `Bonjour, votre annonce ${property.refBien} expire bientôt. Souhaitez-vous la renouveler ?`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary btn-sm"
                                                title="Contacter via WhatsApp"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                            >
                                                <Phone size={14} /> Contact
                                            </a>
                                        )}
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleRenew(property)}
                                            disabled={isRenewing || isArchiving}
                                            title="Renouveler pour 30 jours"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <RotateCcw size={14} className={isRenewing ? 'spin' : ''} />
                                            {isRenewing ? '...' : 'Renouveler'}
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleArchive(property)}
                                            disabled={isRenewing || isArchiving}
                                            title="Archiver cette annonce"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Archive size={14} className={isArchiving ? 'spin' : ''} />
                                            {isArchiving ? '...' : 'Archiver'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExpiringProperties;
