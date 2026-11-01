
import pool from '../config/db.js';

/**
 * Calculate the sum of a financial field.
 * Returns null if any book has missing or invalid financial data.
 */
const sumFinancialField = (books, field) => {

    if (books.length === 0) {
        return 0;
    }

    const values = books.map(book => book[field]);

    const hasMissingValue = values.some(
        value =>
            value === null ||
            value === undefined ||
            value === '' ||
            !Number.isFinite(Number(value))
    );

    if (hasMissingValue) {
        return null;
    }

    return values.reduce(
        (sum, value) => sum + Number(value),
        0
    );
};


/**
 * Fetch and construct category-specific author and book context
 * for AI response drafting.
 *
 * If a specific book is selected, only that author's book is fetched.
 * Otherwise, the author's complete book catalog is fetched.
 */
export const fetchAndBuildAuthorContext = async (ticket) => {

    let authorBooks = [];
    let selectedBookForContext = null;

    const hasBookId =
        ticket.book_id !== null &&
        ticket.book_id !== undefined &&
        ticket.book_id !== '';

    // ---------------------------------------------
    // 1. Fetch specific book or author's book catalog
    // ---------------------------------------------

    if (hasBookId) {

        const [bookRows] = await pool.query(`
            SELECT
                b.id,
                b.title,
                b.isbn,
                b.status,
                b.total_copies_sold,
                b.total_royalty_earned,
                b.royalty_paid,
                b.royalty_pending,
                b.publication_date,
                b.print_partner,
                b.available_on,

                (
                    SELECT COUNT(*)
                    FROM tickets t2
                    WHERE t2.book_id = b.id
                ) AS total_tickets_count

            FROM books b

            WHERE b.id = ?
            AND b.author_id = ?
        `, [ticket.book_id, ticket.author_id]);

        if (bookRows.length > 0) {
            selectedBookForContext = bookRows[0];
        }

    } else {

        const [bookRows] = await pool.query(`
            SELECT
                b.id,
                b.title,
                b.isbn,
                b.status,
                b.total_copies_sold,
                b.total_royalty_earned,
                b.royalty_paid,
                b.royalty_pending,
                b.publication_date,
                b.print_partner,
                b.available_on,

                (
                    SELECT COUNT(*)
                    FROM tickets t2
                    WHERE t2.book_id = b.id
                ) AS total_tickets_count

            FROM books b

            WHERE b.author_id = ?

            ORDER BY b.id DESC
        `, [ticket.author_id]);

        authorBooks = bookRows;
    }


    // ---------------------------------------------
    // 2. Initialize common context
    // ---------------------------------------------

    const normalizedTicketText =
        `${ticket.subject || ''} ${ticket.description || ''}`
            .toLowerCase()
            .trim();

    const bookNotFound = Boolean(
        hasBookId && !selectedBookForContext
    );

    const context = {

        authorName: ticket.author_name || 'Author',

        ticketCategory: ticket.category || 'General Inquiry',

        normalizedText: normalizedTicketText,

        bookNotFound,

        contextSource: hasBookId
            ? 'specific_book'
            : 'author_catalog',

        contextAvailable: hasBookId
            ? Boolean(selectedBookForContext)
            : authorBooks.length > 0
    };


    // ---------------------------------------------
    // 3. Build context for a specific book
    // ---------------------------------------------

    if (hasBookId && selectedBookForContext) {

        const book = selectedBookForContext;

        const baseRelevantBook = {

            title: book.title,

            isbn: book.isbn || null,

            status: book.status,

            total_tickets_count:
                Number(book.total_tickets_count || 0),

            publication_date: book.publication_date,

            print_partner: book.print_partner,

            available_on: book.available_on
        };


        // Add category-specific information.

        switch (ticket.category) {

            case 'Royalty & Payments':

                baseRelevantBook.total_copies_sold =
                    book.total_copies_sold;

                baseRelevantBook.total_royalty_earned =
                    book.total_royalty_earned;

                baseRelevantBook.royalty_paid =
                    book.royalty_paid;

                baseRelevantBook.royalty_pending =
                    book.royalty_pending;

                break;


            case 'Printing & Quality':

                baseRelevantBook.print_partner =
                    book.print_partner;

                break;


            case 'Distribution & Availability':

                baseRelevantBook.available_on =
                    book.available_on;

                break;


            case 'ISBN & Metadata Issues':

                baseRelevantBook.isbn =
                    book.isbn || null;

                baseRelevantBook.publication_date =
                    book.publication_date;

                break;


            case 'Book Status & Production Updates':

                baseRelevantBook.status =
                    book.status;

                baseRelevantBook.publication_date =
                    book.publication_date;

                break;


            default:

                baseRelevantBook.isbn =
                    book.isbn || null;

                baseRelevantBook.publication_date =
                    book.publication_date;

                break;
        }

        context.relevantBook = baseRelevantBook;
    }


    // ---------------------------------------------
    // 4. Build author-level context when no book
    //    is specifically selected
    // ---------------------------------------------

    else if (!hasBookId) {

        switch (ticket.category) {


            // -------------------------------------
            // Royalty & Payments
            // -------------------------------------

            case 'Royalty & Payments': {

                const aggregatedRoyalty = {

                    totalRoyaltyEarned: sumFinancialField(
                        authorBooks,
                        'total_royalty_earned'
                    ),

                    totalRoyaltyPaid: sumFinancialField(
                        authorBooks,
                        'royalty_paid'
                    ),

                    totalRoyaltyPending: sumFinancialField(
                        authorBooks,
                        'royalty_pending'
                    ),

                    totalCopiesSold: sumFinancialField(
                        authorBooks,
                        'total_copies_sold'
                    ),

                    booksCount: authorBooks.length,

                    topPerformingBook: null,

                    booksWithRoyaltyIssues:
                        authorBooks.filter(book =>
                            book.royalty_pending !== null &&
                            book.royalty_pending !== undefined &&
                            Number(book.royalty_pending) > 0
                        ).length
                };


                // Find the book with the highest
                // known royalty earnings.

                const booksWithKnownEarnings =
                    authorBooks.filter(book =>
                        book.total_royalty_earned !== null &&
                        book.total_royalty_earned !== undefined &&
                        book.total_royalty_earned !== '' &&
                        Number.isFinite(
                            Number(book.total_royalty_earned)
                        )
                    );


                if (booksWithKnownEarnings.length > 0) {

                    const topBook = booksWithKnownEarnings.reduce(
                        (prev, curr) =>
                            Number(curr.total_royalty_earned) >
                            Number(prev.total_royalty_earned)
                                ? curr
                                : prev
                    );

                    aggregatedRoyalty.topPerformingBook = {

                        title: topBook.title,

                        isbn: topBook.isbn || null,

                        totalRoyaltyEarned:
                            topBook.total_royalty_earned
                    };
                }


                context.royaltyAggregate = aggregatedRoyalty;

                break;
            }


            // -------------------------------------
            // Printing & Quality
            // -------------------------------------

            case 'Printing & Quality': {

                const booksByStatus = {};

                authorBooks.forEach(book => {

                    const status = book.status || 'Unknown';

                    if (!booksByStatus[status]) {
                        booksByStatus[status] = [];
                    }

                    booksByStatus[status].push({

                        title: book.title,

                        isbn: book.isbn || null,

                        status: book.status,

                        print_partner: book.print_partner
                    });
                });


                context.booksByProductionStage = booksByStatus;

                break;
            }


            // -------------------------------------
            // Distribution & Availability
            // -------------------------------------

            case 'Distribution & Availability': {

                const publishedOrLiveBooks =
                    authorBooks.filter(book => {

                        const status =
                            (book.status || '').toLowerCase();

                        return [
                            'published',
                            'live',
                            'available'
                        ].includes(status);
                    });


                const distributionHealth = {

                    booksEvaluatedCount:
                        publishedOrLiveBooks.length,

                    currentPlatformPresence:
                        publishedOrLiveBooks.map(book => ({

                            title: book.title,

                            isbn: book.isbn || null,

                            status: book.status,

                            available_on: book.available_on
                        }))
                };


                context.distributionHealth = distributionHealth;

                break;
            }


            // -------------------------------------
            // ISBN & Metadata Issues
            // -------------------------------------

            case 'ISBN & Metadata Issues': {

                const isbnContext = {

                    booksMetadata: authorBooks.map(book => ({

                        title: book.title,

                        isbn: book.isbn || null,

                        status: book.status,

                        publicationDate: book.publication_date
                    }))
                };


                context.isbnMetadataContext = isbnContext;

                break;
            }


            // -------------------------------------
            // Book Status & Production Updates
            // -------------------------------------

            case 'Book Status & Production Updates': {

                const productionContext = {

                    booksProductionStatus:
                        authorBooks.map(book => ({

                            title: book.title,

                            isbn: book.isbn || null,

                            status: book.status,

                            publicationDate:
                                book.publication_date,

                            printPartner: book.print_partner
                        }))
                };


                context.productionUpdateContext =
                    productionContext;

                break;
            }


            // -------------------------------------
            // General Inquiry
            // -------------------------------------

            default: {

                const limitedContext = {

                    totalBooks: authorBooks.length,

                    hasMultipleBooks: authorBooks.length > 1,

                    recentActivity:
                        authorBooks.slice(0, 3).map(book => ({

                            title: book.title,

                            isbn: book.isbn || null,

                            status: book.status,

                            publicationDate:
                                book.publication_date
                        }))
                };


                context.generalInquiryContext = limitedContext;

                break;
            }
        }
    }


    // ---------------------------------------------
    // 5. Return only category-relevant context
    // ---------------------------------------------

    return selectAuthorContext(
        context,
        ticket.category || 'General Inquiry'
    );
};


