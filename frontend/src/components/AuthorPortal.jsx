import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    LogOut,
    Plus,
    User,
    MapPin,
    Phone,
    Mail
} from 'lucide-react';

import TicketDetailModal from './TicketDetailModal.jsx';
import NewTicketModal from './NewTicketModal.jsx';

export default function AuthorPortal({ user, token, onLogout }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);

    const [tickets, setTickets] = useState([]);
    const [ticketFilter, setTicketFilter] = useState('');

    const [dashboardError, setDashboardError] = useState('');
    const [ticketsError, setTicketsError] = useState('');

    const [refreshCount, setRefreshCount] = useState(0);

    // Fetch Dashboard and Tickets with coordinated polling
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        let isCancelled = false;
        let timer;

        // Fetch Author Dashboard
        const fetchDashboard = async () => {
            try {
                const res = await fetch('/api/authors/dashboard', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    signal
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data?.message || 'Failed to fetch author dashboard.'
                    );
                }

                if (!data || typeof data !== 'object' || Array.isArray(data)) {
                    throw new Error('Invalid dashboard response.');
                }

                if (!isCancelled) {
                    setDashboardData(data);
                    setDashboardError('');
                }
            } catch (err) {
                if (err.name === 'AbortError' || isCancelled) return;

                console.error('Failed to fetch author dashboard:', err);
                setDashboardError('Unable to load dashboard data.');
            }
        };

        // Fetch Author Tickets
        const fetchTickets = async () => {
            try {
                const res = await fetch('/api/tickets', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    signal
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data?.message || 'Failed to fetch support tickets.'
                    );
                }

                if (!Array.isArray(data?.tickets)) {
                    throw new Error('Invalid tickets response.');
                }

                if (!isCancelled) {
                    setTickets(data.tickets);
                    setTicketsError('');
                }
            } catch (err) {
                if (err.name === 'AbortError' || isCancelled) return;

                console.error('Failed to fetch tickets:', err);
                setTicketsError('Unable to load support tickets.');
            }
        };

        // Initial fetch followed by sequential polling
        const fetchAllData = async () => {
            if (isCancelled) return;

            await Promise.all([
                fetchDashboard(),
                fetchTickets()
            ]);

            if (!isCancelled) {
                setLoading(false);
                timer = setTimeout(fetchAllData, 6000);
            }
        };

        fetchAllData();

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [token, refreshCount]);

    // Refresh data after ticket creation or update
    const handleRefresh = () => {
        setRefreshCount(prev => prev + 1);
    };

    // Loading Screen
    if (loading) {
        return (
            <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center text-[#1c1917]">
                <div className="flex items-center gap-3 text-sm font-medium">
                    <div className="w-5 h-5 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin"></div>
                    Loading Author Portal...
                </div>
            </div>
        );
    }

    const stats = dashboardData?.stats || {};
    const author = dashboardData?.author || user;
    const books = Array.isArray(dashboardData?.books)
        ? dashboardData.books
        : [];

    // Check whether there are any unread tickets with admin replies
    const hasUnreadTickets = tickets.some(
        t => t.is_unread === 1
    );

    // Filter tickets by status
    const filteredTickets = tickets.filter(t => {
        if (!ticketFilter) return true;
        return t.status === ticketFilter;
    });

    return (
        <div className="min-h-screen bg-[#fcfbf9] text-[#1c1917] flex flex-col">

            {/* Top Navigation */}
            <header className="bg-white border-b border-[#e7e5e4] sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                    </div>

                    <div>
                        <h1 className="text-base font-semibold text-[#1e293b] leading-tight">
                            BookLeaf Author Portal
                        </h1>

                        <p className="text-xs text-[#57534e]">
                            Welcome, {author.name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#f5f4f0] border border-[#e7e5e4] rounded-lg text-xs text-[#57534e]">
                        <User className="w-3.5 h-3.5 text-[#0f766e]" />

                        <span>
                            Author ID:{' '}
                            <strong className="text-[#1c1917] font-mono">
                                {author.author_id}
                            </strong>
                        </span>
                    </div>

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
            <div className="bg-white border-b border-[#e7e5e4] px-6 py-2.5 flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'dashboard'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        Dashboard & Royalties
                    </button>

                    <button
                        onClick={() => setActiveTab('books')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'books'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        My Books ({books.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'tickets'
                                ? 'bg-[#0f766e] text-white shadow-xs'
                                : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f4f0]'
                        }`}
                    >
                        Support Tickets ({stats.openTicketsCount || 0} Open)

                        {hasUnreadTickets && (
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block ml-1.5"></span>
                        )}
                    </button>
                </div>

                <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="px-3.5 py-1.5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-medium rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Support Ticket
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

                {dashboardError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                        {dashboardError}
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                            <div className="bg-white border border-[#e7e5e4] p-5 rounded-xl shadow-xs">
                                <span className="text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                    Total Books
                                </span>

                                <div className="text-2xl font-bold text-[#1e293b] mt-1">
                                    {stats.totalBooks || 0}
                                </div>

                                <span className="text-[11px] text-[#0f766e] mt-1 block">
                                    Published editions
                                </span>
                            </div>

                            <div className="bg-white border border-[#e7e5e4] p-5 rounded-xl shadow-xs">
                                <span className="text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                    Copies Sold
                                </span>

                                <div className="text-2xl font-bold text-[#1e293b] mt-1">
                                    {stats.totalCopiesSold || 0}
                                </div>

                                <span className="text-[11px] text-emerald-600 mt-1 block">
                                    Lifetime sales
                                </span>
                            </div>

                            <div className="bg-white border border-[#e7e5e4] p-5 rounded-xl shadow-xs">
                                <span className="text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                    Total Royalty Earned
                                </span>

                                <div className="text-2xl font-bold text-[#1e293b] mt-1">
                                    ₹{stats.totalRoyaltyEarned || '0.00'}
                                </div>

                                <span className="text-[11px] text-[#0f766e] mt-1 block">
                                    80% net author share
                                </span>
                            </div>

                            <div className="bg-white border border-[#e7e5e4] p-5 rounded-xl shadow-xs">
                                <span className="text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                    Royalty Paid
                                </span>

                                <div className="text-2xl font-bold text-emerald-600 mt-1">
                                    ₹{stats.royaltyPaid || '0.00'}
                                </div>

                                <span className="text-[11px] text-[#57534e] mt-1 block">
                                    Disbursed to bank
                                </span>
                            </div>

                            <div className="bg-white border border-[#e7e5e4] p-5 rounded-xl shadow-xs">
                                <span className="text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                    Pending Payout
                                </span>

                                <div className="text-2xl font-bold text-amber-600 mt-1">
                                    ₹{stats.royaltyPending || '0.00'}
                                </div>

                                <span className="text-[11px] text-[#57534e] mt-1 block">
                                    45-day cycle
                                </span>
                            </div>
                        </div>

                        {/* Author Profile Card & Recent Tickets */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Profile Info */}
                            <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs space-y-4">
                                <h3 className="text-sm font-semibold text-[#1e293b] border-b border-[#e7e5e4] pb-3 uppercase tracking-wider">
                                    Author Profile
                                </h3>

                                <div className="space-y-3 text-xs">
                                    <div className="flex items-center gap-3 text-[#57534e]">
                                        <User className="w-4 h-4 text-[#0f766e]" />
                                        <strong className="text-[#1c1917]">
                                            {author.name}
                                        </strong>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#57534e]">
                                        <Mail className="w-4 h-4 text-[#0f766e]" />
                                        <span className="text-[#1c1917]">
                                            {author.email}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#57534e]">
                                        <Phone className="w-4 h-4 text-[#0f766e]" />
                                        <span className="text-[#1c1917]">
                                            {author.phone || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#57534e]">
                                        <MapPin className="w-4 h-4 text-[#0f766e]" />
                                        <span className="text-[#1c1917]">
                                            {author.city || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Support Tickets */}
                            <div className="lg:col-span-2 bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs flex flex-col">
                                <div className="flex items-center justify-between mb-4 border-b border-[#e7e5e4] pb-3">
                                    <h3 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wider">
                                        Recent Support Tickets
                                    </h3>

                                    <button
                                        onClick={() => setActiveTab('tickets')}
                                        className="text-xs text-[#0f766e] hover:underline font-medium"
                                    >
                                        View All ({tickets.length})
                                    </button>
                                </div>

                                {ticketsError && (
                                    <p className="text-xs text-red-600 mb-3">
                                        {ticketsError}
                                    </p>
                                )}

                                <div className="space-y-2.5 flex-1">
                                    {tickets.length === 0 ? (
                                        <p className="text-xs text-[#57534e] py-8 text-center">
                                            {ticketsError
                                                ? 'Unable to display tickets.'
                                                : 'No support tickets found.'}
                                        </p>
                                    ) : (
                                        tickets.slice(0, 4).map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTicketId(t.id)}
                                                className={`p-3.5 bg-[#fcfbf9] hover:bg-[#f5f4f0] border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                                                    t.is_unread === 1
                                                        ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-400/50'
                                                        : 'border-[#e7e5e4]'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[11px] font-mono text-[#0f766e] font-semibold">
                                                            {t.ticket_id}
                                                        </span>

                                                        <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                                                            t.status === 'Resolved' || t.status === 'Closed'
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-amber-50 text-amber-700'
                                                        }`}>
                                                            {t.status}
                                                        </span>

                                                        {t.is_unread === 1 && (
                                                            <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                                        )}
                                                    </div>

                                                    <h4 className="text-xs font-semibold text-[#1e293b]">
                                                        {t.subject}
                                                    </h4>

                                                    <p className="text-[11px] text-[#57534e] mt-0.5">
                                                        {t.category} • {new Date(t.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Books Tab */}
                {activeTab === 'books' && (
                    <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs">
                        <h3 className="text-sm font-semibold text-[#1e293b] mb-5 uppercase tracking-wider">
                            My Published Books ({books.length})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {books.length === 0 ? (
                                <p className="text-xs text-[#57534e]">
                                    No published books found.
                                </p>
                            ) : (
                                books.map(book => (
                                    <div
                                        key={book.id}
                                        className="bg-[#fcfbf9] border border-[#e7e5e4] rounded-xl p-5 flex flex-col justify-between shadow-xs"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="px-2 py-0.5 bg-[#f5f4f0] text-[#0f766e] font-mono text-[11px] rounded border border-[#e7e5e4]">
                                                    ISBN: {book.isbn || 'N/A'}
                                                </span>

                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium border border-emerald-200">
                                                    {book.status}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-semibold text-[#1e293b] mb-1">
                                                {book.title}
                                            </h4>

                                            <p className="text-xs text-[#57534e] mb-4">
                                                {book.genre} • Published{' '}
                                                {book.publication_date
                                                    ? new Date(book.publication_date).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>

                                        <div className="border-t border-[#e7e5e4] pt-3 space-y-1.5 text-xs">
                                            <div className="flex justify-between text-[#57534e]">
                                                <span>Copies Sold:</span>
                                                <strong className="text-[#1c1917]">
                                                    {book.total_copies_sold || 0}
                                                </strong>
                                            </div>

                                            <div className="flex justify-between text-[#57534e]">
                                                <span>Royalty Earned:</span>
                                                <strong className="text-[#0f766e]">
                                                    ₹{book.total_royalty_earned || '0.00'}
                                                </strong>
                                            </div>

                                            <div className="flex justify-between text-[#57534e]">
                                                <span>Pending Payout:</span>
                                                <strong className="text-amber-600">
                                                    ₹{book.royalty_pending || '0.00'}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                    <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-xs">
                        <div className="flex items-center justify-between mb-5 border-b border-[#e7e5e4] pb-4">
                            <h3 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wider">
                                Support Tickets
                            </h3>

                            <div className="flex gap-2">
                                <select
                                    value={ticketFilter}
                                    onChange={(e) => setTicketFilter(e.target.value)}
                                    className="bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                        </div>

                        {ticketsError && (
                            <p className="text-xs text-red-600 mb-3">
                                {ticketsError}
                            </p>
                        )}

                        <div className="space-y-3">
                            {filteredTickets.length === 0 ? (
                                <p className="text-xs text-[#57534e] py-12 text-center">
                                    {ticketsError
                                        ? 'Unable to load tickets.'
                                        : 'No tickets found matching filter.'}
                                </p>
                            ) : (
                                filteredTickets.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTicketId(t.id)}
                                        className={`p-4 bg-[#fcfbf9] hover:bg-[#f5f4f0] border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                                            t.is_unread === 1
                                                ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-400/50'
                                                : 'border-[#e7e5e4]'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2.5 mb-1">
                                                <span className="text-xs font-mono text-[#0f766e] font-semibold">
                                                    {t.ticket_id}
                                                </span>

                                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                                    t.status === 'Resolved' || t.status === 'Closed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {t.status}
                                                </span>

                                                <span className="px-2 py-0.5 bg-[#f5f4f0] text-[#57534e] text-xs rounded border border-[#e7e5e4]">
                                                    {t.category}
                                                </span>

                                                {t.is_unread === 1 && (
                                                    <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                                )}
                                            </div>

                                            <h4 className="text-xs font-semibold text-[#1e293b]">
                                                {t.subject}
                                            </h4>

                                            <p className="text-xs text-[#57534e] mt-0.5 line-clamp-1">
                                                {t.description}
                                            </p>
                                        </div>

                                        <span className="text-xs text-[#57534e] font-medium">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
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
                    onTicketUpdated={handleRefresh}
                />
            )}

            {/* New Ticket Modal */}
            {showNewTicketModal && (
                <NewTicketModal
                    books={books}
                    token={token}
                    onClose={() => setShowNewTicketModal(false)}
                    onTicketCreated={() => {
                        setShowNewTicketModal(false);
                        setActiveTab('tickets');
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
}
