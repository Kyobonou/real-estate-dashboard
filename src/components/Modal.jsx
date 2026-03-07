// Modal Component
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, size = 'md', navContent, variant = 'modal' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className={`modal-overlay ${variant}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <div className={`modal-wrapper ${variant}`} onClick={onClose}>
                        <motion.div
                            className={`modal modal-${size} modal-${variant}`}
                            initial={variant === 'side-panel' ? { opacity: 0, x: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
                            animate={variant === 'side-panel' ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={variant === 'side-panel' ? { opacity: 0, x: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>{title}</h3>
                                {navContent && (
                                    <div className="modal-nav-inline">{navContent}</div>
                                )}
                                <button className="modal-close" onClick={onClose}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;
