# AGENTS.md — Development Guidelines & Coding Standards

## 1. Coding Standards & Principles
- **Clean Code & Modular Separation:** Maintain clear separation of concerns (Controllers, Services, Routes, Database connection pool using `mysql2`).
- **JavaScript ES Modules:** Use modern ES module syntax (`import/export`) for all backend and frontend files.
- **Error Handling:** Never swallow exceptions. Return structured JSON error responses with meaningful HTTP status codes (400, 401, 403, 404, 500).
- **Security:** 
  - Store all database credentials and API keys in environment variables (`.env`), never hardcoded.
  - Enforce JWT authentication and RBAC middleware on all protected routes.
  - Use parameterized queries (`?` placeholders) with `mysql2` to entirely prevent SQL injection.

## 2. AI Integration Guidelines
- Inject the BookLeaf Knowledge Base context into system prompts so AI-generated responses match company policy (80/20 royalty split, 45-day payout, 5-7 days printing turnaround).
- Implement graceful degradation: if the LLM API fails, log the error, create the ticket with default fallback classification/priority, and allow manual admin response.
