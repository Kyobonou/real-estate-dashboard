import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import { NotificationProvider } from './contexts/NotificationContext';

// Direct imports — NO lazy loading to eliminate blank screen issues
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Visits from './pages/Visits';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ImageGallery from './pages/ImageGallery';

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
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="properties" element={<ErrorBoundary><Properties /></ErrorBoundary>} />
                <Route path="gallery" element={<ErrorBoundary><ImageGallery /></ErrorBoundary>} />
                <Route path="visits" element={<ErrorBoundary><Visits /></ErrorBoundary>} />
                <Route path="analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <NotificationProvider>
                            <BrowserRouter>
                                <AppRoutes />
                            </BrowserRouter>
                        </NotificationProvider>
                    </ToastProvider>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
