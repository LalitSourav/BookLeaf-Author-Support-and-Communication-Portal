# API Documentation — BookLeaf Portal

## Base URL
`http://localhost:5000/api`

## Authentication
All protected endpoints require a valid JWT token passed in the HTTP header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoint Reference

### 1. Authentication Endpoints

#### **POST `/auth/login`**
- **Description:** Authenticates an author or administrator in the system and issues a secure JWT token.
- **Authentication:** Public (No token required)
- **Request Body:**
  - `email` (string, required): Registered email address of the user.
  - `password` (string, required): User password.
  - `role` (string, required): Either `"author"` or `"admin"`.
- **Behavior:** Verifies the user credentials against the database (`authors` or `admins` table) using password hashing comparison. Generates a signed JWT session token upon success.

#### **GET `/auth/me`**
- **Description:** Retrieves the user profile associated with the currently active JWT token session.
- **Authentication:** Protected (Requires valid Bearer token)
- **Behavior:** Validates the JWT token via middleware and returns the authenticated user's ID, name, email, and role.

---

### 2. Author Portal Endpoints

#### **GET `/authors/dashboard`**
- **Description:** Retrieves financial and operational summary metrics for the authenticated author.
- **Authentication:** Protected (Author role required)
- **Behavior:** Queries the database for the author's books, calculating total earnings, paid royalties, pending payouts, total copies sold, and active book count.

#### **GET `/authors/books`**
- **Description:** Retrieves the complete book catalog belonging to the authenticated author.
- **Authentication:** Protected (Author role required)
- **Behavior:** Queries the `books` table filtered by the authenticated author's ID, returning title, ISBN, publication status, sales figures, royalties, print partner, and distribution platforms.

---

### 3. Admin Portal Endpoints

#### **GET `/admin/dashboard`**
- **Description:** Retrieves platform-wide analytics and operational metrics for internal operations and administrative review.
- **Authentication:** Protected (Admin role required)
- **Behavior:** Aggregates statistics across all authors, books, and support tickets, including open ticket counts, critical priority tickets, and total pending payouts.

#### **GET `/admin/authors`**
- **Description:** Retrieves the directory of all registered authors across the publishing platform.
- **Authentication:** Protected (Admin role required)
- **Behavior:** Queries all author records from the database with contact information and registration dates.

#### **GET `/admin/books`**
- **Description:** Retrieves all books published across the entire BookLeaf catalog.
- **Authentication:** Protected (Admin role required)
- **Behavior:** Queries all book records joined with author names and publishing statuses.

---

### 4. Support Ticket Endpoints

#### **GET `/tickets`**
- **Description:** Retrieves support tickets. Authors view only their own tickets; administrators view all support tickets across the platform.
- **Authentication:** Protected (Author or Admin role required)
- **Query Parameters:**
  - `status` (string, optional): Filter by ticket status (`Open`, `In Progress`, `Resolved`, `Closed`).
  - `category` (string, optional): Filter by support category (`Royalty & Payments`, `Printing & Quality`, `Distribution & Availability`, `ISBN & Metadata Issues`, `Book Status & Production Updates`, `General Inquiry`).
  - `priority` (string, optional): Filter by priority (`Low`, `Medium`, `High`, `Critical`).
  - `search` (string, optional): Keyword search matching ticket subject or description.
- **Behavior:** Executes a parameterized SQL query joining tickets with author and book details, applying optional filters.

#### **POST `/tickets`**
- **Description:** Creates a new support ticket raised by an author.
- **Authentication:** Protected (Author role required)
- **Request Body:**
  - `book_id` (integer, optional): Associated book ID if the query concerns a specific book.
  - `subject` (string, required): Concise subject line summarizing the issue.
  - `description` (string, required): Detailed description of the support request.
- **Behavior:** 
  1. Generates a unique ticket identifier (`TKT-YYYY-XXXX`).
  2. Invokes the Google Gemini AI service (`gemini-3.5-flash`) with Knowledge Base context injection to automatically classify the ticket category, assign a priority level, and generate an `ai_summary`.
  3. **Graceful Degradation:** If the LLM API is unavailable, rate-limited, or times out, the system automatically falls back to a rule-based classifier, ensuring ticket creation never fails.
  4. Persists the ticket in the MySQL database.

#### **GET `/tickets/:id`**
- **Description:** Retrieves complete details for a single support ticket, including its message thread and internal administrative notes.
- **Authentication:** Protected (Author if owner, or Admin)
- **Behavior:** Fetches ticket record, associated book data, and messages. Updates `author_last_viewed_at` timestamp to clear unread notifications.

#### **POST `/tickets/:id/messages`**
- **Description:** Posts a new message or internal note to a ticket conversation thread.
- **Authentication:** Protected (Author or Admin)
- **Request Body:**
  - `message` (string, required): Content of the reply or internal note.
  - `is_internal_note` (boolean, optional): Flag indicating whether the message is visible only to admins (defaults to `false`).
- **Behavior:** Validates sender permissions and inserts the message record into the `ticket_messages` table.

#### **PATCH `/tickets/:id`**
- **Description:** Updates ticket metadata, status, category, priority, or assigned administrator.
- **Authentication:** Protected (Admin role required)
- **Request Body:**
  - `status` (string, optional): New ticket status.
  - `priority` (string, optional): Updated priority level.
  - `category` (string, optional): Reclassified category.
  - `assigned_admin_id` (integer, optional): Admin ID assigned to handle the ticket.
- **Behavior:** Executes a parameterized SQL update on the specified ticket attributes.

#### **GET `/tickets/:id/ai-draft`**
- **Description:** Generates an AI-backed draft response for an administrator to review before replying to an author.
- **Authentication:** Protected (Admin role required)
- **Behavior:** 
  1. Fetches category-specific author and book database records via `ticketContextService.js`.
  2. Retrieves the relevant BookLeaf Knowledge Base policy section via scoring-based keyword retrieval (`bookleafKB.js`).
  3. Calls Google Gemini (`gemini-3.5-flash`) with strict anti-hallucination prompt guards and financial formatting helpers (`formatCurrency`) to draft an empathetic, policy-compliant reply.
