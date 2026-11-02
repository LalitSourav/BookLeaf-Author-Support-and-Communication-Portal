import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Search } from 'lucide-react';
import TicketDetailModal from './TicketDetailModal.jsx';

export default function AdminPortal({ user, token, onLogout }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('tickets');
    const [tickets, setTickets] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [books, setBooks] = useState([]);

    const [selectedTicketId, setSelectedTicketId] = useState(null);

    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const [refreshCount, setRefreshCount] = useState(0);

    const [dashboardError, setDashboardError] = useState('');
    const [ticketsError, setTicketsError] = useState('');
    const [authorsError, setAuthorsError] = useState('');
    const [booksError, setBooksError] = useState('');

    // Fetch Admin Dashboard
    const fetchAdminData = async (signal) => {
        try {
            const res = await fetch('/api/admin/dashboard', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal
            });

            if (!res.ok) {
                throw new Error('Failed to fetch dashboard data.');
            }

            const data = await res.json();

            if (!data || !data.metrics) {
                throw new Error('Invalid dashboard response.');
            }

            setDashboardData(data);
            setDashboardError('');

        } catch (err) {
            if (err.name === 'AbortError') return;

            console.error('Failed to fetch admin dashboard:', err);
            setDashboardError('Unable to load dashboard data.');
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    // Fetch Support Tickets
    const fetchTickets = async (signal) => {
        try {
            const params = new URLSearchParams();

            if (statusFilter) {
                params.set('status', statusFilter);
            }

            if (priorityFilter) {
                params.set('priority', priorityFilter);
            }

            if (appliedSearch) {
                params.set('search', appliedSearch);
            }

            const queryString = params.toString();

            const res = await fetch(
                `/api/tickets${queryString ? `?${queryString}` : ''}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    signal
                }
            );

            if (!res.ok) {
                throw new Error('Failed to fetch tickets.');
            }

            const data = await res.json();

            if (!Array.isArray(data.tickets)) {
                throw new Error('Invalid tickets response.');
            }

            setTickets(data.tickets);
            setTicketsError('');

        } catch (err) {
            if (err.name === 'AbortError') return;

            console.error('Failed to fetch tickets:', err);
            setTicketsError('Unable to load support tickets.');
        }
    };

    // Fetch Authors and Books independently
    const fetchAuthorsAndBooks = async (signal) => {
        // Fetch authors independently
        try {
            const authorsRes = await fetch('/api/admin/authors', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal
            });

            if (!authorsRes.ok) {
                throw new Error('Failed to fetch authors.');
            }

            const authorsData = await authorsRes.json();

            if (!Array.isArray(authorsData.authors)) {
                throw new Error('Invalid authors response.');
            }

            setAuthors(authorsData.authors);
            setAuthorsError('');
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Failed to fetch authors:', err);
            setAuthorsError('Unable to load authors.');
        }

        // Fetch books independently
        try {
            const booksRes = await fetch('/api/admin/books', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal
            });

            if (!booksRes.ok) {
                throw new Error('Failed to fetch books.');
            }

            const booksData = await booksRes.json();

            if (!Array.isArray(booksData.books)) {
                throw new Error('Invalid books response.');
            }

            setBooks(booksData.books);
            setBooksError('');
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Failed to fetch books:', err);
            setBooksError('Unable to load books.');
        }
    };

    // Initial Fetch + Polling coordinated with refreshCount
    useEffect(() => {
        const controller = new AbortController();
        let isCancelled = false;
        let timer;

        const signal = controller.signal;

        const fetchAllData = async () => {
            if (isCancelled) return;

            await Promise.all([
                fetchAdminData(signal),
                fetchTickets(signal)
            ]);

            if (
                !isCancelled &&
                (activeTab === 'authors' || activeTab === 'books')
            ) {
                await fetchAuthorsAndBooks(signal);
            }

            if (!isCancelled) {
                timer = setTimeout(fetchAllData, 6000);
            }
        };

        fetchAllData();

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [
        statusFilter,
        priorityFilter,
        appliedSearch,
        activeTab,
        token,
        refreshCount
    ]);

    // Apply Search
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setAppliedSearch(searchQuery.trim());
    };

    // Apply Filters
    const handleFilterClick = () => {
        setAppliedSearch(searchQuery.trim());
    };

    // Refresh Data after Ticket Update (coordinates with polling effect via refreshCount)
    const handleTicketUpdated = () => {
        setRefreshCount(prev => prev + 1);
    };

    if (loading && !dashboardData) {
        return (
            <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center text-[#1c1917]">
                <div className="flex items-center gap-3 text-sm font-medium">
                    <div className="w-5 h-5 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin"></div>
                    Loading Admin Portal...
                </div>
            </div>
        );
    }

    const metrics = dashboardData?.metrics || {};

    return (
        <div className="min-h-screen bg-[#fcfbf9] text-[#1c1917] flex flex-col">

            {/* Top Navigation */}
            <header className="bg-white border-b border-[#e7e5e4] sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>

                    <div>
                        <h1 className="text-base font-semibold text-[#1e293b] leading-tight">
                            BookLeaf Admin Control Center
                        </h1>

                        <p className="text-xs text-[#57534e]">
                            Signed in as Administrator ({user.name})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-[#f5f4f0] border border-[#e7e5e4] text-[#57534e] hover:text-[#1c1917] rounded-lg text-xs font-medium transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Sub-navbar */}
            <div className="bg-white border-b border-[#e7e5e4] px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'tickets'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        Support Queue ({metrics.openTicketCount || 0} Open)
                    </button>

                    <button
                        onClick={() => setActiveTab('authors')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'authors'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        Authors ({metrics.authorCount || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab('books')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'books'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        Platform Books ({metrics.bookCount || 0})
                    </button>
                </div>

                {/* Quick Metrics Bar */}
                <div className="hidden xl:flex items-center gap-6 text-xs text-[#57534e]">
                    <div>
                        Total Sales:{' '}
                        <strong className="text-[#1c1917]">
                            {metrics.totalCopiesSold || 0} copies
                        </strong>
                    </div>

                    <div>
                        Royalty Earned:{' '}
                        <strong className="text-[#0f766e]">
                            ₹{metrics.totalRoyaltyEarned || '0.00'}
                        </strong>
                    </div>

                    <div>
                        Pending Payouts:{' '}
                        <strong className="text-amber-600">
                            ₹{metrics.royaltyPending || '0.00'}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

                {dashboardError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                        {dashboardError}
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="space-y-6">

                        {/* Filters & Search */}
                        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">

                            <form
                                onSubmit={handleSearchSubmit}
                                className="flex-1 min-w-[280px] relative"
                            >
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4" />
                                </span>

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ticket ID, subject, or author name..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#e7e5e4] rounded-lg text-[#1c1917] placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
                                />
                            </form>

                            <div className="flex items-center gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3 py-2 text-xs focus:outline-none"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>

                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3 py-2 text-xs focus:outline-none"
                                >
                                    <option value="">All Priorities</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>

                                <button
                                    type="button"
                                    onClick={handleFilterClick}
                                    className="px-4 py-2 bg-[#0f766e] hover:bg-[#0d9488] text-white font-medium rounded-lg text-xs transition-all shadow-xs"
                                >
                                    Filter
                                </button>
                            </div>
                        </div>

                        {/* Tickets Queue Table */}
                        <div className="bg-white border border-[#e7e5e4] rounded-xl shadow-xs overflow-hidden">

                            <div className="p-5 border-b border-[#e7e5e4] flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wider">
                                    Support Ticket Queue ({tickets.length})
                                </h3>
                            </div>

                            {ticketsError && (
                                <div className="p-3 bg-red-50 text-red-700 text-xs">
                                    {ticketsError}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#f5f4f0] text-[#57534e] uppercase font-semibold border-b border-[#e7e5e4]">
                                        <tr>
                                            <th className="p-4">Ticket ID</th>
                                            <th className="p-4">Author</th>
                                            <th className="p-4">Subject</th>
                                            <th className="p-4">Category</th>
                                            <th className="p-4">Priority</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Date</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-[#e7e5e4]">
                                        {tickets.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center text-[#57534e]">
                                                    No support tickets found.
                                                </td>
                                            </tr>
                                        ) : (
                                            tickets.map(t => (
                                                <tr
                                                    key={t.id}
                                                    onClick={() => setSelectedTicketId(t.id)}
                                                    className="hover:bg-[#f5f4f0]/60 cursor-pointer transition-all"
                                                >
                                                    <td className="p-4 font-mono text-[#0f766e] font-semibold">
                                                        {t.ticket_id}
                                                    </td>

                                                    <td className="p-4 font-medium text-[#1c1917]">
                                                        {t.author_name}
                                                    </td>

                                                    <td className="p-4 text-[#1e293b] max-w-xs">
                                                        <div className="font-medium truncate">
                                                            {t.subject}
                                                        </div>

                                                        {t.ai_summary && (
                                                            <div className="text-[11px] text-[#0f766e] flex items-center gap-1 mt-0.5 truncate">
                                                                <span className="font-semibold">AI:</span>
                                                                {t.ai_summary}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-4 text-[#57534e]">
                                                        {t.category}
                                                    </td>

                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                                                            t.priority === 'Urgent' || t.priority === 'High'
                                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                                : 'bg-[#f5f4f0] text-[#57534e]'
                                                        }`}>
                                                            {t.priority}
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                                                            t.status === 'Resolved' || t.status === 'Closed'
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-amber-50 text-amber-700'
                                                        }`}>
                                                            {t.status}
                                                        </span>
                                                    </td>

                                                    <td className="p-4 text-[#57534e]">
                                                        {new Date(t.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Authors Tab */}
                {activeTab === 'authors' && (
                    <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs">
                        <h3 className="text-sm font-semibold text-[#1e293b] mb-5 uppercase tracking-wider">
                            Registered Authors ({authors.length})
                        </h3>

                        {authorsError && (
                            <p className="text-xs text-red-600 mb-4">
                                {authorsError}
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {authors.length === 0 ? (
                                <p className="text-xs text-[#57534e]">
                                    No authors found.
                                </p>
                            ) : (
                                authors.map(a => (
                                    <div
                                        key={a.id}
                                        className="bg-[#fcfbf9] border border-[#e7e5e4] rounded-xl p-5 space-y-2 shadow-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono text-[#0f766e] font-semibold">
                                                {a.author_id}
                                            </span>

                                            <span className="text-[11px] text-[#57534e]">
                                                {a.city || 'N/A'}
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-semibold text-[#1e293b]">
                                            {a.name}
                                        </h4>

                                        <p className="text-xs text-[#57534e]">
                                            {a.email}
                                        </p>

                                        <p className="text-xs text-[#57534e]">
                                            Phone: {a.phone || 'N/A'}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Books Tab */}
                {activeTab === 'books' && (
                    <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs">
                        <h3 className="text-sm font-semibold text-[#1e293b] mb-5 uppercase tracking-wider">
                            Platform Books ({books.length})
                        </h3>

                        {booksError && (
                            <p className="text-xs text-red-600 mb-4">
                                {booksError}
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {books.length === 0 ? (
                                <p className="text-xs text-[#57534e]">
                                    No books found.
                                </p>
                            ) : (
                                books.map(b => (
                                    <div
                                        key={b.id}
                                        className="bg-[#fcfbf9] border border-[#e7e5e4] rounded-xl p-5 flex flex-col justify-between shadow-xs"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="px-2 py-0.5 bg-[#f5f4f0] text-[#0f766e] font-mono text-[11px] rounded border border-[#e7e5e4]">
                                                    ISBN: {b.isbn || 'N/A'}
                                                </span>

                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium border border-emerald-200">
                                                    {b.status}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-semibold text-[#1e293b] mb-1">
                                                {b.title}
                                            </h4>

                                            <p className="text-xs text-[#57534e] mb-3">
                                                By <strong className="text-[#1c1917]">{b.author_name}</strong> ({b.genre})
                                            </p>
                                        </div>

                                        <div className="border-t border-[#e7e5e4] pt-3 space-y-1 text-xs">
                                            <div className="flex justify-between text-[#57534e]">
                                                <span>Copies Sold:</span>
                                                <strong className="text-[#1c1917]">
                                                    {b.total_copies_sold || 0}
                                                </strong>
                                            </div>

                                            <div className="flex justify-between text-[#57534e]">
                                                <span>Royalty Earned:</span>
                                                <strong className="text-[#0f766e]">
                                                    ₹{b.total_royalty_earned || '0.00'}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Ticket Detail Modal */}
            {selectedTicketId && (
                <TicketDetailModal
                    ticketId={selectedTicketId}
                    currentUser={user}
                    token={token}
                    onClose={() => setSelectedTicketId(null)}
                    onTicketUpdated={handleTicketUpdated}
                />
            )}
        </div>
    );
}
