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
  - **Query Params:** `status`, `category`, `priority`, `date`
  - **Response:** List of tickets with messages.
- **POST `/tickets`**
  - **Auth:** Author only
  - **Body:** `{ "book_id": "string (optional)", "subject": "string", "description": "string" }`
  - **Behavior:** Triggers AI service for auto-classification and priority scoring.
  - **Response:** Created ticket object.
- **GET `/tickets/:id`**
  - **Auth:** Author (if owner) or Admin.
  - **Response:** Ticket details, associated book, and message thread.
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
  - **Behavior:** Invokes AI with ticket context and BookLeaf Knowledge Base to draft a response.
  - **Response:** `{ "draft_response": "..." }`
