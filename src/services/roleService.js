import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Mapping email -> role (fallback si pas encore dans Firestore)
// Pour ajouter un admin/agent : ajouter son email ici OU le changer depuis Settings > Utilisateurs
export const ROLE_MAPPING = {
    'kassio.wifried@gmail.com': 'admin',
    'admin@immodash.ci': 'admin',
    'agent@immodash.ci': 'agent',
    'demo@immodash.ci': 'viewer'
};

// Matrice de permissions par role
const PERMISSIONS = {
    admin: {
        pages: ['/', '/properties', '/gallery', '/clients', '/analytics', '/settings'],
        actions: ['call', 'whatsapp'],
        settingsTabs: ['profile', 'security', 'notifications', 'integration', 'users'],
    },
    agent: {
        pages: ['/', '/properties', '/gallery', '/clients', '/settings'],
        actions: ['call', 'whatsapp'],
        settingsTabs: ['profile', 'security', 'notifications'],
    },
    viewer: {
        pages: ['/properties', '/gallery', '/settings'],
        actions: [],
        settingsTabs: ['profile', 'security', 'notifications'],
    },
};

export function getPermissions(role) {
    return PERMISSIONS[role] || PERMISSIONS.viewer;
}

export function hasPermission(role, action) {
    const perms = getPermissions(role);
    return perms.actions.includes(action);
}

export function canAccessPage(role, path) {
    const perms = getPermissions(role);
    return perms.pages.includes(path);
}

export function canAccessSettingsTab(role, tabId) {
    const perms = getPermissions(role);
    return perms.settingsTabs.includes(tabId);
}

// Read user role from Firestore, fallback to legacy mapping
export async function getUserRole(uid, email) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role || 'viewer';
        }
        // Fallback to legacy mapping
        return ROLE_MAPPING[email] || 'viewer';
    } catch (error) {
        console.error('Error reading user role:', error);
        return ROLE_MAPPING[email] || 'viewer';
    }
}

// Write user role to Firestore (admin only)
export async function setUserRole(uid, role) {
    try {
        await setDoc(doc(db, 'users', uid), { role }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error setting user role:', error);
        return { success: false, error: error.message };
    }
}

// List all user docs from Firestore
export async function listUsers() {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error listing users:', error);
        return [];
    }
}

// Initialize user document on first login
export async function initUserDoc(uid, email, displayName) {
    try {
        const userRef = doc(db, 'users', uid);
        const existing = await getDoc(userRef);
        if (!existing.exists()) {
            const role = ROLE_MAPPING[email] || 'viewer';
            const name = displayName || email.split('@')[0];
            const avatar = name.charAt(0).toUpperCase();
            await setDoc(userRef, { email, name, avatar, role, createdAt: new Date().toISOString() });
            return { role, name, avatar };
        }
        return existing.data();
    } catch (error) {
        console.error('Error initializing user doc:', error);
        const role = ROLE_MAPPING[email] || 'viewer';
        return { role, name: displayName || 'Utilisateur', avatar: 'U' };
    }
}
