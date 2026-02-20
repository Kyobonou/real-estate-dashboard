import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/api';
import './ChatAssistant.css';

// ─── Utilitaires texte ────────────────────────────────────────────────────────
const norm = (s = '') =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// ─── Zones détectables ────────────────────────────────────────────────────────
const ZONES = [
    ['cocody', 'cocody'],
    ['plateau', 'plateau'],
    ['marcory', 'marcory'],
    ['koumassi', 'koumassi'],
    ['yopougon', 'yopougon', 'yop'],
    ['riviera', 'riviera'],
    ['bietry', 'bietry', 'biétry'],
    ['zone 4', 'zone4', 'zone 4'],
    ['palm club', 'palm club', 'palm'],
    ['bingerville', 'bingerville'],
    ['adjame', 'adjame', 'adjamé'],
    ['treichville', 'treichville'],
    ['abobo', 'abobo'],
    ['port-bouet', 'port bouet', 'portbouet'],
    ['angre', 'angre', 'angré'],
    ['songon', 'songon'],
    ['attiecoube', 'attiecoube', 'attécoubé'],
    ['lopou', 'lopou'],
    ['deux plateaux', 'deux plateaux', '2 plateaux'],
];

// ─── Types de biens ────────────────────────────────────────────────────────────
const TYPES = [
    ['villa', 'villa'],
    ['maison', 'maison'],
    ['appartement', 'appartement', 'appart', 'appt'],
    ['studio', 'studio'],
    ['terrain', 'terrain'],
    ['duplex', 'duplex'],
    ['immeuble', 'immeuble'],
    ['bureau', 'bureau'],
    ['magasin', 'magasin', 'boutique'],
    ['entrepot', 'entrepot', 'entrepôt'],
    ['chambre', 'chambre'],
    ['local commercial', 'local commercial', 'local'],
];

const detectZone = (text) => {
    const n = norm(text);
    for (const [canonical, ...variants] of ZONES) {
        if (variants.some(v => n.includes(norm(v)))) return canonical;
    }
    return null;
};

const detectType = (text) => {
    const n = norm(text);
    for (const [canonical, ...variants] of TYPES) {
        if (variants.some(v => n.includes(norm(v)))) return canonical;
    }
    return null;
};

// ─── Parsing de prix ──────────────────────────────────────────────────────────
const parsePriceToken = (token) => {
    if (!token) return null;
    const n = norm(token).replace(/\s/g, '');
    const match = n.match(/^(\d+(?:[.,]\d+)?)(m|k)?$/);
    if (!match) return null;
    let val = parseFloat(match[1].replace(',', '.'));
    if (match[2] === 'k') val *= 1000;
    if (match[2] === 'm') val *= 1_000_000;
    return Math.round(val);
};

const detectPriceFilter = (text) => {
    const n = norm(text);
    const between = n.match(/entre\s+(\S+)\s+et\s+(\S+)/);
    if (between) return { min: parsePriceToken(between[1]), max: parsePriceToken(between[2]) };
    const maxM = n.match(/(?:moins de|max|maximum|pas plus de|jusqu.?a|inferieur a)\s+(\S+)/);
    if (maxM) return { max: parsePriceToken(maxM[1]) };
    const minM = n.match(/(?:plus de|min|minimum|a partir de|superieur a)\s+(\S+)/);
    if (minM) return { min: parsePriceToken(minM[1]) };
    return null;
};

// ─── Formatage prix ────────────────────────────────────────────────────────────
const fmt = (n) => {
    if (!n || n === 0) return 'N/A';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M FCFA';
    if (n >= 1_000) return Math.round(n / 1_000) + 'k FCFA';
    return n.toLocaleString('fr-FR') + ' FCFA';
};

// ─── Rendu markdown simple ─────────────────────────────────────────────────────
const renderText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        return (
            <React.Fragment key={i}>
                {rendered}
                {i < lines.length - 1 && <br />}
            </React.Fragment>
        );
    });
};

// ─── Suggestions rapides ──────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
    'Résumé du portefeuille',
    'Biens disponibles',
    'Visites du jour',
    'Prix moyens par type',
    'Nouveaux prospects',
];

