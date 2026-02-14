/**
 * Performance Monitoring Utilities
 * Surveillance des performances de l'application en temps réel
 */

// Métriques Web Vitals
export const measureWebVitals = () => {
    if (typeof window === 'undefined') return;

    // First Contentful Paint (FCP)
    const measureFCP = () => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            console.log(`[Performance] FCP: ${fcpEntry.startTime.toFixed(2)}ms`);
            return fcpEntry.startTime;
        }
    };

    // Largest Contentful Paint (LCP)
    const measureLCP = () => {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log(`[Performance] LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    };

    // First Input Delay (FID)
    const measureFID = () => {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    console.log(`[Performance] FID: ${entry.processingStart - entry.startTime}ms`);
                });
            });
            observer.observe({ entryTypes: ['first-input'] });
        }
    };

    // Cumulative Layout Shift (CLS)
    const measureCLS = () => {
        if ('PerformanceObserver' in window) {
            let clsScore = 0;
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsScore += entry.value;
                        console.log(`[Performance] CLS: ${clsScore.toFixed(4)}`);
                    }
                }
            });
            observer.observe({ entryTypes: ['layout-shift'] });
        }
    };

    // Time to Interactive (TTI)
    const measureTTI = () => {
        if (document.readyState === 'complete') {
            const tti = performance.now();
            console.log(`[Performance] TTI: ${tti.toFixed(2)}ms`);
        } else {
            window.addEventListener('load', () => {
                const tti = performance.now();
                console.log(`[Performance] TTI: ${tti.toFixed(2)}ms`);
            });
        }
    };

    measureFCP();
    measureLCP();
    measureFID();
    measureCLS();
    measureTTI();
};

// Mesurer les performances d'une fonction
export const measureFunctionPerformance = (fn, label) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

    // Avertir si la fonction est lente
    if (duration > 100) {
        console.warn(`⚠️ [Performance] ${label} est lent (${duration.toFixed(2)}ms)`);
    }

    return result;
};

// Mesurer les performances d'une fonction async
export const measureAsyncPerformance = async (fn, label) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
        console.warn(`⚠️ [Performance] ${label} est lent (${duration.toFixed(2)}ms)`);
    }

    return result;
};

// Surveiller l'utilisation de la mémoire
export const monitorMemory = () => {
    if (!performance.memory) {
        console.warn('[Performance] Memory API non disponible');
        return;
    }

    const formatBytes = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const logMemory = () => {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const usage = (usedJSHeapSize / jsHeapSizeLimit * 100).toFixed(2);

        console.log(`[Memory] Utilisée: ${formatBytes(usedJSHeapSize)} / ${formatBytes(jsHeapSizeLimit)} (${usage}%)`);

        if (usage > 80) {
            console.warn(`⚠️ [Memory] Utilisation élevée: ${usage}%`);
        }
    };

    // Log initial
    logMemory();

    // Log toutes les 30 secondes
    setInterval(logMemory, 30000);
};

// Surveiller les requêtes réseau
export const monitorNetworkRequests = () => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
            const duration = entry.responseEnd - entry.requestStart;
            const size = entry.transferSize || 0;

            console.log(`[Network] ${entry.name}`);
            console.log(`  Duration: ${duration.toFixed(2)}ms`);
            console.log(`  Size: ${(size / 1024).toFixed(2)} KB`);

            // Avertir si la requête est lente
            if (duration > 3000) {
                console.warn(`⚠️ [Network] Requête lente: ${entry.name} (${duration.toFixed(2)}ms)`);
            }

            // Avertir si la requête est volumineuse
            if (size > 500000) {
                console.warn(`⚠️ [Network] Requête volumineuse: ${entry.name} (${(size / 1024).toFixed(2)} KB)`);
            }
        });
    });

    observer.observe({ entryTypes: ['resource'] });
};

// Tracker les erreurs
export class ErrorTracker {
    static errors = [];
    static maxErrors = 50;

    static init() {
        // Erreurs JavaScript
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Promesses rejetées non gérées
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Erreurs de ressources
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.logError({
                    type: 'Resource Error',
                    message: `Failed to load: ${event.target.src || event.target.href}`,
                    timestamp: new Date().toISOString()
                });
            }
        }, true);
    }

    static logError(error) {
        console.error('[Error Tracker]', error);

        this.errors.push(error);

        // Garder seulement les N dernières erreurs
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Sauvegarder dans localStorage pour analyse
        try {
            localStorage.setItem('app_errors', JSON.stringify(this.errors));
        } catch (e) {
            console.warn('Impossible de sauvegarder les erreurs dans localStorage');
        }
    }

    static getErrors() {
        return this.errors;
    }

    static clearErrors() {
        this.errors = [];
        localStorage.removeItem('app_errors');
    }

    static getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            recent: this.errors.slice(-5)
        };

        this.errors.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }
}

// Tracker les performances des pages
export class PagePerformanceTracker {
    static pageMetrics = {};

    static startTracking(pageName) {
        this.pageMetrics[pageName] = {
            startTime: performance.now(),
            renderCount: 0,
            apiCalls: 0,
            errors: 0
        };
    }

    static endTracking(pageName) {
        if (!this.pageMetrics[pageName]) return;

        const metrics = this.pageMetrics[pageName];
        metrics.endTime = performance.now();
        metrics.duration = metrics.endTime - metrics.startTime;

        console.log(`[Page Performance] ${pageName}:`, {
            duration: `${metrics.duration.toFixed(2)}ms`,
            renderCount: metrics.renderCount,
            apiCalls: metrics.apiCalls,
            errors: metrics.errors
        });

        return metrics;
    }

    static incrementRenderCount(pageName) {
        if (this.pageMetrics[pageName]) {
            this.pageMetrics[pageName].renderCount++;
        }
    }

    static incrementApiCalls(pageName) {
        if (this.pageMetrics[pageName]) {
            this.pageMetrics[pageName].apiCalls++;
        }
    }

    static incrementErrors(pageName) {
        if (this.pageMetrics[pageName]) {
            this.pageMetrics[pageName].errors++;
        }
    }

    static getMetrics(pageName) {
        return this.pageMetrics[pageName];
    }

    static getAllMetrics() {
        return this.pageMetrics;
    }
}

// Initialiser le monitoring
export const initMonitoring = () => {
    console.log('🔍 [Monitoring] Initialisation...');

    // Mesurer les Web Vitals
    measureWebVitals();

    // Surveiller la mémoire
    monitorMemory();

    // Surveiller les requêtes réseau
    monitorNetworkRequests();

    // Tracker les erreurs
    ErrorTracker.init();

    console.log('✅ [Monitoring] Initialisé');
};

// Obtenir un rapport de performance complet
export const getPerformanceReport = () => {
    const report = {
        timestamp: new Date().toISOString(),
        memory: performance.memory ? {
            used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
            usage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
        } : null,
        navigation: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource').length,
        errors: ErrorTracker.getErrorStats(),
        pages: PagePerformanceTracker.getAllMetrics()
    };

    console.log('[Performance Report]', report);
    return report;
};

export default {
    measureWebVitals,
    measureFunctionPerformance,
    measureAsyncPerformance,
    monitorMemory,
    monitorNetworkRequests,
    ErrorTracker,
    PagePerformanceTracker,
    initMonitoring,
    getPerformanceReport
};
