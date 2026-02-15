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
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    color: 'var(--danger, red)',
                    backgroundColor: 'var(--bg-panel, #fff)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <h2>Une erreur est survenue.</h2>
                    <p>Détails techniques (pour le support) :</p>
                    <details style={{
                        whiteSpace: 'pre-wrap',
                        textAlign: 'left',
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '8px',
                        maxWidth: '100%',
                        overflow: 'auto'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.75rem 1.5rem',
                            background: 'var(--brand-primary, #4f46e5)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Recharger la page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
