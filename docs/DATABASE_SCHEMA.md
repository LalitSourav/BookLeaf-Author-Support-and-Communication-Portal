# Database Schema — BookLeaf Portal

## Database Engine: MySQL (v8.0+)
Managed via native SQL migration scripts using `mysql2`.

## ER Diagram
```mermaid
erDiagram
    authors {
        int id PK
        varchar author_id UK
        varchar name
        varchar email UK
        varchar password_hash
        varchar phone
        varchar city
        date joined_date
    }

    books {
        int id PK
        varchar book_id UK
        int author_id FK
        varchar title
        varchar isbn
        varchar genre
        date publication_date
        varchar status
        decimal mrp
        decimal author_royalty_per_copy
        int total_copies_sold
        decimal total_royalty_earned
        decimal royalty_paid
        decimal royalty_pending
        date last_royalty_payout_date
        varchar print_partner
        json available_on
    }

    admins {
        int id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role
    }

    tickets {
        int id PK
        varchar ticket_id UK
        int author_id FK
        int book_id FK "Nullable"
        varchar subject
        text description
        varchar category
        varchar priority
        text ai_summary "Nullable"
        varchar status
        int assigned_admin_id FK "Nullable"
        datetime author_last_viewed_at "Nullable"
        datetime created_at
        datetime updated_at
    }

    ticket_messages {
        int id PK
        int ticket_id FK
        enum sender_type "author, admin"
        int sender_id
        text message
        boolean is_internal_note
        datetime created_at
    }

    authors ||--o{ books : writes
    authors ||--o{ tickets : raises
    books ||--o{ tickets : relates_to
    tickets ||--o{ ticket_messages : contains
    admins ||--o{ tickets : manages
```

## SQL Schema Definition (`schema.sql`)
```sql
CREATE DATABASE IF NOT EXISTS bookleaf_db;
USE bookleaf_db;

CREATE TABLE IF NOT EXISTS authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    city VARCHAR(100),
    joined_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id VARCHAR(50) UNIQUE NOT NULL,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(50),
    genre VARCHAR(100),
    publication_date DATE NULL,
    status VARCHAR(100) NOT NULL,
    mrp DECIMAL(10, 2) NULL,
    author_royalty_per_copy DECIMAL(10, 2) NULL,
    total_copies_sold INT DEFAULT 0,
    total_royalty_earned DECIMAL(10, 2) DEFAULT 0.00,
    royalty_paid DECIMAL(10, 2) DEFAULT 0.00,
    royalty_pending DECIMAL(10, 2) DEFAULT 0.00,
    last_royalty_payout_date DATE NULL,
    print_partner VARCHAR(100) NULL,
    available_on JSON NULL,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    author_id INT NOT NULL,
    book_id INT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General Inquiry',
    priority VARCHAR(50) DEFAULT 'Medium',
    ai_summary TEXT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    assigned_admin_id INT NULL,
    author_last_viewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_type ENUM('author', 'admin') NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
```
