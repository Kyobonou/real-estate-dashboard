import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Search, Home, Map, Key, ShieldCheck } from 'lucide-react';
import './PublicServices.css';

const PublicServices = () => {
    const services = [
        {
            icon: <Search size={40} />,
            title: "Recherche sur Mesure",
            description: "Nous trouvons le bien qui correspond exactement à vos critères. De la location d'appartements à l'achat de villas de luxe, nous vous accompagnons dans chaque étape."
        },
        {
            icon: <Building size={40} />,
            title: "Vente & Location",
            description: "Vous souhaitez vendre ou louer votre bien ? Nous estimons votre propriété à sa juste valeur et la mettons en avant auprès d'acquéreurs ou locataires qualifiés."
        },
        {
            icon: <ShieldCheck size={40} />,
            title: "Gestion Locative",
            description: "Confiez-nous la gestion de vos biens immobiliers. Nous nous occupons de tout : recherche de locataires, perception des loyers, gestion des travaux et administration."
        },
        {
            icon: <Map size={40} />,
            title: "Expertise de Secteur",
            description: "Grâce à notre parfaite connaissance du marché abidjanais et ivoirien, nous vous conseillons sur les meilleurs quartiers pour investir ou habiter."
        },
        {
            icon: <Key size={40} />,
            title: "Clé en Main",
            description: "Un accompagnement personnalisé de la première visite jusqu'à la remise des clés et la signature chez le notaire."
        },
        {
            icon: <Home size={40} />,
            title: "Conseil en Investissement",
            description: "Optimisez votre patrimoine grâce à nos conseils d'experts sur les investissements immobiliers rentables à court et long terme."
        }
    ];

    return (
        <motion.div
            className="public-services"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <section className="services-header">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Nos <span className="text-gradient">Services</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    Découvrez l'ensemble des prestations que nous proposons pour réaliser vos projets immobiliers.
                </motion.p>
            </section>

            <section className="services-main">
                <div className="services-container">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            className="detailed-service-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="detailed-service-icon">
                                {service.icon}
                            </div>
                            <h3>{service.title}</h3>
                            <p>{service.description}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    className="services-cta"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <h2>Un projet en tête ?</h2>
                    <p>Parlons-en dès aujourd'hui et donnez vie à vos projets avec notre équipe d'experts.</p>
                    <Link to="/contact" className="btn-primary">Contactez-nous</Link>
                </motion.div>
            </section>
        </motion.div>
    );
};

export default PublicServices;
