import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Calendar, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = ({ onClose }) => {
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const navigate = useNavigate();

    const handleItemClick = (notification) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'visit': return <Calendar size={16} className="text-indigo" />;
            case 'system': return <Info size={16} className="text-blue" />;
            case 'alert': return <AlertTriangle size={16} className="text-orange" />;
            default: return <Bell size={16} className="text-gray" />;
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            className="notification-panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
        >
            <div className="panel-header">
                <h3>Notifications</h3>
                {notifications.length > 0 && (
                    <div className="actions">
                        <button onClick={markAllAsRead} title="Tout marquer comme lu">
                            <Check size={16} />
                        </button>
                        <button onClick={clearAll} title="Tout effacer">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className="notification-list">
                <AnimatePresence>
                    {notifications.length > 0 ? (
                        notifications.map((note) => (
                            <motion.div
                                key={note.id}
                                className={`notification-item ${!note.read ? 'unread' : ''}`}
                                onClick={() => handleItemClick(note)}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className={`icon-wrapper ${note.type}`}>
                                    {getIcon(note.type)}
                                </div>
                                <div className="content">
                                    <h4>{note.title}</h4>
                                    <p>{note.message}</p>
                                    <span className="time">{formatDate(note.date)}</span>
                                </div>
                                {!note.read && <div className="dot"></div>}
                            </motion.div>
                        ))
                    ) : (
                        <div className="empty-state-panel">
                            <Bell size={32} />
                            <p>Aucune notification</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx>{`
                .notification-panel {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    width: 360px;
                    max-width: 90vw; /* Responsive width */
                    background: var(--glass-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    z-index: 1000;
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    max-height: 480px;
                    overflow: hidden;
                }

                @media (max-width: 480px) {
                    .notification-panel {
                        position: fixed; /* Fixed on mobile for better visibility */
                        top: 70px; /* Below header */
                        left: 50%;
                        transform: translateX(-50%);
                        right: auto;
                        width: 95vw;
                        max-width: 360px;
                    }
                }

                .panel-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(var(--bg-primary-rgb), 0.8);
                }

                .panel-header h3 {
                    font-size: 0.9375rem;
                    font-weight: 700;
                    margin: 0;
                }

                .actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .actions button {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .actions button:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--text-primary);
                }

                .notification-list {
                    overflow-y: auto;
                    flex: 1;
                    padding: 0.5rem;
                }

                .notification-item {
                    display: flex;
                    gap: 1rem;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: background 0.2s;
                    position: relative;
                }

                .notification-item:hover {
                    background: rgba(255,255,255,0.05);
                }

                .notification-item.unread {
                    background: rgba(102, 126, 234, 0.05);
                }

                .icon-wrapper {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: var(--bg-secondary);
                }

                .icon-wrapper.visit { background: rgba(102, 126, 234, 0.1); color: #667eea; }
                .icon-wrapper.system { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .icon-wrapper.alert { background: rgba(249, 115, 22, 0.1); color: #f97316; }

                .content {
                    flex: 1;
                    min-width: 0; /* Text truncation fix */
                }

                .content h4 {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                    color: var(--text-primary);
                }

                .content p {
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                    margin: 0 0 0.25rem 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .time {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }

                .dot {
                    width: 8px;
                    height: 8px;
                    background: var(--primary);
                    border-radius: 50%;
                    position: absolute;
                    top: 1rem;
                    right: 0.75rem;
                }

                .empty-state-panel {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 1rem;
                    color: var(--text-muted);
                    gap: 0.5rem;
                }

                /* Scrollbar */
                .notification-list::-webkit-scrollbar {
                    width: 4px;
                }
                .notification-list::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                }
            `}</style>
        </motion.div>
    );
};

export default NotificationPanel;
