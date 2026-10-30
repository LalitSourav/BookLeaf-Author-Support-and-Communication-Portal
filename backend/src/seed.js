import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookleaf_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5
});

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding process...');

        const jsonPath = path.join(__dirname, 'bookleaf_sample_data.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Sample data file not found at ${jsonPath}`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const jsonData = JSON.parse(rawData);
        const authors = jsonData.authors;

        const defaultAuthorPasswordHash = await bcrypt.hash('Password@123', 10);
        const defaultAdminPasswordHash = await bcrypt.hash('Admin@123', 10);

        // 1. Seed Admin Account
        const [existingAdmin] = await pool.query('SELECT * FROM admins WHERE email = ?', ['admin@bookleaf.com']);
        if (existingAdmin.length === 0) {
            await pool.query(
                'INSERT INTO admins (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
                ['admin@bookleaf.com', defaultAdminPasswordHash, 'BookLeaf Admin', 'admin']
            );
            console.log('✅ Seeded admin account: admin@bookleaf.com / Admin@123');
        } else {
            console.log('ℹ️ Admin account already exists.');
        }

        // 2. Seed Authors and Books
        for (const author of authors) {
            const [existingAuthor] = await pool.query('SELECT id FROM authors WHERE author_id = ?', [author.author_id]);

            let authorIdSql;
            if (existingAuthor.length === 0) {
                const [result] = await pool.query(
                    'INSERT INTO authors (author_id, name, email, password_hash, phone, city, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        author.author_id,
                        author.name,
                        author.email,
                        defaultAuthorPasswordHash,
                        author.phone || null,
                        author.city || null,
                        author.joined_date || null
                    ]
                );
                authorIdSql = result.insertId;
                console.log(`✅ Seeded author: ${author.name} (${author.author_id})`);
            } else {
                authorIdSql = existingAuthor[0].id;
                console.log(`ℹ️ Author already exists: ${author.name} (${author.author_id})`);
            }

            if (author.books && Array.isArray(author.books)) {
                for (const book of author.books) {
                    const [existingBook] = await pool.query('SELECT id FROM books WHERE book_id = ?', [book.book_id]);

                    const availableOnJson = book.available_on ? JSON.stringify(book.available_on) : JSON.stringify([]);

                    if (existingBook.length === 0) {
                        await pool.query(
                            `INSERT INTO books
                            (book_id, author_id, title, isbn, genre, publication_date, status, mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned, royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                book.book_id,
                                authorIdSql,
                                book.title,
                                book.isbn || null,
                                book.genre || null,
                                book.publication_date || null,
                                book.status || 'In Production',
                                book.mrp !== null ? book.mrp : null,
                                book.author_royalty_per_copy !== null ? book.author_royalty_per_copy : null,
                                book.total_copies_sold || 0,
                                book.total_royalty_earned || 0.00,
                                book.royalty_paid || 0.00,
                                book.royalty_pending || 0.00,
                                book.last_royalty_payout_date || null,
                                book.print_partner || null,
                                availableOnJson
                            ]
                        );
                        console.log(`   📖 Seeded book: ${book.title} (${book.book_id})`);
                    } else {
                        console.log(`   ℹ️ Book already exists: ${book.title} (${book.book_id})`);
                    }
                }
            }
        }

        console.log('🎉 Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedDatabase();
