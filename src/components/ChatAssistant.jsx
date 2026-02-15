import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/api';
import './ChatAssistant.css';

const ChatAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: 'Bonjour ! Je suis connecté à vos données en temps réel. Posez-moi une question sur vos visites, vos biens ou vos leads.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // Store context for follow-up
    const messagesEndRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const responseText = await processMessage(userMsg.text);
            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: responseText }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "Désolé, j'ai eu un problème pour accéder aux données." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const processMessage = async (text) => {
        const lower = text.toLowerCase();

        // --- HANDLE FOLLOW-UPS (Context) ---
        if (pendingAction) {
            if (['oui', 'yes', 'ok', 'd\'accord', 'vas-y'].some(w => lower.includes(w))) {
                const action = pendingAction;
                setPendingAction(null); // Clear context

                if (action.type === 'SHOW_PROPERTIES') {
                    let list = action.data.map(p => `- ${p.typeBien} à ${p.commune || p.zone} (${apiService.formatPrice(p.rawPrice)})`).join('\n');
                    if (list.length > 500) list = list.substring(0, 500) + '... (liste tronquée)';
                    return `Voici les biens trouvés :\n${list}`;
                }
            } else if (['non', 'no', 'pas la peine'].some(w => lower.includes(w))) {
                setPendingAction(null);
                return "Entendu. Autre chose ?";
            }
        }

        try {
            // --- VISITES (Detailed) ---
            if (lower.includes('visite') || lower.includes('rendez-vous') || lower.includes('agenda') || lower.includes('planning')) {
                const res = await apiService.getVisits();
                if (!res.success) return "Je n'arrive pas à accéder aux visites pour le moment.";

                const visits = res.data || [];
                const today = new Date().toISOString().split('T')[0];
                const todayVisits = visits.filter(v => v.date === today || v.status === "Aujourd'hui");
                const upcoming = visits.filter(v => v.visiteProg).slice(0, 3); // Next 3 visits

                let response = `Vous avez ${todayVisits.length} visite(s) aujourd'hui.`;

                if (upcoming.length > 0) {
                    response += " \nProchains rendez-vous :";
                    upcoming.forEach(v => {
                        response += `\n- ${v.nomPrenom} (${v.localInteresse || '?'}) - ${v.dateRv || 'Date à confirmer'}`;
                    });
                } else {
                    response += " Aucune visite programmée à venir.";
                }
                return response;
            }

            // --- BIENS / STOCKS (Broader Search) ---
            const propertyKeywords = ['bien', 'maison', 'appart', 'studio', 'villa', 'terrain', 'duplex', 'immeuble', 'entrepôt', 'bureau', 'magasin'];
            const searchActions = ['chercher', 'cherche', 'trouve', 'voir', 'montre', 'avez', 'tu as', 'dispo', 'stock'];

            // Check if query contains ANY property type OR any search action
            if (propertyKeywords.some(k => lower.includes(k)) || searchActions.some(k => lower.includes(k))) {
                const res = await apiService.getProperties();
                if (!res.success) return "Désolé, je ne peux pas accéder à la liste des biens.";

                const properties = res.data || [];

                // Detect Type
                const type = propertyKeywords.find(t => lower.includes(t)) || '';

                // Detect Zone (Expanded list)
                const zones = ['cocody', 'plateau', 'marcory', 'koumassi', 'yopougon', 'riviera', 'biétry', 'zone 4', 'palm', 'bingerville', 'adjame', 'treichville'];
                const zone = zones.find(z => lower.includes(z));

                let filtered = properties.filter(p => p.status === 'Disponible' || p.disponible);

                // Apply filters if detected
                if (type && type !== 'bien' && type !== 'stock') {
                    filtered = filtered.filter(p => p.typeBien.toLowerCase().includes(type));
                }
                if (zone) {
                    filtered = filtered.filter(p => (p.zone || '').toLowerCase().includes(zone) || (p.commune || '').toLowerCase().includes(zone));
                }

                if (type || zone) {
                    // STORE CONTEXT FOR FOLLOW-UP
                    setPendingAction({ type: 'SHOW_PROPERTIES', data: filtered });
                    return `J'ai trouvé ${filtered.length} ${type || 'biens'} disponible(s)${zone ? ` à ${zone}` : ''}. ${filtered.length > 0 ? 'Voulez-vous voir la liste ?' : ''}`;
                }

                return `Nous avons actuellement ${properties.length} biens au total, dont ${filtered.length} disponibles. Dites par exemple "Chercher Villa à Cocody".`;
            }

            // --- PRIX / ESTIMATION ---
            if (lower.includes('prix') || lower.includes('combien') || lower.includes('budget') || lower.includes('valeur')) {
                const res = await apiService.getProperties();
                if (!res.success) return "Erreur lors du calcul des prix.";

                const properties = res.data || [];
                const available = properties.filter(p => (p.status === 'Disponible' || p.disponible) && p.rawPrice > 0);

                if (available.length === 0) return "Je n'ai pas assez de données pour calculer un prix moyen.";

                const avgPrice = available.reduce((acc, curr) => acc + curr.rawPrice, 0) / available.length;
                return `Le prix moyen des biens disponibles est de ${apiService.formatPrice(Math.round(avgPrice))}.`;
            }

            // --- PIPELINE / CLIENTS (Search) ---
            if (lower.includes('client') || lower.includes('prospect') || lower.includes('lead')) {
                const res = await apiService.getPipeline();
                if (!res.success) return "Impossible d'accéder au pipeline.";

                const newLeads = res.data ? res.data.filter(i => i.status === 'leads').length : 0;
                return `Vous avez ${newLeads} nouveaux prospects à traiter dans le pipeline.`;
            }

            // --- GENERIC ---
            if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello') || lower.includes('cc')) return "Bonjour ! Je suis connecté à votre base de données immobilière. Que cherchez-vous ?";
            if (lower.includes('merci')) return "Avec plaisir !";
            if (lower.includes('aide')) return "Je peux vous donner des infos sur : vos visites ('agenda'), vos biens ('maison à cocody'), ou vos leads ('prospects').";

            return "Je ne suis pas sûr de comprendre. Essayez 'Combien de visites aujourd'hui ?' ou 'Chercher Studio'.";

        } catch (e) {
            console.error("Bot Error:", e);
            return "Une erreur est survenue lors du traitement de votre demande.";
        }
    };

    return (
        <>
            <motion.button
                className="chat-fab"
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
                            </div>
                            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message ${msg.type}`}>
                                    <div className="message-content">
                                        {msg.text}
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

                        <form className="chat-input-area" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="Posez une question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" disabled={!input.trim()}>
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
