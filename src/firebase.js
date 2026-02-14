import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCuL0s6P1o2GDWTBzokMr4Sp2Pk8hEdgXQ",
    authDomain: "immo-dashboard-ci.firebaseapp.com",
    projectId: "immo-dashboard-ci",
    storageBucket: "immo-dashboard-ci.firebasestorage.app",
    messagingSenderId: "270527679044",
    appId: "1:270527679044:web:1c502b9aef393e58970a11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
