import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial load from storage + generate dynamic ones
    useEffect(() => {
        loadNotifications();

        // Listen for data updates to regenerate notifications
        const unsubscribe = apiService.subscribe('dataUpdate', (data) => {
            if (data.visits) {
                generateVisitNotifications(data.visits);
            }
            if (data.stats) {
                // Example system notification
                addSystemNotification({
                    id: `sys-update-${Date.now()}`,
                    title: 'Données mises à jour',
                    message: 'Les données du tableau de bord ont été actualisées.',
                    type: 'system',
                    date: new Date().toISOString()
                });
            }
        });

        return () => unsubscribe();
    }, []);

    // Recalculate unread count whenever notifications change
    useEffect(() => {
        const count = notifications.filter(n => !n.read).length;
        setUnreadCount(count);
        saveNotifications(notifications);
    }, [notifications]);

    const loadNotifications = () => {
        try {
            const saved = localStorage.getItem('immodash_notifications');
            if (saved) {
                setNotifications(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load notifications', e);
        }
    };

    const saveNotifications = (notes) => {
        try {
            // Limit history to last 50
            const toSave = notes.slice(0, 50);
            localStorage.setItem('immodash_notifications', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save notifications', e);
        }
    };

    const generateVisitNotifications = (visits) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const newAlerts = [];

        visits.forEach(visit => {
            if (!visit.parsedDate) return;

            const visitDate = new Date(visit.parsedDate);
            const isToday = isSameDay(visitDate, today);
            const isTomorrow = isSameDay(visitDate, tomorrow);

            if (isToday) {
                const id = `visit-today-${visit.id}`;
                if (!hasNotification(id)) {
                    newAlerts.push({
                        id,
                        title: 'Visite Aujourd\'hui',
                        message: `Visite avec ${visit.nomPrenom} à ${formatTime(visitDate)}`,
                        type: 'visit',
                        date: new Date().toISOString(),
                        read: false,
                        link: '/visits'
                    });
                }
            } else if (isTomorrow) {
                const id = `visit-tomorrow-${visit.id}`;
                if (!hasNotification(id)) {
                    newAlerts.push({
                        id,
                        title: 'Visite Demain',
                        message: `Préparez la visite avec ${visit.nomPrenom}`,
                        type: 'info',
                        date: new Date().toISOString(),
                        read: false,
                        link: '/visits'
                    });
                }
            }
        });

        if (newAlerts.length > 0) {
            setNotifications(prev => [...newAlerts, ...prev]);
        }
    };

    const addSystemNotification = (note) => {
        // Prevent duplicate system messages within short timeframe (e.g. 5s)
        /* 
           Simple dedupe logic: check 5 most recent notifications 
           for same title & type within 5 seconds 
        */
        setNotifications(prev => {
            const isDuplicate = prev.slice(0, 5).some(n =>
                n.title === note.title &&
                n.type === note.type &&
                (new Date() - new Date(n.date)) < 5000
            );

            if (isDuplicate) return prev;
            return [{ ...note, read: false }, ...prev];
        });
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    // Helpers
    const hasNotification = (id) => {
        return notifications.some(n => n.id === id);
    };

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const value = {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        addSystemNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
