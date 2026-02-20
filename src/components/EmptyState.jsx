import React from 'react';
import { motion } from 'framer-motion';
import './EmptyState.css';

/**
 * EmptyState Component
 * Displays when no data is available with icon, message, and optional action
 */
const EmptyState = ({
    icon: Icon,
    title = 'Aucune donnée',
    description = '',
    actionLabel,
    onAction,
    size = 'medium'
}) => {
    return (
        <motion.div
            className={`empty-state empty-state-${size}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="empty-state-icon">
                {Icon && <Icon size={size === 'large' ? 64 : 48} />}
            </div>

            <h3 className="empty-state-title">{title}</h3>

            {description && (
                <p className="empty-state-description">{description}</p>
            )}

            {actionLabel && onAction && (
                <button
                    className="btn btn-primary empty-state-action"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </motion.div>
    );
};

export default EmptyState;
