import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading des pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const Visits = lazy(() => import('./pages/Visits'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ImagesPage = lazy(() => import('./pages/Images/ImagesPage'));
const RequestsPage = lazy(() => import('./pages/Requests/RequestsPage'));
const Clients = lazy(() => import('./pages/Clients'));
const Settings = lazy(() => import('./pages/Settings'));
const ImageGallery = lazy(() => import('./pages/ImageGallery'));
const AdGenerator = lazy(() => import('./pages/AdGenerator'));
const Pipeline = lazy(() => import('./pages/Pipeline'));

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
            border: '3px solid rgba(79, 70, 229, 0.2)',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Chargement...</p>
    </div>
);

const AppRoutes = () => {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/" element={
                    <Layout />
                }>
                    <Route index element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Dashboard />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="properties" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Properties />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="visits" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Visits />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="images" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <ImagesPage />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="gallery" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <ImageGallery />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="clients" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Clients />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="analytics" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Analytics />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="settings" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Settings />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="requests" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <RequestsPage />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="tools/ad-generator" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <AdGenerator />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="pipeline" element={
                        <Suspense fallback={<PageLoader />}>
                            <ErrorBoundary>
                                <Pipeline />
                            </ErrorBoundary>
                        </Suspense>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </ErrorBoundary>
    );
};

function App() {
    return (
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
    );
}

export default App;
