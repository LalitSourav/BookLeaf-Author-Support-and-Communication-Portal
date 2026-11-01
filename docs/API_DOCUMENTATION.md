# API Documentation — BookLeaf Portal

## Base URL
`http://localhost:5000/api`

## Authentication
All protected endpoints require the `Authorization` header:
`Authorization: Bearer <JWT_TOKEN>`

---

## Endpoints

### 1. Authentication
- **POST `/auth/login`**
  - **Body:** `{ "email": "string", "password": "string", "role": "author" | "admin" }`
  - **Response:** `{ "token": "JWT_TOKEN", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }`

### 2. Author Portal
- **GET `/author/books`**
  - **Auth:** Author only
  - **Response:** List of books belonging to the authenticated author with sales, royalties, and status.
- **GET `/author/dashboard`**
  - **Auth:** Author only
  - **Response:** Financial summary (total earnings, paid, pending, total copies sold).

### 3. Tickets
- **GET `/tickets`**
  - **Auth:** Author (sees own tickets) or Admin (sees all tickets).
  - **Query Params:** `status`, `category`, `priority`, `search`
  - **Response:** List of tickets with messages, last sender type, and author/book details.
- **POST `/tickets`**
  - **Auth:** Author only
  - **Body:** `{ "book_id": "number (optional)", "subject": "string", "description": "string" }`
  - **Behavior:** Triggers Google Gemini AI service for auto-classification, priority scoring, and `ai_summary` generation. Includes graceful degradation fallback if AI is unavailable.
  - **Response:** Created ticket object with `ai_summary`, `category`, and `priority`.
- **GET `/tickets/:id`**
  - **Auth:** Author (if owner) or Admin.
  - **Response:** Ticket details, associated book, message thread, and clears author unread notification (`author_last_viewed_at`).
- **POST `/tickets/:id/messages`**
  - **Auth:** Author or Admin
  - **Body:** `{ "message": "string" }`
  - **Response:** Created message.
- **PATCH `/tickets/:id`**
  - **Auth:** Admin only
  - **Body:** `{ "status": "...", "priority": "...", "category": "...", "assigned_admin_id": "..." }`
  - **Response:** Updated ticket.
- **POST `/tickets/:id/notes`**
  - **Auth:** Admin only
  - **Body:** `{ "note": "string" }`
  - **Response:** Created internal note.
- **POST `/tickets/:id/generate-response`**
  - **Auth:** Admin only
  - **Behavior:** Invokes Google Gemini AI with ticket context, database records, and BookLeaf Knowledge Base (`bookleafKB.js`) to draft a policy-compliant response.
  - **Response:** `{ "draft_response": "..." }`
