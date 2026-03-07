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
                            <label>Prix</label>
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

// --- LOGIQUE DE GÉNÉRATION — Copywriting Immobilier Pro ---

// Normalise et formate le prix saisi
const smartFormatPrice = (p) => {
    if (!p) return null;
    let str = String(p).replace(/FCFA|CFA|F/gi, '').trim();
    const lower = str.toLowerCase();
    let mult = 1;

    if (lower.endsWith('m') || lower.includes('mill')) {
        mult = 1_000_000;
        str = str.replace(/m|millions?|mill/gi, '').trim();
    } else if (lower.endsWith('k')) {
        mult = 1_000;
        str = str.replace(/k/gi, '').trim();
    }

    const cleaned = mult > 1
        ? str.replace(',', '.').replace(/\./g, (m, o, s) => s.indexOf('.') !== o ? '' : '.')
        : str.replace(/[\s.,]/g, '');

    const num = parseFloat(cleaned) * mult;
    return isNaN(num) ? null : Math.floor(num).toLocaleString('fr-FR');
};

// ── FORMAT 1 : ANNONCE PORTAIL (Structurée, complète, professionnelle) ───────
const generateProfessionalAd = (data) => {
    const isVente   = data.status === 'Vente';
    const lieu      = data.quartier ? `${data.commune} – ${data.quartier}` : data.commune;
    const standingMap = { Luxe: 'GRAND LUXE', 'Haut Standing': 'HAUT STANDING', Standard: '' };
    const standingTag = standingMap[data.standing] || '';
    const prixFmt   = smartFormatPrice(data.prix);

    // Hook d'accroche contextuel selon standing
    const hooks = {
        Luxe:          `Une adresse d'exception qui redéfinit l'art de vivre à ${data.commune}.`,
        'Haut Standing': `Confort supérieur, emplacement stratégique : ce bien coche toutes les cases.`,
        Standard:      `Un bien soigné, bien situé, à un prix cohérent avec le marché de ${data.commune}.`,
    };
    const hook = hooks[data.standing] || hooks['Standard'];

    // Descriptif chambre
    const chambreStr = data.pieces > 1 ? `${Number(data.pieces) - 1} chambre${Number(data.pieces) - 1 > 1 ? 's' : ''}` : 'chambre et salon';

    // Atouts formatés
    const atoutsBlock = data.features.length > 0
        ? `\n\n✅ CE QUE VOUS OBTENEZ :\n${data.features.map(f => `   • ${f}`).join('\n')}`
        : '';

    // Surface
    const surfaceStr = data.surface ? ` sur ${data.surface} m²` : '';

    let text = '';
    text += `${isVente ? '🔵 VENTE' : '🟢 LOCATION'} — ${data.type.toUpperCase()}${standingTag ? ' ' + standingTag : ''} | ${lieu.toUpperCase()}\n`;
    text += `${'─'.repeat(45)}\n\n`;
    text += `${hook}\n\n`;
    text += `Nous proposons à ${isVente ? 'la vente' : 'la location'} un${data.type === 'Appartement' || data.type === 'Studio' ? ' ' : 'e '}`;
    text += `${data.type.toLowerCase()}${surfaceStr} de ${data.pieces} pièces (${chambreStr}), `;
    text += `idéalement positionné${data.quartier ? ` au cœur du quartier ${data.quartier}` : ` à ${data.commune}`}.\n\n`;

    // Points forts selon standing
    if (data.standing === 'Luxe') {
        text += `Conçu pour une clientèle exigeante, il allie matériaux nobles, architecture soignée et prestations `;
        text += `au-dessus du marché. Chaque détail a été pensé pour offrir un confort de vie sans compromis.\n`;
    } else if (data.standing === 'Haut Standing') {
        text += `Ses finitions de qualité, son espace bien distribué et sa localisation premium en font un choix `;
        text += `particulièrement judicieux — que ce soit pour y habiter ou pour investir.\n`;
    } else {
        text += `Fonctionnel, bien entretenu et facile d'accès, il répond aux besoins d'un locataire ou acquéreur `;
        text += `en quête de praticité et de sérénité dans un quartier à fort potentiel.\n`;
    }

    if (data.meuble) text += `\n🛋️ Livré entièrement meublé et équipé — prêt à vivre dès la signature.`;

    text += atoutsBlock;

    text += `\n\n${'─'.repeat(45)}\n`;
    text += `💰 PRIX : ${prixFmt ? prixFmt + ' FCFA' : 'Nous consulter'}\n`;
    text += `📋 Visites organisées sur rendez-vous.\n`;
    text += `📞 Pour plus d'informations ou pour planifier une visite, contactez-nous directement.`;

    return { type: 'pro', text };
};

