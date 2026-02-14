import React, { useState, useEffect } from 'react';
import { X, Activity, Cpu, HardDrive, Network, AlertTriangle } from 'lucide-react';
import { getPerformanceReport, ErrorTracker, PagePerformanceTracker } from '../utils/monitoring';
import './PerformancePanel.css';

const PerformancePanel = ({ isOpen, onClose }) => {
    const [report, setReport] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const updateReport = () => {
            setReport(getPerformanceReport());
        };

        updateReport();

        if (autoRefresh) {
            const interval = setInterval(updateReport, 2000);
            return () => clearInterval(interval);
        }
    }, [isOpen, autoRefresh]);

    if (!isOpen) return null;

    return (
        <div className="performance-panel-overlay">
            <div className="performance-panel">
                <div className="performance-panel-header">
                    <div className="header-left">
                        <Activity size={20} />
                        <h2>Performance Monitor</h2>
                    </div>
                    <div className="header-right">
                        <label className="auto-refresh-toggle">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            <span>Auto-refresh</span>
                        </label>
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {report && (
                    <div className="performance-panel-content">
                        {/* Memory Section */}
                        {report.memory && (
                            <div className="perf-section">
                                <div className="section-header">
                                    <HardDrive size={18} />
                                    <h3>Memory Usage</h3>
                                </div>
                                <div className="metrics-grid">
                                    <div className="metric">
                                        <span className="metric-label">Used</span>
                                        <span className="metric-value">{report.memory.used}</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Total</span>
                                        <span className="metric-value">{report.memory.total}</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Limit</span>
                                        <span className="metric-value">{report.memory.limit}</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Usage</span>
                                        <span className={`metric-value ${parseFloat(report.memory.usage) > 80 ? 'warning' : ''}`}>
                                            {report.memory.usage}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Network Section */}
                        <div className="perf-section">
                            <div className="section-header">
                                <Network size={18} />
                                <h3>Network</h3>
                            </div>
                            <div className="metrics-grid">
                                <div className="metric">
                                    <span className="metric-label">Resources Loaded</span>
                                    <span className="metric-value">{report.resources}</span>
                                </div>
                                {report.navigation && (
                                    <>
                                        <div className="metric">
                                            <span className="metric-label">DNS Lookup</span>
                                            <span className="metric-value">
                                                {(report.navigation.domainLookupEnd - report.navigation.domainLookupStart).toFixed(2)}ms
                                            </span>
                                        </div>
                                        <div className="metric">
                                            <span className="metric-label">TCP Connection</span>
                                            <span className="metric-value">
                                                {(report.navigation.connectEnd - report.navigation.connectStart).toFixed(2)}ms
                                            </span>
                                        </div>
                                        <div className="metric">
                                            <span className="metric-label">Response Time</span>
                                            <span className="metric-value">
                                                {(report.navigation.responseEnd - report.navigation.requestStart).toFixed(2)}ms
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Errors Section */}
                        <div className="perf-section">
                            <div className="section-header">
                                <AlertTriangle size={18} />
                                <h3>Errors</h3>
                            </div>
                            <div className="metrics-grid">
                                <div className="metric">
                                    <span className="metric-label">Total Errors</span>
                                    <span className={`metric-value ${report.errors.total > 0 ? 'error' : ''}`}>
                                        {report.errors.total}
                                    </span>
                                </div>
                                {Object.entries(report.errors.byType).map(([type, count]) => (
                                    <div key={type} className="metric">
                                        <span className="metric-label">{type}</span>
                                        <span className="metric-value error">{count}</span>
                                    </div>
                                ))}
                            </div>
                            {report.errors.recent.length > 0 && (
                                <div className="recent-errors">
                                    <h4>Recent Errors:</h4>
                                    {report.errors.recent.map((error, index) => (
                                        <div key={index} className="error-item">
                                            <span className="error-type">{error.type}</span>
                                            <span className="error-message">{error.message}</span>
                                            <span className="error-time">{new Date(error.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pages Performance Section */}
                        {Object.keys(report.pages).length > 0 && (
                            <div className="perf-section">
                                <div className="section-header">
                                    <Cpu size={18} />
                                    <h3>Pages Performance</h3>
                                </div>
                                <div className="pages-list">
                                    {Object.entries(report.pages).map(([pageName, metrics]) => (
                                        <div key={pageName} className="page-item">
                                            <div className="page-name">{pageName}</div>
                                            <div className="page-metrics">
                                                <span>Duration: {metrics.duration?.toFixed(2) || 'N/A'}ms</span>
                                                <span>Renders: {metrics.renderCount}</span>
                                                <span>API Calls: {metrics.apiCalls}</span>
                                                {metrics.errors > 0 && (
                                                    <span className="error">Errors: {metrics.errors}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="perf-actions">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    ErrorTracker.clearErrors();
                                    setReport(getPerformanceReport());
                                }}
                            >
                                Clear Errors
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    console.log('Performance Report:', report);
                                    alert('Performance report logged to console');
                                }}
                            >
                                Log to Console
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformancePanel;
