# Engineering Design Decisions — BookLeaf Portal

This document records the major architectural, database, backend, frontend, security, and AI integration decisions made during the development of the BookLeaf Author Support & Communication Portal.

Each decision explains the problem being addressed, the selected implementation approach, alternatives considered, the reasoning behind the selection, and the associated trade-offs. The document also distinguishes between currently implemented capabilities and proposed improvements.

---

## Decision 1: Database and Driver Selection — MySQL with `mysql2` (Raw SQL)

### Decision
Use MySQL as the relational database and the native `mysql2` Node.js package with connection pooling (`mysql.createPool`) and parameterized asynchronous SQL queries.

### Context and Requirements
The application manages structured relational entities:
- Authors and their associated books.
- Support tickets associated with authors and optionally with books.
- Ticket messages and internal administrative notes.
- Administrative operations and ticket assignments.

These relationships require consistent data management, relational integrity, and reliable database transactions (`beginTransaction`, `commit`, `rollback`, `release`).

### Justification
1. **Relational Data Management:** MySQL provides relational tables, foreign-key constraints, and transaction support suitable for the application's data relationships.
2. **Direct Query Control:** Using `mysql2` allows explicit control over SQL queries, joins, filtering, and database operations without ORM abstraction overhead.
3. **Parameterized Queries:** Query parameters (`?`) prevent SQL injection caused by directly concatenating untrusted input into SQL statements.
4. **Transaction Support & Connection Pooling:** Handled robustly in `backend/src/config/db.js` and controllers (`ticketController.js`) using explicit pool connections, transactions, and safe resource release in `finally` blocks.

### Alternatives Considered and Trade-offs
- **Prisma ORM:** Provides schema-based database modelling, type-safe queries, and migration tooling. However, it introduces an additional abstraction layer and generated client workflow. Raw SQL with `mysql2` is direct and crystal clear.

---

## Decision 2: Backend Framework — Node.js with Express and JavaScript ES Modules

### Decision
Use Node.js with Express.js and modern JavaScript using the ES Modules `import` and `export` syntax (`type: "module"`).

### Context and Requirements
The backend must expose REST APIs, manage JWT authentication, communicate with MySQL, process support tickets, and integrate with the Google Gemini AI API (`gemini-3.5-flash`).

### Justification
1. **JavaScript-Based Development:** Using JavaScript across frontend and backend maintains a unified development model.
2. **Asynchronous I/O:** Node.js supports asynchronous operations suitable for handling database requests and external API communication.
3. **Express Middleware:** Express provides middleware support for JWT verification, role-based authorization (`author` vs `admin`), request processing, and error handling.
4. **Modular Structure:** ES Modules allow the backend to cleanly separate controllers, routes, middleware, configuration, and services.

---

## Decision 3: Frontend Framework — React with Vite, Tailwind CSS, and Lucide Icons

### Decision
Use React with Vite, Tailwind CSS, and Lucide Icons to develop the BookLeaf frontend as a Single Page Application (SPA).

### Context and Requirements
The application contains separate Author and Admin interfaces with different workflows, dashboards, ticket management views, and access requirements.

### Justification
1. **Component-Based Architecture:** React allows reusable UI components and separation of application views (`AuthorPortal.jsx`, `AdminPortal.jsx`, modals).
2. **Vite Development Workflow:** Vite provides fast development startup and Hot Module Replacement (HMR).
3. **Utility-First Styling:** Tailwind CSS supports consistent and responsive interface development.
4. **Icon Integration:** Lucide Icons provide clean, reusable icons across the application.

---

## Decision 4: AI Provider Selection and Integration — Google Gemini (`gemini-3.5-flash`)

### Decision
Integrate Google Gemini using the official `@google/genai` SDK with model identifier `gemini-3.5-flash` for automated ticket classification, priority scoring, ticket summarization, and Knowledge Base-backed response drafting.

### Context and Requirements
The support system needs to process incoming tickets, identify their categories and priorities, summarize ticket content, and assist administrators in preparing relevant responses.

### Justification
1. **Ticket Classification:** Gemini analyzes ticket subject and description to categorize queries into allowed categories (`Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`).
2. **Priority Scoring:** Determines priority level (`Low`, `Medium`, `High`, `Critical`).
3. **Response Drafting:** Uses modular Knowledge Base policies and category-specific author database context (`selectAuthorContext`) to prepare context-aware response drafts.
4. **Model Identifier:** Explicitly configured as `gemini-3.5-flash` in `backend/src/services/aiService.js`.

---

## Decision 5: REST API Architecture

### Decision
Use REST-style HTTP endpoints to connect the React frontend with the Express backend.

### Context and Requirements
The Author and Admin portals need to retrieve and update application data, including dashboard information, books, tickets, messages, and administrative records.

### Justification
1. **Resource-Based Endpoints:** API routes represent resources (`/auth`, `/authors`, `/admin`, `/tickets`).
2. **HTTP Methods:** GET, POST, PATCH operations.
3. **Authentication:** Protected endpoints use JWT-based authentication through Bearer tokens (`Authorization: Bearer <token>`).
4. **Role-Based Access:** Backend middleware separates author and administrator permissions.

---

