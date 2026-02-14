import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import { NotificationProvider } from './contexts/NotificationContext';

// Lazy loading des pages pour réduire le bundle initial (-40%)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const Visits = lazy(() => import('./pages/Visits'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const ImageGallery = lazy(() => import('./pages/ImageGallery'));

// Composant de chargement pour Suspense
const PageLoader = () => (
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
            Chargement de la page...
        </p>
    </div>
);

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
                <Route index element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Dashboard />
                        </Suspense>
                    </ErrorBoundary>
                } />
                <Route path="properties" element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Properties />
                        </Suspense>
                    </ErrorBoundary>
                } />
                <Route path="gallery" element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <ImageGallery />
                        </Suspense>
                    </ErrorBoundary>
                } />
                <Route path="visits" element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Visits />
                        </Suspense>
                    </ErrorBoundary>
                } />
                <Route path="analytics" element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Analytics />
                        </Suspense>
                    </ErrorBoundary>
                } />
                <Route path="settings" element={
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Settings />
                        </Suspense>
                    </ErrorBoundary>
                } />
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
