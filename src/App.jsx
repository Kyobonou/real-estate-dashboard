import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import PerformancePanel from './components/PerformancePanel';

// Lazy loading des pages (Publiques)
const PublicHome = lazy(() => import('./pages/PublicHome'));
const PublicProperties = lazy(() => import('./pages/PublicProperties'));
const PublicServices = lazy(() => import('./pages/PublicServices'));
const PublicContact = lazy(() => import('./pages/PublicContact'));
const PublicLayout = lazy(() => import('./components/PublicLayout'));
const Login = lazy(() => import('./pages/Login'));

// Lazy loading des pages (Dashboard)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const Visits = lazy(() => import('./pages/Visits'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ImagesPage = lazy(() => import('./pages/Images/ImagesPage'));
const RequestsPage = lazy(() => import('./pages/Requests/RequestsPage'));
const Clients = lazy(() => import('./pages/Clients'));
const Settings = lazy(() => import('./pages/Settings'));
const ImageGallery = lazy(() => import('./pages/ImageGallery'));
const ExpiringProperties = lazy(() => import('./pages/ExpiringProperties'));
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
            border: '3px solid rgba(27, 66, 153, 0.2)',
            borderTopColor: '#1B4299',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Chargement...</p>
    </div>
);

const AppRoutes = () => {
    const location = useLocation();
    const siteMode = import.meta.env.VITE_SITE_MODE || 'full'; // 'app', 'vitrine' or 'full'

    return (
        <ErrorBoundary resetKey={location.pathname}>
            <Routes>
                {/* ---------- ROUTE PUBLIQUE LOGIN ---------- */}
                <Route path="/login" element={
                    <Suspense fallback={<PageLoader />}>
                        <Login />
                    </Suspense>
                } />

                {/* ---------- LOGIQUE MULTI-SITES ---------- */}

                {/* Mode VITRINE : Uniquement le site public */}
                {siteMode === 'vitrine' && (
                    <Route path="/" element={
                        <Suspense fallback={<PageLoader />}>
                            <PublicLayout />
                        </Suspense>
                    }>
                        <Route index element={
                            <Suspense fallback={<PageLoader />}>
                                <ErrorBoundary resetKey={location.pathname}>
                                    <PublicHome />
                                </ErrorBoundary>
                            </Suspense>
                        } />
                        <Route path="proprietes" element={
                            <Suspense fallback={<PageLoader />}>
                                <ErrorBoundary resetKey={location.pathname}>
                                    <PublicProperties />
                                </ErrorBoundary>
                            </Suspense>
                        } />
                        <Route path="services" element={
                            <Suspense fallback={<PageLoader />}>
                                <ErrorBoundary resetKey={location.pathname}>
                                    <PublicServices />
                                </ErrorBoundary>
                            </Suspense>
                        } />
                        <Route path="contact" element={
                            <Suspense fallback={<PageLoader />}>
                                <ErrorBoundary resetKey={location.pathname}>
                                    <PublicContact />
                                </ErrorBoundary>
                            </Suspense>
                        } />
                        {/* Redirection si on essaie d'aller sur le dashboard depuis la vitrine */}
                        <Route path="dashboard/*" element={<Navigate to="/" replace />} />
                    </Route>
                )}

                {/* Mode APP : Uniquement le dashboard */}
                {siteMode === 'app' && (
                    <>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route index element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Dashboard />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="properties" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Properties />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="visits" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Visits />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="images" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ImagesPage />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="gallery" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ImageGallery />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="expiring" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ExpiringProperties />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="clients" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Clients />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="analytics" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Analytics />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="settings" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Settings />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="requests" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <RequestsPage />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="tools/ad-generator" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <AdGenerator />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="pipeline" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Pipeline />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                        </Route>
                    </>
                )}

                {/* Mode FULL (Dev ou par défaut) : Les deux sont disponibles */}
                {(siteMode === 'full' || !['app', 'vitrine'].includes(siteMode)) && (
                    <>
                        <Route path="/" element={
                            <Suspense fallback={<PageLoader />}>
                                <PublicLayout />
                            </Suspense>
                        }>
                            <Route index element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <PublicHome />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="proprietes" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <PublicProperties />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="services" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <PublicServices />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="contact" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <PublicContact />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                        </Route>

                        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route index element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Dashboard />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="properties" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Properties />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="visits" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Visits />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                            <Route path="images" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ImagesPage />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="gallery" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ImageGallery />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="expiring" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <ExpiringProperties />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="clients" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Clients />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="analytics" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Analytics />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="settings" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Settings />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="requests" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <RequestsPage />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="tools/ad-generator" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <AdGenerator />
                                    </ErrorBoundary>
                                </Suspense>
                            } />

                            <Route path="pipeline" element={
                                <Suspense fallback={<PageLoader />}>
                                    <ErrorBoundary resetKey={location.pathname}>
                                        <Pipeline />
                                    </ErrorBoundary>
                                </Suspense>
                            } />
                        </Route>
                    </>
                )}

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ErrorBoundary>
    );
};


function App() {
    const [isPerfPanelOpen, setIsPerfPanelOpen] = React.useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.altKey && e.key === 'p') {
                setIsPerfPanelOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsPerfPanelOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <AuthProvider>
            <ThemeProvider>
                <ToastProvider>
                    <NotificationProvider>
                        <BrowserRouter>
                            <ScrollToTop />
                            <AppRoutes />
                            <PerformancePanel 
                                isOpen={isPerfPanelOpen} 
                                onClose={() => setIsPerfPanelOpen(false)} 
                            />
                        </BrowserRouter>
                    </NotificationProvider>
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;

