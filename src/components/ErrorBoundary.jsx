import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
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
                    {this.state.error && (
                        <pre style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.78rem', textAlign: 'left', maxWidth: '90%', overflow: 'auto', border: '1px solid #fca5a5' }}>
                            {this.state.error.message}
                            {this.state.error.stack && '\n\n' + this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                        </pre>
                    )}
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
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
