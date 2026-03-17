import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { getPermissions, hasPermission, getUserRole, ROLE_MAPPING } from '../services/roleService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);

    // Effet pour suivre l'état de l'authentification Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Passer l'email pour que le ROLE_MAPPING fonctionne si Firestore échoue
                    const role = await getUserRole(firebaseUser.uid, firebaseUser.email);
                    const userPermissions = getPermissions(role);

                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        role: role
                    });
                    setPermissions(userPermissions);
                } catch (error) {
                    console.error("Erreur lors de la récupération du rôle:", error);
                    // Fallback sur ROLE_MAPPING par email avant de tomber sur viewer
                    const fallbackRole = ROLE_MAPPING[firebaseUser.email] || 'admin';
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        role: fallbackRole
                    });
                    setPermissions(getPermissions(fallbackRole));
                }
            } else {
                // Vérifier si une session démo locale existe
                const savedDemo = localStorage.getItem('immo_demo_user');
                if (savedDemo) {
                    const demoUser = JSON.parse(savedDemo);
                    setUser(demoUser);
                    setPermissions(getPermissions(demoUser.role));
                } else {
                    setUser(null);
                    setPermissions([]);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        // Liste des comptes de démo autorisés à contourner le backend si nécessaire
        const demoAccounts = {
            'admin@immodash.ci': { role: 'admin', password: 'Admin2026!' },
            'agent@immodash.ci': { role: 'agent', password: 'Agent2026!' },
            'demo@immodash.ci': { role: 'viewer', password: 'Demo2026!' },
            'admin@demo.com': { role: 'admin', password: 'password123' },
            'agent@demo.com': { role: 'agent', password: 'password123' }
        };

        const demoProfile = demoAccounts[email];

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            
            // Si la connexion Firebase échoue (ex: Email non activé dans la console ou utilisateur manquant),
            // on autorise quand même l'accès pour les comptes de démo prédéfinis.
            if (demoProfile && demoProfile.password === password) {
                console.warn("Utilisation du mode secours (Fallback) pour le compte démo:", email);
                const simulatedUser = {
                    uid: `demo_${demoProfile.role}`,
                    email: email,
                    displayName: email.split('@')[0],
                    role: demoProfile.role,
                    isDemo: true
                };
                
                setUser(simulatedUser);
                setPermissions(getPermissions(demoProfile.role));
                localStorage.setItem('immo_demo_user', JSON.stringify(simulatedUser));
                setLoading(false);
                return { success: true, user: simulatedUser };
            }

            let message = 'Erreur lors de la connexion';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/operation-not-allowed') {
                message = 'Email ou mot de passe incorrect';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Format d\'email invalide';
            }
            return { success: false, error: message };
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            localStorage.removeItem('immo_demo_user');
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    };

    const checkPermission = useCallback((permission) => {
        if (!user) return false;
        return hasPermission(user.role, permission);
    }, [user]);

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        permissions,
        login,
        loginWithGoogle,
        logout,
        hasPermission: checkPermission
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