/**
 * Select only the database information relevant
 * to the ticket category.
 *
 * This prevents unnecessary author and book data
 * from being passed to the AI service.
 */
export function selectAuthorContext(authorContext, category) {

    const selected = {

        authorName: authorContext.authorName,

        ticketCategory: authorContext.ticketCategory,

        normalizedText: authorContext.normalizedText,

        bookNotFound: Boolean(authorContext.bookNotFound),

        contextSource: authorContext.contextSource,

        contextAvailable: Boolean(
            authorContext.contextAvailable
        )
    };


    // Include specific book information when available.

    if (authorContext.relevantBook) {

        selected.relevantBook =
            authorContext.relevantBook;
    }


    // Include category-specific author context.

    switch (category) {


        case 'Royalty & Payments':

            if (authorContext.royaltyAggregate) {

                selected.royaltyAggregate =
                    authorContext.royaltyAggregate;
            }

            break;


        case 'Printing & Quality':

            if (authorContext.booksByProductionStage) {

                selected.booksByProductionStage =
                    authorContext.booksByProductionStage;
            }

            break;


        case 'Distribution & Availability':

            if (authorContext.distributionHealth) {

                selected.distributionHealth =
                    authorContext.distributionHealth;
            }

            break;


        case 'ISBN & Metadata Issues':

            if (authorContext.isbnMetadataContext) {

                selected.isbnMetadataContext =
                    authorContext.isbnMetadataContext;
            }

            break;


        case 'Book Status & Production Updates':

            if (authorContext.productionUpdateContext) {

                selected.productionUpdateContext =
                    authorContext.productionUpdateContext;
            }

            break;


        default:

            if (authorContext.generalInquiryContext) {

                selected.generalInquiryContext =
                    authorContext.generalInquiryContext;
            }

            break;
    }


    return selected;
}
