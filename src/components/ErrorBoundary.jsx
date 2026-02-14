import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary, #f8fafc)',
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        fontSize: '1.5rem',
                    }}>
                        ⚠️
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Une erreur est survenue
                    </h3>
                    <p style={{
                        color: 'var(--text-secondary, #cbd5e1)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem',
                        maxWidth: '400px',
                    }}>
                        {this.state.error?.message || 'Erreur inattendue'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '0.625rem 1.5rem',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        Réessayer
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details style={{
                            marginTop: '1rem',
                            maxWidth: '600px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted, #94a3b8)',
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            overflow: 'auto',
                            maxHeight: '200px',
                        }}>
                            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                                Détails techniques
                            </summary>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {this.state.error?.toString()}
                                {'\n'}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
