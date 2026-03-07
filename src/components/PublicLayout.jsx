import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

const PublicLayout = () => {
    return (
        <div
            className="public-layout public-page"
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                color: '#0f172a'
            }}
        >
            <PublicNavbar />
            <main className="public-content" style={{ flex: 1 }}>
                <Outlet />
            </main>
            <PublicFooter />
        </div>
    );
};

export default PublicLayout;

