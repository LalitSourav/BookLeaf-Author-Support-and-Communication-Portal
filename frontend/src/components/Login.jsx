import React, { useState } from 'react';
import { BookOpen, Shield, User, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('bookleaf_token', data.token);
            localStorage.setItem('bookleaf_user', JSON.stringify(data.user));
            onLoginSuccess(data.user, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (demoEmail, demoPass) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setError('');
    };

    return (
        <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border border-[#e7e5e4] rounded-xl shadow-sm overflow-hidden p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-[#0f766e]/10 text-[#0f766e] mb-4">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-semibold text-[#1e293b] tracking-tight">BookLeaf Publishing</h1>
                    <p className="text-[#57534e] text-sm mt-1">Author Support & Communication Portal</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <User className="w-4 h-4" />
                            </span>
                            <input
                                type="email"
                                required
                                maxLength={150}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] rounded-lg text-[#1c1917] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent text-sm transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Lock className="w-4 h-4" />
                            </span>
                            <input
                                type="password"
                                required
                                maxLength={100}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e5e4] rounded-lg text-[#1c1917] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent text-sm transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-[#0f766e] hover:bg-[#0d9488] text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
                    >
                        {loading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <>Sign In to Portal <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>

                {/* Demo Quick Logins */}
                <div className="mt-8 pt-6 border-t border-[#e7e5e4]">
                    <p className="text-xs font-semibold text-[#57534e] uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#0f766e]" /> Quick Demo Access
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => fillDemo('kavita.deshmukh@email.com', 'Password@123')}
                            className="p-3 bg-[#f5f4f0] hover:bg-[#e7e5e4]/60 border border-[#e7e5e4] rounded-lg text-left transition-all"
                        >
                            <span className="block text-xs font-semibold text-[#0f766e]">Author Demo</span>
                            <span className="block text-[11px] text-[#57534e] truncate mt-0.5">Kavita Deshmukh</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemo('admin@bookleaf.com', 'Admin@123')}
                            className="p-3 bg-[#f5f4f0] hover:bg-[#e7e5e4]/60 border border-[#e7e5e4] rounded-lg text-left transition-all"
                        >
                            <span className="block text-xs font-semibold text-[#1e293b] flex items-center gap-1"><Shield className="w-3 h-3 text-[#0f766e]" /> Admin Demo</span>
                            <span className="block text-[11px] text-[#57534e] truncate mt-0.5">BookLeaf Admin</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
