import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import './PublicContact.css';

const PublicContact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here we could integrate with an API to send the email
        // For now, let's just use WhatsApp as the primary contact method
        const text = `Nouveau message de ${formData.name} (${formData.phone} / ${formData.email}): ${formData.message}`;
        window.open(`https://wa.me/22500000000?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <motion.div
            className="public-contact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <section className="contact-header">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="text-gradient">Contactez-nous</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    Notre équipe est à votre disposition pour vous accompagner dans votre projet immobilier.
                </motion.p>
            </section>

            <section className="contact-main">
                <div className="contact-container">
                    <motion.div
                        className="contact-info"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2>Nos Coordonnées</h2>
                        <p>N'hésitez pas à nous joindre directement ou à venir nous rencontrer en agence.</p>

                        <div className="info-item">
                            <div className="icon-wrapper"><MapPin size={24} /></div>
                            <div>
                                <h3>Adresse</h3>
                                <p>Abidjan, Côte d'Ivoire</p>
                            </div>
                        </div>

                        <div className="info-item">
                            <div className="icon-wrapper"><Phone size={24} /></div>
                            <div>
                                <h3>Téléphone</h3>
                                <p>+225 00 00 00 00 00</p>
                            </div>
                        </div>

                        <div className="info-item">
                            <div className="icon-wrapper"><Mail size={24} /></div>
                            <div>
                                <h3>Email</h3>
                                <p>contact@votreagence.ci</p>
                            </div>
                        </div>

                        <div className="business-hours">
                            <h3>Heures d'ouverture</h3>
                            <ul>
                                <li><span>Lundi - Vendredi:</span> 08:00 - 18:00</li>
                                <li><span>Samedi:</span> 09:00 - 14:00</li>
                                <li><span>Dimanche:</span> Fermé</li>
                            </ul>
                        </div>
                    </motion.div>

                    <motion.div
                        className="contact-form-wrapper"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2>Envoyez-nous un message</h2>
                        <form onSubmit={handleSubmit} className="contact-form">
                            <div className="form-group">
                                <label>Nom complet</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Votre nom"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Votre email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Téléphone</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Votre numéro"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Message</label>
                                <textarea
                                    required
                                    rows="5"
                                    placeholder="Comment pouvons-nous vous aider ?"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                ></textarea>
                            </div>

                            <button type="submit" className="btn-primary">
                                <Send size={20} /> Envoyer via WhatsApp
                            </button>
                        </form>
                    </motion.div>
                </div>
            </section>
        </motion.div>
    );
};

export default PublicContact;
