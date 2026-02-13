import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Visits from './pages/Visits';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const AppRoutes = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-primary)',
                flexDirection: 'column',
                gap: '1rem',
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(102, 126, 234, 0.2)',
                    borderTopColor: '#667eea',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }}></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Chargement d'ImmoDash...
                </p>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Route */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="properties" element={<Properties />} />
                <Route path="visits" element={<Visits />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
