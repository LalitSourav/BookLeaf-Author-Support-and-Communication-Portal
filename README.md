# BookLeaf Author Support & Communication Portal

## 1. Project Overview
The **BookLeaf Author Support & Communication Portal** is a full-stack web application built for BookLeaf Publishing to streamline author support operations across 22,000+ titles. It consists of two primary interfaces:
- **Author Portal:** Enables authors to manage their book catalog, view royalties and sales aggregates, submit support queries, and track tickets with near-real-time responses.
- **Admin Portal:** Enables internal ops teams to manage incoming support tickets, leverage Google Gemini AI auto-classification and priority scoring, review AI-drafted responses backed by the BookLeaf Knowledge Base, update ticket status, add internal notes, and assign tickets.

---

## 2. Technology Stack
- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons, React Router.
- **Backend:** Node.js, Express.js, JavaScript (ES Modules).
- **Database:** MySQL (v8.0+) via `mysql2` (Parameterized Async SQL queries & transactions).
- **AI Engine:** Google Gemini (`gemini-3.5-flash`) via official `@google/genai` SDK with strict Knowledge Base injection and graceful degradation fallback.

---

## 3. Application URLs & Ports
- **Frontend Application (Vite SPA):** `http://localhost:3000`
- **Backend REST API Server:** `http://localhost:5000/api`

---

## 4. Prerequisites & Environment Variables (`.env.example`)

### Prerequisites
- Node.js (v18+)
- MySQL server (v8.0+) running locally or remotely

### Environment Configuration
Create a `.env` file in the root directory (or `backend/.env`) based on `.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bookleaf_db
DB_PORT=3306

# JWT Secret
JWT_SECRET="super-secret-jwt-key-bookleaf-2026"

# AI Configuration (Google Gemini)
GEMINI_API_KEY="your-gemini-api-key"
AI_PROVIDER="gemini"
```

---

## 5. Database Setup & Sample Data Seeding

1. **Create Database & Schema:**
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   *(Alternatively, the database schema is automatically set up via backend configuration/migration scripts).*

2. **Seed Sample Data:**
   ```bash
   cd backend
   npm run seed
   ```
   This populates test authors, book catalogs (spanning 22,000+ titles), sample admins, and initial tickets from `database/bookleaf_sample_data.json`.

---

## 6. Installation & Running Instructions

### Backend Setup & Execution
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:5000`)*

### Frontend Setup & Execution
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 7. Test Login Credentials & Demo Access

On the login page (`http://localhost:3000`), you can either enter the credentials below manually or **directly click the quick-fill "Demo Author" or "Demo Admin" buttons** on the login UI to instantly populate test credentials.

### Admin Login
- **Email:** `admin@bookleaf.com`
- **Password:** `Admin@123`

### Author Logins
*(Password for all author accounts: `Password@123`)*
1. `priya.sharma@email.com`
2. `rohit.kapoor@email.com`
3. `ananya.reddy@email.com`
4. `vikram.joshi@email.com`
5. `meera.nair@email.com`
6. `arjun.malhotra@email.com`
7. `sneha.kulkarni@email.com`
8. `farhan.sheikh@email.com`
9. `kavita.deshmukh@email.com`
10. `diya.chatterjee@email.com`

---

## 8. AI Integration Workflow, Prompt Strategy & Graceful Degradation

### A. AI Auto-Classification & Priority Scoring
- When an author submits a new ticket, the backend invokes Google Gemini (`gemini-3.5-flash`) with the query subject and description.
- Gemini analyzes the query against BookLeaf operating guidelines and returns an automated category, priority score (`Low`, `Medium`, `High`, `Critical`), and concise `ai_summary`.

### B. Knowledge Base Retrieval (`bookleafKB.js`)
- Admin response drafting utilizes scoring-based keyword retrieval (`getKBSectionForQuery()`) to find the exact relevant policy section (Royalty & Payments, Printing & Quality, Distribution & Availability, ISBN & Metadata, or Profile & Tax), avoiding full-document token bloat.

### C. Graceful Degradation & Fallback
- If the Gemini API times out (>8s), hits rate limits, or `GEMINI_API_KEY` is unconfigured, the system logs the warning and seamlessly falls back to a rule-based intelligent classifier.
- **Key Guarantee:** Ticket creation **always succeeds** regardless of AI availability, preventing author support disruption.

---

## 9. Cost Management & Token Efficiency
- **Targeted Context Injection:** Rather than passing the entire 2,000-word Knowledge Base on every call, `bookleafKB.js` extracts and injects only the top-3 scoring policy sections.
- **Category-Specific DB Filtering (`selectAuthorContext.js`):** Extracts only relevant fields (e.g., `royaltyAggregate` for royalty tickets, `distributionHealth` for distribution tickets) to prevent unnecessary token consumption and data leakage.

---

## 10. Known Limitations & Future Improvements
- **Polling vs WebSockets:** Currently uses non-overlapping recursive `setTimeout` (6s polling interval) for real-time ticket updates and unread indicator tracking. Future iterations can integrate WebSockets (Socket.io) for instant bidirectional events.
- **AI Rate Limits:** Relies on Google Gemini API quotas; fallback classifier ensures continuity during rate limiting.
- **File Attachments:** Allow authors to upload PDFs, documents, and images with tickets and replies.
- **Real-Time Communication:** Replace polling with WebSockets or Server-Sent Events.
- **AI Monitoring:** Add token usage tracking, response quality evaluation, and cost monitoring.
- **Performance:** Optimise database queries and introduce caching where appropriate.
- **Security:** Strengthen token storage, validation, rate limiting, and file access controls.
- **Scalability:** Introduce background jobs for notifications and other time-consuming operations.

---

## 11. Detailed Documentation Index

For comprehensive information regarding the architecture, APIs, and engineering decisions, refer to the following documents:

| Topic | Document Path | Description |
| :--- | :--- | :--- |
| **System Architecture** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | High-level architecture, technology stack, data flow diagrams, and polling architecture. |
| **API Documentation** | [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Comprehensive API endpoint reference, authentication mechanisms, query params, and status codes. |
| **Database Schema** | [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | ER diagrams, table definitions (`authors`, `books`, `admins`, `tickets`, `ticket_messages`), and foreign keys. |
| **Engineering Decisions** | [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md) | Architectural justifications, trade-offs, security controls, and anti-hallucination prompt strategies. |

