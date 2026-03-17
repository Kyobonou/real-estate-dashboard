import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Search, MapPin, Building, Phone, ArrowRight, Bed, Bath, Square, Home, ChevronLeft, ChevronRight, TrendingUp, Users, Award, TreePine, Layers, Briefcase, ShoppingBag, Warehouse, Building2, Calendar, Clock, Shield, Star, CheckCircle, Zap, Mail, Instagram, Facebook, Linkedin, Globe, MessageSquare } from 'lucide-react';
import bogbesLogo from '../assets/bogbes-logo.jpg';
import luxuryVillaHero from '../assets/luxury_villa_hero.png';
import luxuryInteriorCta from '../assets/luxury_interior_cta.png';
import aboutUsImage from '../assets/about_us.png';
import apiService from '../services/api';
import { extractBestPhone } from '../utils/phoneUtils';
import PublicPropertyModal from '../components/PublicPropertyModal';
import './PublicHome.css';

/* Compteur animé pour les stats */
const AnimatedCounter = ({ target, suffix = '' }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const duration = 1800;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(current));
        }, duration / steps);
        return () => clearInterval(timer);
    }, [inView, target]);

    return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>;
};

/* Définition des catégories avec icônes + gradients */
const TYPE_CATEGORIES = [
    { key: 'villa',        label: 'Villa',        icon: Home,       gradient: 'linear-gradient(135deg,#1B4299,#4f46e5)', keywords: ['villa'] },
    { key: 'appartement',  label: 'Appartement',  icon: Building2,  gradient: 'linear-gradient(135deg,#0e7490,#0891b2)', keywords: ['appartement', 'appart'] },
    { key: 'terrain',      label: 'Terrain',      icon: TreePine,   gradient: 'linear-gradient(135deg,#059669,#10b981)', keywords: ['terrain'] },
    { key: 'studio',       label: 'Studio',       icon: Layers,     gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', keywords: ['studio'] },
    { key: 'bureau',       label: 'Bureau',       icon: Briefcase,  gradient: 'linear-gradient(135deg,#b45309,#d97706)', keywords: ['bureau'] },
    { key: 'magasin',      label: 'Magasin',      icon: ShoppingBag,gradient: 'linear-gradient(135deg,#be123c,#e11d48)',  keywords: ['magasin', 'boutique', 'commerce'] },
    { key: 'entrepot',     label: 'Entrepôt',     icon: Warehouse,  gradient: 'linear-gradient(135deg,#374151,#6b7280)', keywords: ['entrepot', 'entrepôt', 'hangar'] },
    { key: 'immeuble',     label: 'Immeuble',     icon: Building,   gradient: 'linear-gradient(135deg,#0f4c81,#1d6fa4)', keywords: ['immeuble', 'batiment', 'bâtiment'] },
];

const matchCategory = (typeBien = '') => {
    const t = typeBien.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return TYPE_CATEGORIES.find(cat => cat.keywords.some(k => t.includes(k)));
};

/* Mini carousel réutilisable pour chaque section par type */
const MiniCarousel = ({ properties, onSelect }) => {
    const ref = useRef(null);
    const scroll = (dir) => {
        const el = ref.current;
        if (!el) return;
        const w = el.querySelector('.public-property-card')?.offsetWidth + 20 || 320;
        el.scrollBy({ left: dir * w, behavior: 'smooth' });
    };
    return (
        <div className="carousel-wrapper mini-carousel-wrapper">
            <button className="carousel-btn carousel-btn-prev" onClick={() => scroll(-1)}><ChevronLeft size={20} /></button>
            <button className="carousel-btn carousel-btn-next" onClick={() => scroll(1)}><ChevronRight size={20} /></button>
            <div className="carousel-track" ref={ref}>
                {properties.map((property, index) => {
                    const gradients = ['#1B4299,#4f46e5', '#0e7490,#0891b2', '#7c3aed,#a855f7', '#059669,#10b981'];
                    const grad = gradients[index % gradients.length];
                    return (
                        <motion.div
                            key={property.id}
                            className="public-property-card carousel-card"
                            onClick={() => onSelect(property)}
                            style={{ cursor: 'pointer' }}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.35, delay: Math.min(index, 4) * 0.06 }}
                            whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        >
                            <div className="property-image-wrapper">
                                {property.imageUrl ? (
                                    <img src={property.imageUrl} alt={property.typeBien} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ background: `linear-gradient(135deg,${grad})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.85)', gap: 8 }}>
                                        <Building size={36} /><span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{property.typeBien}</span>
                                    </div>
                                )}
                                <div className="property-badges-overlay">
                                    <span className={`badge-offer${property.typeOffre === 'Location' ? ' location-badge' : ''}`}>{property.typeOffre || 'Découvrir'}</span>
                                    {property.disponible !== false && <span className="badge-dispo">Disponible</span>}
                                </div>
                                <div className="image-gradient-overlay"></div>
                            </div>
                            <div className="property-content">
                                <div className="property-main-info">
                                    <h3 className="property-title">{property.typeBien}</h3>
                                    <div className="property-price">{property.prixFormate}</div>
                                </div>
                                <div className="property-location">
                                    <MapPin size={12} />
                                    <span>{property.commune || property.zone}{property.quartier && ` · ${property.quartier}`}</span>
                                </div>
                                {property.description && (
                                    <p className="property-description">{property.description.slice(0, 75)}{property.description.length > 75 ? '…' : ''}</p>
                                )}
                                <div className="property-features">
                                    {property.chambres > 0 && <span className="feature-item"><Bed size={12} /> {property.chambres} ch.</span>}
                                    {property.salles_eau > 0 && <span className="feature-item"><Bath size={12} /> {property.salles_eau} sdb.</span>}
                                    {property.superficie && <span className="feature-item"><Square size={12} /> {property.superficie} m²</span>}
                                    {property.meuble && <span className="feature-item"><Home size={12} /> Meublé</span>}
                                </div>
                                <div className="property-footer">
                                    {property.datePublication && <span className="property-date"><Calendar size={11} /> {property.datePublication}</span>}
                                    <button className="btn-details" onClick={(e) => { e.stopPropagation(); onSelect(property); }}>Découvrir</button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

const PublicHome = () => {
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    const carouselRef = useRef(null);
    const autoScrollRef = useRef(null);
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/proprietes?search=${encodeURIComponent(searchQuery)}`);
        } else {
            navigate('/proprietes');
        }
    };

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await apiService.getProperties(false);
                if (response.success) {
                    setFeaturedProperties(response.data.slice(0, 10));
                }
            } catch (error) {
                // silenced
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    /* Grouper les biens par catégorie */
    const categorized = useMemo(() => {
        const map = {};
        featuredProperties.forEach(p => {
            const cat = matchCategory(p.typeBien);
            const key = cat ? cat.key : 'autre';
            if (!map[key]) map[key] = { cat: cat || { key: 'autre', label: 'Autre', gradient: 'linear-gradient(135deg,#6b7280,#9ca3af)', icon: Building }, items: [] };
            map[key].items.push(p);
        });
        return Object.values(map).filter(g => g.items.length >= 1).sort((a, b) => b.items.length - a.items.length);
    }, [featuredProperties]);

    /* Compteur par catégorie pour les type-cards */
    const typeCount = useMemo(() => {
        const counts = {};
        featuredProperties.forEach(p => {
            const cat = matchCategory(p.typeBien);
            if (cat) counts[cat.key] = (counts[cat.key] || 0) + 1;
        });
        return counts;
    }, [featuredProperties]);

    /* Auto-scroll carousel */
    const scrollNext = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        const cardWidth = el.querySelector('.public-property-card')?.offsetWidth + 24 || 370;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 10) {
            el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            el.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        if (isPaused || loading || featuredProperties.length === 0) return;
        autoScrollRef.current = setInterval(scrollNext, 3500);
        return () => clearInterval(autoScrollRef.current);
    }, [isPaused, loading, featuredProperties, scrollNext]);

    const scrollPrev = () => {
        const el = carouselRef.current;
        if (!el) return;
        const cardWidth = el.querySelector('.public-property-card')?.offsetWidth + 24 || 370;
        el.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    };

    return (
        <div className="home-page" style={{
            fontFamily: "'Inter', sans-serif",
            color: '#0f172a',
            overflowX: 'hidden'
        }}>
            {/* Hero Section */}
            <section className="hero" style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#fff'
            }}>
                {/* Premium Background Image with Overlay */}
                <div className="hero-bg-image">
                    <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2500&auto=format&fit=crop" alt="Luxury Villa" />
                    <div className="hero-overlay"></div>
                </div>
                
                <div className="container hero-container" style={{ position: 'relative', zIndex: 2 }}>
                    <motion.div 
                        className="hero-content"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <motion.div 
                            className="hero-badge"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <span className="hero-badge-dot"></span>
                            Immobilier de Luxe à Abidjan
                        </motion.div>
                        
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            Trouvez la Demeure de vos <span className="text-gradient">Rêves</span>
                        </motion.h1>
                        
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                        >
                            Découvrez une collection exclusive de propriétés d'exception dans les quartiers les plus prestigieux de la Côte d'Ivoire.
                        </motion.p>

                        <motion.form
                            className="search-bar"
                            onSubmit={handleSearch}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.5, type: "spring", stiffness: 100 }}
                        >
                            <div className="search-input-wrapper">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Ville, quartier ou type de bien..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn-primary">Rechercher</button>
                        </motion.form>

                        {/* Quick Stats row */}
                        <motion.div
                            className="hero-quick-stats"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.75 }}
                        >
                            <div className="hero-stat">
                                <span className="hero-stat-value">500+</span>
                                <span className="hero-stat-label">Biens</span>
                            </div>
                            <div className="hero-stat-divider" />
                            <div className="hero-stat">
                                <span className="hero-stat-value">1 200+</span>
                                <span className="hero-stat-label">Clients</span>
                            </div>
                            <div className="hero-stat-divider" />
                            <div className="hero-stat">
                                <span className="hero-stat-value">8 ans</span>
                                <span className="hero-stat-label">Expérience</span>
                            </div>
                            <div className="hero-stat-divider" />
                            <div className="hero-stat">
                                <span className="hero-stat-value">98%</span>
                                <span className="hero-stat-label">Satisfaction</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ── STATS SECTION ── */}
            <motion.section
                className="stats-section"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                {[
                    { icon: Building, value: 500, suffix: '+', label: 'Biens disponibles' },
                    { icon: Users, value: 1200, suffix: '+', label: 'Clients satisfaits' },
                    { icon: TrendingUp, value: 8, suffix: ' ans', label: "D'expérience" },
                    { icon: Award, value: 98, suffix: '%', label: 'Taux de satisfaction' },
                ].map(({ icon: Icon, value, suffix, label }, i) => (
                    <motion.div
                        key={i}
                        className="stat-item"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                        <div className="stat-icon"><Icon size={24} /></div>
                        <div className="stat-number"><AnimatedCounter target={value} suffix={suffix} /></div>
                        <div className="stat-label">{label}</div>
                    </motion.div>
                ))}
            </motion.section>

            {/* ── CAROUSEL FEATURED PROPERTIES ── */}
            <section className="featured-properties">
                <div className="section-header">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Nos <span className="text-gradient">Biens</span> à la Une
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        Découvrez nos opportunités immobilières les plus prestigieuses
                    </motion.p>
                </div>

                <div className="carousel-wrapper">
                    {/* Navigation boutons */}
                    <button className="carousel-btn carousel-btn-prev" onClick={scrollPrev} aria-label="Précédent">
                        <ChevronLeft size={22} />
                    </button>
                    <button className="carousel-btn carousel-btn-next" onClick={scrollNext} aria-label="Suivant">
                        <ChevronRight size={22} />
                    </button>

                    {/* Track scrollable */}
                    <div
                        className="carousel-track"
                        ref={carouselRef}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onTouchStart={() => setIsPaused(true)}
                        onTouchEnd={() => setIsPaused(false)}
                    >
                        {loading ? (
                            [1, 2, 3, 4].map((item) => (
                                <div key={item} className="property-card-skeleton carousel-card">
                                    <div className="skeleton-image"></div>
                                    <div className="skeleton-content">
                                        <div className="skeleton-title"></div>
                                        <div className="skeleton-price"></div>
                                        <div className="skeleton-details"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            featuredProperties.map((property, index) => {
                                const gradients = ['#1B4299,#4f46e5', '#0e7490,#0891b2', '#7c3aed,#a855f7', '#059669,#10b981', '#d97706,#f59e0b'];
                                const grad = gradients[index % gradients.length];
                                const phone = extractBestPhone(property) || '22500000000';
                                return (
                                    <motion.div
                                        key={property.id}
                                        className="public-property-card carousel-card"
                                        onClick={() => setSelectedProperty(property)}
                                        style={{ cursor: 'pointer' }}
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ duration: 0.4, delay: Math.min(index, 3) * 0.06 }}
                                        whileHover={{ y: -6, transition: { duration: 0.3 } }}
                                    >
                                        <div className="property-image-wrapper">
                                            {property.imageUrl ? (
                                                <img src={property.imageUrl} alt={property.typeBien} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                            ) : (
                                                <div className="property-image-placeholder" style={{ background: `linear-gradient(135deg, ${grad})` }}>
                                                    <Building size={48} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '8px' }}>{property.typeBien}</span>
                                                </div>
                                            )}
                                            <div className="property-badges-overlay">
                                                <span className={`badge-offer ${property.typeOffre === 'Vente' ? 'badge-sale' : 'badge-rent'}`}>{property.typeOffre || 'Découvrir'}</span>
                                                {property.refBien && <span className="badge-ref">#{property.refBien}</span>}
                                            </div>
                                            <div className="image-gradient-overlay"></div>
                                        </div>

                                        <div className="property-content">
                                            <div className="property-location group-location">
                                                <MapPin size={15} />
                                                <span>{property.zone}{property.commune && ` • ${property.commune}`}</span>
                                            </div>
                                            <div className="property-main-info">
                                                <h3 className="property-title">{property.typeBien}</h3>
                                                <div className="property-price">{property.prixFormate}</div>
                                            </div>
                                            <div className="property-features">
                                                {property.chambres > 0 && <span className="feature-item"><Bed size={15} /> <strong>{property.chambres}</strong> ch.</span>}
                                                {property.salles_eau > 0 && <span className="feature-item"><Bath size={15} /> <strong>{property.salles_eau}</strong> sde.</span>}
                                                {property.superficie && <span className="feature-item"><Square size={15} /> <strong>{property.superficie}</strong> m²</span>}
                                            </div>
                                            <div className="property-actions">
                                                <button className="btn-details" onClick={(e) => { e.stopPropagation(); setSelectedProperty(property); }}>
                                                    Voir les détails
                                                </button>
                                                <button
                                                    className="btn-whatsapp-icon"
                                                    title="Contacter sur WhatsApp"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const msg = encodeURIComponent(`Bonjour, je suis intéressé(e) par ce bien (Réf: ${property.refBien}) : ${property.typeBien} à ${property.zone}. Pouvons-nous en discuter ?`);
                                                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                                                    }}
                                                >
                                                    <Phone size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="view-all-container">
                    <motion.button
                        className="btn-view-all"
                        onClick={() => navigate('/proprietes')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        Explorer tout le catalogue <ArrowRight size={20} />
                    </motion.button>
                </div>
            </section>

            {/* ── EXPLORER PAR TYPE ── */}
            <section className="type-explorer">
                <div className="type-explorer-inner">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2>Explorer par <span className="text-gradient">Catégorie</span></h2>
                        <p>Trouvez le bien qui correspond exactement à vos besoins</p>
                    </motion.div>

                    <div className="type-grid">
                        {TYPE_CATEGORIES.map((cat, i) => {
                            const count = typeCount[cat.key] || 0;
                            const Icon = cat.icon;
                            return (
                                <motion.div
                                    key={cat.key}
                                    className={`type-card ${count === 0 ? 'type-card-empty' : ''}`}
                                    style={{ '--type-gradient': cat.gradient }}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: i * 0.07, duration: 0.4 }}
                                    whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.22 } }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(`/proprietes?type=${cat.label}`)}
                                >
                                    <div className="type-card-icon-wrap">
                                        <Icon size={28} />
                                    </div>
                                    <span className="type-card-label">{cat.label}</span>
                                    {count > 0 && (
                                        <span className="type-card-count">{count} bien{count > 1 ? 's' : ''}</span>
                                    )}
                                    <div className="type-card-arrow"><ArrowRight size={16} /></div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── SECTIONS PAR TYPE (carousels dynamiques) ── */}
            {!loading && categorized.map(({ cat, items }, idx) => {
                const Icon = cat.icon;
                return (
                    <section key={cat.key} className="type-section">
                        <div className="type-section-header">
                            <motion.div
                                className="type-section-title"
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.05 }}
                            >
                                <div className="type-section-icon" style={{ background: cat.gradient }}>
                                    <Icon size={20} color="white" />
                                </div>
                                <div>
                                    <h2>{cat.label}s</h2>
                                    <span className="type-section-count">{items.length} bien{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}</span>
                                </div>
                            </motion.div>
                            <motion.button
                                className="btn-see-all"
                                onClick={() => navigate(`/proprietes?type=${cat.label}`)}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                whileHover={{ x: 4 }}
                            >
                                Voir tout <ArrowRight size={16} />
                            </motion.button>
                        </div>
                        <MiniCarousel properties={items} onSelect={setSelectedProperty} />
                    </section>
                );
            })}

            {/* Services Section */}
            <section className="services" id="services">
                <div className="services-header" data-aos="fade-up">
                    <div className="services-logo-container">
                        <img src={bogbesLogo} alt="Bogbe's Logo" className="services-section-logo" />
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        Pourquoi nous choisir ?
                    </motion.h2>
                    <motion.p
                        className="services-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        Nous réinventons l'expérience immobilière grâce à des services sur-mesure et une exigence sans compromis.
                    </motion.p>
                </div>
                
                <div className="services-grid">
                    {[
                        { icon: Building, title: 'Expertise Locale', desc: 'Une connaissance pointue et actualisée du marché immobilier ivoirien pour vous guider avec précision.' },
                        { icon: Search, title: 'Recherche Ciblée', desc: 'Des algorithmes de matching avancés pour identifier rapidement les biens correspondant à votre style de vie.' },
                        { icon: Award, title: 'Qualité Premium', desc: 'Une sélection rigoureuse de propriétés exclusives, évaluées selon des standards stricts d\'excellence.' },
                        { icon: Phone, title: 'Accompagnement A à Z', desc: 'Un suivi personnalisé et réactif, de la première visite jusqu\'à la remise des clés et au-delà.' },
                    ].map(({ icon: Icon, title, desc }, i) => (
                        <motion.div
                            key={title}
                            className="service-card"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="service-card-inner">
                                <div className="service-icon-wrapper">
                                    <div className="service-icon-bg"></div>
                                    <Icon className="service-icon-svg" size={34} strokeWidth={1.5} />
                                </div>
                                <h3 className="service-title">{title}</h3>
                                <p className="service-desc">{desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>
            
            {/* ── ABOUT US SECTION ── */}
            <section className="about-us" id="a-propos">
                <div className="about-container">
                    <div className="about-grid">
                        <motion.div 
                            className="about-image-wrap"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <img src={aboutUsImage} alt="À propos de Bogbe's Immobilier" />
                            <div className="experience-badge">
                                <span className="years">10+</span>
                                <span className="label">Années d'excellence</span>
                            </div>
                        </motion.div>
                        
                        <motion.div 
                            className="about-info"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="section-tag">Notre Histoire</div>
                            <h2>L'Excellence Immobilière au <span className="text-gradient">Cœur d'Abidjan</span></h2>
                            <p className="main-p">
                                Fondée sur une vision de luxe et de raffinement, Bogbe's Immobilier redéfinit les standards de l'habitat en Côte d'Ivoire. Nous ne nous contentons pas de vendre des m², nous créons des destinations de vie exceptionnelles.
                            </p>
                            
                            <div className="about-features">
                                <div className="about-f-item">
                                    <div className="f-icon"><Award size={22} color="#d4af37" /></div>
                                    <div className="f-text">
                                        <h4>Standards Internationaux</h4>
                                        <p>Une rigueur inspirée des plus grandes agences mondiales adaptée au contexte local.</p>
                                    </div>
                                </div>
                                <div className="about-f-item">
                                    <div className="f-icon"><Shield size={22} color="#d4af37" /></div>
                                    <div className="f-text">
                                        <h4>Confidentialité Totale</h4>
                                        <p>Un service discret et exclusif pour une clientèle exigeante et prestigieuse.</p>
                                    </div>
                                </div>
                                <div className="about-f-item">
                                    <div className="f-icon"><Zap size={22} color="#d4af37" /></div>
                                    <div className="f-text">
                                        <h4>Solutions Digitales</h4>
                                        <p>Une plateforme moderne pour une recherche de biens transparente et efficace.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── CONTACT SECTION ── */}
            <section className="contact-us" id="contact">
                <div className="contact-container">
                    <div className="contact-info-card">
                        <motion.div 
                            className="contact-header"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="section-tag">Contactez-nous</div>
                            <h2>Parlons de votre <span className="text-gradient">Futur Projet</span></h2>
                            <p>Nos experts sont à votre écoute pour concrétiser vos rêves immobiliers les plus audacieux.</p>
                        </motion.div>

                        <div className="contact-grid">
                            <motion.div 
                                className="contact-details"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="contact-method">
                                    <div className="method-icon"><MapPin size={24} /></div>
                                    <div className="method-text">
                                        <h4>Notre Siège</h4>
                                        <p>Cocody Ambassade, BP 123 - Abidjan, Côte d'Ivoire</p>
                                    </div>
                                </div>
                                <div className="contact-method">
                                    <div className="method-icon"><Phone size={24} /></div>
                                    <div className="method-text">
                                        <h4>Téléphone & WhatsApp</h4>
                                        <p>+225 00 00 00 00 00</p>
                                        <p className="sub-text">Disponible lun-sam : 08h00 - 19h00</p>
                                    </div>
                                </div>
                                <div className="contact-method">
                                    <div className="method-icon"><Mail size={24} /></div>
                                    <div className="method-text">
                                        <h4>Email Professionnel</h4>
                                        <p>contact@bogbes-immobilier.com</p>
                                    </div>
                                </div>
                                
                                <div className="social-connect">
                                    <h4>Suivez notre actualité</h4>
                                    <div className="social-links">
                                        <a href="#" className="s-link" aria-label="Facebook"><Facebook size={20} /></a>
                                        <a href="#" className="s-link" aria-label="Instagram"><Instagram size={20} /></a>
                                        <a href="#" className="s-link" aria-label="LinkedIn"><Linkedin size={20} /></a>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                className="contact-form-wrap"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                            >
                                <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Votre Nom complet</label>
                                            <input type="text" placeholder="Ex: Jean Dupont" required />
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input type="email" placeholder="email@exemple.com" required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Objet du projet</label>
                                        <select>
                                            <option>Achat d'un bien</option>
                                            <option>Location de luxe</option>
                                            <option>Estimation immobilière</option>
                                            <option>Partenariat investisseur</option>
                                            <option>Autre</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Votre message</label>
                                        <textarea rows="4" placeholder="Décrivez brièvement votre projet..."></textarea>
                                    </div>
                                    <button className="btn-submit-contact">
                                        Envoyer ma demande <ArrowRight size={18} />
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-bg-image">
                    <img src={luxuryInteriorCta} alt="Luxury Interior" />
                    <div className="cta-overlay"></div>
                </div>
                <div className="container cta-container">
                    <motion.div 
                        className="cta-card"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="cta-content">
                            <h2>Prêt à trouver votre perle rare ?</h2>
                            <p>Nos experts sont à votre disposition pour vous accompagner dans votre projet immobilier de luxe à Abidjan.</p>
                            <div className="cta-buttons">
                                <button className="cta-btn-primary" onClick={() => navigate('/proprietes')}>
                                    Explorer les offres
                                </button>
                                <button className="cta-btn-secondary" onClick={() => window.open('https://wa.me/225xxxxxxxx', '_blank')}>
                                    Contacter un expert
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <PublicPropertyModal
                property={selectedProperty}
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
            />
        </div>
    );
};

export default PublicHome;
