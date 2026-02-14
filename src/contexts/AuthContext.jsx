import React, { createContext, useContext, useState, useCallback } from 'react';
import { getPermissions, hasPermission } from '../services/roleService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

// User par défaut (accès libre)
const DEFAULT_USER = {
    uid: 'default-user',
    email: 'user@immodash.local',
    name: 'Utilisateur',
    avatar: 'U',
    role: 'admin',
    permissions: getPermissions('admin'),
};

export const AuthProvider = ({ children }) => {
    // Par défaut, utilisateur connecté en tant qu'admin
    const [user] = useState(DEFAULT_USER);
    const [loading] = useState(false);

    const login = useCallback(async () => {
        // Pas besoin de login - accès libre
        return { success: true };
    }, []);

    const logout = useCallback(async () => {
        // Pas besoin de logout
    }, []);

    const canAccess = useCallback((path) => {
        // Accès libre à toutes les pages
        return true;
    }, []);

    const can = useCallback((action) => {
        // Toutes les permissions
        return true;
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated: true,
        login,
        loginWithGoogle: () => ({ success: true }),
        logout,
        canAccess,
        can
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
