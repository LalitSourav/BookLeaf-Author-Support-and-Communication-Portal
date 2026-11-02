import React, { useState } from 'react';
import { X, Sparkles, Send } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function NewTicketModal({
    books = [],
    token,
    onClose,
    onTicketCreated
}) {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [bookId, setBookId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) return;

        setError('');

        const trimmedSubject = subject.trim();
        const trimmedDesc = description.trim();

        // Validate subject and description
        if (!trimmedSubject || !trimmedDesc) {
            setError('Subject and description cannot be empty or whitespace only.');
            return;
        }

        // Validate character limits
        if (trimmedSubject.length > 255) {
            setError('Subject cannot exceed 255 characters.');
            return;
        }

        if (trimmedDesc.length > 5000) {
            setError('Description cannot exceed 5000 characters.');
            return;
        }

        // Validate selected book ID
        let selectedBookId = null;

        if (bookId) {
            selectedBookId = Number(bookId);

            if (!Number.isSafeInteger(selectedBookId) || selectedBookId <= 0) {
                setError('Please select a valid book.');
                return;
            }
        }

        if (!token) {
            setError('Your session has expired. Please log in again.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject: trimmedSubject,
                    description: trimmedDesc,
                    book_id: selectedBookId
                })
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    `Failed to create ticket (${res.status}).`
                );
            }

            if (!data || !data.ticket) {
                throw new Error('Ticket was submitted, but the server returned an invalid response.');
            }

            if (onTicketCreated) {
                onTicketCreated(data.ticket);
            }

            onClose();

        } catch (err) {
            console.error('Failed to create support ticket:', err);

            setError(
                err.message || 'Something went wrong. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#e7e5e4] rounded-xl shadow-xl max-w-lg w-full overflow-hidden p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-[#1e293b]">
                                New Support Ticket
                            </h2>

                            <p className="text-xs text-[#57534e]">
                                AI auto-classifies & prioritizes your request
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="p-1.5 text-[#57534e] hover:text-[#1c1917] bg-[#f5f4f0] hover:bg-[#e7e5e4] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        role="alert"
                        className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs"
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Related Book */}
                    <div>
                        <label className="block text-xs font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">
                            Related Book (Optional)
                        </label>

                        <select
                            value={bookId}
                            onChange={(e) => {
                                setBookId(e.target.value);
                                setError('');
                            }}
                            disabled={submitting}
                            className="w-full bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e] disabled:opacity-50"
                        >
                            <option value="">-- General Inquiry --</option>

                            {books.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.title} ({b.isbn || 'No ISBN'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subject */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                Subject
                            </label>

                            <span className="text-[11px] text-slate-400">
                                {subject.length}/255 chars
                            </span>
                        </div>

                        <input
                            type="text"
                            required
                            maxLength={255}
                            value={subject}
                            disabled={submitting}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setError('');
                            }}
                            placeholder="e.g. Inquiry regarding Q3 royalty disbursement (max 255 chars)"
                            className="w-full bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e] placeholder-slate-400 disabled:opacity-50"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                                Description
                            </label>

                            <span className="text-[11px] text-slate-400">
                                {description.length}/5000 chars
                            </span>
                        </div>

                        <textarea
                            rows="4"
                            required
                            maxLength={5000}
                            value={description}
                            disabled={submitting}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setError('');
                            }}
                            placeholder="Please provide details about your inquiry or request (max 5000 chars)..."
                            className="w-full bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f766e] placeholder-slate-400 resize-none disabled:opacity-50"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-4 py-2 bg-[#f5f4f0] hover:bg-[#e7e5e4] text-[#57534e] font-medium rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-[#0f766e] hover:bg-[#0d9488] text-white font-medium rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                'Submitting...'
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    Submit Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