// ─── Composant principal ──────────────────────────────────────────────────────
const ChatAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{
        id: 1, type: 'bot',
        text: '👋 Bonjour ! Je suis votre assistant immobilier connecté en temps réel.\n\nJe peux vous aider avec :\n• Recherche de biens (type, zone, budget)\n• Statistiques du portefeuille\n• Planning des visites\n• Suivi des prospects\n\nTapez **aide** pour voir toutes les commandes.',
    }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const dataCache = useRef({ properties: [], visits: [], clients: [], pipeline: [], requests: [], ts: 0 });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Pre-charger les données à l'ouverture
    useEffect(() => {
        if (!isOpen) return;
        inputRef.current?.focus();
        const now = Date.now();
        if (now - dataCache.current.ts < 5 * 60_000) return; // Cache valide 5 min
        setIsLoadingData(true);
        Promise.all([
            apiService.getProperties(),
            apiService.getVisits(),
            apiService.getClients(),
            apiService.getPipeline(),
            apiService.getRequests(),
        ]).then(([props, visits, clients, pipeline, requests]) => {
            dataCache.current = {
                properties: props.success ? props.data : [],
                visits: visits.success ? visits.data : [],
                clients: clients.success ? clients.data : [],
                pipeline: pipeline.success ? pipeline.data : [],
                requests: requests.success ? requests.data : [],
                ts: Date.now(),
            };
        }).finally(() => setIsLoadingData(false));
    }, [isOpen]);

    const getData = async () => {
        if (dataCache.current.ts > 0 && Date.now() - dataCache.current.ts < 5 * 60_000) {
            return dataCache.current;
        }
        const [props, visits, clients, pipeline, requests] = await Promise.all([
            apiService.getProperties(),
            apiService.getVisits(),
            apiService.getClients(),
            apiService.getPipeline(),
            apiService.getRequests(),
        ]);
        dataCache.current = {
            properties: props.success ? props.data : [],
            visits: visits.success ? visits.data : [],
            clients: clients.success ? clients.data : [],
            pipeline: pipeline.success ? pipeline.data : [],
            requests: requests.success ? requests.data : [],
            ts: Date.now(),
        };
        return dataCache.current;
    };

    const addBot = (text) =>
        setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text }]);

    const dispatchMessage = async (text) => {
        setMessages(prev => [...prev, { id: Date.now(), type: 'user', text }]);
        setIsTyping(true);
        try {
            const response = await processMessage(text);
            addBot(response);
        } catch (err) {
            console.error('Chat Error:', err);
            addBot("Désolé, une erreur est survenue. Réessayez dans un moment.");
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isTyping) return;
        setInput('');
        await dispatchMessage(text);
    };

    const handleSuggestion = (suggestion) => {
        if (isTyping) return;
        dispatchMessage(suggestion);
    };

    const processMessage = async (text) => {
        const n = norm(text);
        const data = await getData();
        const { properties = [], visits = [], clients = [], pipeline = [], requests = [] } = data;

        // ── Salutations ────────────────────────────────────────────────────────
        if (/^(bonjour|bonsoir|salut|hello|cc|coucou|slt|bjr|bpjr|hi|hey)/.test(n)) {
            return `Bonjour ! Comment puis-je vous aider ?\n\nExemples :\n• "Villa disponible à Cocody"\n• "Visites d'aujourd'hui"\n• "Prix moyen des studios"\n• "Combien de prospects ?"`;
        }

        // ── Aide ────────────────────────────────────────────────────────────────
        if (n.includes('aide') || n.includes('help') || n.includes('que sais') || n.includes('que peux')) {
            return `Je peux vous aider avec :\n\n📊 **Statistiques**\n• "Résumé du portefeuille"\n• "Biens par commune"\n• "Prix moyens par type"\n\n🏠 **Recherche de biens**\n• "Villa à Cocody"\n• "Studio moins de 300k"\n• "Appartements entre 200k et 600k"\n• "Biens disponibles à Yopougon"\n\n📅 **Visites**\n• "Visites du jour"\n• "Planning de la semaine"\n\n👥 **Clients & Prospects**\n• "Nouveaux prospects"\n• "Pipeline"\n• "Demandes récentes"`;
        }

        // ── Résumé / Dashboard ─────────────────────────────────────────────────
        if (n.includes('resume') || n.includes('résumé') || n.includes('bilan') || n.includes('synthese') ||
            n.includes('dashboard') || n.includes('tableau de bord') || n.includes('portefeuille')) {
            const dispo = properties.filter(p => p.disponible || p.status === 'Disponible');
            const occupe = properties.length - dispo.length;
            const withPrice = dispo.filter(p => p.rawPrice > 0);
            const avgPrice = withPrice.length
                ? Math.round(withPrice.reduce((a, b) => a + b.rawPrice, 0) / withPrice.length)
                : 0;
            const today = new Date().toISOString().split('T')[0];
            const todayV = visits.filter(v => v.date === today || v.status === "Aujourd'hui").length;
            const newLeads = pipeline.filter(i => i.status === 'leads').length;
            const taux = properties.length ? Math.round((dispo.length / properties.length) * 100) : 0;
            return `📊 **Résumé du portefeuille**\n\n🏠 **Biens**\n  • Total : ${properties.length}\n  • Disponibles : ${dispo.length} (${taux}%)\n  • Occupés/Vendus : ${occupe}\n  • Prix moyen dispo : ${fmt(avgPrice)}\n\n📅 **Visites**\n  • Aujourd'hui : ${todayV}\n  • Total programmées : ${visits.filter(v => v.visiteProg).length}\n\n📩 **Demandes** : ${requests.length}\n\n👥 **Pipeline** : ${pipeline.length} contacts\n  • Nouveaux leads : ${newLeads}`;
        }

        // ── Visites ─────────────────────────────────────────────────────────────
        if (n.includes('visite') || n.includes('rendez-vous') || n.includes(' rdv') || n.startsWith('rdv') ||
            n.includes('agenda') || n.includes('planning') || n.includes('calendrier') || n.includes('aujourd')) {
            if (visits.length === 0) return "Aucune visite enregistrée pour le moment.";
            const today = new Date().toISOString().split('T')[0];
            const todayV = visits.filter(v => v.date === today || v.status === "Aujourd'hui");
            const upcoming = visits.filter(v => v.visiteProg && v.dateRv).slice(0, 5);
            let resp = `📅 **Planning des visites**\n\n• Aujourd'hui : **${todayV.length} visite(s)**\n• Programmées : ${visits.filter(v => v.visiteProg).length} / ${visits.length} total\n`;
            if (todayV.length > 0) {
                resp += `\n**Aujourd'hui :**\n`;
                todayV.slice(0, 4).forEach(v => {
                    resp += `  • ${v.nomPrenom || 'Client'} → ${v.localInteresse || v.refBien || '?'}\n`;
                });
            }
            if (upcoming.length > 0) {
                resp += `\n**Prochains RDV :**\n`;
                upcoming.slice(0, 4).forEach(v => {
                    resp += `  • ${v.nomPrenom || 'Client'} — ${v.dateRv} (${v.localInteresse || '?'})\n`;
                });
            }
            return resp.trim();
        }

        // ── Demandes ────────────────────────────────────────────────────────────
        if (n.includes('demande') || n.includes('requete') || n.includes('requête') ||
            n.includes('message') && n.includes('client')) {
            const groups = requests.filter(r => (r.groupe || '').includes('@g.us'));
            const privates = requests.filter(r => (r.groupe || '').includes('@c.us'));
            const recent = requests.slice(0, 4);
            let resp = `📩 **Demandes reçues**\n\n• Total : **${requests.length}**\n• Groupes WhatsApp : ${groups.length}\n• Messages privés : ${privates.length}\n`;
            if (recent.length > 0) {
                resp += `\n**Dernières demandes :**\n`;
                recent.forEach(r => {
                    const preview = (r.message || r.description || '').substring(0, 70).replace(/\n/g, ' ');
                    resp += `  • ${r.expediteur || 'Inconnu'} : "${preview}..."\n`;
                });
            }
            return resp.trim();
        }

        // ── Pipeline / Prospects ─────────────────────────────────────────────────
        if (n.includes('prospect') || n.includes('lead') || n.includes('pipeline') ||
            n.includes('client') || n.includes('contact')) {
            const stages = {};
            pipeline.forEach(p => { stages[p.status] = (stages[p.status] || 0) + 1; });
            const labels = { leads: '🆕 Nouveaux', contacted: '📞 Contactés', visit: '🏠 Visite', offer: '💼 Offre', closed: '✅ Clôturés' };
            let resp = `👥 **Pipeline clients**\n\n• Pipeline total : **${pipeline.length}** contacts\n• Clients enregistrés : ${clients.length}\n`;
            const entries = Object.entries(stages);
            if (entries.length > 0) {
                resp += `\n**Par étape :**\n`;
                entries.forEach(([stage, count]) => {
                    resp += `  ${labels[stage] || stage} : ${count}\n`;
                });
            }
            return resp.trim();
        }

        // ── Répartition par commune ──────────────────────────────────────────────
        if (n.includes('commune') || n.includes('par zone') || n.includes('par quartier') ||
            n.includes('repartition') || n.includes('répartition') ||
            (n.includes('top') && (n.includes('zone') || n.includes('ville')))) {
            const counts = {};
            properties.forEach(p => {
                const key = p.commune || p.zone || 'Non défini';
                counts[key] = (counts[key] || 0) + 1;
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            let resp = `🗺️ **Biens par commune**\n\n`;
            sorted.forEach(([name, count]) => {
                const bar = '█'.repeat(Math.min(Math.round(count / properties.length * 20), 10));
                resp += `  • ${name} : ${count} bien(s) ${bar}\n`;
            });
            return resp.trim();
        }

        // ── Prix moyens par type ─────────────────────────────────────────────────
        if ((n.includes('prix') || n.includes('moyen') || n.includes('tarif') || n.includes('cout') || n.includes('coût')) &&
            !detectType(text) && !detectZone(text) && !detectPriceFilter(text)) {
            const withPrice = properties.filter(p => p.rawPrice > 0);
            if (withPrice.length === 0) return "Pas assez de données de prix disponibles.";
            const byType = {};
            withPrice.forEach(p => {
                const t = p.typeBien || 'Autre';
                if (!byType[t]) byType[t] = [];
                byType[t].push(p.rawPrice);
            });
            const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
            const sorted = Object.entries(byType)
                .filter(([, arr]) => arr.length >= 1)
                .sort((a, b) => avg(b[1]) - avg(a[1]))
                .slice(0, 7);
            const globalAvg = avg(withPrice.map(p => p.rawPrice));
            let resp = `💰 **Prix moyens par type de bien**\n\n`;
            sorted.forEach(([type, prices]) => {
                resp += `  • ${type} : **${fmt(avg(prices))}** (${prices.length} biens)\n`;
            });
            resp += `\n📊 Moyenne globale : **${fmt(globalAvg)}**`;
            return resp.trim();
        }

        // ── Biens récents ─────────────────────────────────────────────────────────
        if (n.includes('recent') || n.includes('nouveau') || n.includes('derniers biens') || n.includes('ajout')) {
            const recent = properties.slice(0, 6);
            if (recent.length === 0) return "Aucun bien enregistré pour le moment.";
            let resp = `🆕 **Derniers biens ajoutés**\n\n`;
            recent.forEach(p => {
                const loc = [p.commune, p.quartier].filter(Boolean).join(', ') || p.zone || '?';
                const statut = (p.disponible || p.status === 'Disponible') ? '✅' : '🔒';
                resp += `${statut} ${p.typeBien} — ${loc} — **${fmt(p.rawPrice)}**\n`;
            });
            return resp.trim();
        }

        // ── Recherche de biens (type + zone + budget) ─────────────────────────────
        const detectedType = detectType(text);
        const detectedZone = detectZone(text);
        const priceFilter = detectPriceFilter(text);
        const isSearch = detectedType || detectedZone || priceFilter ||
            ['disponible', 'dispo', 'stock', 'louer', 'vendre', 'vente', 'location', 'cherche', 'chercher', 'trouve'].some(k => n.includes(k));

        if (isSearch) {
            let filtered = [...properties];
            // Disponibilité
            if (n.includes('dispo') || n.includes('disponible') || n.includes('louer') || n.includes('location')) {
                filtered = filtered.filter(p => p.disponible || p.status === 'Disponible');
            }
            // Type
            if (detectedType) {
                filtered = filtered.filter(p => norm(p.typeBien).includes(norm(detectedType)));
            }
            // Zone
            if (detectedZone) {
                filtered = filtered.filter(p =>
                    norm(p.commune).includes(norm(detectedZone)) ||
                    norm(p.zone).includes(norm(detectedZone)) ||
                    norm(p.quartier).includes(norm(detectedZone)) ||
                    norm(p.locationLabel).includes(norm(detectedZone))
                );
            }
            // Prix
            if (priceFilter?.min) filtered = filtered.filter(p => p.rawPrice >= priceFilter.min);
            if (priceFilter?.max) filtered = filtered.filter(p => p.rawPrice > 0 && p.rawPrice <= priceFilter.max);

            // Description de la recherche
            let desc = '';
            if (detectedType) desc += ` ${detectedType}`;
            if (detectedZone) desc += ` à ${detectedZone}`;
            if (priceFilter?.max) desc += ` ≤ ${fmt(priceFilter.max)}`;
            if (priceFilter?.min) desc += ` ≥ ${fmt(priceFilter.min)}`;

            if (filtered.length === 0) {
                return `Aucun bien${desc} trouvé dans la base.\n\nEssayez sans filtres ou avec d'autres critères.`;
            }

            const dispoCount = filtered.filter(p => p.disponible || p.status === 'Disponible').length;
            let resp = `🏠 **${filtered.length} bien(s)${desc}** (${dispoCount} disponibles)\n\n`;
            filtered.slice(0, 7).forEach(p => {
                const loc = [p.commune, p.quartier].filter(Boolean).join(', ') || p.zone || '?';
                const statut = (p.disponible || p.status === 'Disponible') ? '✅' : '🔒';
                resp += `${statut} **${p.typeBien}** — ${loc}\n`;
                resp += `   💰 ${fmt(p.rawPrice)}`;
                if (p.chambres > 0) resp += `  🛏 ${p.chambres} ch.`;
                if (p.refBien) resp += `  (${p.refBien})`;
                resp += '\n';
            });
            if (filtered.length > 7) resp += `\n_...et ${filtered.length - 7} autre(s). Affinez votre recherche._`;
            return resp.trim();
        }

        // ── Comptage rapide ────────────────────────────────────────────────────────
        if (n.includes('combien') || n.includes('nombre') || n.includes('total') || n.includes('count') ||
            n.includes('stock') || n.includes('biens disponibles')) {
            const dispo = properties.filter(p => p.disponible || p.status === 'Disponible');
            return `📊 **Stock actuel**\n\n• Biens total : **${properties.length}**\n• Disponibles : ${dispo.length}\n• Occupés/Vendus : ${properties.length - dispo.length}\n• Visites : ${visits.length}\n• Demandes : ${requests.length}\n• Pipeline : ${pipeline.length} contacts`;
        }

        // ── Politesse ─────────────────────────────────────────────────────────────
        if (n.includes('merci') || n.includes('super') || n.includes('parfait') || n.includes('bravo') || n.includes('bien')) {
            return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. 😊";
        }

        // ── Fallback ───────────────────────────────────────────────────────────────
        return `Je n'ai pas bien compris. Essayez :\n• "**Villa à Cocody**"\n• "**Visites du jour**"\n• "**Prix moyen des appartements**"\n• "**Nouveaux prospects**"\n\nTapez **aide** pour voir toutes les fonctionnalités.`;
    };

    return (
        <>
            <motion.button
                className={`chat-fab${isOpen ? ' is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && <span className="chat-badge"><Sparkles size={12} /></span>}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chat-window"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    >
                        <div className="chat-header">
                            <div className="chat-title">
                                <Bot size={20} />
                                <span>Assistant IA</span>
                                {isLoadingData && (
                                    <RefreshCw size={12} className="chat-loading-icon" title="Chargement des données..." />
                                )}
                            </div>
                            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message ${msg.type}`}>
                                    <div className="message-content">
                                        {renderText(msg.text)}
                                    </div>
                                    <div className="message-avatar">
                                        {msg.type === 'bot' ? <Bot size={14} /> : <User size={14} />}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="message bot typing">
                                    <div className="typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestions rapides — affichées uniquement au début */}
                        {messages.length <= 2 && (
                            <div className="chat-suggestions">
                                {QUICK_SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        className="suggestion-chip"
                                        onClick={() => handleSuggestion(s)}
                                        disabled={isTyping}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form className="chat-input-area" onSubmit={handleSend}>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Posez une question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" disabled={!input.trim() || isTyping}>
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatAssistant;
