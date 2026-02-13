import React from 'react';
import './Common.css';

const Card = ({ children, className = '', title, action }) => {
    return (
        <div className={`card ${className}`}>
            {(title || action) && (
                <div className="card-header">
                    {title && <h3 className="card-title">{title}</h3>}
                    {action && <div className="card-action">{action}</div>}
                </div>
            )}
            <div className="card-body">
                {children}
            </div>
        </div>
    );
};

export default Card;
