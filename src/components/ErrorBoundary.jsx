import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    // Auto-reset quand la route change (via prop "resetKey")
    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '3rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    textAlign: 'center',
                    minHeight: '300px'
                }}>
                    <div style={{ fontSize: '3rem' }}>⚠️</div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary, #1e293b)', fontWeight: 700 }}>
                        Impossible de charger cette section
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem' }}>
                        Une erreur est survenue. Veuillez recharger la page ou réessayer.
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.reload();
                        }}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.625rem 1.5rem',
                            background: 'var(--brand-primary, #4f46e5)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                        }}
                    >
                        Recharger
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
