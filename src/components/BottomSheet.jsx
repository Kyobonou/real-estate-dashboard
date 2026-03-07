import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { hapticLight, hapticMedium } from '../utils/haptics';
import './BottomSheet.css';

const BottomSheet = ({ isOpen, onClose, title, children }) => {
    // Disable body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            hapticMedium();     // vibration douce à l'ouverture
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleClose = () => {
        hapticLight();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="bottom-sheet-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />
                    <motion.div
                        className="bottom-sheet-content"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) {
                                hapticLight();  // vibration légère au swipe-dismiss
                                onClose();
                            }
                        }}
                    >
                        <div className="bottom-sheet-handle-wrapper">
                            <div className="bottom-sheet-handle" />
                        </div>

                        <div className="bottom-sheet-header">
                            <h3>{title}</h3>
                            <button className="btn-close-circle" onClick={handleClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bottom-sheet-body">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
