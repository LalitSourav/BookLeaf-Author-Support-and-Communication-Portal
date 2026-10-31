import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-bookleaf-2026';

// Unified Login for both Authors and Admins
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        let user = null;
        let role = null;

        // 1. Check if user is an Admin
        const [adminRows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (adminRows.length > 0) {
            user = adminRows[0];
            role = 'admin';
        } else {
            // 2. Check if user is an Author
            const [authorRows] = await pool.query('SELECT * FROM authors WHERE email = ?', [email]);
            if (authorRows.length > 0) {
                user = authorRows[0];
                role = 'author';
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 3. Compare password hash
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 4. Generate JWT Token
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: role,
            name: user.name,
            author_id: user.author_id || null 
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role,
                author_id: user.author_id || null,
                city: user.city || null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error during login.' });
    }
};

// Get current logged-in user profile
export const getMe = async (req, res) => {
    try {
        const { id, role } = req.user;

        if (role === 'admin') {
            const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM admins WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Admin not found.' });
            return res.status(200).json({ user: rows[0] });
        } else {
            const [rows] = await pool.query('SELECT id, author_id, name, email, phone, city, joined_date FROM authors WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Author not found.' });
            return res.status(200).json({ user: rows[0] });
        }
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