// ── FORMAT 2 : STORYTELLING RÉSEAUX SOCIAUX (Facebook / Instagram) ───────────
const generateEmotionalAd = (data) => {
    const isVente = data.status === 'Vente';
    const lieu    = data.quartier ? `${data.quartier}, ${data.commune}` : data.commune;
    const prixFmt = smartFormatPrice(data.prix);

    // Accroche émotionnelle selon type de bien et standing
    const accrochesVente = {
        Luxe:          `Votre futur chez-vous vous attend à ${data.commune}. Et il dépasse tout ce que vous imaginiez.`,
        'Haut Standing': `Imaginez ouvrir votre porte chaque matin sur ce cadre. C'est possible — et c'est maintenant.`,
        Standard:      `Vous cherchez. Vous comparez. Arrêtez : ce bien est ce que vous attendiez.`,
    };
    const accrochesLocation = {
        Luxe:          `Ce n'est pas juste un logement — c'est le style de vie que vous méritez.`,
        'Haut Standing': `Nouveau départ, nouveau cadre. Bienvenue dans votre prochain chez-vous.`,
        Standard:      `Fini les compromis. Ce ${data.type.toLowerCase()} à ${data.commune} coche toutes les cases.`,
    };
    const accroches = isVente ? accrochesVente : accrochesLocation;
    const accroche = accroches[data.standing] || accroches['Standard'];

    // Corps du message
    const standingDesc = {
        Luxe:          `un écrin d'exception — matériaux premium, volumes généreux, finitions irréprochables`,
        'Haut Standing': `un bien soigné aux standards élevés, pensé pour votre confort quotidien`,
        Standard:      `un espace pratique et chaleureux, parfaitement adapté à la vie moderne`,
    };

    let text = `✨ ${accroche}\n\n`;
    text += `📍 ${lieu}\n`;
    text += `🏠 ${data.type} · ${data.pieces} pièces`;
    if (data.surface) text += ` · ${data.surface} m²`;
    if (data.meuble)  text += ` · Meublé`;
    text += `\n\n`;

    text += `C'est ${standingDesc[data.standing] || standingDesc['Standard']}. `;

    // Détails émotionnels selon features
    const featureLines = [];
    if (data.features.includes('Piscine'))     featureLines.push(`Une piscine pour décompresser après vos journées`);
    if (data.features.includes('Vue Lagune'))  featureLines.push(`Une vue lagune qui vous coupe le souffle chaque matin`);
    if (data.features.includes('Jardin'))      featureLines.push(`Un jardin pour les moments de paix en famille`);
    if (data.features.includes('Sécurité 24/7')) featureLines.push(`Une sécurité 24h/24 pour vivre l'esprit léger`);
    if (data.features.includes('Garage'))      featureLines.push(`Un garage pour protéger votre véhicule`);
    if (data.features.includes('Groupe Électrogène')) featureLines.push(`Un groupe électrogène — plus jamais de coupure qui perturbe votre confort`);
    if (data.features.includes('Cuisine Équipée')) featureLines.push(`Une cuisine entièrement équipée, prête à l'emploi`);
    if (data.features.includes('Balcon'))      featureLines.push(`Un balcon pour vos matins café et vos soirées détente`);

    if (featureLines.length > 0) {
        text += `\n\nCe qui fait la différence ici :\n`;
        text += featureLines.slice(0, 4).map(l => `   ↗ ${l}`).join('\n');
    }

    const cta = isVente
        ? `\n\n${prixFmt ? `💵 ${prixFmt} FCFA` : '💵 Prix sur demande'} — des biens comme celui-ci ne restent pas longtemps sur le marché.\nContactez-nous aujourd'hui. Les visites sont sur rendez-vous.`
        : `\n\n${prixFmt ? `💵 ${prixFmt} FCFA / mois` : '💵 Prix sur demande'} — disponibilité limitée.\n📩 Envoyez-nous un message pour réserver votre visite.`;

    text += cta;

    return { type: 'emo', text };
};

// ── FORMAT 3 : IMPACT DIRECT (WhatsApp / groupes immobiliers) ────────────────
const generateConciseAd = (data) => {
    const isVente = data.status === 'Vente';
    const prixFmt = smartFormatPrice(data.prix);
    const lieu    = data.quartier ? `${data.commune} / ${data.quartier}` : data.commune;

    // Headline percutante
    const standingEmoji = data.standing === 'Luxe' ? '💎' : data.standing === 'Haut Standing' ? '⭐' : '✅';
    const transactionEmoji = isVente ? '🔵' : '🟢';

    let text = `${transactionEmoji} ${isVente ? 'À VENDRE' : 'À LOUER'} ${standingEmoji}\n`;
    text += `${data.type.toUpperCase()} • ${data.pieces} PIÈCES • ${lieu.toUpperCase()}\n`;
    text += `${'━'.repeat(30)}\n`;

    // Détails clés — concis, lisibles
    const lines = [];
    if (data.surface)          lines.push(`📐 Surface : ${data.surface} m²`);
    if (data.meuble)           lines.push(`🛋️ Meublé : OUI`);
    if (data.standing !== 'Standard') lines.push(`🏅 Standing : ${data.standing}`);

    lines.push(...data.features.map(f => `✔️ ${f}`));

    if (lines.length > 0) text += lines.join('\n') + '\n';

    text += `${'━'.repeat(30)}\n`;
    text += prixFmt
        ? `💰 ${prixFmt} FCFA${!isVente ? '/mois' : ''}\n`
        : `💰 Prix : Nous contacter\n`;

    // CTA direct
    text += `\n👉 Intéressé(e) ? Inbox ou appel direct — les visites sont rapides à organiser. ✅`;

    return { type: 'short', text };
};

export default AdGenerator;
