import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <Loader className="spinner" size={32} color="var(--primary)" />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Vérification de l'accès...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Vérifier les rôles si spécifiés
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role || 'viewer';
        if (!allowedRoles.includes(userRole)) {
            // Rediriger vers la page d'accueil si pas le bon rôle
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
