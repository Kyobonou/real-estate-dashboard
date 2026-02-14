import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

// Hardcoded roles for legacy support/demo users
const ROLE_MAPPING = {
    'admin@immodash.ci': { role: 'admin', name: 'Agent Immo', avatar: 'AI' },
    'agent@immodash.ci': { role: 'agent', name: 'Agent Terrain', avatar: 'AT' },
    'demo@immodash.ci': { role: 'viewer', name: 'Utilisateur Demo', avatar: 'UD' }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Map Firebase user to App User with Roles
                // Check if user exists in legacy mapping, otherwise default to viewer
                const metadata = ROLE_MAPPING[firebaseUser.email] || {
                    role: 'viewer',
                    name: firebaseUser.displayName || 'Utilisateur',
                    avatar: (firebaseUser.displayName || 'U').charAt(0).toUpperCase()
                };

                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...metadata
                });
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
                // Clear any legacy local storage if present
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            let errorMessage = "Échec de la connexion";

            // Map Firebase error codes to user-friendly messages
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = "Adresse email invalide";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "Ce compte a été désactivé";
                    break;
                case 'auth/user-not-found':
                    errorMessage = "Aucun utilisateur trouvé avec cet email";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Mot de passe incorrect";
                    break;
                case 'auth/invalid-credential':
                    errorMessage = "Email ou mot de passe incorrect";
                    break;
                default:
                    errorMessage = error.message;
            }

            return { success: false, error: errorMessage };
        }
    }, []);

    const loginWithGoogle = useCallback(async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            return { success: true };
        } catch (error) {
            console.error("Google login failed:", error);
            return { success: false, error: error.message };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            apiService.stopPolling();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, []);

    const updateUser = useCallback((updates) => {
        // Only updates local state for the session, mostly for UI preferences
        if (user) {
            setUser(prev => ({ ...prev, ...updates }));
        }
    }, [user]);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        loginWithGoogle,
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
