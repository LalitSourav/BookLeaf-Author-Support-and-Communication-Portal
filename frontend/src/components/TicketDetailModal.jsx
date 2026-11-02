import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Sparkles, Shield, User } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function TicketDetailModal({
    ticketId,
    currentUser,
    token,
    onClose,
    onTicketUpdated
}) {
    const [ticketData, setTicketData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [isInternalNote, setIsInternalNote] = useState(false);
    const [sending, setSending] = useState(false);
    const [aiDrafting, setAiDrafting] = useState(false);
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [error, setError] = useState(null);
    const [updatingMeta, setUpdatingMeta] = useState(false);

    const metaUpdatingRef = useRef(false);

    const isAdmin = currentUser?.role === 'admin';

    // Fetch ticket details
    const fetchTicketDetails = useCallback(async (signal) => {
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error || `Failed to fetch ticket details (${res.status})`
                );
            }

            if (!data.ticket) {
                throw new Error('Invalid ticket response from server.');
            }

            setTicketData(data.ticket);
            setMessages(Array.isArray(data.messages) ? data.messages : []);

            // Avoid overwriting metadata while an update is in progress.
            if (!metaUpdatingRef.current) {
                setStatus(data.ticket.status || '');
                setPriority(data.ticket.priority || '');
            }

            setError(null);
        } catch (err) {
            if (err.name === 'AbortError') return;

            console.error('Failed to fetch ticket details:', err);
            setError(err.message || 'Failed to fetch ticket details.');
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [ticketId, token]);

    // Initial fetch and polling
    useEffect(() => {
        const controller = new AbortController();
        let timer;
        let isCancelled = false;

        const poll = async () => {
            if (isCancelled) return;

            await fetchTicketDetails(controller.signal);

            if (!isCancelled && !controller.signal.aborted) {
                timer = setTimeout(poll, 6000);
            }
        };

        poll();

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [fetchTicketDetails]);

    // Send reply or internal note
    const handleSendReply = async (e) => {
        e.preventDefault();

        const message = replyText.trim();

        if (!message || sending) return;

        if (message.length > 5000) {
            setError('Message cannot exceed 5000 characters.');
            return;
        }

        setSending(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    is_internal_note: isAdmin && isInternalNote
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error || `Failed to send reply (${res.status})`
                );
            }

            setReplyText('');
            setIsInternalNote(false);

            await fetchTicketDetails();

            if (onTicketUpdated) {
                onTicketUpdated();
            }
        } catch (err) {
            console.error('Failed to send reply:', err);
            setError(err.message || 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    };

    // Generate AI reply draft
    const handleGenerateAIDraft = async () => {
        if (aiDrafting) return;

        setAiDrafting(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/ai-draft`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error || `Failed to generate AI draft (${res.status})`
                );
            }

            if (
                typeof data.ai_draft !== 'string' ||
                !data.ai_draft.trim()
            ) {
                throw new Error('The AI did not return a valid draft.');
            }

            setReplyText(data.ai_draft);
        } catch (err) {
            console.error('Failed to generate AI draft:', err);
            setError(err.message || 'Failed to generate AI draft.');
        } finally {
            setAiDrafting(false);
        }
    };

    // Update ticket status and priority
    const handleUpdateMeta = async (newStatus, newPriority) => {
        if (metaUpdatingRef.current) return;

        const prevStatus = status;
        const prevPriority = priority;

        const targetStatus =
            newStatus !== undefined ? newStatus : status;

        const targetPriority =
            newPriority !== undefined ? newPriority : priority;

        if (
            targetStatus === prevStatus &&
            targetPriority === prevPriority
        ) {
            return;
        }

        metaUpdatingRef.current = true;
        setUpdatingMeta(true);
        setError(null);

        // Optimistic update
        setStatus(targetStatus);
        setPriority(targetPriority);

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: targetStatus,
                    priority: targetPriority
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error || `Failed to update ticket (${res.status})`
                );
            }

            // Use the returned ticket if available.
            if (data.ticket) {
                setTicketData(data.ticket);
                setStatus(data.ticket.status || targetStatus);
                setPriority(data.ticket.priority || targetPriority);
            } else {
                setTicketData(prev => prev ? {
                    ...prev,
                    status: targetStatus,
                    priority: targetPriority
                } : prev);
            }

            if (onTicketUpdated) {
                onTicketUpdated();
            }
        } catch (err) {
            console.error('Failed to update ticket metadata:', err);

            // Rollback on failure
            setStatus(prevStatus);
            setPriority(prevPriority);

            setError(err.message || 'Failed to update ticket metadata.');
        } finally {
            metaUpdatingRef.current = false;
            setUpdatingMeta(false);
        }
    };

    if (loading && !ticketData) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white border border-[#e7e5e4] p-6 rounded-xl shadow-lg text-[#1c1917] flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin"></div>
                    Loading support ticket...
                </div>
            </div>
        );
    }

    if (!ticketData) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-[#e7e5e4] p-6 rounded-xl shadow-xl max-w-md w-full text-center space-y-4">
                    <h3 className="text-base font-semibold text-red-600">
                        Ticket Not Found
                    </h3>

                    <p className="text-xs text-[#57534e]">
                        {error || 'Could not load support ticket details. It may have been removed or you do not have permission.'}
                    </p>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#0f766e] text-white rounded-lg text-xs font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#e7e5e4] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-[#e7e5e4] flex items-start justify-between bg-[#fcfbf9]">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="px-2.5 py-0.5 bg-[#f5f4f0] border border-[#e7e5e4] text-[#0f766e] font-mono text-xs rounded font-medium">
                                {ticketData.ticket_id}
                            </span>

                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${
                                ticketData.status === 'Resolved' || ticketData.status === 'Closed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : ticketData.status === 'In Progress'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                                {ticketData.status}
                            </span>

                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${
                                ticketData.priority === 'Urgent' || ticketData.priority === 'High'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-[#f5f4f0] text-[#57534e]'
                            }`}>
                                {ticketData.priority} Priority
                            </span>
                        </div>

                        <h2 className="text-xl font-semibold text-[#1e293b]">
                            {ticketData.subject}
                        </h2>

                        {ticketData.ai_summary && (
                            <div className="mt-2 p-2.5 bg-[#0f766e]/5 border border-[#0f766e]/20 rounded-lg text-xs text-[#0f766e] flex items-start gap-2">
                                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#0f766e]" />

                                <div>
                                    <strong className="font-semibold">AI Summary:</strong> {ticketData.ai_summary}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-[#57534e] mt-1.5">
                            Author: <strong className="text-[#1c1917]">{ticketData.author_name}</strong> ({ticketData.author_email})

                            {ticketData.book_title && (
                                <span>
                                    {' '}• Book: <strong className="text-[#1c1917]">{ticketData.book_title}</strong>
                                </span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-[#57534e] hover:text-[#1c1917] bg-[#f5f4f0] hover:bg-[#e7e5e4] rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center justify-between">
                        <span>{error}</span>

                        <button
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-800 font-bold ml-2"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Admin Controls */}
                {isAdmin && (
                    <div className="px-6 py-3 bg-[#f5f4f0] border-b border-[#e7e5e4] flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3">
                            <label className="text-[#57534e] font-semibold">
                                Status:
                            </label>

                            <select
                                value={status}
                                disabled={updatingMeta}
                                onChange={(e) => handleUpdateMeta(e.target.value, undefined)}
                                className="bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e] disabled:opacity-50"
                            >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>

                            <label className="text-[#57534e] font-semibold ml-2">
                                Priority:
                            </label>

                            <select
                                value={priority}
                                disabled={updatingMeta}
                                onChange={(e) => handleUpdateMeta(undefined, e.target.value)}
                                className="bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e] disabled:opacity-50"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={handleGenerateAIDraft}
                            disabled={aiDrafting}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-[#0f766e]/40 text-[#0f766e] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {aiDrafting ? 'Drafting Response...' : '✨ Generate AI Response Draft'}
                        </button>
                    </div>
                )}

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                    {messages.map((msg, index) => {
                        const isAdminMessage = msg.sender_type === 'admin';
                        const isNote = Boolean(msg.is_internal_note);

                        // Internal notes should only be visible to admins.
                        if (isNote && !isAdmin) {
                            return null;
                        }

                        return (
                            <div
                                key={msg.id ?? index}
                                className={`flex flex-col ${
                                    isAdminMessage && !isNote
                                        ? 'items-end'
                                        : isNote
                                            ? 'items-center'
                                            : 'items-start'
                                }`}
                            >
                                {isNote ? (
                                    <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3.5 my-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                                            <Shield className="w-3.5 h-3.5" />
                                            Internal Admin Note by {msg.sender_name} • {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                                        </div>

                                        <p className="text-xs text-amber-900 whitespace-pre-wrap">
                                            {msg.message}
                                        </p>
                                    </div>
                                ) : (
                                    <div className={`max-w-xl rounded-xl p-4 ${
                                        isAdminMessage
                                            ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534]'
                                            : 'bg-[#f5f4f0] border border-[#e7e5e4] text-[#1c1917]'
                                    }`}>
                                        <div className="flex items-center gap-2 text-xs font-semibold opacity-85 mb-1">
                                            {isAdminMessage ? (
                                                <Shield className="w-3.5 h-3.5 text-[#0f766e]" />
                                            ) : (
                                                <User className="w-3.5 h-3.5 text-[#57534e]" />
                                            )}

                                            <span className="text-[#1e293b]">
                                                {msg.sender_name}
                                            </span>

                                            <span className="text-[#57534e] font-normal">
                                                • {msg.created_at
                                                    ? new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : ''
                                                }
                                            </span>
                                        </div>

                                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                            {msg.message}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Reply Form */}
                <form
                    onSubmit={handleSendReply}
                    className="p-4 bg-[#fcfbf9] border-t border-[#e7e5e4]"
                >
                    {isAdmin && (
                        <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 text-xs text-[#57534e] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isInternalNote}
                                    onChange={(e) => setIsInternalNote(e.target.checked)}
                                    className="rounded border-[#e7e5e4] text-[#0f766e] focus:ring-[#0f766e]"
                                />

                                <span className={isInternalNote ? 'text-amber-700 font-semibold' : ''}>
                                    Mark as Internal Note (Admin eyes only)
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <textarea
                            rows="2"
                            maxLength={5000}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={
                                isAdmin
                                    ? "Type your reply to author or internal note (max 5000 chars)..."
                                    : "Type your reply to support (max 5000 chars)..."
                            }
                            className="flex-1 bg-white border border-[#e7e5e4] rounded-lg px-4 py-2.5 text-[#1c1917] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] text-xs resize-none"
                            required
                        />

                        <button
                            type="submit"
                            disabled={sending || !replyText.trim()}
                            className="px-5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-sm"
                        >
                            {sending ? (
                                'Sending...'
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Reply
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