## Decision 6: Ticket Updates Through Periodic Polling (6-Second Interval)

### Decision
Use non-overlapping recursive `setTimeout` polling (every 6 seconds) with `AbortController` signal cleanup and `metaUpdatingRef` protection to retrieve ticket updates and unread notification statuses (`author_last_viewed_at`) without WebSocket infrastructure.

### Context and Requirements
Authors and administrators need to see ticket messages, status changes, and unread green indicator dots (`is_unread`) without manually refreshing the application.

### Justification
1. **Simplicity and Reliability:** Polling every 6 seconds avoids complex WebSocket state management while keeping the UI responsive.
2. **Race Condition Prevention (`metaUpdatingRef`):** Prevents background polling cycles from overwriting uncommitted local admin dropdown selections (Status/Priority) while a PATCH request is pending.
3. **Unread Dot Synchronization:** Backend SQL query compares `author_last_viewed_at` with admin message timestamps, automatically clearing the green notification dot when opened by the author.

---

## Decision 7: Modular Knowledge Base Context Selection

### Decision
Use relevant Knowledge Base policy sections as context for AI processing instead of repeatedly sending the entire Knowledge Base.

### Context and Requirements
BookLeaf support policies cover different operational areas (Royalty, Printing, Distribution, Profile & Tax, ISBN & Metadata). Sending unrelated policy information for every request increases token consumption and latency.

### Justification
1. **Context Reduction:** Only relevant policy sections are selected for the AI request.
2. **Focused Prompting:** Ticket-related policy sections provide focused guidance for classification and response drafting.

---

## Decision 8: Scoring-Based Knowledge Base Retrieval

### Decision
Upgrade Knowledge Base retrieval to a weighted scoring mechanism (`getKBSectionForQuery` in `bookleafKB.js`) with regex phrase matching, priority keywords, and ticket-category alignment.

### Justification
1. **High-Priority Keywords:** Weight +4.
2. **Multi-Word Phrase Matching:** Weight +3.
3. **Standard Word Matching:** Weight +2.
4. **Category Alignment:** Matching ticket categories receive an additional +6 score.
5. **Top Section Filtering:** Selects top-3 scoring sections while always including `communicationGuidelines`.

---

## Decision 9: Category-Specific Author Context Filtering (`selectAuthorContext`)

### Decision
Use `selectAuthorContext()` inside `ticketContextService.js` to select author and book information relevant to the ticket category before passing it to the AI service.

### Justification
1. **Relevant Data Selection:** Only category-related data (e.g., `royaltyAggregate` for royalty tickets, `distributionHealth` for distribution tickets) is injected into the AI prompt.
2. **Data Privacy & Null Safety:** Prevents unrelated financial data from being exposed and uses `sumFinancialField()` to safely return `null` when data is missing rather than treating it as zero.

---

## Decision 10: Safe Financial Formatting and Anti-Hallucination Prompt Instructions

### Decision
Use helper functions (`formatCurrency`, `formatValue`) and an explicit `buildAuthorDbSnippet()` in `aiService.js` to structure author data, prevent false zeroes, and include anti-hallucination and prompt-injection guard instructions.

---

## Decision 11: Resilient Ticket Creation & AI Failure Handling

### Decision
Decouple AI classification from database persistence. In `ticketController.js`, **AI classification (`classifyTicketAI`) runs before database connection and transaction acquisition**. 

If the AI API fails, times out (>8s), or hits rate limits, the system catches the error and falls back to a rule-based intelligent classifier (`aiResult` with category/priority/summary defaults), ensuring that **ticket creation always succeeds** and never blocks on external LLM availability.

---

## Decision 12: JWT Authentication and Client-Side Token Storage

### Decision
Use JSON Web Tokens (JWT) for authenticated API access stored in client `localStorage` and sent via `Authorization: Bearer <token>` headers, protected by backend JWT verification and role-based middleware.

---

## Decision 13: AI-Generated Response Drafts with Administrator Review

### Decision
Use AI-generated response drafts (`getAIDraftForTicket`) to assist administrators while keeping final ticket communication under manual administrator review and control.

---

## Decision 14: AI Context Optimisation and Cost Management

### Decision
Optimize token consumption by dynamically injecting only relevant KB policy chunks and category-filtered author DB records.

---

## Decision 15: Role-Based Access Control and Internal Note Separation

### Decision
Enforce strict RBAC on backend routes and filter internal notes (`is_internal_note = FALSE` for authors) to ensure authors cannot access admin-only notes or other authors' tickets.

---

## Future Improvements and Technical Considerations

### 1. File Attachments
Allow authors to upload PDFs, documents, and images with support tickets and replies.

### 2. Real-Time Communication
Replace 6-second polling with WebSockets or Server-Sent Events (SSE) for instant message delivery.

### 3. AI Monitoring
Add token usage tracking, response quality evaluation, and cost monitoring.

### 4. Performance Optimisation
Optimize database queries and introduce Redis caching where appropriate.

### 5. Security Improvements
Strengthen token storage (e.g., HttpOnly cookies), input validation, rate limiting, and file access controls.

### 6. Scalability
Introduce background jobs (e.g., BullMQ) for notifications and asynchronous operations.

