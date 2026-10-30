# BookLeaf Author Support & Communication Portal

## Project Overview
The Author Support & Communication Portal is a full-stack web application built for BookLeaf Publishing to streamline author support operations across 22,000+ titles. It features an **Author Portal** for managing books, checking royalties, and tracking support tickets, and an **Admin Portal** featuring AI auto-classification, AI priority scoring, and Knowledge Base-backed AI response drafting.

## Technology Stack
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, JavaScript (ESM)
- **Database:** MySQL (v8.0+) via `mysql2` parameterized queries
- **AI Engine:** Anthropic Claude / OpenAI API

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL server running locally

### Installation
1. Clone the repository.
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
3. Create database and run schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
4. Install dependencies and seed sample data (`bookleaf_sample_data.json`):
   ```bash
   npm install
   npm run seed
   ```
5. Start the application:
   ```bash
   npm run dev
   ```
