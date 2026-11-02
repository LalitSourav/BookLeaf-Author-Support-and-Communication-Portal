import pool from '../config/db.js';
import { classifyTicketAI, draftAIResponse } from '../services/aiService.js';
import { fetchAndBuildAuthorContext } from '../services/ticketContextService.js';

// Get Tickets (Authors see their own; Admins see all with filters)
export const getTickets = async (req, res) => {
    try {
        const { id, role } = req.user;
        const { status, category, priority, search } = req.query;

        let query = `
            SELECT t.*, a.name as author_name, a.email as author_email, b.title as book_title, ad.name as admin_name,
            CASE
                WHEN ? = 'author' THEN
                    CASE
                        WHEN (SELECT tm.sender_type FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.is_internal_note = FALSE ORDER BY tm.created_at DESC LIMIT 1) = 'admin'
                         AND (t.author_last_viewed_at IS NULL OR t.author_last_viewed_at < (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.sender_type = 'admin' AND tm.is_internal_note = FALSE))
                        THEN 'admin'
                        ELSE 'author'
                    END
                ELSE
                    (SELECT tm.sender_type FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.is_internal_note = FALSE ORDER BY tm.created_at DESC LIMIT 1)
            END as last_sender_type
            FROM tickets t
            JOIN authors a ON t.author_id = a.id
            LEFT JOIN books b ON t.book_id = b.id
            LEFT JOIN admins ad ON t.assigned_admin_id = ad.id
            WHERE 1=1
        `;
        const queryParams = [role];

        if (role === 'author') {
            query += ' AND t.author_id = ?';
            queryParams.push(id);
        }

        if (status) {
            query += ' AND t.status = ?';
            queryParams.push(status);
        }

        if (category) {
            query += ' AND t.category = ?';
            queryParams.push(category);
        }

        if (priority) {
            query += ' AND t.priority = ?';
            queryParams.push(priority);
        }

        if (search) {
            query += ' AND (t.subject LIKE ? OR t.ticket_id LIKE ? OR a.name LIKE ?)';
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, queryParams);
        return res.status(200).json({ tickets });
    } catch (error) {
        console.error('Get Tickets error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching tickets.' });
    }
};

// Get single ticket with full message thread
export const getTicketById = async (req, res) => {
    try {
        const { id, role } = req.user;
        const ticketId = req.params.id;

        // 1. Get ticket
        const [ticketRows] = await pool.query(`
            SELECT t.*, a.name as author_name, a.email as author_email, b.title as book_title, ad.name as admin_name
            FROM tickets t
            JOIN authors a ON t.author_id = a.id
            LEFT JOIN books b ON t.book_id = b.id
            LEFT JOIN admins ad ON t.assigned_admin_id = ad.id
            WHERE t.id = ? OR t.ticket_id = ?
        `, [ticketId, ticketId]);

        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticket = ticketRows[0];

        // Authorization check for authors
        if (role === 'author') {
            if (Number(ticket.author_id) !== Number(id)) {
                return res.status(403).json({ error: 'Access denied. You can only view your own tickets.' });
            }
            // Update author last viewed timestamp so notification dot clears upon opening
            await pool.query('UPDATE tickets SET author_last_viewed_at = NOW() WHERE id = ?', [ticket.id]);
        }

        // 2. Get messages for this ticket (authors cannot see internal notes)
        let messageQuery = `
            SELECT tm.*,
                   CASE WHEN tm.sender_type = 'author' THEN a.name ELSE ad.name END as sender_name
            FROM ticket_messages tm
            LEFT JOIN authors a ON tm.sender_type = 'author' AND tm.sender_id = a.id
            LEFT JOIN admins ad ON tm.sender_type = 'admin' AND tm.sender_id = ad.id
            WHERE tm.ticket_id = ?
        `;

        if (role === 'author') {
            messageQuery += ' AND tm.is_internal_note = FALSE';
        }

        messageQuery += ' ORDER BY tm.created_at ASC';

        const [messages] = await pool.query(messageQuery, [ticket.id]);

        return res.status(200).json({
            ticket,
            messages
        });
    } catch (error) {
        console.error('Get Ticket Details error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching ticket details.' });
    }
};

