import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';

const users = [
    { email: 'admin@immodash.ci', password: 'Admin2026!', role: 'admin' },
    { email: 'agent@immodash.ci', password: 'Agent2026!', role: 'agent' },
    { email: 'demo@immodash.ci', password: 'Demo2026!', role: 'demo' }
];

async function seedUsers() {
    console.log('Starting user seeding...');

    for (const user of users) {
        try {
            console.log(`Checking user: ${user.email}...`);
            // Try to login to see if user exists
            try {
                await signInWithEmailAndPassword(auth, user.email, user.password);
                console.log(`✅ User ${user.email} already exists.`);
            } catch (loginError) {
                if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
                    // Create user
                    console.log(`Creating user: ${user.email}...`);
                    await createUserWithEmailAndPassword(auth, user.email, user.password);
                    console.log(`✅ Created user: ${user.email}`);
                } else {
                    throw loginError;
                }
            }
        } catch (error) {
            console.error(`❌ Failed to process ${user.email}:`, error.code, error.message);
            if (error.code === 'auth/operation-not-allowed') {
                console.error('\n⚠️  IMPORTANT: You must enable "Email/Password" provider in Firebase Console!');
                console.error('Go to: https://console.firebase.google.com/project/immo-dashboard-ci/authentication/providers');
            }
        }
    }

    console.log('\nSeeding complete. Press Ctrl+C to exit if it doesn\'t close automatically.');
    process.exit(0);
}

seedUsers();
