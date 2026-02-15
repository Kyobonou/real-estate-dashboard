import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Wand2, Copy, RefreshCw, Layers, Check, Sparkles, Building, MapPin,
    DollarSign, Home, Key, CheckCircle2
} from 'lucide-react';
import { useToast } from '../components/Toast';
import './AdGenerator.css';

const AdGenerator = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatedads, setGeneratedAds] = useState([]);

    const [formData, setFormData] = useState({
        type: 'Appartement',
        pieces: '3',
        surface: '',
        commune: 'Cocody',
        quartier: '',
        prix: '',
        status: 'Vente', // Vente ou Location
        meuble: false,
        standing: 'Standard', // Standard, Haut Standing, Luxe
        features: []
    });

    const commonFeatures = [
        "Piscine", "Garage", "Jardin", "Sécurité 24/7", "Vue Lagune",
        "Climatisation", "Groupe Électrogène", "Ascenseur", "Balcon",
        "Cuisine Équipée", "Placards", "Staff Décoratif"
    ];

    const handleFeatureToggle = (feature) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.includes(feature)
                ? prev.features.filter(f => f !== feature)
                : [...prev.features, feature]
        }));
    };

    const generateAd = () => {
        setLoading(true);

        // Simuler un appel API (IA)
        setTimeout(() => {
            const ads = [
                generateProfessionalAd(formData),
                generateEmotionalAd(formData),
                generateConciseAd(formData)
            ];
            setGeneratedAds(ads);
            setLoading(false);
            addToast({ type: 'success', title: 'Génération terminée', message: '3 propositions créées !' });
        }, 1500);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        addToast({ type: 'success', title: 'Copié !', message: 'Texte copié dans le presse-papier' });
    };

    return (
        <motion.div
            className="ad-generator-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="generator-header">
                <div className="header-icon-box">
                    <Wand2 size={24} color="#6366f1" />
                </div>
                <div>
                    <h2>Assistant Rédactionnel IA</h2>
                    <p>Créez des descriptions percutantes pour vos annonces en quelques secondes.</p>
                </div>
            </div>

            <div className="generator-content">
                {/* FORMULAIRE */}
                <div className="generator-form-panel">
                    <h3>Détails du Bien</h3>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Type de Transaction</label>
                            <div className="toggle-group">
                                <button
                                    className={`toggle-btn ${formData.status === 'Vente' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, status: 'Vente' })}
                                >Vente</button>
                                <button
                                    className={`toggle-btn ${formData.status === 'Location' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, status: 'Location' })}
                                >Location</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Type de Bien</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="Appartement">Appartement</option>
                                <option value="Villa">Villa</option>
                                <option value="Duplex">Duplex</option>
                                <option value="Studio">Studio</option>
                                <option value="Terrain">Terrain</option>
                                <option value="Bureau">Bureau</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Commune</label>
                            <select
                                value={formData.commune}
                                onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                            >
                                <option value="Cocody">Cocody</option>
                                <option value="Marcory">Marcory</option>
                                <option value="Plateau">Plateau</option>
                                <option value="Yopougon">Yopougon</option>
                                <option value="Bingerville">Bingerville</option>
                                <option value="Port-Bouët">Port-Bouët</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Quartier (Précision)</label>
                            <input
                                type="text"
                                placeholder="Ex: Riviéra 3, Zone 4..."
                                value={formData.quartier}
                                onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Nombre de Pièces</label>
                            <input
                                type="number"
                                value={formData.pieces}
                                onChange={(e) => setFormData({ ...formData, pieces: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Prix (FCFA)</label>
                            <input
                                type="text"
                                placeholder="Ex: 500 000"
                                value={formData.prix}
                                onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Standing</label>
                            <select
                                value={formData.standing}
                                onChange={(e) => setFormData({ ...formData, standing: e.target.value })}
                            >
                                <option value="Standard">Standard</option>
                                <option value="Haut Standing">Haut Standing</option>
                                <option value="Luxe">Luxe</option>
                            </select>
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.meuble}
                                    onChange={(e) => setFormData({ ...formData, meuble: e.target.checked })}
                                />
                                Meublé
                            </label>
                        </div>
                    </div>

                    <div className="features-selector">
                        <label>Atouts & Commodités</label>
                        <div className="features-grid">
                            {commonFeatures.map(feature => (
                                <div
                                    key={feature}
                                    className={`feature-chip ${formData.features.includes(feature) ? 'selected' : ''}`}
                                    onClick={() => handleFeatureToggle(feature)}
                                >
                                    {formData.features.includes(feature) && <Check size={12} />}
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn-generate"
                        onClick={generateAd}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="spin" size={20} />
                                Rédaction en cours...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Générer les Annonces
                            </>
                        )}
                    </button>
                </div>

                {/* RÉSULTATS */}
                <div className="generator-results-panel">
                    {generatedads.length > 0 ? (
                        <div className="results-container">
                            {generatedads.map((ad, index) => (
                                <motion.div
                                    key={index}
                                    className="ad-card"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="ad-card-header">
                                        <div className="ad-type-badge">
                                            {ad.type === 'pro' && '👔 Professionnel'}
                                            {ad.type === 'emo' && '❤️ Coup de Cœur'}
                                            {ad.type === 'short' && '⚡ Efficace'}
                                        </div>
                                        <button
                                            className="btn-copy"
                                            onClick={() => copyToClipboard(ad.text)}
                                            title="Copier le texte"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <div className="ad-content">
                                        <pre>{ad.text}</pre>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state-generator">
                            <div className="empty-icon">
                                <Wand2 size={48} />
                            </div>
                            <h3>Prêt à rédiger ?</h3>
                            <p>Remplissez les informations à gauche et laissez l'IA créer des descriptions vendeuses pour Facebook, WhatsApp et les portails immobiliers.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// --- LOGIQUE DE GÉNÉRATION (MOCK IA) ---

const generateProfessionalAd = (data) => {
    const isVente = data.status === 'Vente';
    const featuresList = data.features.length > 0 ? `\n\n✅ ATOUTS :\n- ${data.features.join('\n- ')}` : '';
    const quartier = data.quartier ? `(${data.quartier})` : '';
    const standing = data.standing === 'Luxe' ? 'DE GRAND LUXE' : data.standing === 'Haut Standing' ? 'HAUT STANDING' : '';

    let text = `Ref: #IMMO-${Math.floor(Math.random() * 1000)}\n\n`;
    text += `🏢 ${isVente ? 'A VENDRE' : 'A LOUER'} - ${data.type.toUpperCase()} ${data.pieces} PIÈCES ${standing} - ${data.commune.toUpperCase()} ${quartier.toUpperCase()}\n\n`;
    text += `Nous mettons en ${isVente ? 'vente' : 'location'} ce magnifique ${data.type.toLowerCase()} de ${data.pieces} pièces, idéalement situé à ${data.commune} ${data.quartier || ''}.`;
    text += `\nIl offre de beaux volumes et une luminosité naturelle exceptionnelle. Bâti avec des matériaux de qualité, ce bien saura vous séduire par son agencement optimisé.\n`;

    if (data.meuble) text += `\n🛋️ Le bien est loué ENTIÈREMENT MEUBLÉ et ÉQUIPÉ.`;

    text += featuresList;

    text += `\n\n💰 PRIX : ${data.prix ? data.prix + ' FCFA' : 'Nous consulter'}`;
    text += `\n\n📞 INFOLINE & VISITE :\nContactez-nous dès maintenant pour une visite !`;

    return { type: 'pro', text };
};

const generateEmotionalAd = (data) => {
    const isVente = data.status === 'Vente';
    const emotionWords = ['Coup de cœur assuré', 'Véritable havre de paix', 'Perle rare', 'Cadre de vie exceptionnel'];
    const catchPhrase = emotionWords[Math.floor(Math.random() * emotionWords.length)];

    let text = `✨ ${catchPhrase.toUpperCase()} À ${data.commune.toUpperCase()} ! ✨\n\n`;
    text += `Vous rêvez d'un ${data.type.toLowerCase()} alliant confort, modernité et sécurité ? Ne cherchez plus !\n\n`;
    text += `Niché au cœur de ${data.commune} ${data.quartier ? 'à ' + data.quartier : ''}, découvrez ce bijou architectural de ${data.pieces} pièces qui n'attend que vous. `;
    text += `Dès l'entrée, vous serez séduit par ses finitions ${data.standing === 'Standard' ? 'soignées' : 'impeccables'} et son atmosphère chaleureuse.\n`;

    if (data.features.includes('Piscine')) text += `\n💦 Profitez de moments de détentes inoubliables au bord de la piscine.`;
    if (data.features.includes('Vue Lagune')) text += `\n🌅 Laissez-vous bercer par une vue imprenable sur la lagune.`;
    if (data.features.includes('Sécurité 24/7')) text += `\n🛡️ Dormez sur vos deux oreilles grâce à un service de sécurité optimal.`;

    text += `\n\nCe bien est une opportunité unique ${isVente ? "d'investir dans votre bonheur" : "de poser vos valises dans un cadre idyllique"}.`;
    text += `\n\n🏷️ ${data.prix ? data.prix + ' FCFA' : 'Prix sur demande'}`;
    text += `\n📅 Visites sur rendez-vous uniquement.`;

    return { type: 'emo', text };
};

const generateConciseAd = (data) => {
    const isVente = data.status === 'Vente';

    let text = `🔴 ${isVente ? 'VENTE' : 'LOCATION'} | ${data.commune.toUpperCase()}\n`;
    text += `TYPE: ${data.type} ${data.pieces} Pièces\n`;
    if (data.quartier) text += `QUARTIER: ${data.quartier}\n`;
    if (data.prix) text += `PRIX: ${data.prix} FCFA\n`;
    text += `STANDING: ${data.standing}\n\n`;

    text += `DETAILS:\n`;
    text += `- ${data.pieces} Pièces\n`;
    if (data.surface) text += `- Superficie: ${data.surface} m²\n`;
    if (data.meuble) text += `- Meublé: OUI\n`;
    data.features.forEach(f => text += `- ${f}\n`);

    text += `\ninteressé(e) ? Inbox ou appel direct 📞`;

    return { type: 'short', text };
};

export default AdGenerator;
