import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (token && savedUser && apiService.validateToken(token)) {
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const result = await apiService.login(email, password);

        if (result.success) {
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('auth_user', JSON.stringify(result.user));
            setUser(result.user);
            setIsAuthenticated(true);
            return { success: true };
        }

        return { success: false, error: result.error };
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setUser(null);
        setIsAuthenticated(false);
        apiService.stopPolling();
    }, []);

    const updateUser = useCallback((updates) => {
        const updated = { ...user, ...updates };
        setUser(updated);
        localStorage.setItem('auth_user', JSON.stringify(updated));
    }, [user]);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