// Create a new support ticket (Author) with AI auto-classification and fallback
export const createTicket = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const authorId = req.user.id;
        const { book_id, subject, description } = req.body;

        // Strict input type validation and trimming
        if (typeof subject !== 'string' || typeof description !== 'string') {
            return res.status(400).json({ error: 'Subject and description must be valid strings.' });
        }

        const safeSubject = subject.trim();
        const safeDesc = description.trim();

        if (!safeSubject) {
            return res.status(400).json({ error: 'Subject is required and cannot be empty.' });
        }
        if (safeSubject.length > 255) {
            return res.status(400).json({ error: 'Subject cannot exceed 255 characters.' });
        }
        if (!safeDesc) {
            return res.status(400).json({ error: 'Description is required and cannot be empty.' });
        }
        if (safeDesc.length > 5000) {
            return res.status(400).json({ error: 'Description cannot exceed 5000 characters.' });
        }

        // Validate book_id if provided
        if (book_id !== undefined && book_id !== null && book_id !== '') {
            if (isNaN(book_id) || Number(book_id) <= 0) {
                return res.status(400).json({ error: 'Invalid book ID.' });
            }
        }

        // 1. Book ownership verification using standalone pool query (no active connection holding)
        if (book_id) {
            const [bookRows] = await pool.query(
                'SELECT id FROM books WHERE id = ? AND author_id = ?',
                [book_id, authorId]
            );
            if (bookRows.length === 0) {
                return res.status(403).json({
                    error: 'Access denied. Book does not belong to you.'
                });
            }
        }

        // 2. Run AI auto-classification OUTSIDE of active database connection & transaction
        let aiResult;
        try {
            aiResult = await classifyTicketAI(safeSubject, safeDesc);
        } catch (aiError) {
            console.warn('AI classification failed, using fallback:', aiError.message);
            aiResult = {
                category: 'General Inquiry',
                priority: 'Medium',
                ai_summary: null,
                ai_status: 'fallback_error'
            };
        }

        // 3. Acquire connection and start transaction ONLY for database persistence
        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        // Generate robust ticket ID with duplicate-key retry handling
        let newInternalId = null;
        let createdTicketRecord = null;
        let inserted = false;
        let attempts = 0;

        while (!inserted && attempts < 5) {
            const randomHex = Math.floor(100000 + Math.random() * 900000);
            const ticketIdStr = `TKT-2026-${randomHex}`;

            try {
                const [result] = await connection.query(
                    `INSERT INTO tickets (ticket_id, author_id, book_id, subject, description, category, priority, ai_summary, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
                    [
                        ticketIdStr,
                        authorId,
                        book_id || null,
                        safeSubject,
                        safeDesc,
                        aiResult.category,
                        aiResult.priority,
                        aiResult.ai_summary || null
                    ]
                );
                newInternalId = result.insertId;
                inserted = true;
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                    attempts++;
                    if (attempts >= 5) throw err;
                } else {
                    throw err;
                }
            }
        }

        // Insert initial message into ticket_messages (transactional)
        await connection.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal_note)
             VALUES (?, 'author', ?, ?, FALSE)`,
            [newInternalId, authorId, safeDesc]
        );

        // Fetch newly created ticket using the SAME acquired connection (prevents pool deadlock)
        const [createdTicketRows] = await connection.query(
            `SELECT t.*, a.name as author_name, b.title as book_title
             FROM tickets t
             JOIN authors a ON t.author_id = a.id
             LEFT JOIN books b ON t.book_id = b.id
             WHERE t.id = ?`,
            [newInternalId]
        );
        createdTicketRecord = createdTicketRows[0];

        // Commit transaction
        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            message: 'Support ticket created successfully.',
            ticket: createdTicketRecord,
            ai_classification: aiResult
        });
    } catch (error) {
        if (transactionStarted && connection) {
            await connection.rollback();
        }
        console.error('Create Ticket error:', error);
        return res.status(500).json({ error: 'Internal server error while creating ticket.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Add message/reply to a ticket
export const addTicketMessage = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const { id, role } = req.user;
        const ticketIdParam = req.params.id;
        const { message, is_internal_note } = req.body;

        if (typeof message !== 'string') {
            return res.status(400).json({ error: 'Message must be a valid string.' });
        }

        const safeMessage = message.trim();
        if (!safeMessage) {
            return res.status(400).json({ error: 'Message content is required and cannot be empty.' });
        }
        if (safeMessage.length > 5000) {
            return res.status(400).json({ error: 'Message cannot exceed 5000 characters.' });
        }

        connection = await pool.getConnection();

        // 1. Find ticket
        const [ticketRows] = await connection.query('SELECT * FROM tickets WHERE id = ? OR ticket_id = ?', [ticketIdParam, ticketIdParam]);
        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }
        const ticket = ticketRows[0];

        // Authorization (normalize ID types for comparison)
        if (role === 'author' && Number(ticket.author_id) !== Number(id)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        // Strict boolean validation for internal note
        const internalNote = role === 'admin' ? (is_internal_note === true) : false;

        // Start transaction for atomic operations
        await connection.beginTransaction();
        transactionStarted = true;

        // 2. Insert message
        const [result] = await connection.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal_note)
             VALUES (?, ?, ?, ?, ?)`,
            [ticket.id, role, id, safeMessage, internalNote]
        );

        // 3. Update ticket status if admin replied (transactional)
        if (role === 'admin' && ticket.status === 'Open' && !internalNote) {
            await connection.query(
                'UPDATE tickets SET status = "In Progress", assigned_admin_id = COALESCE(assigned_admin_id, ?) WHERE id = ?',
                [id, ticket.id]
            );
        }

        // Fetch new message using the SAME acquired connection (prevents pool deadlock)
        const [newMsgRows] = await connection.query(
            `SELECT tm.*,
                    CASE WHEN tm.sender_type = 'author' THEN a.name ELSE ad.name END as sender_name
             FROM ticket_messages tm
             LEFT JOIN authors a ON tm.sender_type = 'author' AND tm.sender_id = a.id
             LEFT JOIN admins ad ON tm.sender_type = 'admin' AND tm.sender_id = ad.id
             WHERE tm.id = ?`,
            [result.insertId]
        );

        // Commit transaction
        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            message: 'Reply added successfully.',
            ticketMessage: newMsgRows[0]
        });
    } catch (error) {
        if (transactionStarted && connection) {
            await connection.rollback();
        }
        console.error('Add Ticket Message error:', error);
        return res.status(500).json({ error: 'Internal server error while adding reply.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Update ticket status, priority, or assignment (Admin only)
export const updateTicketMeta = async (req, res) => {
    let connection;
    try {
        const adminId = req.user.id;
        const ticketIdParam = req.params.id;
        const { status, priority, category, assigned_admin_id } = req.body;

        // Validate assigned_admin_id if provided
        if (assigned_admin_id !== undefined && assigned_admin_id !== null && assigned_admin_id !== '') {
            if (isNaN(assigned_admin_id) || Number(assigned_admin_id) <= 0) {
                return res.status(400).json({ error: 'Invalid assigned admin ID.' });
            }
        }

        connection = await pool.getConnection();

        const [ticketRows] = await connection.query('SELECT * FROM tickets WHERE id = ? OR ticket_id = ?', [ticketIdParam, ticketIdParam]);
        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }
        const ticket = ticketRows[0];

        // Validation: ensure admin exists if assigning admin
        if (assigned_admin_id !== undefined && assigned_admin_id !== null && assigned_admin_id !== '') {
            const [adminRows] = await connection.query('SELECT id FROM admins WHERE id = ?', [Number(assigned_admin_id)]);
            if (adminRows.length === 0) {
                return res.status(404).json({ error: 'Assigned admin not found.' });
            }
        }

        const updates = [];
        const params = [];

        if (status) {
            const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status value.' });
            }
            updates.push('status = ?');
            params.push(status);
        }
        if (priority) {
            const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
            if (!validPriorities.includes(priority)) {
                return res.status(400).json({ error: 'Invalid priority value.' });
            }
            updates.push('priority = ?');
            params.push(priority);
        }
        if (category) {
            const validCategories = ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality',
                                   'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ error: 'Invalid category value.' });
            }
            updates.push('category = ?');
            params.push(category);
        }
        if (assigned_admin_id !== undefined) {
            updates.push('assigned_admin_id = ?');
            params.push(assigned_admin_id ? Number(assigned_admin_id) : null);
        } else if (!ticket.assigned_admin_id && status === 'In Progress') {
            updates.push('assigned_admin_id = ?');
            params.push(adminId);
        }

        if (updates.length > 0) {
            params.push(ticket.id);
            await connection.query(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Fetch updated ticket using the SAME acquired connection (prevents pool deadlock)
        const [updatedRows] = await connection.query(
            `SELECT t.*, a.name as author_name, b.title as book_title, ad.name as admin_name
             FROM tickets t
             JOIN authors a ON t.author_id = a.id
             LEFT JOIN books b ON t.book_id = b.id
             LEFT JOIN admins ad ON t.assigned_admin_id = ad.id
             WHERE t.id = ?`,
            [ticket.id]
        );

        return res.status(200).json({
            message: 'Ticket updated successfully.',
            ticket: updatedRows[0]
        });
    } catch (error) {
        console.error('Update Ticket Meta error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Request AI response draft for a ticket (Admin only)
export const getAIDraftForTicket = async (req, res) => {
    try {
        const ticketIdParam = req.params.id;

        const [ticketRows] = await pool.query(`
            SELECT t.*, a.name as author_name, b.title as book_title
            FROM tickets t
            JOIN authors a ON t.author_id = a.id
            LEFT JOIN books b ON t.book_id = b.id
            WHERE t.id = ? OR t.ticket_id = ?
        `, [ticketIdParam, ticketIdParam]);

        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticket = ticketRows[0];

        // Fetch and build category-specific author and book context using dedicated service
        const authorContext = await fetchAndBuildAuthorContext(ticket);

        const draft = await draftAIResponse(ticket.subject, ticket.description, ticket.author_name, ticket.book_title, authorContext);

        return res.status(200).json({
            ai_draft: draft
        });
    } catch (error) {
        console.error('Get AI Draft error:', error);
        return res.status(500).json({ error: 'Internal server error while generating AI draft.' });
    }
};
