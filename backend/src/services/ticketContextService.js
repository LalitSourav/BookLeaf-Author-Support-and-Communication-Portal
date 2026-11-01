import pool from '../config/db.js';

/**
 * Fetch and construct category-specific author and book context for AI response drafting.
 */
export const fetchAndBuildAuthorContext = async (ticket) => {
    let authorBooks = [];
    let selectedBookForContext = null;

    if (ticket.book_id) {
        // Specific book ticket with ownership verification, total_tickets_count, and ISBN
        const [bookRows] = await pool.query(`
            SELECT b.id, b.title, b.isbn, b.status, b.total_copies_sold,
                   b.total_royalty_earned, b.royalty_paid, b.royalty_pending,
                   b.publication_date, b.print_partner, b.available_on,
                   (SELECT COUNT(*) FROM tickets t2 WHERE t2.book_id = b.id) as total_tickets_count
            FROM books b
            WHERE b.id = ? AND b.author_id = ?
        `, [ticket.book_id, ticket.author_id]);
        if (bookRows.length > 0) selectedBookForContext = bookRows[0];
    } else {
        // General inquiry - get essential data across author catalog
        const [bookRows] = await pool.query(`
            SELECT b.id, b.title, b.isbn, b.status, b.total_copies_sold,
                   b.total_royalty_earned, b.royalty_paid, b.royalty_pending,
                   b.publication_date, b.print_partner, b.available_on,
                   (SELECT COUNT(*) FROM tickets t2 WHERE t2.book_id = b.id) as total_tickets_count
            FROM books b
            WHERE b.author_id = ?
            ORDER BY b.id DESC
        `, [ticket.author_id]);
        authorBooks = bookRows;
    }

    const normalizedTicketText = `${ticket.subject} ${ticket.description}`.toLowerCase();
    const context = {
        authorName: ticket.author_name,
        ticketCategory: ticket.category,
        normalizedText: normalizedTicketText
    };

    if (ticket.book_id && selectedBookForContext) {
        const baseRelevantBook = {
            title: selectedBookForContext.title,
            isbn: selectedBookForContext.isbn || 'N/A',
            status: selectedBookForContext.status,
            total_tickets_count: selectedBookForContext.total_tickets_count || 0,
            publication_date: selectedBookForContext.publication_date,
            print_partner: selectedBookForContext.print_partner,
            available_on: selectedBookForContext.available_on
        };

        if (ticket.category === 'Royalty & Payments') {
            baseRelevantBook.total_copies_sold = selectedBookForContext.total_copies_sold;
            baseRelevantBook.total_royalty_earned = selectedBookForContext.total_royalty_earned;
            baseRelevantBook.royalty_paid = selectedBookForContext.royalty_paid;
            baseRelevantBook.royalty_pending = selectedBookForContext.royalty_pending;
        } else if (ticket.category === 'Printing & Quality') {
            baseRelevantBook.print_partner = selectedBookForContext.print_partner;
        } else if (ticket.category === 'Distribution & Availability') {
            baseRelevantBook.available_on = selectedBookForContext.available_on;
        } else if (ticket.category === 'ISBN & Metadata Issues') {
            baseRelevantBook.isbn = selectedBookForContext.isbn || 'N/A';
            baseRelevantBook.publication_date = selectedBookForContext.publication_date;
        } else if (ticket.category === 'Book Status & Production Updates') {
            baseRelevantBook.publication_date = selectedBookForContext.publication_date;
            baseRelevantBook.status = selectedBookForContext.status;
        } else {
            baseRelevantBook.isbn = selectedBookForContext.isbn || 'N/A';
            baseRelevantBook.publication_date = selectedBookForContext.publication_date;
        }

        context.relevantBook = baseRelevantBook;
        return context;
    } else {
        if (ticket.category === 'Royalty & Payments') {
            const aggregatedRoyalty = {
                totalRoyaltyEarned: authorBooks.reduce((sum, book) => sum + Number(book.total_royalty_earned || 0), 0),
                totalRoyaltyPaid: authorBooks.reduce((sum, book) => sum + Number(book.royalty_paid || 0), 0),
                totalRoyaltyPending: authorBooks.reduce((sum, book) => sum + Number(book.royalty_pending || 0), 0),
                totalCopiesSold: authorBooks.reduce((sum, book) => sum + Number(book.total_copies_sold || 0), 0),
                booksCount: authorBooks.length,
                topPerformingBook: null,
                booksWithRoyaltyIssues: authorBooks.filter(b => Number(b.royalty_pending || 0) > 0).length
            };

            if (authorBooks.length > 0) {
                const topBook = authorBooks.reduce((prev, curr) =>
                    Number(curr.total_royalty_earned || 0) > Number(prev.total_royalty_earned || 0) ? curr : prev
                );
                aggregatedRoyalty.topPerformingBook = {
                    title: topBook.title,
                    isbn: topBook.isbn || 'N/A',
                    totalRoyaltyEarned: topBook.total_royalty_earned || 0
                };
            }
            context.aggregatedRoyaltyData = aggregatedRoyalty;
            return context;
        } else if (ticket.category === 'Printing & Quality') {
            const booksByStatus = {};
            authorBooks.forEach(book => {
                const st = book.status || 'Unknown';
                if (!booksByStatus[st]) booksByStatus[st] = [];
                booksByStatus[st].push({
                    title: book.title,
                    isbn: book.isbn || 'N/A',
                    status: book.status,
                    print_partner: book.print_partner
                });
            });
            context.booksByProductionStage = booksByStatus;
            return context;
        } else if (ticket.category === 'Distribution & Availability') {
            const publishedOrLiveBooks = authorBooks.filter(b =>
                b.status && (b.status.toLowerCase() === 'published' || b.status.toLowerCase() === 'live' || b.status.toLowerCase() === 'available')
            );
            const distributionHealth = {
                booksEvaluatedCount: publishedOrLiveBooks.length,
                currentPlatformPresence: publishedOrLiveBooks.map(book => ({
                    title: book.title,
                    isbn: book.isbn || 'N/A',
                    status: book.status,
                    available_on: book.available_on
                }))
            };
            context.distributionHealth = distributionHealth;
            return context;
        } else if (ticket.category === 'ISBN & Metadata Issues') {
            const isbnContext = {
                booksMetadata: authorBooks.map(b => ({
                    title: b.title,
                    isbn: b.isbn || 'N/A',
                    status: b.status,
                    publicationDate: b.publication_date
                }))
            };
            context.isbnMetadataContext = isbnContext;
            return context;
        } else if (ticket.category === 'Book Status & Production Updates') {
            const productionContext = {
                booksProductionStatus: authorBooks.map(b => ({
                    title: b.title,
                    isbn: b.isbn || 'N/A',
                    status: b.status,
                    publicationDate: b.publication_date,
                    printPartner: b.print_partner
                }))
            };
            context.productionUpdateContext = productionContext;
            return context;
        } else {
            const limitedContext = {
                totalBooks: authorBooks.length,
                hasMultipleBooks: authorBooks.length > 1,
                recentActivity: authorBooks.slice(0, 3).map(book => ({
                    title: book.title,
                    isbn: book.isbn || 'N/A',
                    status: book.status,
                    publicationDate: book.publication_date
                }))
            };
            context.generalInquiryContext = limitedContext;
            return context;
        }
    }
};
