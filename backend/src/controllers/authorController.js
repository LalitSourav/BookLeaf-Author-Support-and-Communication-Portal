import pool from '../config/db.js';

// Get Author Dashboard Stats
export const getAuthorDashboard = async (req, res) => {
    try {
        const authorId = req.user.id; // authors table primary key id

        // 1. Get author details
        const [authorRows] = await pool.query(
            'SELECT id, author_id, name, email, phone, city, joined_date FROM authors WHERE id = ?',
            [authorId]
        );
        if (authorRows.length === 0) {
            return res.status(404).json({ error: 'Author not found.' });
        }
        const author = authorRows[0];

        // 2. Get books authored by this author
        const [bookRows] = await pool.query(
            'SELECT * FROM books WHERE author_id = ? ORDER BY publication_date DESC',
            [authorId]
        );

        // 3. Calculate summary metrics
        let totalBooks = bookRows.length;
        let totalCopiesSold = 0;
        let totalRoyaltyEarned = 0;
        let royaltyPaid = 0;
        let royaltyPending = 0;

        bookRows.forEach(book => {
            totalCopiesSold += book.total_copies_sold || 0;
            totalRoyaltyEarned += parseFloat(book.total_royalty_earned || 0);
            royaltyPaid += parseFloat(book.royalty_paid || 0);
            royaltyPending += parseFloat(book.royalty_pending || 0);
        });

        // 4. Get active support tickets for this author with last message sender type
        const [ticketRows] = await pool.query(`
            SELECT t.*,
            CASE
                WHEN (SELECT tm.sender_type FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.is_internal_note = FALSE ORDER BY tm.created_at DESC LIMIT 1) = 'admin'
                 AND (t.author_last_viewed_at IS NULL OR t.author_last_viewed_at < (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.sender_type = 'admin' AND tm.is_internal_note = FALSE))
                THEN 'admin'
                ELSE 'author'
            END as last_sender_type
            FROM tickets t
            WHERE t.author_id = ?
            ORDER BY t.created_at DESC
        `, [authorId]);

        const openTicketsCount = ticketRows.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

        return res.status(200).json({
            author,
            stats: {
                totalBooks,
                totalCopiesSold,
                totalRoyaltyEarned: totalRoyaltyEarned.toFixed(2),
                royaltyPaid: royaltyPaid.toFixed(2),
                royaltyPending: royaltyPending.toFixed(2),
                openTicketsCount,
                totalTicketsCount: ticketRows.length
            },
            books: bookRows,
            recentTickets: ticketRows.slice(0, 5)
        });
    } catch (error) {
        console.error('Get Author Dashboard error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching dashboard.' });
    }
};

// Get all books for logged-in author
export const getAuthorBooks = async (req, res) => {
    try {
        const authorId = req.user.id;
        const [rows] = await pool.query('SELECT * FROM books WHERE author_id = ? ORDER BY title ASC', [authorId]);
        return res.status(200).json({ books: rows });
    } catch (error) {
        console.error('Get Author Books error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get Admin Dashboard Overview (for Admin Portal)
export const getAdminDashboard = async (req, res) => {
    try {
        // 1. Total authors, books, tickets
        const [[{ authorCount }]] = await pool.query('SELECT COUNT(*) as authorCount FROM authors');
        const [[{ bookCount }]] = await pool.query('SELECT COUNT(*) as bookCount FROM books');
        const [[{ ticketCount }]] = await pool.query('SELECT COUNT(*) as ticketCount FROM tickets');
        const [[{ openTicketCount }]] = await pool.query("SELECT COUNT(*) as openTicketCount FROM tickets WHERE status != 'Closed'");

        // 2. Financial totals across all books
        const [[finances]] = await pool.query(`
            SELECT
                SUM(total_copies_sold) as totalCopies,
                SUM(total_royalty_earned) as totalRoyalty,
                SUM(royalty_paid) as totalPaid,
                SUM(royalty_pending) as totalPending
            FROM books
        `);

        // 3. Recent tickets queue
        const [recentTickets] = await pool.query(`
            SELECT t.*, a.name as author_name, b.title as book_title
            FROM tickets t
            JOIN authors a ON t.author_id = a.id
            LEFT JOIN books b ON t.book_id = b.id
            ORDER BY t.created_at DESC
            LIMIT 10
        `);

        return res.status(200).json({
            metrics: {
                authorCount,
                bookCount,
                ticketCount,
                openTicketCount,
                totalCopiesSold: finances.totalCopies || 0,
                totalRoyaltyEarned: parseFloat(finances.totalRoyalty || 0).toFixed(2),
                royaltyPaid: parseFloat(finances.totalPaid || 0).toFixed(2),
                royaltyPending: parseFloat(finances.totalPending || 0).toFixed(2)
            },
            recentTickets
        });
    } catch (error) {
        console.error('Get Admin Dashboard error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching admin dashboard.' });
    }
};

// Get all authors (Admin only)
export const getAllAuthors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, author_id, name, email, phone, city, joined_date, created_at FROM authors ORDER BY name ASC');
        return res.status(200).json({ authors: rows });
    } catch (error) {
        console.error('Get All Authors error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get all books across platform (Admin only)
export const getAllBooks = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, a.name as author_name
            FROM books b
            JOIN authors a ON b.author_id = a.id
            ORDER BY b.title ASC
        `);
        return res.status(200).json({ books: rows });
    } catch (error) {
        console.error('Get All Books error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
