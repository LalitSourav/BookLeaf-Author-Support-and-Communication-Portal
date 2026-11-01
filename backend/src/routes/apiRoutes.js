import express from 'express';
import { verifyToken, requireAdmin, requireAuthor } from '../middleware/auth.js';
import {
    getAuthorDashboard,
    getAuthorBooks,
    getAdminDashboard,
    getAllAuthors,
    getAllBooks
} from '../controllers/authorController.js';
import {
    getTickets,
    getTicketById,
    createTicket,
    addTicketMessage,
    updateTicketMeta,
    getAIDraftForTicket
} from '../controllers/ticketController.js';

const router = express.Router();

// --- Author Portal Routes ---
router.get('/authors/dashboard', verifyToken, requireAuthor, getAuthorDashboard);
router.get('/authors/books', verifyToken, requireAuthor, getAuthorBooks);

// --- Admin Portal Routes ---
router.get('/admin/dashboard', verifyToken, requireAdmin, getAdminDashboard);
router.get('/admin/authors', verifyToken, requireAdmin, getAllAuthors);
router.get('/admin/books', verifyToken, requireAdmin, getAllBooks);

// --- Shared / Ticket Routes ---
router.get('/tickets', verifyToken, getTickets);
router.post('/tickets', verifyToken, requireAuthor, createTicket); // Only authors create tickets
router.get('/tickets/:id', verifyToken, getTicketById);
router.post('/tickets/:id/messages', verifyToken, addTicketMessage);
router.patch('/tickets/:id', verifyToken, requireAdmin, updateTicketMeta); // Only admins update ticket metadata/status
router.get('/tickets/:id/ai-draft', verifyToken, requireAdmin, getAIDraftForTicket);

export default router;
