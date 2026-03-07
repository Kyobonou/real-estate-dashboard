import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import './ConfettiEffect.css';

const ConfettiEffect = ({ isActive, onComplete }) => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (isActive) {
            // Create particles
            const newParticles = Array.from({ length: 40 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
                size: Math.random() * 8 + 4
            }));
            setParticles(newParticles);

            const timer = setTimeout(() => {
                setParticles([]);
                if (onComplete) onComplete();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    return (
        <AnimatePresence>
            {isActive && (
                <div className="confetti-overlay">
                    <motion.div
                        className="success-check-circle"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                    >
                        <Check size={48} strokeWidth={3} />
                    </motion.div>

                    {particles.map(p => (
                        <motion.div
                            key={p.id}
                            className="confetti-particle"
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                                x: p.x * 4,
                                y: p.y * 4 - 100,
                                opacity: 0,
                                scale: 0,
                                rotate: Math.random() * 360
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{
                                backgroundColor: p.color,
                                width: p.size,
                                height: p.size,
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                            }}
                        />
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfettiEffect;
