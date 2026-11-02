import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import AuthorPortal from './components/AuthorPortal.jsx';
import AdminPortal from './components/AdminPortal.jsx';

export default function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('bookleaf_token');
        const savedUser = localStorage.getItem('bookleaf_user');

        if (savedToken && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            } catch (e) {
                localStorage.removeItem('bookleaf_token');
                localStorage.removeItem('bookleaf_user');
            }
        }
        setLoading(false);
    }, []);

    const handleLoginSuccess = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
        setUser(null);
        setToken(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading BookLeaf Portal...
                </div>
            </div>
        );
    }

    if (!user || !token) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    if (user.role === 'admin') {
        return <AdminPortal user={user} token={token} onLogout={handleLogout} />;
    }

    return <AuthorPortal user={user} token={token} onLogout={handleLogout} />;
}
